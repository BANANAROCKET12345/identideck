import { computeSubscriptionTotals } from '../store/useVaultStore';
import type {
  AppBinding,
  CurrencySubtotal,
  IdentityCard,
  Language,
} from '../types/vault';

export type RenewalUrgency = 'safe' | 'soon' | 'urgent';

export interface RenewalCountdownInfo {
  daysUntil: number;
  nextDate: Date;
  cycleProgress: number;
  urgency: RenewalUrgency;
  renewalDay: number;
}

export interface UpcomingRenewalItem {
  binding: AppBinding;
  countdown: RenewalCountdownInfo;
  ownerIdentity?: IdentityCard;
  paymentCard?: IdentityCard;
}

export interface BankSpendRow {
  /** Linked physical bank card, or `null` for paid subscriptions with no bank card assigned */
  bankCard: IdentityCard | null;
  totals: CurrencySubtotal[];
  bindingCount: number;
  bindings: AppBinding[];
}

const MS_PER_DAY = 86_400_000;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function makeClampedDate(year: number, monthIndex: number, day: number): Date {
  // Normalize overflow/underflow months via Date(year, monthIndex, 1) first
  const anchor = new Date(year, monthIndex, 1);
  const actualYear = anchor.getFullYear();
  const actualMonth = anchor.getMonth();
  const maxDay = daysInMonth(actualYear, actualMonth);
  return new Date(actualYear, actualMonth, Math.min(day, maxDay));
}

function diffCalendarDays(fromDate: Date, toDate: Date): number {
  const fromUtc = Date.UTC(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
  );
  const toUtc = Date.UTC(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate(),
  );
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/**
 * Computes exact countdown, next billing date, cycle progress (0..1), and urgency
 * for a monthly renewal day (`1..31`), safely clamping end-of-month days (e.g. 31 -> Feb 28/29).
 */
export function getRenewalCountdown(
  renewalDay: number | undefined,
  now: Date = new Date(),
): RenewalCountdownInfo | null {
  if (
    renewalDay === undefined ||
    renewalDay === null ||
    !Number.isFinite(renewalDay) ||
    renewalDay < 1
  ) {
    return null;
  }

  const clampedDay = Math.min(31, Math.max(1, Math.round(renewalDay)));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const thisMonthRenewal = makeClampedDate(
    today.getFullYear(),
    today.getMonth(),
    clampedDay,
  );

  let prevDate: Date;
  let nextDate: Date;

  if (diffCalendarDays(today, thisMonthRenewal) >= 0) {
    nextDate = thisMonthRenewal;
    prevDate = makeClampedDate(
      today.getFullYear(),
      today.getMonth() - 1,
      clampedDay,
    );
  } else {
    prevDate = thisMonthRenewal;
    nextDate = makeClampedDate(
      today.getFullYear(),
      today.getMonth() + 1,
      clampedDay,
    );
  }

  const daysUntil = Math.max(0, diffCalendarDays(today, nextDate));
  const totalCycleDays = Math.max(1, diffCalendarDays(prevDate, nextDate));
  const elapsedDays = Math.max(0, diffCalendarDays(prevDate, today));
  const cycleProgress =
    daysUntil === 0
      ? 1
      : Math.min(1, Math.max(0, Number((elapsedDays / totalCycleDays).toFixed(4))));

  const urgency: RenewalUrgency =
    daysUntil <= 2 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'safe';

  return {
    daysUntil,
    nextDate,
    cycleProgress,
    urgency,
    renewalDay: clampedDay,
  };
}

/**
 * Formats relative renewal copy in Simplified Chinese or English.
 * Pass `compact = true` for ultra-tight graph/badge micro-chips (`3天后` / `3d`).
 */
export function formatRenewalRelative(
  info: RenewalCountdownInfo,
  lang: Language,
  compact = false,
): string {
  if (lang === 'zh') {
    if (info.daysUntil === 0) return '今天扣款';
    if (info.daysUntil === 1) return '明天扣款';
    return compact ? `${info.daysUntil}天后` : `还有 ${info.daysUntil} 天`;
  }
  if (info.daysUntil === 0) return 'Due today';
  if (info.daysUntil === 1) return 'Due tomorrow';
  return compact ? `${info.daysUntil}d` : `In ${info.daysUntil}d`;
}

/**
 * Returns all active recurring paid bindings that have a valid `renewalDay`,
 * sorted ascending by `daysUntil` (most imminent renewal first).
 */
export function getUpcomingRenewals(
  bindings: AppBinding[],
  identities: IdentityCard[],
  now: Date = new Date(),
): UpcomingRenewalItem[] {
  const identityMap = new Map(identities.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const items: UpcomingRenewalItem[] = [];

  for (const binding of bindings) {
    if (seen.has(binding.id)) continue;
    seen.add(binding.id);

    const sub = binding.subscription;
    if (!sub?.isPaid || sub.cycle === 'lifetime') continue;
    const countdown = getRenewalCountdown(sub.renewalDay, now);
    if (!countdown) continue;

    items.push({
      binding,
      countdown,
      ownerIdentity: identityMap.get(binding.identityId),
      paymentCard: sub.paymentCardId
        ? identityMap.get(sub.paymentCardId)
        : undefined,
    });
  }

  return items.sort((a, b) => {
    if (a.countdown.daysUntil !== b.countdown.daysUntil) {
      return a.countdown.daysUntil - b.countdown.daysUntil;
    }
    return a.binding.serviceName.localeCompare(b.binding.serviceName);
  });
}

/**
 * Computes per-bank-card monthly & annual subscription spend breakdown, plus an optional
 * unassigned bucket (`bankCard: null`) for paid subscriptions with no bank card linked.
 * Deduplicates by `binding.id` so every paid subscription is counted EXACTLY once.
 */
export function computeBankSpendBreakdown(
  bindings: AppBinding[],
  identities: IdentityCard[],
): BankSpendRow[] {
  const bankCards = identities
    .filter((c) => c.type === 'bank')
    .sort((a, b) => a.order - b.order);
  const bankCardMap = new Map(bankCards.map((c) => [c.id, c]));

  const buckets = new Map<string, AppBinding[]>();
  for (const bank of bankCards) {
    buckets.set(bank.id, []);
  }
  const unassigned: AppBinding[] = [];
  const seen = new Set<string>();

  for (const binding of bindings) {
    if (seen.has(binding.id)) continue;
    seen.add(binding.id);
    if (!binding.subscription?.isPaid) continue;

    const payId = binding.subscription.paymentCardId;
    if (payId && bankCardMap.has(payId)) {
      buckets.get(payId)!.push(binding);
    } else if (bankCardMap.has(binding.identityId)) {
      buckets.get(binding.identityId)!.push(binding);
    } else {
      unassigned.push(binding);
    }
  }

  const rows: BankSpendRow[] = bankCards.map((bankCard) => {
    const bankBindings = buckets.get(bankCard.id) ?? [];
    return {
      bankCard,
      totals: computeSubscriptionTotals(bankBindings),
      bindingCount: bankBindings.length,
      bindings: bankBindings,
    };
  });

  // Sort active bank cards (with paid bindings) ahead of 0-binding cards, keeping card order stable
  rows.sort((a, b) => {
    if (a.bindingCount > 0 && b.bindingCount === 0) return -1;
    if (a.bindingCount === 0 && b.bindingCount > 0) return 1;
    return (a.bankCard?.order ?? 0) - (b.bankCard?.order ?? 0);
  });

  if (unassigned.length > 0) {
    rows.push({
      bankCard: null,
      totals: computeSubscriptionTotals(unassigned),
      bindingCount: unassigned.length,
      bindings: unassigned,
    });
  }

  return rows;
}
