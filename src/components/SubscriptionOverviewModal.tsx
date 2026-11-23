import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Wallet,
  X,
} from 'lucide-react';
import { getBankPresetById } from '../data/bankCatalog';
import { getBankLogoDomain } from '../data/brandIcons';
import { getServiceById } from '../data/serviceCatalog';
import { getBillingCycleLabel, useT } from '../i18n/translations';
import { computeSubscriptionTotals, useVaultStore } from '../store/useVaultStore';
import type { CurrencyCode, CurrencySubtotal } from '../types/vault';
import { formatIdentityIdentifier } from '../utils/mask';
import {
  computeBankSpendBreakdown,
  formatRenewalRelative,
  getUpcomingRenewals,
  type RenewalUrgency,
} from '../utils/renewal';
import { IdentityLogoBadge, ServiceBadge } from './ServiceBadge';

export interface SubscriptionOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToIdentity: (identityId: string) => void;
  onJumpToBinding: (identityId: string, bindingId: string) => void;
}

const SPRING_MODAL = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
};

// Approximate relative currency weights for visual proportion bars only (never shown as FX conversion)
const APPROX_MYR_WEIGHT: Record<CurrencyCode, number> = {
  MYR: 1,
  USD: 4.45,
  SGD: 3.3,
  CNY: 0.62,
};

function formatAmount(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function estimateNormalizedSpend(totals: CurrencySubtotal[], annual: boolean): number {
  let sum = 0;
  for (const t of totals) {
    const base = annual ? t.yearlyTotal : t.monthlyTotal;
    sum += base * (APPROX_MYR_WEIGHT[t.currency] ?? 1);
  }
  return sum;
}

function getUrgencyBadgeClasses(urgency: RenewalUrgency): string {
  switch (urgency) {
    case 'urgent':
      return 'bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:bg-rose-500/16 dark:text-rose-300 dark:ring-rose-400/25';
    case 'soon':
      return 'bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25';
    default:
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/14 dark:text-emerald-300 dark:ring-emerald-400/20';
  }
}

export function SubscriptionOverviewModal({
  isOpen,
  onClose,
  onJumpToIdentity,
  onJumpToBinding,
}: SubscriptionOverviewModalProps) {
  const { t, language } = useT();

  const identities = useVaultStore((s) => s.identities);
  const bindings = useVaultStore((s) => s.bindings);
  const privacyMode = useVaultStore((s) => s.privacyMode);

  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const globalTotals = useMemo(
    () => computeSubscriptionTotals(bindings),
    [bindings],
  );

  const bankBreakdown = useMemo(
    () => computeBankSpendBreakdown(bindings, identities),
    [bindings, identities],
  );

  const upcomingRenewals = useMemo(
    () => getUpcomingRenewals(bindings, identities),
    [bindings, identities],
  );

  const isAnnual = period === 'annual';

  const maxRowWeight = useMemo(() => {
    let max = 0;
    for (const row of bankBreakdown) {
      max = Math.max(max, estimateNormalizedSpend(row.totals, isAnnual));
    }
    return max || 1;
  }, [bankBreakdown, isAnnual]);

  const totalPaidCount = useMemo(
    () => globalTotals.reduce((acc, item) => acc + item.activePaidCount, 0),
    [globalTotals],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-md sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sub-overview-title"
          data-testid="subscription-overview-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={SPRING_MODAL}
            className="liquid-glass !bg-white/95 dark:!bg-[#111116]/96 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] shadow-2xl sm:rounded-[28px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.07] px-5 py-4 dark:border-white/[0.08]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Wallet className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="sub-overview-title"
                    className="truncate text-base font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
                  >
                    {t('subOverviewTitle')}
                  </h2>
                  <p className="text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                    {language === 'zh'
                      ? `${totalPaidCount} 项活跃付费订阅`
                      : `${totalPaidCount} active paid subscriptions`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="tactile-press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.045] text-[#52525B] transition-colors hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.12] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="thin-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-5 safe-pb">
              {/* Monthly <-> Annual Burn-Rate Hero Card */}
              <div className="rounded-[22px] border border-black/[0.07] bg-[#F5F5F7]/85 p-4 sm:p-5 dark:border-white/[0.08] dark:bg-[#09090C]/90">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    role="tablist"
                    aria-label="Billing period"
                    className="inline-flex items-center rounded-full bg-black/[0.055] p-1 dark:bg-white/[0.07]"
                  >
                    {(
                      [
                        { id: 'monthly', label: t('subOverviewMonthly') },
                        { id: 'annual', label: t('subOverviewAnnual') },
                      ] as const
                    ).map(({ id, label }) => {
                      const active = period === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          data-testid={`sub-overview-toggle-${id}`}
                          onClick={() => setPeriod(id)}
                          className={`relative rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                            active
                              ? 'text-[#111113] dark:text-[#FAFAFA]'
                              : 'text-[#52525B] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="sub-overview-period-pill"
                              transition={SPRING_MODAL}
                              className="absolute inset-0 rounded-full bg-white shadow-2xs ring-1 ring-black/[0.05] dark:bg-white/[0.14] dark:ring-white/[0.08]"
                            />
                          )}
                          <span className="relative z-10">{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span className="font-mono text-[11px] font-medium text-[#71717A] dark:text-[#8E8E98]">
                    {isAnnual ? '×12 EST.' : 'MONTHLY'}
                  </span>
                </div>

                {/* Large Tabular-Nums Multi-Currency Burn Rate */}
                {globalTotals.length === 0 ? (
                  <p className="mt-4 text-sm font-medium text-[#52525B] dark:text-[#A1A1AA]">
                    {t('noPaidSubs')}
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    {globalTotals.map((item) => {
                      const value = isAnnual
                        ? item.yearlyTotal
                        : item.monthlyTotal > 0
                          ? item.monthlyTotal
                          : item.lifetimeTotal;
                      const unit = isAnnual
                        ? t('subOverviewPerYear')
                        : item.monthlyTotal > 0
                          ? language === 'zh'
                            ? '/月'
                            : '/mo'
                          : '';
                      return (
                        <div key={item.currency} className="flex items-baseline gap-1.5">
                          <span className="font-mono text-xs font-semibold tracking-wider text-[#52525B] dark:text-[#A1A1AA]">
                            {item.currency}
                          </span>
                          <span className="font-mono text-2xl sm:text-[30px] font-bold tracking-tight tabular-nums text-[#111113] dark:text-[#FAFAFA]">
                            {formatAmount(value)}
                          </span>
                          <span className="text-xs font-medium text-[#71717A] dark:text-[#8E8E98]">
                            {unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Per-Bank-Card Spend Breakdown */}
              {bankBreakdown.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-wide text-[#52525B] uppercase dark:text-[#A1A1AA]">
                      {t('subOverviewByBank')}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {bankBreakdown.map((row) => {
                      const bank = row.bankCard;
                      const preset = bank
                        ? getBankPresetById(bank.bankId || bank.provider)
                        : undefined;
                      const weight = estimateNormalizedSpend(row.totals, isAnnual);
                      const barPct =
                        row.bindingCount === 0
                          ? 0
                          : Math.max(8, Math.round((weight / maxRowWeight) * 100));

                      const spendStrings = row.totals.map((item) => {
                        const val = isAnnual
                          ? item.yearlyTotal
                          : item.monthlyTotal > 0
                            ? item.monthlyTotal
                            : item.lifetimeTotal;
                        const suffix = isAnnual
                          ? t('subOverviewPerYear')
                          : item.monthlyTotal > 0
                            ? language === 'zh'
                              ? '/月'
                              : '/mo'
                            : '';
                        return `${item.currency} ${formatAmount(val)}${suffix}`;
                      });

                      const rowContent = (
                        <>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              {bank ? (
                                <ServiceBadge
                                  serviceId={bank.bankId || bank.provider || 'custom:bank'}
                                  serviceName={bank.bankName || bank.label}
                                  serviceDomain={
                                    getBankLogoDomain(bank.bankId || bank.provider) ??
                                    preset?.domain
                                  }
                                  size="xs"
                                />
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[26%] bg-black/[0.06] text-[#52525B] dark:bg-white/[0.08] dark:text-[#A1A1AA]">
                                  <CreditCard className="h-3.5 w-3.5" />
                                </span>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-[13px] font-semibold text-[#111113] dark:text-[#FAFAFA]">
                                    {bank
                                      ? bank.bankName || bank.label
                                      : t('subOverviewUnassigned')}
                                  </span>
                                  {bank && (
                                    <span className="shrink-0 font-mono text-[11px] text-[#71717A] dark:text-[#8E8E98]">
                                      {formatIdentityIdentifier(
                                        bank.identifier,
                                        'bank',
                                        privacyMode,
                                        { last4: bank.cardLast4, compact: true },
                                      )}
                                    </span>
                                  )}
                                </div>
                                <span className="block text-[11px] text-[#71717A] dark:text-[#8E8E98]">
                                  {t('bankBoundSubsCount', { count: row.bindingCount })}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold tabular-nums text-[#111113] dark:text-[#FAFAFA]">
                                {spendStrings.length > 0
                                  ? spendStrings.join(' + ')
                                  : '—'}
                              </span>
                              {bank && (
                                <ArrowUpRight className="h-3.5 w-3.5 text-[#71717A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#8E8E98]" />
                              )}
                            </div>
                          </div>

                          {/* Sleek Hairline Proportion Bar */}
                          <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                            <div
                              className="h-full rounded-full bg-[#111113] transition-[width] duration-300 dark:bg-[#FAFAFA]"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </>
                      );

                      if (bank) {
                        return (
                          <button
                            key={bank.id}
                            type="button"
                            data-testid={`overview-bank-row-${bank.id}`}
                            onClick={() => {
                              onClose();
                              onJumpToIdentity(bank.id);
                            }}
                            className="tactile-press group w-full rounded-2xl border border-black/[0.07] bg-white/80 p-3 text-left transition-colors hover:border-black/15 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/16 dark:hover:bg-white/[0.06]"
                          >
                            {rowContent}
                          </button>
                        );
                      }

                      return (
                        <div
                          key="unassigned"
                          className="rounded-2xl border border-dashed border-black/[0.1] bg-black/[0.02] p-3 dark:border-white/[0.1] dark:bg-white/[0.02]"
                        >
                          {rowContent}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Upcoming Renewals Timeline */}
              <section className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-[#52525B] dark:text-[#A1A1AA]" />
                  <h3 className="text-xs font-semibold tracking-wide text-[#52525B] uppercase dark:text-[#A1A1AA]">
                    {t('subOverviewUpcoming')}
                  </h3>
                </div>

                {upcomingRenewals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.09] px-4 py-6 text-center text-xs text-[#52525B] dark:border-white/[0.09] dark:text-[#A1A1AA]">
                    {t('subOverviewNoUpcoming')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingRenewals.map(
                      ({ binding, countdown, ownerIdentity, paymentCard }) => {
                        const catalog = getServiceById(
                          binding.serviceId,
                          binding.serviceName,
                          binding.serviceDomain,
                        );
                        const displayName =
                          language === 'zh'
                            ? catalog.nameZh || binding.serviceName
                            : catalog.name || binding.serviceName;
                        const sub = binding.subscription;
                        const relLabel = formatRenewalRelative(countdown, language);
                        const daySuffix =
                          language === 'zh'
                            ? `${countdown.renewalDay}日`
                            : `Day ${countdown.renewalDay}`;

                        return (
                          <button
                            key={binding.id}
                            type="button"
                            data-testid={`overview-renewal-${binding.id}`}
                            onClick={() => {
                              onClose();
                              onJumpToBinding(binding.identityId, binding.id);
                            }}
                            className="tactile-press group flex w-full items-center justify-between gap-3 rounded-2xl border border-black/[0.07] bg-white/80 p-3 text-left transition-colors hover:border-black/15 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/16 dark:hover:bg-white/[0.06]"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <ServiceBadge
                                service={catalog}
                                serviceId={binding.serviceId}
                                serviceName={binding.serviceName}
                                serviceDomain={binding.serviceDomain}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="truncate text-[13px] font-semibold text-[#111113] dark:text-[#FAFAFA]">
                                    {displayName}
                                  </span>
                                  {sub?.planName && (
                                    <span className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-[#52525B] dark:bg-white/[0.08] dark:text-[#A1A1AA]">
                                      {sub.planName}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#71717A] dark:text-[#8E8E98]">
                                  {ownerIdentity && (
                                    <span className="inline-flex items-center gap-1.5 truncate">
                                      <IdentityLogoBadge
                                        identity={ownerIdentity}
                                        size="micro"
                                      />
                                      <span className="truncate">
                                        {ownerIdentity.label}
                                      </span>
                                    </span>
                                  )}
                                  {paymentCard && (
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-amber-800 dark:text-amber-300">
                                      <IdentityLogoBadge
                                        identity={paymentCard}
                                        size="micro"
                                      />
                                      <span>
                                        {paymentCard.bankName || paymentCard.label}{' '}
                                        {formatIdentityIdentifier(
                                          paymentCard.identifier,
                                          'bank',
                                          privacyMode,
                                          { last4: paymentCard.cardLast4, compact: true },
                                        )}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {typeof sub?.price === 'number' && sub.price > 0 && (
                                <span className="font-mono text-xs font-semibold tabular-nums text-[#111113] dark:text-[#FAFAFA]">
                                  {sub.currency ?? 'MYR'} {formatAmount(sub.price)}
                                  <span className="font-normal text-[#71717A] dark:text-[#8E8E98]">
                                    {getBillingCycleLabel(
                                      language,
                                      sub.cycle ?? 'monthly',
                                      true,
                                    )}
                                  </span>
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${getUrgencyBadgeClasses(
                                  countdown.urgency,
                                )}`}
                              >
                                <span>{relLabel}</span>
                                <span className="opacity-70">· {daySuffix}</span>
                              </span>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
