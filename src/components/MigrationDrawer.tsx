import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import {
  getAuthMethodLabel,
  getBillingCycleLabel,
  useT,
} from '../i18n/translations';
import {
  computeMigrationStats,
  getBindingsForIdentity,
  useVaultStore,
} from '../store/useVaultStore';
import { formatAccountName, formatIdentityIdentifier } from '../utils/mask';
import { IdentityLogoBadge, ServiceBadge } from './ServiceBadge';

export interface MigrationDrawerProps {
  identityId: string | null;
  onClose: () => void;
}

const SPRING_DRAWER = { type: 'spring', stiffness: 420, damping: 36 } as const;

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function MigrationDrawer({ identityId, onClose }: MigrationDrawerProps) {
  const { t, language } = useT();
  const prefersReducedMotion = useReducedMotion();
  const identities = useVaultStore((s) => s.identities);
  const bindings = useVaultStore((s) => s.bindings);
  const privacyMode = useVaultStore((s) => s.privacyMode);
  const toggleMigrated = useVaultStore((s) => s.toggleMigrated);
  const resetMigrationForIdentity = useVaultStore((s) => s.resetMigrationForIdentity);
  const exportMigrationMarkdown = useVaultStore((s) => s.exportMigrationMarkdown);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [identityId]);

  useEffect(() => {
    if (!identityId) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [identityId]);

  const identityMap = useMemo(
    () => new Map(identities.map((c) => [c.id, c])),
    [identities],
  );

  const identity = useMemo(
    () => (identityId ? identityMap.get(identityId) ?? null : null),
    [identityMap, identityId],
  );

  // Use dual-link helper (direct + billing subscriptions for bank cards) in stable priority order
  const scopedLinks = useMemo(() => {
    if (!identity) return [];
    return getBindingsForIdentity(bindings, identity).sort((a, b) => {
      const aPaid = a.binding.subscription?.isPaid ? 1 : 0;
      const bPaid = b.binding.subscription?.isPaid ? 1 : 0;
      if (aPaid !== bPaid) return bPaid - aPaid;
      const aOAuth =
        a.binding.authMethod !== 'direct' && a.binding.authMethod !== 'phone_otp' ? 1 : 0;
      const bOAuth =
        b.binding.authMethod !== 'direct' && b.binding.authMethod !== 'phone_otp' ? 1 : 0;
      if (aOAuth !== bOAuth) return bOAuth - aOAuth;
      return a.binding.serviceName.localeCompare(b.binding.serviceName);
    });
  }, [bindings, identity]);

  const stats = useMemo(
    () =>
      identityId
        ? computeMigrationStats(bindings, identityId)
        : {
            total: 0,
            migrated: 0,
            remaining: 0,
            percentage: 100,
            paidRemaining: 0,
            oauthDependentCount: 0,
          },
    [bindings, identityId],
  );

  const isOpen = Boolean(identityId && identity);
  const isBank = identity?.type === 'bank';
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (Math.min(100, Math.max(0, stats.percentage)) / 100) * circumference;

  const handleCopyMarkdown = async () => {
    if (!identity) return;
    const md = exportMigrationMarkdown(identity.id);
    if (!md) return;
    const ok = await copyToClipboard(md);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && identity && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="migration-drawer-title"
          className="fixed inset-0 z-50 flex justify-end"
        >
          {/* Velvet Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-md"
          />

          {/* Slide-Over Liquid Glass Drawer */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={prefersReducedMotion ? { duration: 0 } : SPRING_DRAWER}
            className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-black/[0.08] bg-[#F5F5F7] shadow-2xl dark:border-white/[0.08] dark:bg-[#09090C]"
          >
            {/* Sticky Liquid Glass Header */}
            <div
              className="flex items-start justify-between gap-3 border-b border-black/[0.07] bg-white/84 px-5 pb-4 pt-5 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#121216]/84"
              style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
            >
              <div className="flex min-w-0 items-start gap-3">
                <IdentityLogoBadge identity={identity} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-amber-700 dark:text-amber-400">
                    {isBank ? (
                      <CreditCard className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    )}
                    <span>{isBank ? t('bankMigrationTitle') : t('migrationTitle')}</span>
                  </div>
                  <h2
                    id="migration-drawer-title"
                    className="mt-0.5 truncate text-base font-bold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
                  >
                    {identity.label}
                  </h2>
                  <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {formatIdentityIdentifier(
                      identity.identifier,
                      identity.type,
                      privacyMode,
                      { last4: identity.cardLast4, compact: true },
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/[0.045] text-zinc-600 transition-colors hover:bg-black/[0.085] hover:text-[#111113] dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Circular + Linear Progress Glass Card */}
              <div className="rounded-3xl border border-black/[0.07] bg-white/90 p-4 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)] dark:border-white/[0.08] dark:bg-[#121216]/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        className="text-black/[0.06] dark:text-white/[0.08]"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transition: 'stroke-dashoffset 320ms cubic-bezier(0.22,1,0.36,1)' }}
                      />
                    </svg>
                    <span className="absolute font-mono text-xs font-bold text-[#111113] dark:text-[#FAFAFA]">
                      {stats.percentage}%
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
                      {t(isBank ? 'bankMigrationProgress' : 'migrationProgress', {
                        migrated: stats.migrated,
                        total: stats.total,
                        pct: stats.percentage,
                      })}
                    </span>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-[#10B981] transition-all duration-300"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {isBank
                        ? language === 'zh'
                          ? '每项订阅已标注所属登录账号，更换扣款卡后勾选即自动保存'
                          : 'Each subscription shows its owning login account — check off once updated'
                        : language === 'zh'
                          ? '勾选每项已完成换绑或解绑的服务，状态自动本地保存'
                          : 'Check off each service once moved to your new email or SIM'}
                    </p>
                  </div>
                </div>

                {/* Semantic Priority Callouts */}
                <div className="mt-3.5 space-y-2">
                  {stats.total > 0 && stats.remaining === 0 && (
                    <div className="flex items-start gap-2 rounded-2xl border border-[#10B981]/25 bg-[#10B981]/10 px-3 py-2 text-xs font-medium text-[#047857] dark:border-[#10B981]/25 dark:bg-[#10B981]/14 dark:text-[#34D399]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{isBank ? t('bankMigrationAllDone') : t('migrationAllDone')}</span>
                    </div>
                  )}

                  {isBank ? (
                    stats.remaining > 0 && (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/12 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>{t('bankMigrationAlert', { count: stats.remaining })}</span>
                      </div>
                    )
                  ) : (
                    <>
                      {stats.paidRemaining > 0 && (
                        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/12 dark:text-amber-200">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>{t('migrationPaidAlert', { count: stats.paidRemaining })}</span>
                        </div>
                      )}

                      {stats.oauthDependentCount > 0 && (
                        <div className="flex items-start gap-2 rounded-2xl border border-black/[0.07] bg-black/[0.035] px-3 py-2 text-xs font-medium text-zinc-700 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-zinc-300">
                          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                          <span>
                            {t('migrationOAuthAlert', { count: stats.oauthDependentCount })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Checklist Rows */}
              <div className="mt-4 space-y-2">
                {scopedLinks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-black/12 bg-white/60 p-8 text-center text-sm text-zinc-500 dark:border-white/12 dark:bg-[#121216]/60 dark:text-zinc-400">
                    {isBank ? t('bankMigrationEmpty') : t('migrationEmpty')}
                  </div>
                ) : (
                  scopedLinks.map(({ binding, linkKind }) => {
                    const isDone = Boolean(binding.migrated);
                    const isPaid = Boolean(binding.subscription?.isPaid);
                    const isOAuth =
                      binding.authMethod !== 'direct' && binding.authMethod !== 'phone_otp';
                    const authLabel = getAuthMethodLabel(language, binding.authMethod);
                    const sub = binding.subscription;
                    const priceLabel =
                      isPaid && sub
                        ? [
                            sub.planName,
                            typeof sub.price === 'number' && sub.price > 0
                              ? `${sub.currency ?? 'MYR'} ${sub.price}${sub.cycle ? getBillingCycleLabel(language, sub.cycle, true) : ''}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : '';
                    const owningAccount =
                      isBank && linkKind === 'billing'
                        ? identityMap.get(binding.identityId)
                        : undefined;
                    const billingCard =
                      !isBank && sub?.paymentCardId
                        ? identityMap.get(sub.paymentCardId)
                        : undefined;

                    return (
                      <button
                        key={binding.id}
                        type="button"
                        role="checkbox"
                        aria-checked={isDone}
                        onClick={() => toggleMigrated(binding.id)}
                        className={`group flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                          isDone
                            ? 'border-[#10B981]/25 bg-[#10B981]/[0.06] opacity-70 dark:border-[#10B981]/20 dark:bg-[#10B981]/[0.08]'
                            : isPaid
                              ? 'border-amber-500/30 bg-white shadow-[0_2px_10px_-6px_rgba(0,0,0,0.08)] hover:border-amber-500/50 dark:border-amber-400/25 dark:bg-[#121216] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:border-amber-400/45'
                              : 'border-black/[0.07] bg-white shadow-[0_2px_10px_-6px_rgba(0,0,0,0.06)] hover:border-black/15 dark:border-white/[0.08] dark:bg-[#121216] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:border-white/18'
                        }`}
                      >
                        {/* Tactile Checkbox */}
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isDone
                              ? 'border-[#10B981] bg-[#10B981] text-white dark:text-[#09090B]'
                              : 'border-zinc-300 bg-white group-hover:border-[#111113] dark:border-zinc-600 dark:bg-zinc-900 dark:group-hover:border-[#FAFAFA]'
                          }`}
                        >
                          {isDone && <Check className="h-3.5 w-3.5" strokeWidth={2.75} />}
                        </span>

                        <ServiceBadge
                          serviceId={binding.serviceId}
                          serviceName={binding.serviceName}
                          serviceDomain={binding.serviceDomain}
                          size="sm"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`truncate text-sm font-semibold tracking-tight ${
                                isDone
                                  ? 'text-zinc-500 line-through dark:text-zinc-400'
                                  : 'text-[#111113] dark:text-[#FAFAFA]'
                              }`}
                            >
                              {binding.serviceName}
                            </span>
                            {binding.accountName && (
                              <span className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                {formatAccountName(binding.accountName, privacyMode)}
                              </span>
                            )}
                          </div>

                          {/* Account Origin Line (for Bank Card Replacement Checklist) */}
                          {owningAccount && (
                            <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-black/[0.04] px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-200">
                              <UserCheck className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" />
                              <span className="truncate">
                                {t('accountOriginPrefix')}: {owningAccount.label} (
                                <span className="font-mono">
                                  {formatIdentityIdentifier(
                                    owningAccount.identifier,
                                    owningAccount.type,
                                    privacyMode,
                                  )}
                                </span>
                                )
                              </span>
                            </div>
                          )}

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {isPaid && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/14 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
                                <CreditCard className="h-3 w-3" />
                                {priceLabel || t('paidBadge')}
                              </span>
                            )}
                            {billingCard && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.045] px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-zinc-700 dark:bg-white/[0.07] dark:text-zinc-200">
                                {t('billingChipPrefix')}: {billingCard.bankName || billingCard.label}{' '}
                                {formatIdentityIdentifier(
                                  billingCard.identifier,
                                  'bank',
                                  privacyMode,
                                  { last4: billingCard.cardLast4, compact: true },
                                )}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.045] px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-300">
                              {isOAuth && <KeyRound className="h-2.5 w-2.5 opacity-75" />}
                              {authLabel}
                            </span>
                          </div>

                          {binding.note && (
                            <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {binding.note}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sticky Liquid Glass Footer */}
            <div
              className="flex flex-wrap items-center gap-2.5 border-t border-black/[0.07] bg-white/84 px-5 py-4 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#121216]/84"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                disabled={scopedLinks.length === 0}
                onClick={handleCopyMarkdown}
                className={`inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  copied
                    ? 'bg-[#10B981] text-white dark:text-[#09090B]'
                    : 'bg-[#111113] text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t('migrationCopied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {t('migrationCopyMd')}
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={stats.migrated === 0}
                onClick={() => resetMigrationForIdentity(identity.id)}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-black/[0.045] px-4 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.085] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('migrationReset')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
