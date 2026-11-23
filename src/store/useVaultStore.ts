import { create } from 'zustand';
import {
  decryptVault,
  encryptVault,
  isEncryptedVaultEnvelope,
  parsePlainVaultJson,
  serializePlainExport,
  VaultCryptoError,
} from '../crypto/vaultCrypto';
import { createDemoVault } from '../data/demoSeed';
import {
  loadSyncConfigFromStorage,
  loadVaultFromStorage,
  savePrePullSnapshot,
  saveSyncConfigToStorage,
  saveVaultToStorage,
} from '../db/storage';
import {
  GistSyncError,
  pullEncryptedVault,
  pushEncryptedVault,
  twoWaySyncVault,
  type PullSyncResult,
  type PushSyncResult,
  type TwoWaySyncResult,
} from '../sync/gistSync';
import {
  assertNoForbiddenSecretFields,
  sanitizeLast4,
  sanitizeVaultData,
  VAULT_SCHEMA_VERSION,
  type ActiveView,
  type AppBinding,
  type CurrencyCode,
  type CurrencySubtotal,
  type DuplicateBindingMatch,
  type IdentityBindingLink,
  type IdentityCard,
  type Language,
  type MigrationStats,
  type NewBindingInput,
  type NewIdentityInput,
  type SyncConfig,
  type SyncStatus,
  type ThemeMode,
  type UndoEntry,
  type UpdateBindingInput,
  type UpdateIdentityInput,
  type VaultData,
} from '../types/vault';
import { formatAccountName, formatIdentityIdentifier } from '../utils/mask';

export const UNDO_TTL_MS = 6000;

const PREF_KEYS = {
  theme: 'identideck_theme',
  language: 'identideck_language',
  privacyMode: 'identideck_privacy_mode',
} as const;

const CURRENCY_ORDER: CurrencyCode[] = ['MYR', 'USD', 'CNY', 'SGD'];

const undoTimers = new Map<string, ReturnType<typeof setTimeout>>();

function generateId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function readPref(key: string): string | null {
  try {
    return typeof globalThis.localStorage !== 'undefined'
      ? globalThis.localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function writePref(key: string, value: string): void {
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

function getInitialTheme(): ThemeMode {
  const saved = readPref(PREF_KEYS.theme);
  if (saved === 'light' || saved === 'dark') return saved;
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

function getInitialLanguage(): Language {
  const saved = readPref(PREF_KEYS.language);
  return saved === 'en' ? 'en' : 'zh';
}

function getInitialPrivacyMode(): boolean {
  return readPref(PREF_KEYS.privacyMode) === 'true';
}

// ======================== Pure Computation Helpers ========================

/**
 * Resolves all app bindings connected to a given identity card.
 * - Email / Phone cards: returns direct login/registration bindings (`linkKind: 'direct'`).
 * - Bank / Payment cards: returns BOTH direct bindings (`b.identityId === identity.id`)
 *   AND auto-debit subscription billing links (`b.subscription?.paymentCardId === identity.id`),
 *   deduplicated by `binding.id`.
 */
export function getBindingsForIdentity(
  bindings: AppBinding[],
  identity: IdentityCard,
): IdentityBindingLink[] {
  const links: IdentityBindingLink[] = [];
  const seen = new Set<string>();

  for (const binding of bindings) {
    if (binding.identityId === identity.id && !seen.has(binding.id)) {
      seen.add(binding.id);
      links.push({ binding, linkKind: 'direct' });
    }
  }

  if (identity.type === 'bank') {
    for (const binding of bindings) {
      if (
        binding.subscription?.paymentCardId === identity.id &&
        !seen.has(binding.id)
      ) {
        seen.add(binding.id);
        links.push({ binding, linkKind: 'billing' });
      }
    }
  }

  return links;
}

export function findDuplicateBindingMatches(
  identities: IdentityCard[],
  bindings: AppBinding[],
  serviceId: string,
  excludeIdentityId?: string,
): DuplicateBindingMatch[] {
  const targetService = serviceId.trim().toLowerCase();
  if (!targetService) return [];

  const identityMap = new Map(identities.map((idCard) => [idCard.id, idCard]));
  const matches: DuplicateBindingMatch[] = [];

  for (const binding of bindings) {
    if (binding.serviceId.trim().toLowerCase() !== targetService) continue;
    if (excludeIdentityId && binding.identityId === excludeIdentityId) continue;
    const identity = identityMap.get(binding.identityId);
    if (!identity) continue;
    matches.push({
      binding,
      identity,
      isPaid: Boolean(binding.subscription?.isPaid),
    });
  }

  // Sort paid subscriptions first so anti-mistake warnings surface highest risk immediately
  return matches.sort((a, b) => Number(b.isPaid) - Number(a.isPaid));
}

function collectScopedBindings(
  bindings: AppBinding[],
  identityId?: string,
): AppBinding[] {
  const deduped = new Map<string, AppBinding>();
  for (const b of bindings) {
    if (
      !identityId ||
      b.identityId === identityId ||
      b.subscription?.paymentCardId === identityId
    ) {
      if (!deduped.has(b.id)) {
        deduped.set(b.id, b);
      }
    }
  }
  return Array.from(deduped.values());
}

export function computeMigrationStats(
  bindings: AppBinding[],
  identityId: string,
): MigrationStats {
  const scoped = collectScopedBindings(bindings, identityId);
  const total = scoped.length;
  const migrated = scoped.filter((b) => Boolean(b.migrated)).length;
  const remaining = total - migrated;
  const percentage = total === 0 ? 100 : Math.round((migrated / total) * 100);
  const paidRemaining = scoped.filter(
    (b) => !b.migrated && Boolean(b.subscription?.isPaid),
  ).length;
  const oauthDependentCount = scoped.filter(
    (b) => b.authMethod !== 'direct' && b.authMethod !== 'phone_otp',
  ).length;

  return {
    total,
    migrated,
    remaining,
    percentage,
    paidRemaining,
    oauthDependentCount,
  };
}

/**
 * Computes multi-currency subscription subtotals.
 * - When `identityId` is omitted: sums all paid bindings once (deduplicated by `binding.id`, ZERO double counting).
 * - When `identityId` is provided: sums all paid bindings linked via `identityId` OR `subscription.paymentCardId`
 *   (so Bank Cards automatically report their exact monthly auto-debit totals!).
 */
export function computeSubscriptionTotals(
  bindings: AppBinding[],
  identityId?: string,
  _identities?: IdentityCard[],
): CurrencySubtotal[] {
  const scoped = collectScopedBindings(bindings, identityId);
  const bucket = new Map<CurrencyCode, CurrencySubtotal>();

  for (const binding of scoped) {
    const sub = binding.subscription;
    if (!sub?.isPaid) continue;
    const currency: CurrencyCode = sub.currency ?? 'MYR';
    const price =
      typeof sub.price === 'number' && Number.isFinite(sub.price)
        ? sub.price
        : 0;
    const cycle = sub.cycle ?? 'monthly';

    const current = bucket.get(currency) ?? {
      currency,
      monthlyTotal: 0,
      yearlyTotal: 0,
      lifetimeTotal: 0,
      activePaidCount: 0,
    };

    current.activePaidCount += 1;
    if (cycle === 'monthly') {
      current.monthlyTotal = Number((current.monthlyTotal + price).toFixed(2));
      current.yearlyTotal = Number((current.yearlyTotal + price * 12).toFixed(2));
    } else if (cycle === 'yearly') {
      current.monthlyTotal = Number(
        (current.monthlyTotal + price / 12).toFixed(2),
      );
      current.yearlyTotal = Number((current.yearlyTotal + price).toFixed(2));
    } else if (cycle === 'lifetime') {
      current.lifetimeTotal = Number((current.lifetimeTotal + price).toFixed(2));
    }
    bucket.set(currency, current);
  }

  return CURRENCY_ORDER.filter((c) => bucket.has(c)).map((c) => bucket.get(c)!);
}

export function buildMigrationMarkdown(
  identity: IdentityCard,
  bindings: AppBinding[],
  options: {
    language: Language;
    privacyMode: boolean;
    allIdentities?: IdentityCard[];
  },
): string {
  const linked = getBindingsForIdentity(bindings, identity);
  const stats = computeMigrationStats(bindings, identity.id);
  const maskedId = formatIdentityIdentifier(
    identity.identifier,
    identity.type,
    options.privacyMode,
    { last4: identity.cardLast4, compact: true },
  );
  const isZh = options.language === 'zh';
  const isBank = identity.type === 'bank';
  const identityMap = new Map(
    (options.allIdentities ?? []).map((item) => [item.id, item]),
  );

  const header = isBank
    ? isZh
      ? `# 换卡 / 挂失自动扣款解绑清单 · ${identity.label} (${maskedId})\n进度：${stats.migrated} / ${stats.total} 已更新扣款方式 (${stats.percentage}%)\n`
      : `# Card Replacement Auto-Debit Checklist · ${identity.label} (${maskedId})\nProgress: ${stats.migrated} / ${stats.total} updated (${stats.percentage}%)\n`
    : isZh
      ? `# 身份迁移清单 · ${identity.label} (${maskedId})\n进度：${stats.migrated} / ${stats.total} 已换绑 (${stats.percentage}%)\n`
      : `# Account Migration Checklist · ${identity.label} (${maskedId})\nProgress: ${stats.migrated} / ${stats.total} migrated (${stats.percentage}%)\n`;

  const lines = linked.map(({ binding: b, linkKind }) => {
    const box = b.migrated ? '[x]' : '[ ]';
    const tags: string[] = [];
    if (linkKind === 'billing') {
      const owner = identityMap.get(b.identityId);
      if (owner) {
        const ownerMasked = formatIdentityIdentifier(
          owner.identifier,
          owner.type,
          options.privacyMode,
          { last4: owner.cardLast4, compact: true },
        );
        tags.push(
          isZh
            ? `注册账号: ${owner.label} (${ownerMasked})`
            : `Account: ${owner.label} (${ownerMasked})`,
        );
      }
    }
    if (b.accountName) {
      tags.push(formatAccountName(b.accountName, options.privacyMode));
    }
    if (!isBank && b.authMethod !== 'direct') {
      tags.push(`Auth: ${b.authMethod}`);
    }
    if (b.subscription?.isPaid) {
      const subText = [
        b.subscription.planName || (isZh ? '付费会员' : 'Paid'),
        b.subscription.price
          ? `${b.subscription.currency ?? 'MYR'} ${b.subscription.price}`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
      tags.push(isZh ? `扣款: ${subText}` : `Billing: ${subText}`);
    }
    const suffix = tags.length > 0 ? ` — ${tags.join(' · ')}` : '';
    return `- ${box} **${b.serviceName}**${suffix}`;
  });

  return `${header}\n${lines.join('\n')}\n`;
}

// ======================== Zustand Store Interface ========================

export interface ImportPayloadResult {
  importedIdentities: number;
  importedBindings: number;
  wasEncrypted: boolean;
}

export interface VaultStoreState {
  hydrated: boolean;
  identities: IdentityCard[];
  bindings: AppBinding[];
  isDemoData: boolean;
  updatedAt: number;
  selectedIdentityId: string | null;
  activeView: ActiveView;
  privacyMode: boolean;
  theme: ThemeMode;
  language: Language;
  undoStack: UndoEntry[];
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
  syncMessage: string | null;

  // Hydration & UI state
  hydrate: () => Promise<void>;
  setSelectedIdentityId: (id: string | null) => void;
  setActiveView: (view: ActiveView) => void;
  togglePrivacyMode: () => void;
  setPrivacyMode: (enabled: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;

  // Identity CRUD & drag reorder
  addIdentity: (input: NewIdentityInput) => IdentityCard;
  updateIdentity: (id: string, patch: UpdateIdentityInput) => void;
  deleteIdentity: (id: string) => void;
  reorderIdentities: (orderedIds: string[]) => void;

  // Binding CRUD & Dual-Link Resolver
  addBinding: (input: NewBindingInput) => AppBinding;
  addBindingsBatch: (inputs: NewBindingInput[]) => AppBinding[];
  updateBinding: (id: string, patch: UpdateBindingInput) => void;
  deleteBinding: (id: string) => void;
  getBindingsForIdentity: (identityId: string) => IdentityBindingLink[];

  // Undo-delete stack (6s restore)
  undoLastDelete: () => boolean;
  dismissUndo: (entryId?: string) => void;

  // Anti-mistake duplicate guard
  findDuplicateBindings: (
    serviceId: string,
    excludeIdentityId?: string,
  ) => DuplicateBindingMatch[];

  // Swap-SIM / Breach / Card Replacement migration checklist
  toggleMigrated: (bindingId: string) => void;
  resetMigrationForIdentity: (identityId: string) => void;
  getMigrationStats: (identityId: string) => MigrationStats;
  exportMigrationMarkdown: (identityId: string) => string;

  // Multi-currency subscription totals
  getSubscriptionTotals: (identityId?: string) => CurrencySubtotal[];

  // Demo data & bulk reset
  clearDemoData: () => void;
  resetDemoData: () => void;
  clearAllData: () => void;

  // JSON plain & encrypted import/export
  getVaultSnapshot: () => VaultData;
  exportPlainJson: () => string;
  exportEncryptedJson: (passphrase: string) => Promise<string>;
  importJsonPayload: (
    rawJson: string,
    passphrase?: string,
  ) => Promise<ImportPayloadResult>;

  // Cloud Gist E2EE Sync
  updateSyncConfig: (patch: Partial<SyncConfig>) => void;
  clearSyncFeedback: () => void;
  pushSync: (
    passphrase: string,
    options?: { force?: boolean },
  ) => Promise<PushSyncResult>;
  pullSync: (passphrase: string) => Promise<PullSyncResult>;
  runTwoWaySync: (
    passphrase: string,
    resolution?: 'use_local' | 'use_remote',
  ) => Promise<TwoWaySyncResult>;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  provider: 'github',
  token: '',
  gistId: '',
};

export const useVaultStore = create<VaultStoreState>((set, get) => {
  const persistCurrentVault = () => {
    const state = get();
    const snapshot: VaultData = {
      version: VAULT_SCHEMA_VERSION,
      updatedAt: state.updatedAt,
      isDemoData: state.isDemoData,
      identities: state.identities,
      bindings: state.bindings,
    };
    void saveVaultToStorage(snapshot);
  };

  const scheduleUndoExpiry = (entryId: string) => {
    const existing = undoTimers.get(entryId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      undoTimers.delete(entryId);
      set((state) => ({
        undoStack: state.undoStack.filter((item) => item.id !== entryId),
      }));
    }, UNDO_TTL_MS);
    undoTimers.set(entryId, timer);
  };

  const clearUndoTimer = (entryId: string) => {
    const timer = undoTimers.get(entryId);
    if (timer) {
      clearTimeout(timer);
      undoTimers.delete(entryId);
    }
  };

  const initialTheme = getInitialTheme();
  applyThemeToDocument(initialTheme);

  return {
    hydrated: false,
    identities: [],
    bindings: [],
    isDemoData: false,
    updatedAt: Date.now(),
    selectedIdentityId: null,
    activeView: 'wallet',
    privacyMode: getInitialPrivacyMode(),
    theme: initialTheme,
    language: getInitialLanguage(),
    undoStack: [],
    syncConfig: DEFAULT_SYNC_CONFIG,
    syncStatus: 'idle',
    syncMessage: null,

    hydrate: async () => {
      const [storedVault, storedSync] = await Promise.all([
        loadVaultFromStorage(),
        loadSyncConfigFromStorage(),
      ]);

      const shouldUpgradeLegacyDemo =
        Boolean(storedVault?.isDemoData) &&
        !storedVault!.identities.some((card) => card.type === 'bank');
      const vault =
        !storedVault || shouldUpgradeLegacyDemo
          ? createDemoVault()
          : storedVault;
      if (!storedVault || shouldUpgradeLegacyDemo) {
        await saveVaultToStorage(vault);
      }

      const sortedIdentities = [...vault.identities].sort(
        (a, b) => a.order - b.order,
      );

      set({
        hydrated: true,
        identities: sortedIdentities,
        bindings: vault.bindings,
        isDemoData: vault.isDemoData,
        updatedAt: vault.updatedAt,
        selectedIdentityId: sortedIdentities[0]?.id ?? null,
        syncConfig: storedSync ?? DEFAULT_SYNC_CONFIG,
      });
    },

    setSelectedIdentityId: (id) => set({ selectedIdentityId: id }),

    setActiveView: (view) => set({ activeView: view }),

    togglePrivacyMode: () => {
      const next = !get().privacyMode;
      writePref(PREF_KEYS.privacyMode, String(next));
      set({ privacyMode: next });
    },

    setPrivacyMode: (enabled) => {
      writePref(PREF_KEYS.privacyMode, String(enabled));
      set({ privacyMode: enabled });
    },

    setTheme: (theme) => {
      writePref(PREF_KEYS.theme, theme);
      applyThemeToDocument(theme);
      set({ theme });
    },

    toggleTheme: () => {
      const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
      writePref(PREF_KEYS.theme, next);
      applyThemeToDocument(next);
      set({ theme: next });
    },

    setLanguage: (lang) => {
      writePref(PREF_KEYS.language, lang);
      set({ language: lang });
    },

    toggleLanguage: () => {
      const next: Language = get().language === 'zh' ? 'en' : 'zh';
      writePref(PREF_KEYS.language, next);
      set({ language: next });
    },

    addIdentity: (input) => {
      assertNoForbiddenSecretFields(input);
      const now = Date.now();
      const current = get().identities;
      const maxOrder = current.reduce(
        (acc, item) => Math.max(acc, item.order),
        -1,
      );

      const cleanLast4 = sanitizeLast4(input.cardLast4);
      const trimmedIdentifier = input.identifier.trim();
      const resolvedIdentifier =
        input.type === 'bank' && !trimmedIdentifier && cleanLast4
          ? `•••• ${cleanLast4}`
          : trimmedIdentifier;

      const newCard: IdentityCard = {
        ...input,
        id: generateId(input.type === 'bank' ? 'bank' : 'id'),
        label: input.label.trim(),
        identifier: resolvedIdentifier,
        provider: input.provider.trim() || input.bankId?.trim() || 'custom',
        ...(cleanLast4 ? { cardLast4: cleanLast4 } : {}),
        ...(input.bankName ? { bankName: input.bankName.trim() } : {}),
        ...(input.cardExpiry ? { cardExpiry: input.cardExpiry.trim() } : {}),
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        identities: [...state.identities, newCard].sort(
          (a, b) => a.order - b.order,
        ),
        selectedIdentityId: newCard.id,
        updatedAt: now,
      }));
      persistCurrentVault();
      return newCard;
    },

    updateIdentity: (id, patch) => {
      assertNoForbiddenSecretFields(patch);
      const now = Date.now();
      const cleanLast4 =
        patch.cardLast4 !== undefined
          ? sanitizeLast4(patch.cardLast4)
          : undefined;

      set((state) => ({
        identities: state.identities
          .map((card) =>
            card.id === id
              ? {
                  ...card,
                  ...patch,
                  label:
                    patch.label !== undefined ? patch.label.trim() : card.label,
                  identifier:
                    patch.identifier !== undefined
                      ? patch.identifier.trim()
                      : card.identifier,
                  ...(patch.cardLast4 !== undefined
                    ? { cardLast4: cleanLast4 }
                    : {}),
                  ...(patch.bankName !== undefined
                    ? { bankName: patch.bankName.trim() }
                    : {}),
                  ...(patch.cardExpiry !== undefined
                    ? { cardExpiry: patch.cardExpiry.trim() }
                    : {}),
                  updatedAt: now,
                }
              : card,
          )
          .sort((a, b) => a.order - b.order),
        updatedAt: now,
      }));
      persistCurrentVault();
    },

    deleteIdentity: (id) => {
      const state = get();
      const target = state.identities.find((c) => c.id === id);
      if (!target) return;

      const removedBindings = state.bindings.filter((b) => b.identityId === id);
      const clearedPaymentCardBindingIds: string[] = [];

      const remainingIdentities = state.identities
        .filter((c) => c.id !== id)
        .map((c, idx) => ({ ...c, order: idx }));

      const remainingBindings = state.bindings
        .filter((b) => b.identityId !== id)
        .map((b) => {
          let updated = b;
          if (b.subscription?.paymentCardId === id) {
            clearedPaymentCardBindingIds.push(b.id);
            const { paymentCardId: _removed, ...restSub } = b.subscription;
            updated = {
              ...updated,
              subscription: restSub,
            };
          }
          if (b.oauthProviderId === id) {
            const { oauthProviderId: _removedOauth, ...restBinding } = updated;
            updated = restBinding;
          }
          return updated;
        });

      const now = Date.now();
      const undoEntry: UndoEntry = {
        id: generateId('undo'),
        kind: 'identity',
        label: target.label || target.identifier,
        deletedIdentity: target,
        deletedBindings: removedBindings,
        ...(clearedPaymentCardBindingIds.length > 0
          ? { clearedPaymentCardBindingIds }
          : {}),
        createdAt: now,
        expiresAt: now + UNDO_TTL_MS,
      };

      set({
        identities: remainingIdentities,
        bindings: remainingBindings,
        selectedIdentityId:
          state.selectedIdentityId === id
            ? (remainingIdentities[0]?.id ?? null)
            : state.selectedIdentityId,
        undoStack: [undoEntry, ...state.undoStack].slice(0, 5),
        updatedAt: now,
      });

      scheduleUndoExpiry(undoEntry.id);
      persistCurrentVault();
    },

    reorderIdentities: (orderedIds) => {
      const now = Date.now();
      set((state) => {
        const map = new Map(state.identities.map((c) => [c.id, c]));
        const reordered: IdentityCard[] = [];

        for (const id of orderedIds) {
          const found = map.get(id);
          if (found) {
            reordered.push(found);
            map.delete(id);
          }
        }
        for (const leftover of map.values()) {
          reordered.push(leftover);
        }

        return {
          identities: reordered.map((card, index) => ({
            ...card,
            order: index,
            updatedAt: now,
          })),
          updatedAt: now,
        };
      });
      persistCurrentVault();
    },

    addBinding: (input) => {
      assertNoForbiddenSecretFields(input);
      const now = Date.now();
      const newBinding: AppBinding = {
        ...input,
        id: generateId('bind'),
        serviceName: input.serviceName.trim(),
        ...(input.accountName ? { accountName: input.accountName.trim() } : {}),
        ...(input.note ? { note: input.note.trim() } : {}),
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        bindings: [newBinding, ...state.bindings],
        updatedAt: now,
      }));
      persistCurrentVault();
      return newBinding;
    },

    addBindingsBatch: (inputs) => {
      if (inputs.length === 0) return [];
      assertNoForbiddenSecretFields(inputs);
      const now = Date.now();
      const created: AppBinding[] = inputs.map((input, idx) => ({
        ...input,
        id: generateId(`bind-${idx}`),
        serviceName: input.serviceName.trim(),
        ...(input.accountName ? { accountName: input.accountName.trim() } : {}),
        ...(input.note ? { note: input.note.trim() } : {}),
        createdAt: now + idx,
        updatedAt: now + idx,
      }));

      set((state) => ({
        bindings: [...created, ...state.bindings],
        updatedAt: now,
      }));
      persistCurrentVault();
      return created;
    },

    updateBinding: (id, patch) => {
      assertNoForbiddenSecretFields(patch);
      const now = Date.now();
      set((state) => ({
        bindings: state.bindings.map((b) =>
          b.id === id
            ? {
                ...b,
                ...patch,
                serviceName:
                  patch.serviceName !== undefined
                    ? patch.serviceName.trim()
                    : b.serviceName,
                updatedAt: now,
              }
            : b,
        ),
        updatedAt: now,
      }));
      persistCurrentVault();
    },

    deleteBinding: (id) => {
      const state = get();
      const target = state.bindings.find((b) => b.id === id);
      if (!target) return;

      const now = Date.now();
      const undoEntry: UndoEntry = {
        id: generateId('undo'),
        kind: 'binding',
        label: target.serviceName,
        deletedBindings: [target],
        createdAt: now,
        expiresAt: now + UNDO_TTL_MS,
      };

      set({
        bindings: state.bindings.filter((b) => b.id !== id),
        undoStack: [undoEntry, ...state.undoStack].slice(0, 5),
        updatedAt: now,
      });

      scheduleUndoExpiry(undoEntry.id);
      persistCurrentVault();
    },

    getBindingsForIdentity: (identityId) => {
      const state = get();
      const identity = state.identities.find((c) => c.id === identityId);
      if (!identity) return [];
      return getBindingsForIdentity(state.bindings, identity);
    },

    undoLastDelete: () => {
      const state = get();
      const now = Date.now();
      const validIndex = state.undoStack.findIndex(
        (entry) => entry.expiresAt > now,
      );
      if (validIndex === -1) {
        set({ undoStack: [] });
        return false;
      }

      const entry = state.undoStack[validIndex];
      clearUndoTimer(entry.id);

      const remainingStack = state.undoStack.filter(
        (_, idx) => idx !== validIndex,
      );
      let nextIdentities = [...state.identities];
      let nextSelected = state.selectedIdentityId;

      if (entry.kind === 'identity' && entry.deletedIdentity) {
        const exists = nextIdentities.some(
          (c) => c.id === entry.deletedIdentity!.id,
        );
        if (!exists) {
          nextIdentities.splice(
            Math.min(entry.deletedIdentity.order, nextIdentities.length),
            0,
            entry.deletedIdentity,
          );
          nextIdentities = nextIdentities.map((card, idx) => ({
            ...card,
            order: idx,
          }));
        }
        nextSelected = entry.deletedIdentity.id;
      }

      const restoredPaymentSet = new Set(
        entry.clearedPaymentCardBindingIds ?? [],
      );
      const restoredCardId = entry.deletedIdentity?.id;

      const existingUpdatedBindings =
        restoredCardId && restoredPaymentSet.size > 0
          ? state.bindings.map((b) =>
              restoredPaymentSet.has(b.id) && b.subscription
                ? {
                    ...b,
                    subscription: {
                      ...b.subscription,
                      paymentCardId: restoredCardId,
                    },
                  }
                : b,
            )
          : state.bindings;

      const existingBindingIds = new Set(
        existingUpdatedBindings.map((b) => b.id),
      );
      const bindingsToRestore = entry.deletedBindings.filter(
        (b) => !existingBindingIds.has(b.id),
      );

      set({
        identities: nextIdentities,
        bindings: [...bindingsToRestore, ...existingUpdatedBindings],
        selectedIdentityId: nextSelected,
        undoStack: remainingStack,
        updatedAt: now,
      });
      persistCurrentVault();
      return true;
    },

    dismissUndo: (entryId) => {
      if (!entryId) {
        for (const entry of get().undoStack) {
          clearUndoTimer(entry.id);
        }
        set({ undoStack: [] });
        return;
      }
      clearUndoTimer(entryId);
      set((state) => ({
        undoStack: state.undoStack.filter((e) => e.id !== entryId),
      }));
    },

    findDuplicateBindings: (serviceId, excludeIdentityId) => {
      const { identities, bindings } = get();
      return findDuplicateBindingMatches(
        identities,
        bindings,
        serviceId,
        excludeIdentityId,
      );
    },

    toggleMigrated: (bindingId) => {
      const now = Date.now();
      set((state) => ({
        bindings: state.bindings.map((b) =>
          b.id === bindingId
            ? { ...b, migrated: !b.migrated, updatedAt: now }
            : b,
        ),
        updatedAt: now,
      }));
      persistCurrentVault();
    },

    resetMigrationForIdentity: (identityId) => {
      const now = Date.now();
      set((state) => ({
        bindings: state.bindings.map((b) =>
          b.identityId === identityId ||
          b.subscription?.paymentCardId === identityId
            ? { ...b, migrated: false, updatedAt: now }
            : b,
        ),
        updatedAt: now,
      }));
      persistCurrentVault();
    },

    getMigrationStats: (identityId) =>
      computeMigrationStats(get().bindings, identityId),

    exportMigrationMarkdown: (identityId) => {
      const state = get();
      const identity = state.identities.find((c) => c.id === identityId);
      if (!identity) return '';
      return buildMigrationMarkdown(identity, state.bindings, {
        language: state.language,
        privacyMode: state.privacyMode,
        allIdentities: state.identities,
      });
    },

    getSubscriptionTotals: (identityId) =>
      computeSubscriptionTotals(get().bindings, identityId, get().identities),

    clearDemoData: () => {
      const now = Date.now();
      set({
        identities: [],
        bindings: [],
        isDemoData: false,
        selectedIdentityId: null,
        undoStack: [],
        updatedAt: now,
      });
      persistCurrentVault();
    },

    resetDemoData: () => {
      const demo = createDemoVault();
      set({
        identities: demo.identities,
        bindings: demo.bindings,
        isDemoData: true,
        selectedIdentityId: demo.identities[0]?.id ?? null,
        undoStack: [],
        updatedAt: demo.updatedAt,
      });
      persistCurrentVault();
    },

    clearAllData: () => {
      const now = Date.now();
      set({
        identities: [],
        bindings: [],
        isDemoData: false,
        selectedIdentityId: null,
        undoStack: [],
        updatedAt: now,
      });
      persistCurrentVault();
    },

    getVaultSnapshot: () => {
      const state = get();
      return sanitizeVaultData({
        version: VAULT_SCHEMA_VERSION,
        updatedAt: state.updatedAt,
        isDemoData: state.isDemoData,
        identities: state.identities,
        bindings: state.bindings,
      });
    },

    exportPlainJson: () => serializePlainExport(get().getVaultSnapshot()),

    exportEncryptedJson: async (passphrase) => {
      const envelope = await encryptVault(get().getVaultSnapshot(), passphrase);
      return JSON.stringify(envelope, null, 2);
    },

    importJsonPayload: async (rawJson, passphrase) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        throw new VaultCryptoError(
          'INVALID_PLAIN_EXPORT',
          'Imported file is not valid JSON.',
        );
      }

      let vault: VaultData;
      let wasEncrypted = false;

      if (isEncryptedVaultEnvelope(parsed)) {
        wasEncrypted = true;
        vault = await decryptVault(parsed, passphrase ?? '');
      } else {
        vault = parsePlainVaultJson(rawJson);
      }

      const sortedIdentities = [...vault.identities].sort(
        (a, b) => a.order - b.order,
      );

      set({
        identities: sortedIdentities,
        bindings: vault.bindings,
        isDemoData: false,
        selectedIdentityId: sortedIdentities[0]?.id ?? null,
        undoStack: [],
        updatedAt: Date.now(),
      });
      persistCurrentVault();

      return {
        importedIdentities: sortedIdentities.length,
        importedBindings: vault.bindings.length,
        wasEncrypted,
      };
    },

    updateSyncConfig: (patch) => {
      const next: SyncConfig = { ...get().syncConfig, ...patch };
      set({ syncConfig: next });
      void saveSyncConfigToStorage(next);
    },

    clearSyncFeedback: () => set({ syncStatus: 'idle', syncMessage: null }),

    pushSync: async (passphrase, options) => {
      set({ syncStatus: 'syncing', syncMessage: null });
      try {
        const snapshot = get().getVaultSnapshot();
        const result = await pushEncryptedVault(
          get().syncConfig,
          snapshot,
          passphrase,
          options,
        );
        const nextConfig: SyncConfig = {
          ...get().syncConfig,
          gistId: result.gistId,
          lastSyncedAt: result.syncedAt,
          lastRemoteUpdatedAt: result.updatedAt,
        };
        set({
          syncConfig: nextConfig,
          syncStatus: 'synced',
          syncMessage: null,
        });
        void saveSyncConfigToStorage(nextConfig);
        return result;
      } catch (err) {
        const isConflict =
          err instanceof GistSyncError && err.code === 'CONFLICT';
        set({
          syncStatus: isConflict ? 'conflict' : 'error',
          syncMessage:
            err instanceof Error ? err.message : 'Sync push failed.',
        });
        throw err;
      }
    },

    pullSync: async (passphrase) => {
      set({ syncStatus: 'syncing', syncMessage: null });
      try {
        await savePrePullSnapshot(get().getVaultSnapshot());

        const result = await pullEncryptedVault(get().syncConfig, passphrase);
        const sortedIdentities = [...result.vault.identities].sort(
          (a, b) => a.order - b.order,
        );
        const nextConfig: SyncConfig = {
          ...get().syncConfig,
          gistId: result.gistId,
          lastSyncedAt: result.syncedAt,
          lastRemoteUpdatedAt: result.remoteUpdatedAt,
        };

        set({
          identities: sortedIdentities,
          bindings: result.vault.bindings,
          isDemoData: result.vault.isDemoData,
          updatedAt: result.vault.updatedAt,
          selectedIdentityId: sortedIdentities[0]?.id ?? null,
          syncConfig: nextConfig,
          syncStatus: 'synced',
          syncMessage: null,
        });
        persistCurrentVault();
        void saveSyncConfigToStorage(nextConfig);
        return result;
      } catch (err) {
        set({
          syncStatus: 'error',
          syncMessage:
            err instanceof Error ? err.message : 'Sync pull failed.',
        });
        throw err;
      }
    },

    runTwoWaySync: async (passphrase, resolution) => {
      set({ syncStatus: 'syncing', syncMessage: null });
      try {
        const localSnapshot = get().getVaultSnapshot();
        const result = await twoWaySyncVault(
          get().syncConfig,
          localSnapshot,
          passphrase,
          { resolution },
        );

        if (result.action === 'conflict') {
          set({
            syncStatus: 'conflict',
            syncMessage:
              'Both local and cloud vaults changed since last sync. Choose Push Local or Pull Cloud.',
          });
          return result;
        }

        const nextConfig: SyncConfig = {
          ...get().syncConfig,
          gistId: result.gistId,
          lastSyncedAt: result.syncedAt,
          lastRemoteUpdatedAt: result.remoteUpdatedAt,
        };

        if (result.action === 'pulled' && result.vault) {
          await savePrePullSnapshot(localSnapshot);
          const sortedIdentities = [...result.vault.identities].sort(
            (a, b) => a.order - b.order,
          );
          set({
            identities: sortedIdentities,
            bindings: result.vault.bindings,
            isDemoData: result.vault.isDemoData,
            updatedAt: result.vault.updatedAt,
            selectedIdentityId: sortedIdentities[0]?.id ?? null,
            syncConfig: nextConfig,
            syncStatus: 'synced',
            syncMessage: null,
          });
          persistCurrentVault();
        } else {
          set({
            syncConfig: nextConfig,
            syncStatus: 'synced',
            syncMessage: null,
          });
        }

        void saveSyncConfigToStorage(nextConfig);
        return result;
      } catch (err) {
        set({
          syncStatus: 'error',
          syncMessage:
            err instanceof Error ? err.message : 'Two-way sync failed.',
        });
        throw err;
      }
    },
  };
});
