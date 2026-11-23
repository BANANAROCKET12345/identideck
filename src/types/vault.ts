export type IdentityType = 'email' | 'phone' | 'bank';

export type CardNetwork =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'unionpay'
  | 'mydebit'
  | 'ewallet';

export type BankCardKind = 'debit' | 'credit' | 'prepaid';

export type AuthMethod =
  | 'direct'
  | 'google'
  | 'apple'
  | 'github'
  | 'wechat'
  | 'phone_otp';

export type CurrencyCode = 'MYR' | 'USD' | 'CNY' | 'SGD';

export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';

export type CardTheme = 'titanium' | 'navy' | 'emerald' | 'silver' | 'amber';

export type ServiceCategory =
  | 'malaysia'
  | 'ai_dev'
  | 'productivity'
  | 'social'
  | 'shopping'
  | 'media_gaming'
  | 'finance'
  | 'email_identity';

export type ThemeMode = 'light' | 'dark';
export type Language = 'zh' | 'en';
export type ActiveView = 'wallet' | 'graph';
export type SyncProvider = 'github' | 'gitee';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'conflict';

export interface CardThemeSpec {
  id: CardTheme;
  nameZh: string;
  nameEn: string;
  swatchFrom: string;
  swatchTo: string;
  accent: string;
  isLightSurface: boolean;
}

export const CARD_THEMES: Record<CardTheme, CardThemeSpec> = {
  titanium: {
    id: 'titanium',
    nameZh: '钛金黑',
    nameEn: 'Titanium Black',
    swatchFrom: '#242B38',
    swatchTo: '#0F141E',
    accent: '#38BDF8',
    isLightSurface: false,
  },
  navy: {
    id: 'navy',
    nameZh: '深海蓝',
    nameEn: 'Deep Navy',
    swatchFrom: '#1E3A5F',
    swatchTo: '#0D1B2F',
    accent: '#60A5FA',
    isLightSurface: false,
  },
  emerald: {
    id: 'emerald',
    nameZh: '翡翠绿',
    nameEn: 'Emerald Slate',
    swatchFrom: '#0F4C3A',
    swatchTo: '#06261E',
    accent: '#34D399',
    isLightSurface: false,
  },
  silver: {
    id: 'silver',
    nameZh: '极简银',
    nameEn: 'Brushed Silver',
    swatchFrom: '#F1F5F9',
    swatchTo: '#CBD5E1',
    accent: '#1E3A5F',
    isLightSurface: true,
  },
  amber: {
    id: 'amber',
    nameZh: '琥珀金',
    nameEn: 'Champagne Gold',
    swatchFrom: '#543D1C',
    swatchTo: '#241809',
    accent: '#F59E0B',
    isLightSurface: false,
  },
};

export interface ServiceCatalogItem {
  id: string;
  name: string;
  nameZh: string;
  category: ServiceCategory;
  brandColor: string;
  accentColor?: string;
  textColor?: '#FFFFFF' | '#0F172A';
  monogram: string;
  glyph?: string;
  domain?: string;
  aliases: string[];
}

export interface IdentityCard {
  id: string;
  type: IdentityType;
  label: string;
  identifier: string;
  provider: string;
  cardTheme: CardTheme;
  /** When true (or omitted), Bank & Carrier SIM cards render 1:1 authentic physical card artwork */
  useAuthenticSkin?: boolean;
  simCarrier?: string;
  simCountryCode?: string;
  bankId?: string;
  bankName?: string;
  cardLast4?: string;
  cardNetwork?: CardNetwork;
  cardKind?: BankCardKind;
  cardExpiry?: string;
  order: number;
  createdAt: number;
  updatedAt?: number;
}

export interface SubscriptionMeta {
  isPaid: boolean;
  planName?: string;
  price?: number;
  currency?: CurrencyCode;
  cycle?: BillingCycle;
  renewalDay?: number;
  /** Optional Bank/Payment IdentityCard ID charged for this subscription */
  paymentCardId?: string;
}

export interface AppBinding {
  id: string;
  identityId: string;
  serviceId: string;
  serviceName: string;
  serviceDomain?: string;
  accountName?: string;
  authMethod: AuthMethod;
  oauthProviderId?: string;
  subscription?: SubscriptionMeta;
  migrated?: boolean;
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface IdentityBindingLink {
  binding: AppBinding;
  linkKind: 'direct' | 'billing';
}

export interface VaultData {
  version: number;
  updatedAt: number;
  isDemoData: boolean;
  identities: IdentityCard[];
  bindings: AppBinding[];
}

export interface EncryptedVaultEnvelope {
  format: 'identideck-e2ee-v1';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  cipher: 'AES-256-GCM';
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: number;
}

export interface PlainVaultExport {
  format: 'identideck-plain-v1';
  exportedAt: number;
  vault: VaultData;
}

export interface SyncConfig {
  provider: SyncProvider;
  token: string;
  gistId: string;
  lastSyncedAt?: number;
  lastRemoteUpdatedAt?: number;
}

export interface DuplicateBindingMatch {
  binding: AppBinding;
  identity: IdentityCard;
  isPaid: boolean;
}

export interface MigrationStats {
  total: number;
  migrated: number;
  remaining: number;
  percentage: number;
  paidRemaining: number;
  oauthDependentCount: number;
}

export interface CurrencySubtotal {
  currency: CurrencyCode;
  monthlyTotal: number;
  yearlyTotal: number;
  lifetimeTotal: number;
  activePaidCount: number;
}

export interface UndoEntry {
  id: string;
  kind: 'identity' | 'binding';
  label: string;
  deletedIdentity?: IdentityCard;
  deletedBindings: AppBinding[];
  /** Binding IDs whose subscription.paymentCardId pointed to a deleted bank card */
  clearedPaymentCardBindingIds?: string[];
  createdAt: number;
  expiresAt: number;
}

export type NewIdentityInput = Omit<
  IdentityCard,
  'id' | 'order' | 'createdAt' | 'updatedAt'
>;
export type UpdateIdentityInput = Partial<Omit<IdentityCard, 'id' | 'createdAt'>>;

export type NewBindingInput = Omit<AppBinding, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBindingInput = Partial<Omit<AppBinding, 'id' | 'createdAt'>>;

export const VAULT_SCHEMA_VERSION = 1;

const VALID_CARD_NETWORKS = new Set<CardNetwork>([
  'visa',
  'mastercard',
  'amex',
  'unionpay',
  'mydebit',
  'ewallet',
]);

const VALID_BANK_CARD_KINDS = new Set<BankCardKind>([
  'debit',
  'credit',
  'prepaid',
]);

/**
 * Strictly forbidden credential and sensitive card-secret keys enforced at runtime.
 * IdentiDeck NEVER stores passwords, passcodes, PINs, CVVs, full card numbers (PAN), or private keys.
 */
export const FORBIDDEN_SECRET_KEYS = new Set<string>([
  'password',
  'passwd',
  'pwd',
  'passcode',
  'secret',
  'secretkey',
  'secret_key',
  'pin',
  'pincode',
  'pin_code',
  'privatekey',
  'private_key',
  'cvv',
  'cvc',
  'cvv2',
  'cvc2',
  'cardnumber',
  'card_number',
  'fullcardnumber',
  'full_card_number',
  'pan',
  'securitycode',
  'security_code',
  'seedphrase',
  'seed_phrase',
  'mnemonic',
  'recoverykey',
  'recovery_key',
  'masterpassword',
  'master_password',
]);

/** Alias exported for ergonomics & plan compatibility */
export const FORBIDDEN_SECRET_FIELDS = FORBIDDEN_SECRET_KEYS;

export class ZeroPasswordPolicyError extends Error {
  public readonly offendingKeys: string[];

  constructor(offendingKeys: string[]) {
    super(
      `IdentiDeck Zero-Secret Policy violation: forbidden secret field(s) detected (${offendingKeys.join(', ')}). Passwords, PINs, CVVs, and full card numbers are never allowed in vault data.`,
    );
    this.name = 'ZeroPasswordPolicyError';
    this.offendingKeys = offendingKeys;
  }
}

export function findForbiddenSecretFields(value: unknown, path = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, idx) =>
      findForbiddenSecretFields(item, `${path}[${idx}]`),
    );
  }
  const found: string[] = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.trim().toLowerCase();
    const currentPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_SECRET_KEYS.has(normalized)) {
      found.push(currentPath);
    } else if (nested && typeof nested === 'object') {
      found.push(...findForbiddenSecretFields(nested, currentPath));
    }
  }
  return found;
}

export function assertNoForbiddenSecretFields(value: unknown): void {
  const offending = findForbiddenSecretFields(value);
  if (offending.length > 0) {
    throw new ZeroPasswordPolicyError(offending);
  }
}

export function stripForbiddenSecretFields<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripForbiddenSecretFields(item)) as unknown as T;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_SECRET_KEYS.has(key.trim().toLowerCase())) {
      continue;
    }
    cleaned[key] = stripForbiddenSecretFields(nested);
  }
  return cleaned as T;
}

export function sanitizeLast4(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return undefined;
  return digits.slice(-4);
}

export function sanitizeVaultData(vault: VaultData): VaultData {
  const cleanIdentities: IdentityCard[] = (vault.identities ?? []).map(
    (card, index) => {
      const safe = stripForbiddenSecretFields(card);
      const resolvedType: IdentityType =
        safe.type === 'phone'
          ? 'phone'
          : safe.type === 'bank'
            ? 'bank'
            : 'email';
      const cleanLast4 = sanitizeLast4(safe.cardLast4);
      const cleanNetwork =
        safe.cardNetwork && VALID_CARD_NETWORKS.has(safe.cardNetwork)
          ? safe.cardNetwork
          : undefined;
      const cleanKind =
        safe.cardKind && VALID_BANK_CARD_KINDS.has(safe.cardKind)
          ? safe.cardKind
          : undefined;

      return {
        id: String(safe.id),
        type: resolvedType,
        label: String(safe.label ?? '').trim(),
        identifier: String(safe.identifier ?? '').trim(),
        provider: String(safe.provider ?? 'custom').trim(),
        cardTheme: (safe.cardTheme in CARD_THEMES
          ? safe.cardTheme
          : 'titanium') as CardTheme,
        ...(typeof safe.useAuthenticSkin === 'boolean'
          ? { useAuthenticSkin: safe.useAuthenticSkin }
          : {}),
        ...(safe.simCarrier ? { simCarrier: String(safe.simCarrier).trim() } : {}),
        ...(safe.simCountryCode
          ? { simCountryCode: String(safe.simCountryCode).trim() }
          : {}),
        ...(safe.bankId ? { bankId: String(safe.bankId).trim() } : {}),
        ...(safe.bankName ? { bankName: String(safe.bankName).trim() } : {}),
        ...(cleanLast4 ? { cardLast4: cleanLast4 } : {}),
        ...(cleanNetwork ? { cardNetwork: cleanNetwork } : {}),
        ...(cleanKind ? { cardKind: cleanKind } : {}),
        ...(safe.cardExpiry ? { cardExpiry: String(safe.cardExpiry).trim() } : {}),
        order: typeof safe.order === 'number' ? safe.order : index,
        createdAt: typeof safe.createdAt === 'number' ? safe.createdAt : Date.now(),
        ...(typeof safe.updatedAt === 'number' ? { updatedAt: safe.updatedAt } : {}),
      };
    },
  );

  const validIdentityIds = new Set(cleanIdentities.map((c) => c.id));

  const cleanBindings: AppBinding[] = (vault.bindings ?? [])
    .filter((b) => b && validIdentityIds.has(String(b.identityId)))
    .map((binding) => {
      const safe = stripForbiddenSecretFields(binding);
      const sub = safe.subscription
        ? {
            isPaid: Boolean(safe.subscription.isPaid),
            ...(safe.subscription.planName
              ? { planName: String(safe.subscription.planName).trim() }
              : {}),
            ...(typeof safe.subscription.price === 'number' &&
            Number.isFinite(safe.subscription.price)
              ? { price: Math.max(0, safe.subscription.price) }
              : {}),
            ...(safe.subscription.currency
              ? { currency: safe.subscription.currency }
              : {}),
            ...(safe.subscription.cycle ? { cycle: safe.subscription.cycle } : {}),
            ...(typeof safe.subscription.renewalDay === 'number' &&
            safe.subscription.renewalDay >= 1 &&
            safe.subscription.renewalDay <= 31
              ? { renewalDay: Math.round(safe.subscription.renewalDay) }
              : {}),
            ...(safe.subscription.paymentCardId &&
            validIdentityIds.has(String(safe.subscription.paymentCardId))
              ? { paymentCardId: String(safe.subscription.paymentCardId) }
              : {}),
          }
        : undefined;

      return {
        id: String(safe.id),
        identityId: String(safe.identityId),
        serviceId: String(safe.serviceId),
        serviceName: String(safe.serviceName ?? '').trim(),
        ...(safe.serviceDomain
          ? { serviceDomain: String(safe.serviceDomain).trim() }
          : {}),
        ...(safe.accountName
          ? { accountName: String(safe.accountName).trim() }
          : {}),
        authMethod: safe.authMethod ?? 'direct',
        ...(safe.oauthProviderId &&
        validIdentityIds.has(String(safe.oauthProviderId))
          ? { oauthProviderId: String(safe.oauthProviderId) }
          : {}),
        ...(sub ? { subscription: sub } : {}),
        ...(typeof safe.migrated === 'boolean' ? { migrated: safe.migrated } : {}),
        ...(safe.note ? { note: String(safe.note).trim() } : {}),
        createdAt: typeof safe.createdAt === 'number' ? safe.createdAt : Date.now(),
        ...(typeof safe.updatedAt === 'number' ? { updatedAt: safe.updatedAt } : {}),
      };
    });

  return {
    version: VAULT_SCHEMA_VERSION,
    updatedAt: typeof vault.updatedAt === 'number' ? vault.updatedAt : Date.now(),
    isDemoData: Boolean(vault.isDemoData),
    identities: cleanIdentities.sort((a, b) => a.order - b.order),
    bindings: cleanBindings,
  };
}
