import {
  assertNoForbiddenSecretFields,
  sanitizeVaultData,
  type EncryptedVaultEnvelope,
  type PlainVaultExport,
  type VaultData,
} from '../types/vault';

export const E2EE_FORMAT = 'identideck-e2ee-v1' as const;
export const PLAIN_FORMAT = 'identideck-plain-v1' as const;
export const DEFAULT_PBKDF2_ITERATIONS = 250_000;
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12;

export type VaultCryptoErrorCode =
  | 'EMPTY_PASSPHRASE'
  | 'INVALID_ENVELOPE'
  | 'DECRYPTION_FAILED'
  | 'CRYPTO_UNAVAILABLE'
  | 'INVALID_PLAIN_EXPORT';

export class VaultCryptoError extends Error {
  public readonly code: VaultCryptoErrorCode;

  constructor(code: VaultCryptoErrorCode, message: string) {
    super(message);
    this.name = 'VaultCryptoError';
    this.code = code;
  }
}

function getSubtleCrypto(): SubtleCrypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new VaultCryptoError(
      'CRYPTO_UNAVAILABLE',
      'Web Crypto API is unavailable in this environment.',
    );
  }
  return cryptoObj.subtle;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  try {
    const binary = globalThis.atob(base64.trim());
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    throw new VaultCryptoError(
      'INVALID_ENVELOPE',
      'Malformed Base64 payload in encrypted vault envelope.',
    );
  }
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(passphrase)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

export function isEncryptedVaultEnvelope(
  value: unknown,
): value is EncryptedVaultEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.format === E2EE_FORMAT &&
    v.kdf === 'PBKDF2-SHA256' &&
    v.cipher === 'AES-256-GCM' &&
    typeof v.iterations === 'number' &&
    v.iterations >= 10_000 &&
    typeof v.salt === 'string' &&
    typeof v.iv === 'string' &&
    typeof v.ciphertext === 'string'
  );
}

export function isPlainVaultExport(value: unknown): value is PlainVaultExport {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.format === PLAIN_FORMAT &&
    typeof v.vault === 'object' &&
    v.vault !== null
  );
}

export async function encryptVault(
  vault: VaultData,
  passphrase: string,
  options?: { iterations?: number },
): Promise<EncryptedVaultEnvelope> {
  const trimmedPass = passphrase.trim();
  if (!trimmedPass) {
    throw new VaultCryptoError(
      'EMPTY_PASSPHRASE',
      'Sync passphrase is required for AES-256-GCM encryption.',
    );
  }

  // Enforce Zero-Password Policy strictly before encrypting
  assertNoForbiddenSecretFields(vault);
  const cleanVault = sanitizeVaultData(vault);

  const subtle = getSubtleCrypto();
  const iterations = options?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const salt = new Uint8Array(SALT_BYTE_LENGTH);
  const iv = new Uint8Array(IV_BYTE_LENGTH);
  globalThis.crypto.getRandomValues(salt);
  globalThis.crypto.getRandomValues(iv);

  const key = await deriveAesKey(trimmedPass, salt, iterations, ['encrypt']);
  const plaintext = new TextEncoder().encode(JSON.stringify(cleanVault));

  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    format: E2EE_FORMAT,
    kdf: 'PBKDF2-SHA256',
    iterations,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    updatedAt: cleanVault.updatedAt,
  };
}

export async function decryptVault(
  envelope: EncryptedVaultEnvelope,
  passphrase: string,
): Promise<VaultData> {
  const trimmedPass = passphrase.trim();
  if (!trimmedPass) {
    throw new VaultCryptoError(
      'EMPTY_PASSPHRASE',
      'Passphrase is required to decrypt this vault.',
    );
  }

  if (!isEncryptedVaultEnvelope(envelope)) {
    throw new VaultCryptoError(
      'INVALID_ENVELOPE',
      'Input is not a valid IdentiDeck AES-256-GCM encrypted envelope.',
    );
  }

  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  if (salt.byteLength !== SALT_BYTE_LENGTH || iv.byteLength !== IV_BYTE_LENGTH) {
    throw new VaultCryptoError(
      'INVALID_ENVELOPE',
      'Encrypted envelope contains invalid salt or IV byte length.',
    );
  }

  const subtle = getSubtleCrypto();
  const key = await deriveAesKey(trimmedPass, salt, envelope.iterations, [
    'decrypt',
  ]);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
  } catch {
    throw new VaultCryptoError(
      'DECRYPTION_FAILED',
      'Decryption failed: wrong passphrase or ciphertext has been tampered with.',
    );
  }

  let parsed: unknown;
  try {
    const jsonText = new TextDecoder().decode(decryptedBuffer);
    parsed = JSON.parse(jsonText);
  } catch {
    throw new VaultCryptoError(
      'DECRYPTION_FAILED',
      'Decrypted payload is not valid JSON.',
    );
  }

  assertNoForbiddenSecretFields(parsed);
  return sanitizeVaultData(parsed as VaultData);
}

export function serializePlainExport(vault: VaultData): string {
  assertNoForbiddenSecretFields(vault);
  const payload: PlainVaultExport = {
    format: PLAIN_FORMAT,
    exportedAt: Date.now(),
    vault: sanitizeVaultData(vault),
  };
  return JSON.stringify(payload, null, 2);
}

export function parsePlainVaultJson(rawText: string): VaultData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new VaultCryptoError(
      'INVALID_PLAIN_EXPORT',
      'File is not valid JSON.',
    );
  }

  assertNoForbiddenSecretFields(parsed);

  if (isPlainVaultExport(parsed)) {
    return sanitizeVaultData(parsed.vault);
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as VaultData).identities) &&
    Array.isArray((parsed as VaultData).bindings)
  ) {
    return sanitizeVaultData(parsed as VaultData);
  }

  throw new VaultCryptoError(
    'INVALID_PLAIN_EXPORT',
    'Unrecognized IdentiDeck backup format.',
  );
}

export function evaluatePassphraseStrength(passphrase: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'weak' | 'fair' | 'good' | 'strong';
} {
  const p = passphrase.trim();
  if (!p) return { score: 0, label: 'weak' };
  let points = 0;
  if (p.length >= 8) points += 1;
  if (p.length >= 12) points += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) points += 1;
  if (/\d/.test(p)) points += 1;
  if (/[^A-Za-z0-9]/.test(p)) points += 1;

  if (points <= 1) return { score: 1, label: 'weak' };
  if (points === 2) return { score: 2, label: 'fair' };
  if (points === 3) return { score: 3, label: 'good' };
  return { score: 4, label: 'strong' };
}
