import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnimatedNumber,
  MagneticButtonWrapper,
  ScrambleText,
} from '../components/MotionPrimitives';
import {
  DEFAULT_PBKDF2_ITERATIONS,
  decryptVault,
  encryptVault,
  evaluatePassphraseStrength,
  VaultCryptoError,
} from '../crypto/vaultCrypto';
import { createDemoVault, DEMO_IDENTITY_IDS } from '../data/demoSeed';
import { BANK_CATALOG, getBankPresetById, searchBanks } from '../data/bankCatalog';
import {
  BANK_CARD_SKINS,
  CARRIER_SIM_SKINS,
  getBankCardImageUrl,
  getBankCardSkin,
  getCarrierSimSkin,
  REAL_BANK_CARD_IMAGE_IDS,
  resolveIdentityAuraHex,
} from '../data/bankCardSkins';
import {
  FULL_COLOR_LOGO_DOMAINS,
  getBankLogoDomain,
  getFullColorLogoDomain,
  getLocalBankLogoPath,
  getLocalIdentityLogoPath,
  getLocalOfficialLogoPath,
  getRealBrandSvg,
  getRealLogoUrls,
  LOCAL_BANK_LOGO_IDS,
  LOCAL_EMAIL_LOGO_IDS,
  LOCAL_IDENTITY_LOGO_IDS,
  LOCAL_SIM_LOGO_IDS,
  prefersFullColorLogo,
  REAL_BRAND_SVGS,
  resolveIdentityCardLogoPath,
} from '../data/brandIcons';
import {
  getServiceById,
  inferCustomServiceMeta,
  searchServices,
  SERVICE_CATALOG,
  SERVICE_CATEGORIES,
} from '../data/serviceCatalog';
import { clearAllVaultStorage } from '../db/storage';
import { translate } from '../i18n/translations';
import {
  computeSubscriptionTotals,
  getBindingsForIdentity,
  UNDO_TTL_MS,
  useVaultStore,
} from '../store/useVaultStore';
import {
  GIST_FILENAME,
  GistSyncError,
  pullEncryptedVault,
  pushEncryptedVault,
  SYNC_TOKEN_HELP_URLS,
  twoWaySyncVault,
} from '../sync/gistSync';
import {
  assertNoForbiddenSecretFields,
  stripForbiddenSecretFields,
  ZeroPasswordPolicyError,
  type VaultData,
} from '../types/vault';
import {
  formatAccountName,
  formatIdentityIdentifier,
  maskAccountName,
  maskBankIdentifier,
  maskEmail,
  maskPhone,
} from '../utils/mask';
import {
  computeBankSpendBreakdown,
  formatRenewalRelative,
  getRenewalCountdown,
  getUpcomingRenewals,
} from '../utils/renewal';

// Use faster iteration count only in unit crypto micro-tests where specified,
// while also explicitly verifying the production default of 250,000 iterations.
const FAST_ITERS = 15_000;

describe('IdentiDeck — AES-256-GCM E2EE Crypto & Zero-Password Guard', () => {
  it('encrypts and decrypts vault round-trip with production 250,000 PBKDF2 iterations and random salt/IV', async () => {
    const demo = createDemoVault();
    const pass = 'IdentiDeck#2026!Strong';

    const env1 = await encryptVault(demo, pass);
    const env2 = await encryptVault(demo, pass);

    expect(env1.format).toBe('identideck-e2ee-v1');
    expect(env1.kdf).toBe('PBKDF2-SHA256');
    expect(env1.cipher).toBe('AES-256-GCM');
    expect(env1.iterations).toBe(DEFAULT_PBKDF2_ITERATIONS);
    expect(env1.iterations).toBe(250_000);

    // Random salt and IV must differ across encryptions of identical plaintext
    expect(env1.salt).not.toBe(env2.salt);
    expect(env1.iv).not.toBe(env2.iv);
    expect(env1.ciphertext).not.toBe(env2.ciphertext);

    const decrypted = await decryptVault(env1, pass);
    expect(decrypted.identities).toHaveLength(demo.identities.length);
    expect(decrypted.bindings).toHaveLength(demo.bindings.length);
    expect(decrypted.identities[0].identifier).toBe(demo.identities[0].identifier);
    expect(decrypted.bindings[0].subscription?.planName).toBe('Plus');
  });

  it('rejects wrong passphrase with explicit DECRYPTION_FAILED error', async () => {
    const demo = createDemoVault();
    const env = await encryptVault(demo, 'correct-passphrase', {
      iterations: FAST_ITERS,
    });

    await expect(decryptVault(env, 'wrong-passphrase')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof VaultCryptoError && err.code === 'DECRYPTION_FAILED',
    );
  });

  it('rejects tampered ciphertext or authentication tag with DECRYPTION_FAILED', async () => {
    const demo = createDemoVault();
    const env = await encryptVault(demo, 'my-secret-pass', {
      iterations: FAST_ITERS,
    });

    // Flip a byte in decoded ciphertext
    const raw = atob(env.ciphertext);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    let mutatedBin = '';
    for (let i = 0; i < bytes.length; i += 1) {
      mutatedBin += String.fromCharCode(bytes[i]);
    }

    const tampered = { ...env, ciphertext: btoa(mutatedBin) };
    await expect(decryptVault(tampered, 'my-secret-pass')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof VaultCryptoError && err.code === 'DECRYPTION_FAILED',
    );
  });

  it('rejects empty passphrase on both encrypt and decrypt', async () => {
    const demo = createDemoVault();
    await expect(encryptVault(demo, '   ')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof VaultCryptoError && err.code === 'EMPTY_PASSPHRASE',
    );

    const env = await encryptVault(demo, 'valid-pass', {
      iterations: FAST_ITERS,
    });
    await expect(decryptVault(env, '')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof VaultCryptoError && err.code === 'EMPTY_PASSPHRASE',
    );
  });

  it('strictly enforces Zero-Password Policy across vault structures', async () => {
    const poisoned = {
      ...createDemoVault(),
      bindings: [
        {
          id: 'b1',
          identityId: DEMO_IDENTITY_IDS.primaryGmail,
          serviceId: 'github',
          serviceName: 'GitHub',
          authMethod: 'direct',
          password: 'super-secret-password',
          createdAt: Date.now(),
        },
      ],
    } as unknown as VaultData;

    expect(() => assertNoForbiddenSecretFields(poisoned)).toThrow(
      ZeroPasswordPolicyError,
    );
    await expect(
      encryptVault(poisoned, 'valid-pass', { iterations: FAST_ITERS }),
    ).rejects.toThrow(ZeroPasswordPolicyError);

    const stripped = stripForbiddenSecretFields({
      label: 'Primary',
      password: 'nope',
      nested: { pin: '1234', private_key: 'abc', keep: 'ok' },
    });
    expect(stripped).toEqual({ label: 'Primary', nested: { keep: 'ok' } });
  });

  it('evaluates passphrase strength accurately', () => {
    expect(evaluatePassphraseStrength('').score).toBe(0);
    expect(evaluatePassphraseStrength('abc').label).toBe('weak');
    expect(evaluatePassphraseStrength('abcdefgh1').label).toBe('fair');
    expect(evaluatePassphraseStrength('Abcdefgh12').label).toBe('good');
    expect(evaluatePassphraseStrength('IdentiDeck#2026!Vault').label).toBe('strong');
  });
});

describe('IdentiDeck — Privacy Mode Masking', () => {
  it('masks emails cleanly across length edge cases', () => {
    expect(maskEmail('alex.chen88@gmail.com')).toBe('al***88@gmail.com');
    expect(maskEmail('ab@gmail.com')).toBe('a***@gmail.com');
    expect(maskEmail('a@x.io')).toBe('*@x.io');
    expect(maskEmail('alice@corp.my')).toBe('al***e@corp.my');
    expect(maskEmail('')).toBe('');
  });

  it('masks Malaysian +60, CN +86, and local phone numbers cleanly', () => {
    expect(maskPhone('+60 12-345 6789')).toBe('+60 12-••• ••89');
    expect(maskPhone('+86 138 1234 5678')).toBe('+86 13• •••• ••78');
    expect(maskPhone('0123456789')).toBe('012•••••89');
    expect(maskPhone('123')).toBe('•••');
  });

  it('masks account usernames and toggles cleanly with privacyMode flag', () => {
    expect(maskAccountName('@roy_dev')).toBe('@ro•••ev');
    expect(maskAccountName('Roy')).toBe('R••');
    expect(maskAccountName('X')).toBe('••');

    expect(formatIdentityIdentifier('roy.dev@gmail.com', 'email', false)).toBe(
      'roy.dev@gmail.com',
    );
    expect(formatIdentityIdentifier('roy.dev@gmail.com', 'email', true)).toBe(
      'ro***ev@gmail.com',
    );
    expect(formatIdentityIdentifier('+60 12-345 6789', 'phone', true)).toBe(
      '+60 12-••• ••89',
    );
    expect(formatAccountName('@roy-dev', true)).toBe('@ro•••ev');
    expect(formatAccountName('@roy-dev', false)).toBe('@roy-dev');
  });
});

describe('IdentiDeck — 120+ Tri-Region Curated Service Catalog', () => {
  it('contains >= 120 unique curated services covering all 8 categories with zero emojis', () => {
    expect(SERVICE_CATALOG.length).toBeGreaterThanOrEqual(120);
    expect(SERVICE_CATEGORIES).toHaveLength(8);

    const ids = new Set<string>();
    const emojiRegex = /\p{Extended_Pictographic}/u;

    for (const item of SERVICE_CATALOG) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.brandColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(item.monogram.length).toBeGreaterThanOrEqual(1);
      expect(item.monogram.length).toBeLessThanOrEqual(4);
      expect(emojiRegex.test(item.monogram)).toBe(false);
      expect(emojiRegex.test(item.name)).toBe(false);
      expect(emojiRegex.test(item.nameZh)).toBe(false);
    }

    for (const cat of SERVICE_CATEGORIES) {
      const count = SERVICE_CATALOG.filter((s) => s.category === cat.id).length;
      expect(count).toBeGreaterThanOrEqual(10);
    }
  });

  it('supports EN/ZH/Malaysia alias search and custom website domain inference', () => {
    expect(searchServices('tng', 'malaysia').some((s) => s.id === 'tng-ewallet')).toBe(
      true,
    );
    expect(searchServices('小红书').some((s) => s.id === 'xiaohongshu')).toBe(true);
    expect(searchServices('mae').some((s) => s.id === 'maybank-mae')).toBe(true);

    const custom = inferCustomServiceMeta('https://app.my-startup.io/login');
    expect(custom.id).toBe('custom:app-my-startup-io');
    expect(custom.domain).toBe('app.my-startup.io');
    expect(custom.brandColor).toMatch(/^#[0-9A-Fa-f]{6}$/);

    const fallback = getServiceById('custom:indie-tool', 'Indie Tool', 'indie.dev');
    expect(fallback.monogram).toBe('IT');
  });

  it('maps 100% of catalog services to verified simple-icons SVGs or real official logo domains', () => {
    expect(Object.keys(REAL_BRAND_SVGS).length).toBeGreaterThanOrEqual(90);
    expect(Object.keys(FULL_COLOR_LOGO_DOMAINS).length).toBeGreaterThanOrEqual(45);

    // Every catalog item must have either a verified simple-icons vector SVG or a valid official domain
    for (const item of SERVICE_CATALOG) {
      const hasSvg = Boolean(getRealBrandSvg(item.id));
      const domain = getFullColorLogoDomain(item.id, item.domain);
      expect(hasSvg || Boolean(domain)).toBe(true);
    }

    // Spot-check key official vector SVGs
    for (const key of ['gmail', 'icloud', 'apple', 'claude', 'github', 'spotify', 'steam', 'netflix', 'wechat']) {
      const svg = getRealBrandSvg(key);
      expect(svg).toBeDefined();
      expect(svg!.path.length).toBeGreaterThan(20);
      expect(svg!.hex).toMatch(/^[0-9A-Fa-f]{6}$/);
    }

    // Spot-check Malaysian & trademark-removed full-color official domains
    expect(prefersFullColorLogo('tng-ewallet')).toBe(true);
    expect(FULL_COLOR_LOGO_DOMAINS['tng-ewallet']).toBe('tngdigital.com.my');
    expect(FULL_COLOR_LOGO_DOMAINS['maybank-mae']).toBe('maybank2u.com.my');
    expect(FULL_COLOR_LOGO_DOMAINS['openai']).toBe('chatgpt.com');

    const urls = getRealLogoUrls('https://tngdigital.com.my/ewallet');
    expect(urls).toEqual([
      'https://www.google.com/s2/favicons?domain=tngdigital.com.my&sz=128',
      'https://icons.duckduckgo.com/ip3/tngdigital.com.my.ico',
    ]);
  });
});

describe('IdentiDeck — Zustand Vault Store Behavior', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAllVaultStorage();
    useVaultStore.setState({
      hydrated: false,
      identities: [],
      bindings: [],
      isDemoData: false,
      selectedIdentityId: null,
      undoStack: [],
      language: 'zh',
      privacyMode: false,
    });
    await useVaultStore.getState().hydrate();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates with realistic demo data (2 Email + 1 SIM + 2 Bank Cards) and clears cleanly in one click', () => {
    const state = useVaultStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.isDemoData).toBe(true);
    expect(state.identities).toHaveLength(5);
    expect(state.bindings).toHaveLength(10);

    state.clearDemoData();
    const after = useVaultStore.getState();
    expect(after.isDemoData).toBe(false);
    expect(after.identities).toHaveLength(0);
    expect(after.bindings).toHaveLength(0);
    expect(after.selectedIdentityId).toBeNull();
  });

  it('detects duplicate bindings & prioritizes active paid subscription warnings', () => {
    const store = useVaultStore.getState();

    // Add a free OpenAI binding on Maxis SIM so we have both paid (Gmail) and free (Maxis)
    store.addBinding({
      identityId: DEMO_IDENTITY_IDS.malaysiaMaxisSim,
      serviceId: 'openai',
      serviceName: 'OpenAI / ChatGPT',
      authMethod: 'phone_otp',
    });

    // Check from Apple iCloud identity's perspective
    const dupes = useVaultStore
      .getState()
      .findDuplicateBindings('openai', DEMO_IDENTITY_IDS.workIcloud);

    expect(dupes).toHaveLength(2);
    // Paid subscription match MUST come first
    expect(dupes[0].isPaid).toBe(true);
    expect(dupes[0].identity.id).toBe(DEMO_IDENTITY_IDS.primaryGmail);
    expect(dupes[0].binding.subscription?.planName).toBe('Plus');
    expect(dupes[1].isPaid).toBe(false);

    // Excluding primaryGmail should leave only the non-paid Maxis match
    const excluded = useVaultStore
      .getState()
      .findDuplicateBindings('openai', DEMO_IDENTITY_IDS.primaryGmail);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].identity.id).toBe(DEMO_IDENTITY_IDS.malaysiaMaxisSim);
  });

  it('reorders identities deterministically for drag-and-drop', () => {
    const store = useVaultStore.getState();
    const newOrder = [
      DEMO_IDENTITY_IDS.maybankCard,
      DEMO_IDENTITY_IDS.malaysiaMaxisSim,
      DEMO_IDENTITY_IDS.workIcloud,
      DEMO_IDENTITY_IDS.gxbankCard,
      DEMO_IDENTITY_IDS.primaryGmail,
    ];
    store.reorderIdentities(newOrder);

    const reordered = useVaultStore.getState().identities;
    expect(reordered.map((c) => c.id)).toEqual(newOrder);
    expect(reordered.map((c) => c.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it('supports 6-second undo-delete for both identities (cascaded) and bindings, then expires', () => {
    vi.useFakeTimers();

    const beforeCount = useVaultStore.getState().bindings.length;
    const gmailBindingCount = useVaultStore
      .getState()
      .bindings.filter((b) => b.identityId === DEMO_IDENTITY_IDS.primaryGmail).length;

    // Delete Gmail card -> cascades its bindings
    useVaultStore.getState().deleteIdentity(DEMO_IDENTITY_IDS.primaryGmail);
    expect(useVaultStore.getState().identities).toHaveLength(4);
    expect(useVaultStore.getState().bindings).toHaveLength(
      beforeCount - gmailBindingCount,
    );
    expect(useVaultStore.getState().undoStack).toHaveLength(1);

    // Undo within 6 seconds restores card + all bindings in original position
    vi.advanceTimersByTime(3000);
    const restored = useVaultStore.getState().undoLastDelete();
    expect(restored).toBe(true);
    expect(useVaultStore.getState().identities).toHaveLength(5);
    expect(useVaultStore.getState().identities[0].id).toBe(
      DEMO_IDENTITY_IDS.primaryGmail,
    );
    expect(useVaultStore.getState().bindings).toHaveLength(beforeCount);

    // Delete a single binding and let the 6s TTL expire
    const targetBindingId = useVaultStore.getState().bindings[0].id;
    useVaultStore.getState().deleteBinding(targetBindingId);
    expect(useVaultStore.getState().undoStack).toHaveLength(1);

    vi.advanceTimersByTime(UNDO_TTL_MS + 100);
    expect(useVaultStore.getState().undoStack).toHaveLength(0);
    expect(useVaultStore.getState().undoLastDelete()).toBe(false);
  });

  it('tracks Swap-SIM / Breach migration progress and exports Markdown checklist', () => {
    const simId = DEMO_IDENTITY_IDS.malaysiaMaxisSim;
    const simBindings = useVaultStore
      .getState()
      .bindings.filter((b) => b.identityId === simId);
    expect(simBindings).toHaveLength(3);

    const initialStats = useVaultStore.getState().getMigrationStats(simId);
    expect(initialStats.total).toBe(3);
    expect(initialStats.migrated).toBe(0);
    expect(initialStats.percentage).toBe(0);
    expect(initialStats.paidRemaining).toBe(1); // GrabUnlimited

    useVaultStore.getState().toggleMigrated(simBindings[0].id);
    const midStats = useVaultStore.getState().getMigrationStats(simId);
    expect(midStats.migrated).toBe(1);
    expect(midStats.remaining).toBe(2);
    expect(midStats.percentage).toBe(33);

    useVaultStore.getState().setPrivacyMode(true);
    const md = useVaultStore.getState().exportMigrationMarkdown(simId);
    expect(md).toContain('+60 12-••• ••89');
    expect(md).toContain('[x]');
    expect(md).toContain('[ ]');

    useVaultStore.getState().resetMigrationForIdentity(simId);
    expect(useVaultStore.getState().getMigrationStats(simId).migrated).toBe(0);
  });

  it('computes multi-currency subscription totals across monthly, yearly, and lifetime cycles', () => {
    const totals = useVaultStore.getState().getSubscriptionTotals();
    const usd = totals.find((t) => t.currency === 'USD');
    const myr = totals.find((t) => t.currency === 'MYR');

    // Demo has ChatGPT Plus ($20/mo) + Claude Pro ($20/mo) = $40/mo USD
    expect(usd?.monthlyTotal).toBe(40);
    expect(usd?.yearlyTotal).toBe(480);
    expect(usd?.activePaidCount).toBe(2);

    // Demo has Spotify (RM 15.9) + iCloud+ (RM 11.9) + GrabUnlimited (RM 4.9) = RM 32.7/mo
    expect(myr?.monthlyTotal).toBe(32.7);
    expect(myr?.activePaidCount).toBe(3);

    // Verify yearly prorating & lifetime separation
    const customTotals = computeSubscriptionTotals([
      {
        id: 'y1',
        identityId: 'i1',
        serviceId: '1password',
        serviceName: '1Password',
        authMethod: 'direct',
        subscription: {
          isPaid: true,
          price: 120,
          currency: 'SGD',
          cycle: 'yearly',
        },
        createdAt: 1,
      },
      {
        id: 'l1',
        identityId: 'i1',
        serviceId: 'obsidian',
        serviceName: 'Obsidian',
        authMethod: 'direct',
        subscription: {
          isPaid: true,
          price: 50,
          currency: 'SGD',
          cycle: 'lifetime',
        },
        createdAt: 2,
      },
    ]);
    expect(customTotals[0]).toEqual({
      currency: 'SGD',
      monthlyTotal: 10,
      yearlyTotal: 120,
      lifetimeTotal: 50,
      activePaidCount: 2,
    });
  });

  it('exports & imports both plain and AES-256-GCM encrypted JSON payloads safely', async () => {
    const plainJson = useVaultStore.getState().exportPlainJson();
    const encJson = await useVaultStore
      .getState()
      .exportEncryptedJson('BackupPass#2026');

    useVaultStore.getState().clearAllData();
    expect(useVaultStore.getState().identities).toHaveLength(0);

    // Plain import
    const plainResult = await useVaultStore.getState().importJsonPayload(plainJson);
    expect(plainResult.wasEncrypted).toBe(false);
    expect(plainResult.importedIdentities).toBe(5);
    expect(plainResult.importedBindings).toBe(10);

    // Encrypted import without passphrase must reject cleanly
    await expect(
      useVaultStore.getState().importJsonPayload(encJson),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof VaultCryptoError && err.code === 'EMPTY_PASSPHRASE',
    );

    // Encrypted import with right passphrase restores cleanly
    useVaultStore.getState().clearAllData();
    const encResult = await useVaultStore
      .getState()
      .importJsonPayload(encJson, 'BackupPass#2026');
    expect(encResult.wasEncrypted).toBe(true);
    expect(encResult.importedIdentities).toBe(5);
    expect(encResult.importedBindings).toBe(10);

    // Reject importing JSON that contains a forbidden password field
    const poisonedJson = JSON.stringify({
      identities: [],
      bindings: [{ id: 'x', identityId: 'y', password: 'leaked' }],
    });
    await expect(
      useVaultStore.getState().importJsonPayload(poisonedJson),
    ).rejects.toThrow(ZeroPasswordPolicyError);
  });

  it('translates bilingual ZH & EN keys with parameter interpolation', () => {
    expect(translate('zh', 'appsBoundCount', { count: 4 })).toBe('4 个 App');
    expect(translate('en', 'appsBoundCount', { count: 4 })).toBe('4 apps');
    expect(SYNC_TOKEN_HELP_URLS.github).toContain('scopes=gist');
    expect(SYNC_TOKEN_HELP_URLS.gitee).toContain('personal_access_tokens');
  });
});

describe('IdentiDeck — GitHub & Gitee Private Gist E2EE Sync Engine', () => {
  it('creates a private Gist, pulls & decrypts, and detects timestamp conflicts', async () => {
    const demo = createDemoVault();
    const pass = 'GistSyncPass#99';
    let storedContent = '';
    let storedUpdatedAt = new Date(demo.updatedAt).toISOString();

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      // List gists
      if (method === 'GET' && url.includes('/gists?')) {
        return new Response(
          JSON.stringify(
            storedContent
              ? [{ id: 'gist-123', files: { [GIST_FILENAME]: { content: storedContent } } }]
              : [],
          ),
          { status: 200 },
        );
      }

      // Create private gist
      if (method === 'POST' && url.endsWith('/gists')) {
        const body = JSON.parse(String(init?.body)) as {
          public: boolean;
          files: Record<string, { content: string }>;
        };
        expect(body.public).toBe(false);
        storedContent = body.files[GIST_FILENAME].content;
        return new Response(
          JSON.stringify({ id: 'gist-123', updated_at: storedUpdatedAt }),
          { status: 201 },
        );
      }

      // Fetch specific gist
      if (method === 'GET' && url.includes('/gists/gist-123')) {
        return new Response(
          JSON.stringify({
            id: 'gist-123',
            updated_at: storedUpdatedAt,
            files: { [GIST_FILENAME]: { content: storedContent } },
          }),
          { status: 200 },
        );
      }

      // Patch gist
      if (method === 'PATCH' && url.includes('/gists/gist-123')) {
        const body = JSON.parse(String(init?.body)) as {
          files: Record<string, { content: string }>;
        };
        storedContent = body.files[GIST_FILENAME].content;
        return new Response(
          JSON.stringify({ id: 'gist-123', updated_at: new Date().toISOString() }),
          { status: 200 },
        );
      }

      return new Response('Not found', { status: 404 });
    }) as unknown as typeof fetch;

    // 1. Initial push creates private gist
    const pushed = await pushEncryptedVault(
      { provider: 'github', token: 'ghp_test_token', gistId: '' },
      demo,
      pass,
      { fetcher: mockFetch },
    );
    expect(pushed.created).toBe(true);
    expect(pushed.gistId).toBe('gist-123');
    // Plaintext email must NEVER appear in uploaded Gist content
    expect(storedContent).not.toContain('roy.dev@gmail.com');
    expect(storedContent).toContain('identideck-e2ee-v1');

    // 2. Pull auto-discovers gist and decrypts cleanly
    const pulled = await pullEncryptedVault(
      { provider: 'github', token: 'ghp_test_token', gistId: '' },
      pass,
      { fetcher: mockFetch },
    );
    expect(pulled.gistId).toBe('gist-123');
    expect(pulled.vault.identities).toHaveLength(5);

    // 3. Simulate newer remote timestamp -> push without force raises CONFLICT
    storedUpdatedAt = new Date(demo.updatedAt + 60_000).toISOString();
    await expect(
      pushEncryptedVault(
        {
          provider: 'github',
          token: 'ghp_test_token',
          gistId: 'gist-123',
          lastRemoteUpdatedAt: demo.updatedAt,
        },
        demo,
        pass,
        { fetcher: mockFetch },
      ),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof GistSyncError && err.code === 'CONFLICT',
    );

    // 4. Two-way sync detects conflict when BOTH local and remote diverged
    const divergedLocal: VaultData = {
      ...demo,
      updatedAt: demo.updatedAt + 30_000,
    };
    const twoWay = await twoWaySyncVault(
      {
        provider: 'github',
        token: 'ghp_test_token',
        gistId: 'gist-123',
        lastSyncedAt: demo.updatedAt,
        lastRemoteUpdatedAt: demo.updatedAt,
      },
      divergedLocal,
      pass,
      { fetcher: mockFetch },
    );
    expect(twoWay.action).toBe('conflict');
  });
});

describe('IdentiDeck — Physical Bank Cards & Dual-Link Subscription Billing', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAllVaultStorage();
    useVaultStore.setState({
      hydrated: false,
      identities: [],
      bindings: [],
      isDemoData: false,
      selectedIdentityId: null,
      undoStack: [],
      language: 'zh',
      privacyMode: false,
    });
    await useVaultStore.getState().hydrate();
  });

  it('provides 52 real banks & digital banks (30 MY + 13 Global/SG + 9 CN) with verified official logo sources', () => {
    expect(BANK_CATALOG).toHaveLength(52);
    expect(BANK_CATALOG.filter((b) => b.region === 'malaysia')).toHaveLength(30);
    expect(BANK_CATALOG.filter((b) => b.region === 'global')).toHaveLength(13);
    expect(BANK_CATALOG.filter((b) => b.region === 'china')).toHaveLength(9);

    // Verify all 5 official BNM-licensed Malaysia digital banks are present & tagged as digital
    const digitalBanks = searchBanks('', 'digital');
    expect(digitalBanks.length).toBeGreaterThanOrEqual(14);
    for (const bnmDigitalId of ['gxbank', 'aeonbank', 'boostbank', 'rytbank', 'kafbank']) {
      const preset = getBankPresetById(bnmDigitalId);
      expect(preset).toBeDefined();
      expect(preset?.region).toBe('malaysia');
      expect(preset?.isDigitalBank).toBe(true);
    }

    const ids = new Set<string>();
    for (const bank of BANK_CATALOG) {
      expect(ids.has(bank.id)).toBe(false);
      ids.add(bank.id);
      expect(bank.domain).toContain('.');
      expect(getBankLogoDomain(bank.id)).toBe(bank.domain);
    }

    expect(getBankPresetById('maybank')?.domain).toBe('maybank2u.com.my');
    expect(getBankPresetById('rytbank')?.domain).toBe('rytbank.my');
    expect(getBankPresetById('kafbank')?.domain).toBe('kafdigitalbank.com.my');
    expect(getBankPresetById('boc')?.domain).toBe('www.boc.cn');
    expect(searchBanks('招商', 'china').some((b) => b.id === 'cmb')).toBe(true);
    expect(searchBanks('gx', 'malaysia').some((b) => b.id === 'gxbank')).toBe(true);
    expect(searchBanks('gxs', 'global').some((b) => b.id === 'gxs')).toBe(true);
  });

  it('provides 1:1 authentic physical card skins for all 52 banks & major carriers with WCAG-safe ink contrast', () => {
    expect(Object.keys(BANK_CARD_SKINS)).toHaveLength(52);
    for (const bank of BANK_CATALOG) {
      const skin = getBankCardSkin(bank.id);
      expect(skin).toBeDefined();
      expect(skin!.bankId).toBe(bank.id);
      expect(skin!.background).toContain('gradient');
      expect(skin!.auraHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(['gold', 'silver']).toContain(skin!.chipTone);
    }

    // Spot-check signature real-world physical traits
    const maybankSkin = getBankCardSkin('maybank')!;
    expect(maybankSkin.isLightSurface).toBe(true);
    expect(maybankSkin.inkColor).toBe('#111113');
    expect(maybankSkin.visaInkColor).toBe('#1A1F71');

    const wiseSkin = getBankCardSkin('wise')!;
    expect(wiseSkin.isLightSurface).toBe(true);
    expect(wiseSkin.hasRightNotch).toBe(true);
    expect(wiseSkin.inkColor).toBe('#163300');

    const kafSkin = getBankCardSkin('kafbank')!;
    expect(kafSkin.hasRightNotch).toBe(true);

    const rakyatSkin = getBankCardSkin('bankrakyat')!;
    expect(rakyatSkin.hasRightNotch).toBe(true);

    const gxSkin = getBankCardSkin('gxbank')!;
    expect(gxSkin.isLightSurface).toBe(false);
    expect(gxSkin.edgeCoreGradient).toContain('gradient');

    const rytSkin = getBankCardSkin('rytbank')!;
    expect(rytSkin.isLightSurface).toBe(true);
    expect(rytSkin.cardImageUrl).toBe('/bank-cards/rytbank.webp');

    const trustSkin = getBankCardSkin('trustbank')!;
    expect(trustSkin.isLightSurface).toBe(true);
    expect(trustSkin.inkColor).toBe('#0A2559');

    // Carrier SIM skins (all 11 MY/SG/CN carriers with 1:1 physical artwork, ICCID prefix & spec label)
    expect(Object.keys(CARRIER_SIM_SKINS)).toHaveLength(11);
    for (const skin of Object.values(CARRIER_SIM_SKINS)) {
      expect(skin.artwork).toBe(skin.carrierId);
      expect(skin.iccidPrefix).toMatch(/^89\d{2} \d{2}/);
      expect(skin.simSpecLabel.length).toBeGreaterThanOrEqual(4);
    }
    expect(getCarrierSimSkin('maxis', 'MAXIS 5G')?.carrierId).toBe('maxis');
    expect(getCarrierSimSkin('custom', 'CelcomDigi 5G')?.carrierId).toBe('celcomdigi');
    expect(getCarrierSimSkin('yes5g')?.auraHex).toBe('#E6007E');
    expect(getCarrierSimSkin('unifi')?.isLightSurface).toBe(true);
    expect(getCarrierSimSkin('singtel')?.isLightSurface).toBe(true);
    expect(getCarrierSimSkin('chinamobile')?.iccidPrefix).toBe('8986 02••');
    expect(getCarrierSimSkin('chinaunicom')?.iccidPrefix).toBe('8986 01••');
    expect(getCarrierSimSkin('chinatelecom', '中国电信')?.iccidPrefix).toBe('8986 03••');
    expect(getCarrierSimSkin('tunetalk')?.carrierId).toBe('tunetalk');

    // Aura resolver respects useAuthenticSkin default (true) vs custom theme override (false)
    const demo = createDemoVault();
    const maybankCard = demo.identities.find((c) => c.id === DEMO_IDENTITY_IDS.maybankCard)!;
    expect(resolveIdentityAuraHex(maybankCard)).toBe('#FFD000');
    expect(
      resolveIdentityAuraHex({ ...maybankCard, useAuthenticSkin: false, cardTheme: 'navy' }),
    ).toBe('#2563EB');

    // Verify ALL 52 banks have bundled local official App Store / official logos on disk
    expect(LOCAL_BANK_LOGO_IDS.size).toBe(52);
    const publicDir = resolve(__dirname, '../../public');
    for (const bank of BANK_CATALOG) {
      const logoUrl = getLocalBankLogoPath(bank.id);
      expect(logoUrl).toBe(`/bank-logos/${bank.id}.webp`);
      expect(existsSync(resolve(publicDir, `bank-logos/${bank.id}.webp`))).toBe(true);
    }

    // Verify ALL 10 Email + 11 SIM official App Store logos exist on disk and map cleanly
    expect(LOCAL_EMAIL_LOGO_IDS.size).toBe(10);
    expect(LOCAL_SIM_LOGO_IDS.size).toBe(11);
    expect(LOCAL_IDENTITY_LOGO_IDS.size).toBe(21);
    for (const id of LOCAL_IDENTITY_LOGO_IDS) {
      expect(getLocalIdentityLogoPath(id)).toBe(`/identity-logos/${id}.webp`);
      expect(getLocalOfficialLogoPath(id)).toBe(`/identity-logos/${id}.webp`);
      expect(existsSync(resolve(publicDir, `identity-logos/${id}.webp`))).toBe(true);
    }

    // Spot-check Email & SIM catalog aliases, fuzzy carrier matching, and email-domain inference
    expect(getLocalOfficialLogoPath('icloud-mail')).toBe('/identity-logos/icloud.webp');
    expect(getLocalOfficialLogoPath('apple-icloud')).toBe('/identity-logos/icloud.webp');
    expect(getLocalOfficialLogoPath('proton-mail')).toBe('/identity-logos/proton.webp');
    expect(getLocalOfficialLogoPath('qq-mail')).toBe('/identity-logos/qq.webp');
    expect(getLocalOfficialLogoPath('163-mail')).toBe('/identity-logos/163.webp');
    expect(getLocalIdentityLogoPath('custom', 'MAXIS 5G')).toBe('/identity-logos/maxis.webp');
    expect(getLocalIdentityLogoPath('custom', 'CelcomDigi 5G')).toBe('/identity-logos/celcomdigi.webp');
    expect(getLocalIdentityLogoPath('custom', '中国电信')).toBe('/identity-logos/chinatelecom.webp');
    expect(
      resolveIdentityCardLogoPath({
        type: 'email',
        provider: 'custom',
        identifier: 'roy.chen@gmail.com',
      }),
    ).toBe('/identity-logos/gmail.webp');
    expect(
      resolveIdentityCardLogoPath(
        demo.identities.find((c) => c.id === DEMO_IDENTITY_IDS.primaryGmail),
      ),
    ).toBe('/identity-logos/gmail.webp');
    expect(
      resolveIdentityCardLogoPath(
        demo.identities.find((c) => c.id === DEMO_IDENTITY_IDS.workIcloud),
      ),
    ).toBe('/identity-logos/icloud.webp');
    expect(
      resolveIdentityCardLogoPath(
        demo.identities.find((c) => c.id === DEMO_IDENTITY_IDS.malaysiaMaxisSim),
      ),
    ).toBe('/identity-logos/maxis.webp');
    expect(
      resolveIdentityCardLogoPath(
        demo.identities.find((c) => c.id === DEMO_IDENTITY_IDS.maybankCard),
      ),
    ).toBe('/bank-logos/maybank.webp');

    // Verify all 46 bundled real official physical bank card artworks exist on disk
    expect(REAL_BANK_CARD_IMAGE_IDS.size).toBeGreaterThanOrEqual(46);
    for (const cardId of REAL_BANK_CARD_IMAGE_IDS) {
      expect(getBankCardImageUrl(cardId)).toBe(`/bank-cards/${cardId}.webp`);
      expect(getBankCardSkin(cardId)?.cardImageUrl).toBe(`/bank-cards/${cardId}.webp`);
      expect(existsSync(resolve(publicDir, `bank-cards/${cardId}.webp`))).toBe(true);
    }
  });

  it('masks bank card identifiers cleanly in both Normal and Privacy modes', () => {
    expect(maskBankIdentifier('•••• 4829', '4829', false)).toBe(
      '••••  ••••  ••••  4829',
    );
    expect(maskBankIdentifier('•••• 4829', '4829', false, true)).toBe('•••• 4829');
    expect(maskBankIdentifier('•••• 4829', '4829', true)).toBe(
      '••••  ••••  ••••  ••••',
    );
    expect(maskBankIdentifier('•••• 4829', '4829', true, true)).toBe('•••• ••••');

    expect(
      formatIdentityIdentifier('•••• 8021', 'bank', false, { last4: '8021' }),
    ).toBe('••••  ••••  ••••  8021');
    expect(
      formatIdentityIdentifier('•••• 8021', 'bank', true, { last4: '8021' }),
    ).toBe('••••  ••••  ••••  ••••');
  });

  it('resolves dual-link subscriptions per Bank Card with ZERO double-counting in global totals', () => {
    const state = useVaultStore.getState();
    const maybank = state.identities.find(
      (c) => c.id === DEMO_IDENTITY_IDS.maybankCard,
    )!;
    const gxbank = state.identities.find(
      (c) => c.id === DEMO_IDENTITY_IDS.gxbankCard,
    )!;

    // Maybank MAE pays ChatGPT Plus ($20), Claude Pro ($20), iCloud+ (RM 11.90)
    const maybankLinks = getBindingsForIdentity(state.bindings, maybank);
    expect(maybankLinks).toHaveLength(3);
    expect(maybankLinks.every((l) => l.linkKind === 'billing')).toBe(true);
    expect(maybankLinks.map((l) => l.binding.serviceId).sort()).toEqual([
      'apple-icloud',
      'claude',
      'openai',
    ]);

    const maybankTotals = state.getSubscriptionTotals(maybank.id);
    expect(maybankTotals.find((t) => t.currency === 'USD')?.monthlyTotal).toBe(40);
    expect(maybankTotals.find((t) => t.currency === 'MYR')?.monthlyTotal).toBe(11.9);

    // GXBank pays Spotify (RM 15.90) & GrabUnlimited (RM 4.90) = RM 20.80
    const gxLinks = getBindingsForIdentity(state.bindings, gxbank);
    expect(gxLinks).toHaveLength(2);
    const gxTotals = state.getSubscriptionTotals(gxbank.id);
    expect(gxTotals.find((t) => t.currency === 'MYR')?.monthlyTotal).toBe(20.8);

    // Global totals MUST still be USD 40 + MYR 32.70 (zero double counting across Email/SIM + Bank cards!)
    const globalTotals = state.getSubscriptionTotals();
    expect(globalTotals.find((t) => t.currency === 'USD')?.monthlyTotal).toBe(40);
    expect(globalTotals.find((t) => t.currency === 'MYR')?.monthlyTotal).toBe(32.7);
  });

  it('supports Bank Card CRUD, clears paymentCardId on delete, and restores paymentCardId on undo', () => {
    const store = useVaultStore.getState();
    const cimb = store.addIdentity({
      type: 'bank',
      label: 'CIMB OCTO Mastercard',
      identifier: '',
      provider: 'cimb',
      bankId: 'cimb',
      bankName: 'CIMB Bank',
      cardLast4: '1234567890129012', // Must sanitize to last 4 digits ONLY!
      cardNetwork: 'mastercard',
      cardKind: 'credit',
      cardExpiry: '08/30',
      cardTheme: 'titanium',
    });
    expect(cimb.cardLast4).toBe('9012');
    expect(cimb.identifier).toBe('•••• 9012');

    // Delete Maybank MAE card -> must unlink paymentCardId from ChatGPT, Claude, iCloud+ WITHOUT deleting those bindings!
    const bindingsBefore = useVaultStore.getState().bindings.length;
    useVaultStore.getState().deleteIdentity(DEMO_IDENTITY_IDS.maybankCard);
    expect(useVaultStore.getState().bindings).toHaveLength(bindingsBefore);

    const chatgptAfterDelete = useVaultStore
      .getState()
      .bindings.find((b) => b.id === 'demo-bind-chatgpt');
    expect(chatgptAfterDelete?.subscription?.paymentCardId).toBeUndefined();

    // Undo within 6s restores Maybank card AND re-links paymentCardId on all 3 subscriptions!
    expect(useVaultStore.getState().undoLastDelete()).toBe(true);
    const chatgptRestored = useVaultStore
      .getState()
      .bindings.find((b) => b.id === 'demo-bind-chatgpt');
    const claudeRestored = useVaultStore
      .getState()
      .bindings.find((b) => b.id === 'demo-bind-claude');
    const icloudRestored = useVaultStore
      .getState()
      .bindings.find((b) => b.id === 'demo-bind-icloud-plus');
    expect(chatgptRestored?.subscription?.paymentCardId).toBe(
      DEMO_IDENTITY_IDS.maybankCard,
    );
    expect(claudeRestored?.subscription?.paymentCardId).toBe(
      DEMO_IDENTITY_IDS.maybankCard,
    );
    expect(icloudRestored?.subscription?.paymentCardId).toBe(
      DEMO_IDENTITY_IDS.maybankCard,
    );
  });

  it('tracks Bank Replacement Checklist progress and exports Markdown with account origins', () => {
    const maybankId = DEMO_IDENTITY_IDS.maybankCard;
    const stats = useVaultStore.getState().getMigrationStats(maybankId);
    expect(stats.total).toBe(3);
    expect(stats.migrated).toBe(0);
    expect(stats.paidRemaining).toBe(3);

    useVaultStore.getState().toggleMigrated('demo-bind-chatgpt');
    expect(useVaultStore.getState().getMigrationStats(maybankId).migrated).toBe(1);

    const md = useVaultStore.getState().exportMigrationMarkdown(maybankId);
    expect(md).toContain('换卡 / 挂失自动扣款解绑清单');
    expect(md).toContain('•••• 4829');
    expect(md).toContain('主力个人邮箱');
    expect(md).toContain('[x] **OpenAI / ChatGPT**');
  });

  it('strictly blocks sensitive bank card secrets (cvv, cvc, pin, cardNumber, fullCardNumber, pan, securityCode)', () => {
    const forbiddenSamples = [
      { cvv: '123' },
      { cvc: '456' },
      { pin: '123456' },
      { cardNumber: '4111111111111111' },
      { fullCardNumber: '4111-1111-1111-1111' },
      { pan: '5200123456789012' },
      { securityCode: '789' },
    ];
    for (const sample of forbiddenSamples) {
      expect(() => assertNoForbiddenSecretFields(sample)).toThrow(
        ZeroPasswordPolicyError,
      );
      expect(stripForbiddenSecretFields({ safe: 'ok', ...sample })).toEqual({
        safe: 'ok',
      });
    }
  });
});

describe('IdentiDeck — Renewal Countdown Engine & Bank Spend Breakdown', () => {
  it('computes accurate renewal countdowns, urgency tiers, and Feb 28/29 day-31 clamping', () => {
    // Same day -> daysUntil = 0, urgent, progress = 1
    const sameDay = getRenewalCountdown(15, new Date(2026, 2, 15));
    expect(sameDay?.daysUntil).toBe(0);
    expect(sameDay?.urgency).toBe('urgent');
    expect(sameDay?.cycleProgress).toBe(1);
    expect(formatRenewalRelative(sameDay!, 'zh')).toBe('今天扣款');
    expect(formatRenewalRelative(sameDay!, 'en')).toBe('Due today');

    // Tomorrow -> daysUntil = 1, urgent
    const tomorrow = getRenewalCountdown(16, new Date(2026, 2, 15));
    expect(tomorrow?.daysUntil).toBe(1);
    expect(tomorrow?.urgency).toBe('urgent');
    expect(formatRenewalRelative(tomorrow!, 'zh')).toBe('明天扣款');
    expect(formatRenewalRelative(tomorrow!, 'en')).toBe('Due tomorrow');

    // 5 days away -> soon
    const soon = getRenewalCountdown(20, new Date(2026, 2, 15));
    expect(soon?.daysUntil).toBe(5);
    expect(soon?.urgency).toBe('soon');
    expect(formatRenewalRelative(soon!, 'zh')).toBe('还有 5 天');
    expect(formatRenewalRelative(soon!, 'zh', true)).toBe('5天后');
    expect(formatRenewalRelative(soon!, 'en')).toBe('In 5d');

    // 18 days away (wraps into next month) -> safe
    const safe = getRenewalCountdown(2, new Date(2026, 2, 15));
    expect(safe?.daysUntil).toBe(18);
    expect(safe?.urgency).toBe('safe');
    expect(safe?.nextDate.getMonth()).toBe(3); // April
    expect(safe?.nextDate.getDate()).toBe(2);
    expect(safe!.cycleProgress).toBeGreaterThan(0);
    expect(safe!.cycleProgress).toBeLessThan(1);

    // Day 31 in non-leap February (2026) clamps cleanly to Feb 28!
    const febNonLeap = getRenewalCountdown(31, new Date(2026, 1, 20));
    expect(febNonLeap?.nextDate.getFullYear()).toBe(2026);
    expect(febNonLeap?.nextDate.getMonth()).toBe(1);
    expect(febNonLeap?.nextDate.getDate()).toBe(28);
    expect(febNonLeap?.daysUntil).toBe(8);
    expect(febNonLeap?.urgency).toBe('safe');

    // Day 31 in leap February (2024) clamps to Feb 29!
    const febLeap = getRenewalCountdown(31, new Date(2024, 1, 27));
    expect(febLeap?.nextDate.getDate()).toBe(29);
    expect(febLeap?.daysUntil).toBe(2);
    expect(febLeap?.urgency).toBe('urgent');

    // Undefined / invalid returns null
    expect(getRenewalCountdown(undefined)).toBeNull();
    expect(getRenewalCountdown(0)).toBeNull();
  });

  it('sorts upcoming renewals ascending by daysUntil with resolved owner & payment card', () => {
    const demo = createDemoVault();
    // Anchor on the 14th of March 2026:
    // ChatGPT Plus (day 15) = 1d, GrabUnlimited (day 19) = 5d, Spotify (day 22) = 8d, iCloud+ (day 3) = 20d, Claude Pro (day 8) = 25d
    const upcoming = getUpcomingRenewals(
      demo.bindings,
      demo.identities,
      new Date(2026, 2, 14),
    );
    expect(upcoming).toHaveLength(5);
    expect(upcoming.map((u) => u.binding.serviceId)).toEqual([
      'openai',
      'grab',
      'spotify',
      'apple-icloud',
      'claude',
    ]);
    expect(upcoming[0].countdown.daysUntil).toBe(1);
    expect(upcoming[0].countdown.urgency).toBe('urgent');
    expect(upcoming[0].ownerIdentity?.id).toBe(DEMO_IDENTITY_IDS.primaryGmail);
    expect(upcoming[0].paymentCard?.id).toBe(DEMO_IDENTITY_IDS.maybankCard);
    expect(upcoming[1].countdown.daysUntil).toBe(5);
    expect(upcoming[1].countdown.urgency).toBe('soon');
  });

  it('computes per-bank spend breakdown + unassigned bucket with zero double-counting', () => {
    const demo = createDemoVault();
    // Add one paid subscription without a paymentCardId to verify unassigned bucket
    const extraUnassigned = {
      id: 'extra-netflix',
      identityId: DEMO_IDENTITY_IDS.primaryGmail,
      serviceId: 'netflix',
      serviceName: 'Netflix',
      authMethod: 'direct' as const,
      subscription: {
        isPaid: true,
        planName: 'Standard',
        price: 45,
        currency: 'MYR' as const,
        cycle: 'monthly' as const,
        renewalDay: 10,
      },
      createdAt: Date.now(),
    };

    const allBindings = [...demo.bindings, extraUnassigned];
    const breakdown = computeBankSpendBreakdown(allBindings, demo.identities);

    // 2 bank cards (Maybank + GXBank) + 1 unassigned row = 3 rows
    expect(breakdown).toHaveLength(3);

    const maybankRow = breakdown.find(
      (r) => r.bankCard?.id === DEMO_IDENTITY_IDS.maybankCard,
    )!;
    const gxRow = breakdown.find(
      (r) => r.bankCard?.id === DEMO_IDENTITY_IDS.gxbankCard,
    )!;
    const unassignedRow = breakdown.find((r) => r.bankCard === null)!;

    expect(maybankRow.bindingCount).toBe(3);
    expect(maybankRow.totals.find((t) => t.currency === 'USD')?.monthlyTotal).toBe(40);
    expect(maybankRow.totals.find((t) => t.currency === 'USD')?.yearlyTotal).toBe(480);
    expect(maybankRow.totals.find((t) => t.currency === 'MYR')?.monthlyTotal).toBe(11.9);

    expect(gxRow.bindingCount).toBe(2);
    expect(gxRow.totals.find((t) => t.currency === 'MYR')?.monthlyTotal).toBe(20.8);

    expect(unassignedRow.bindingCount).toBe(1);
    expect(unassignedRow.totals.find((t) => t.currency === 'MYR')?.monthlyTotal).toBe(45);

    // Verify exact sum across all rows equals global total (ZERO double counting!)
    const summedMyr = Number(
      breakdown
        .reduce(
          (sum, row) =>
            sum + (row.totals.find((t) => t.currency === 'MYR')?.monthlyTotal ?? 0),
          0,
        )
        .toFixed(2),
    );
    const globalMyr = computeSubscriptionTotals(allBindings).find(
      (t) => t.currency === 'MYR',
    )?.monthlyTotal;
    expect(summedMyr).toBe(globalMyr);
    expect(summedMyr).toBe(77.7);
  });
});

describe('IdentiDeck — GPU Tactile Motion Primitives', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('AnimatedNumber renders initial value immediately, interpolates on updates, and cleans up rAF', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const queuedFrames: FrameRequestCallback[] = [];
    let nextId = 1;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      queuedFrames.push(cb);
      return nextId++;
    });

    // Initial mount MUST render exact value immediately with zero animation
    const { container, rerender, unmount } = render(
      createElement(AnimatedNumber, {
        value: 32.7,
        decimals: 2,
        durationMs: 320,
      }),
    );
    expect(container.textContent).toBe('32.70');
    expect(queuedFrames).toHaveLength(0);

    // Trigger Monthly -> Annual value change
    rerender(
      createElement(AnimatedNumber, {
        value: 392.4,
        decimals: 2,
        durationMs: 320,
      }),
    );
    expect(queuedFrames).toHaveLength(1);

    // Mid-flight frame moves smoothly between 32.70 and 392.40
    act(() => {
      queuedFrames.shift()!(1000);
    });
    act(() => {
      queuedFrames.shift()!(1160);
    });
    const midVal = Number(container.textContent);
    expect(midVal).toBeGreaterThan(32.7);
    expect(midVal).toBeLessThan(392.4);

    // Final frame settles cleanly on exact target value
    act(() => {
      queuedFrames.shift()!(1400);
    });
    expect(container.textContent).toBe('392.40');

    // Start another update and unmount mid-flight -> cancels active rAF cleanly
    rerender(
      createElement(AnimatedNumber, {
        value: 40,
        decimals: 2,
        durationMs: 320,
      }),
    );
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('ScrambleText renders exact initial text, exposes sr-only text during cipher, and cleans up timers', () => {
    vi.useFakeTimers();

    const { container, rerender, unmount } = render(
      createElement(ScrambleText, {
        text: 'roy.dev@gmail.com',
        triggerKey: false,
      }),
    );

    // Initial mount shows exact text immediately with zero active timers
    const srOnly = container.querySelector('.sr-only');
    const visual = container.querySelector('[aria-hidden="true"]');
    expect(srOnly?.textContent).toBe('roy.dev@gmail.com');
    expect(visual?.textContent).toBe('roy.dev@gmail.com');
    expect(vi.getTimerCount()).toBe(0);

    // Toggling privacyMode starts crisp 190ms cipher while keeping sr-only semantic text exact
    rerender(
      createElement(ScrambleText, {
        text: 'ro***ev@gmail.com',
        triggerKey: true,
      }),
    );
    expect(container.querySelector('.sr-only')?.textContent).toBe(
      'ro***ev@gmail.com',
    );
    // Preserved structural characters ('@', '.') remain intact mid-scramble
    const midVisual = container.querySelector('[aria-hidden="true"]')?.textContent ?? '';
    expect(midVisual).toContain('@');
    expect(midVisual).toContain('.');
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    // After 200ms, cipher settles cleanly onto exact target text with 0 pending timers
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      'ro***ev@gmail.com',
    );
    expect(vi.getTimerCount()).toBe(0);

    // Unmounting mid-scramble clears interval cleanly
    rerender(
      createElement(ScrambleText, {
        text: 'roy.dev@gmail.com',
        triggerKey: false,
      }),
    );
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('respects prefers-reduced-motion across AnimatedNumber, ScrambleText, and MagneticButtonWrapper', () => {
    vi.useFakeTimers();
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' || query === '(pointer: fine)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMediaMock);

    const { container, rerender } = render(
      createElement(
        'div',
        null,
        createElement(AnimatedNumber, {
          value: 20,
          decimals: 0,
          format: (n) => `$${n}`,
        }),
        createElement(ScrambleText, {
          text: '+60 12-345 6789',
          triggerKey: false,
        }),
        createElement(
          MagneticButtonWrapper,
          null,
          createElement('button', { type: 'button' }, 'Add'),
        ),
      ),
    );

    rerender(
      createElement(
        'div',
        null,
        createElement(AnimatedNumber, {
          value: 240,
          decimals: 0,
          format: (n) => `$${n}`,
        }),
        createElement(ScrambleText, {
          text: '+60 12-••• ••89',
          triggerKey: true,
        }),
        createElement(
          MagneticButtonWrapper,
          null,
          createElement('button', { type: 'button' }, 'Add'),
        ),
      ),
    );

    // Zero scramble timers queued and immediate snap under reduced motion
    expect(vi.getTimerCount()).toBe(0);
    expect(container.textContent).toContain('$240');
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      '+60 12-••• ••89',
    );

    // MagneticButtonWrapper remains locked at translate3d(0px, 0px, 0) under reduced motion
    const magneticEl = container.querySelector('button')?.parentElement as HTMLDivElement;
    fireEvent.mouseMove(magneticEl, { clientX: 50, clientY: 50 });
    expect(magneticEl.style.transform).toBe('translate3d(0px, 0px, 0)');
  });
});
