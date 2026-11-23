import type { IdentityType } from '../types/vault';

/**
 * Smart email masking for Privacy Mode:
 * - "royyang8040@gmail.com" -> "ro***40@gmail.com"
 * - "ab@gmail.com" -> "a***@gmail.com"
 * - "a@x.io" -> "*@x.io"
 * - "alice@corp.my" -> "al***e@corp.my"
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return '';
  const atIdx = trimmed.indexOf('@');
  if (atIdx === -1) {
    return maskAccountName(trimmed);
  }
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);

  if (local.length <= 1) {
    return `*@${domain}`;
  }
  if (local.length === 2) {
    return `${local[0]}***@${domain}`;
  }
  if (local.length <= 4) {
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (local.length === 5) {
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-2)}@${domain}`;
}

/**
 * Smart phone number masking preserving country code & local prefix + last 2 digits:
 * - "+60 12-345 6789" -> "+60 12-••• ••89"
 * - "+86 138 1234 5678" -> "+86 13• •••• ••78"
 * - "0123456789" -> "012•••••89"
 */
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const digitIndices: number[] = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    if (/\d/.test(trimmed[i])) {
      digitIndices.push(i);
    }
  }

  if (digitIndices.length <= 3) {
    return trimmed.replace(/\d/g, '•');
  }

  const hasPlus = trimmed.startsWith('+');
  let keepStart = 3;
  if (hasPlus) {
    const ccMatch = trimmed.match(/^\+(\d{1,3})[\s-]?/);
    const ccLen = ccMatch ? ccMatch[1].length : 2;
    keepStart = Math.min(ccLen + 2, Math.max(2, digitIndices.length - 4));
  } else {
    keepStart = Math.min(3, Math.max(1, digitIndices.length - 4));
  }

  const keepEnd = 2;
  const maskableDigitPositions = new Set<number>();
  for (let idx = keepStart; idx < digitIndices.length - keepEnd; idx += 1) {
    maskableDigitPositions.add(digitIndices[idx]);
  }

  let out = '';
  for (let i = 0; i < trimmed.length; i += 1) {
    out += maskableDigitPositions.has(i) ? '•' : trimmed[i];
  }
  return out;
}

/**
 * Formats a bank card's masked 16-digit display using ONLY its last 4 digits.
 * - Normal mode: "••••  ••••  ••••  4829" (or compact "•••• 4829")
 * - Privacy Mode: "••••  ••••  ••••  ••••" (or compact "•••• ••••")
 */
export function maskBankIdentifier(
  identifier: string,
  last4?: string,
  privacyMode = true,
  compact = false,
): string {
  if (privacyMode) {
    return compact ? '•••• ••••' : '••••  ••••  ••••  ••••';
  }
  const source = last4?.trim() || identifier.trim();
  const digits = source.replace(/\D/g, '').slice(-4);
  if (digits.length === 4) {
    return compact ? `•••• ${digits}` : `••••  ••••  ••••  ${digits}`;
  }
  if (digits.length > 0) {
    const padded = digits.padStart(4, '•');
    return compact ? `•••• ${padded}` : `••••  ••••  ••••  ${padded}`;
  }
  return identifier.trim() || (compact ? '•••• ••••' : '••••  ••••  ••••  ••••');
}

/**
 * Smart masking for app usernames / handles / display names:
 * - "@roy_dev" -> "@ro•••ev"
 * - "Roy" -> "R••"
 */
export function maskAccountName(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) return '';

  const hasAtPrefix = trimmed.startsWith('@');
  const body = hasAtPrefix ? trimmed.slice(1) : trimmed;
  const prefix = hasAtPrefix ? '@' : '';

  const chars = Array.from(body);
  if (chars.length <= 1) {
    return `${prefix}••`;
  }
  if (chars.length <= 3) {
    return `${prefix}${chars[0]}${'•'.repeat(Math.max(2, chars.length - 1))}`;
  }
  if (chars.length <= 5) {
    return `${prefix}${chars.slice(0, 2).join('')}${'•'.repeat(3)}`;
  }
  return `${prefix}${chars.slice(0, 2).join('')}•••${chars.slice(-2).join('')}`;
}

/**
 * Convenience dispatcher returning the raw/formatted value when privacyMode is off,
 * and smart-masked string when privacyMode is on.
 */
export function formatIdentityIdentifier(
  identifier: string,
  type: IdentityType,
  privacyMode: boolean,
  options?: { last4?: string; compact?: boolean },
): string {
  if (type === 'bank') {
    return maskBankIdentifier(
      identifier,
      options?.last4,
      privacyMode,
      options?.compact ?? false,
    );
  }
  if (!privacyMode) return identifier;
  return type === 'phone' ? maskPhone(identifier) : maskEmail(identifier);
}

export function formatAccountName(
  accountName: string | undefined,
  privacyMode: boolean,
): string {
  if (!accountName) return '';
  return privacyMode ? maskAccountName(accountName) : accountName;
}
