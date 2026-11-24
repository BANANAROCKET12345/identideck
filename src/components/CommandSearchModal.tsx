import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CornerDownLeft,
  CreditCard,
  Network,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import {
  getServiceById,
  searchServices,
} from '../data/serviceCatalog';
import {
  getAuthMethodLabel,
  getBillingCycleLabel,
  useT,
} from '../i18n/translations';
import { getBindingsForIdentity, useVaultStore } from '../store/useVaultStore';
import {
  type AppBinding,
  type IdentityCard,
  type ServiceCatalogItem,
} from '../types/vault';
import { formatAccountName, formatIdentityIdentifier } from '../utils/mask';
import { ScrambleText, usePrefersReducedMotion } from './MotionPrimitives';
import { IdentityLogoBadge, ServiceBadge } from './ServiceBadge';

export interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBindingWallet: (identityId: string, bindingId: string) => void;
  onSelectBindingGraph: (serviceId: string) => void;
  onSelectIdentityWallet: (identityId: string) => void;
  onSelectIdentityGraph: (identityId: string) => void;
  onQuickBindService: (serviceId: string) => void;
}

type SearchEntry =
  | {
      key: string;
      kind: 'binding';
      binding: AppBinding;
      identity: IdentityCard;
      billingCard?: IdentityCard;
    }
  | {
      key: string;
      kind: 'identity';
      identity: IdentityCard;
      boundCount: number;
    }
  | {
      key: string;
      kind: 'catalog';
      service: ServiceCatalogItem;
      alreadyBoundCount: number;
    };

const SPRING_PALETTE = { type: 'spring', stiffness: 460, damping: 34 } as const;

const TYPEWRITER_HINTS = {
  zh: [
    '搜索 ChatGPT / Claude…',
    '搜索卡尾号 4829 / 8021…',
    '搜索 Maxis 5G / Gmail…',
    '搜索 Maybank / GXBank…',
  ],
  en: [
    'Search ChatGPT / Claude…',
    'Search card last-4 4829…',
    'Search Maxis 5G / Gmail…',
    'Search Maybank / GXBank…',
  ],
} as const;

export function CommandSearchModal({
  isOpen,
  onClose,
  onSelectBindingWallet,
  onSelectBindingGraph,
  onSelectIdentityWallet,
  onSelectIdentityGraph,
  onQuickBindService,
}: CommandSearchModalProps) {
  const { t, language } = useT();
  const prefersReducedMotion = usePrefersReducedMotion();
  const identities = useVaultStore((s) => s.identities);
  const bindings = useVaultStore((s) => s.bindings);
  const privacyMode = useVaultStore((s) => s.privacyMode);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Subtle Spotlight typewriter placeholder when open, empty query, and motion allowed
  useEffect(() => {
    if (!isOpen || query.length > 0 || prefersReducedMotion) {
      setTypedPlaceholder('');
      return;
    }

    const hints = TYPEWRITER_HINTS[language];
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const chars = Array.from(hints[phraseIdx]);
      if (!deleting) {
        charIdx += 1;
        setTypedPlaceholder(chars.slice(0, charIdx).join(''));
        if (charIdx >= chars.length) {
          deleting = true;
          timerId = setTimeout(tick, 1400);
        } else {
          timerId = setTimeout(tick, 45);
        }
      } else {
        charIdx -= 1;
        setTypedPlaceholder(chars.slice(0, charIdx).join(''));
        if (charIdx <= 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % hints.length;
          timerId = setTimeout(tick, 160);
        } else {
          timerId = setTimeout(tick, 22);
        }
      }
    };

    timerId = setTimeout(tick, 45);

    return () => {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
    };
  }, [isOpen, query, language, prefersReducedMotion]);

  const inputPlaceholder =
    isOpen && query.length === 0 && !prefersReducedMotion
      ? typedPlaceholder
      : t('cmdPlaceholder');

  const identityMap = useMemo(
    () => new Map(identities.map((c) => [c.id, c])),
    [identities],
  );

  const boundCountByService = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bindings) {
      counts.set(b.serviceId, (counts.get(b.serviceId) ?? 0) + 1);
    }
    return counts;
  }, [bindings]);

  const boundCountByIdentity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of identities) {
      counts.set(card.id, getBindingsForIdentity(bindings, card).length);
    }
    return counts;
  }, [identities, bindings]);

  const { bindingEntries, identityEntries, catalogEntries, flatEntries } = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Bound Accounts (includes billing bank card name / last-4 lookup!)
    const matchedBindings: Extract<SearchEntry, { kind: 'binding' }>[] = [];
    for (const b of bindings) {
      const identity = identityMap.get(b.identityId);
      if (!identity) continue;
      const billingCard = b.subscription?.paymentCardId
        ? identityMap.get(b.subscription.paymentCardId)
        : undefined;
      const serviceMeta = getServiceById(b.serviceId, b.serviceName, b.serviceDomain);

      if (q) {
        const haystack = [
          b.serviceName,
          serviceMeta.name,
          serviceMeta.nameZh,
          ...serviceMeta.aliases,
          b.serviceDomain ?? '',
          b.accountName ?? '',
          b.note ?? '',
          b.subscription?.planName ?? '',
          b.subscription?.isPaid ? 'paid pro plus vip 会员 付费 订阅 扣款' : '',
          b.authMethod,
          identity.label,
          identity.identifier,
          identity.simCarrier ?? '',
          identity.bankName ?? '',
          identity.cardLast4 ?? '',
          billingCard?.label ?? '',
          billingCard?.bankName ?? '',
          billingCard?.bankId ?? '',
          billingCard?.cardLast4 ?? '',
          billingCard?.cardNetwork ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      matchedBindings.push({
        key: `b-${b.id}`,
        kind: 'binding',
        binding: b,
        identity,
        billingCard,
      });
    }

    matchedBindings.sort((a, b) => {
      const ap = a.binding.subscription?.isPaid ? 1 : 0;
      const bp = b.binding.subscription?.isPaid ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return a.binding.serviceName.localeCompare(b.binding.serviceName);
    });

    const limitedBindings = q ? matchedBindings.slice(0, 8) : matchedBindings.slice(0, 5);

    // 2. Identity & Bank Cards (search by bank name, last-4 digits, network, email, SIM)
    const matchedIdentities: Extract<SearchEntry, { kind: 'identity' }>[] = identities
      .filter((card) => {
        if (!q) return true;
        const haystack = [
          card.label,
          card.identifier,
          card.provider,
          card.simCarrier ?? '',
          card.bankName ?? '',
          card.bankId ?? '',
          card.cardLast4 ?? '',
          card.cardNetwork ?? '',
          card.cardKind ?? '',
          card.type === 'bank'
            ? 'bank card debit credit visa mastercard 银行卡 信用卡 借记卡 扣款'
            : card.type === 'phone'
              ? 'phone sim 手机 号码'
              : 'email mail 邮箱',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .map((card) => ({
        key: `i-${card.id}`,
        kind: 'identity' as const,
        identity: card,
        boundCount: boundCountByIdentity.get(card.id) ?? 0,
      }));

    // 3. Service Catalog (Quick Bind)
    const catalogMatches = q ? searchServices(q).slice(0, 6) : searchServices('').slice(0, 4);
    const matchedCatalog: Extract<SearchEntry, { kind: 'catalog' }>[] = catalogMatches.map(
      (service) => ({
        key: `c-${service.id}`,
        kind: 'catalog',
        service,
        alreadyBoundCount: boundCountByService.get(service.id) ?? 0,
      }),
    );

    const flat: SearchEntry[] = [
      ...limitedBindings,
      ...matchedIdentities,
      ...matchedCatalog,
    ];

    return {
      bindingEntries: limitedBindings,
      identityEntries: matchedIdentities,
      catalogEntries: matchedCatalog,
      flatEntries: flat,
    };
  }, [query, bindings, identities, identityMap, boundCountByIdentity, boundCountByService]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, flatEntries.length]);

  const executeEntry = (entry: SearchEntry) => {
    onClose();
    if (entry.kind === 'binding') {
      onSelectBindingWallet(entry.identity.id, entry.binding.id);
    } else if (entry.kind === 'identity') {
      onSelectIdentityWallet(entry.identity.id);
    } else {
      onQuickBindService(entry.service.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatEntries.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatEntries.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatEntries.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatEntries.length) % flatEntries.length);
      }
    } else if (e.key === 'Enter') {
      const target = flatEntries[activeIndex];
      if (target) {
        e.preventDefault();
        executeEntry(target);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let runningIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('searchShortcut')}
          className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-14 sm:px-4 sm:pt-[11vh]"
          onKeyDown={handleKeyDown}
        >
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-md"
          />

          {/* Raycast / Spotlight Liquid Glass Command Palette */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
            transition={prefersReducedMotion ? { duration: 0 } : SPRING_PALETTE}
            className="liquid-glass relative z-10 flex max-h-[76dvh] w-full max-w-xl flex-col overflow-hidden rounded-[26px] border border-black/[0.08] bg-white/94 shadow-[0_28px_80px_-20px_rgba(0,0,0,0.32)] dark:border-white/[0.1] dark:bg-[#121216]/94 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_36px_96px_-18px_rgba(0,0,0,0.92)]"
          >
            {/* Search Bar */}
            <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5 dark:border-white/[0.07]">
              <Search className="h-4.5 w-4.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={inputPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#111113] placeholder:text-zinc-400 focus:outline-none dark:text-[#FAFAFA] dark:placeholder:text-zinc-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-black/[0.06] hover:text-[#111113] dark:hover:bg-white/[0.1] dark:hover:text-[#FAFAFA]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="hidden cursor-pointer rounded-full border border-black/[0.08] bg-black/[0.035] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-zinc-500 hover:text-[#111113] sm:inline-block dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-zinc-400 dark:hover:text-[#FAFAFA]"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2.5">
              {flatEntries.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {t('cmdNoResults')}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group 1: Bound Accounts (1-Second Login + Billing Card Lookup) */}
                  {bindingEntries.length > 0 && (
                    <div>
                      <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.07em] text-zinc-500 uppercase dark:text-zinc-400">
                        {t('cmdGroupBindings')}
                      </div>
                      <div className="space-y-0.5">
                        {bindingEntries.map((entry) => {
                          const idx = runningIndex++;
                          const isActive = idx === activeIndex;
                          const { binding, identity, billingCard } = entry;
                          const maskedId = formatIdentityIdentifier(
                            identity.identifier,
                            identity.type,
                            privacyMode,
                            { last4: identity.cardLast4, compact: true },
                          );
                          const sub = binding.subscription;
                          const paidText = sub?.isPaid
                            ? [
                                sub.planName,
                                typeof sub.price === 'number' && sub.price > 0
                                  ? `${sub.currency ?? 'MYR'} ${sub.price}${sub.cycle ? getBillingCycleLabel(language, sub.cycle, true) : ''}`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')
                            : null;

                          return (
                            <div
                              key={entry.key}
                              onMouseEnter={() => setActiveIndex(idx)}
                              className={`group flex items-center gap-2 rounded-2xl p-2 transition-colors ${
                                isActive
                                  ? 'bg-black/[0.055] dark:bg-white/[0.08]'
                                  : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.05]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => executeEntry(entry)}
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                              >
                                <ServiceBadge
                                  serviceId={binding.serviceId}
                                  serviceName={binding.serviceName}
                                  serviceDomain={binding.serviceDomain}
                                  size="sm"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="truncate text-sm font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
                                      {binding.serviceName}
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                    <span className="truncate font-mono text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                      <ScrambleText text={maskedId} triggerKey={privacyMode} />
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {paidText && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-[#10B981]/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#059669] dark:bg-[#10B981]/18 dark:text-[#34D399]">
                                        <CreditCard className="h-2.5 w-2.5" />
                                        {paidText}
                                      </span>
                                    )}
                                    {billingCard && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/14 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
                                        {t('billingChipPrefix')}：
                                        {billingCard.bankName || billingCard.label}{' '}
                                        <ScrambleText
                                          text={formatIdentityIdentifier(
                                            billingCard.identifier,
                                            'bank',
                                            privacyMode,
                                            { last4: billingCard.cardLast4, compact: true },
                                          )}
                                          triggerKey={privacyMode}
                                        />
                                      </span>
                                    )}
                                    <span className="rounded-md bg-black/[0.045] px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-300">
                                      {getAuthMethodLabel(language, binding.authMethod)}
                                    </span>
                                    {binding.accountName && (
                                      <span className="truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                        <ScrambleText
                                          text={formatAccountName(
                                            binding.accountName,
                                            privacyMode,
                                          )}
                                          triggerKey={privacyMode}
                                        />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Direct Graph Isolate Trigger */}
                              <button
                                type="button"
                                title={
                                  language === 'zh' ? '在关系图谱中聚焦' : 'Isolate in Graph'
                                }
                                aria-label={
                                  language === 'zh' ? '在关系图谱中聚焦' : 'Isolate in Graph'
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onSelectBindingGraph(binding.serviceId);
                                }}
                                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:text-zinc-400 dark:hover:bg-white/[0.1] dark:hover:text-[#FAFAFA]"
                              >
                                <Network className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group 2: Identity & Bank Cards */}
                  {identityEntries.length > 0 && (
                    <div>
                      <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.07em] text-zinc-500 uppercase dark:text-zinc-400">
                        {t('cmdGroupIdentities')}
                      </div>
                      <div className="space-y-0.5">
                        {identityEntries.map((entry) => {
                          const idx = runningIndex++;
                          const isActive = idx === activeIndex;
                          const { identity, boundCount } = entry;
                          const isBank = identity.type === 'bank';
                          const maskedId = formatIdentityIdentifier(
                            identity.identifier,
                            identity.type,
                            privacyMode,
                            { last4: identity.cardLast4, compact: true },
                          );

                          return (
                            <div
                              key={entry.key}
                              onMouseEnter={() => setActiveIndex(idx)}
                              className={`flex items-center gap-2 rounded-2xl p-2 transition-colors ${
                                isActive
                                  ? 'bg-black/[0.055] dark:bg-white/[0.08]'
                                  : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.05]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => executeEntry(entry)}
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                              >
                                <IdentityLogoBadge identity={identity} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
                                      {identity.label}
                                    </span>
                                    <span
                                      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                                        isBank
                                          ? 'bg-amber-500/14 font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
                                          : 'bg-black/[0.045] text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-300'
                                      }`}
                                    >
                                      {isBank
                                        ? t('bankBoundSubsCount', { count: boundCount })
                                        : t('appsBoundCount', { count: boundCount })}
                                    </span>
                                  </div>
                                  <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                    <ScrambleText text={maskedId} triggerKey={privacyMode} />
                                  </p>
                                </div>
                              </button>

                              <button
                                type="button"
                                title={
                                  language === 'zh' ? '在关系图谱中聚焦' : 'Isolate in Graph'
                                }
                                aria-label={
                                  language === 'zh' ? '在关系图谱中聚焦' : 'Isolate in Graph'
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  onSelectIdentityGraph(identity.id);
                                }}
                                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:text-zinc-400 dark:hover:bg-white/[0.1] dark:hover:text-[#FAFAFA]"
                              >
                                <Network className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group 3: Service Catalog Quick Bind */}
                  {catalogEntries.length > 0 && (
                    <div>
                      <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.07em] text-zinc-500 uppercase dark:text-zinc-400">
                        {t('cmdGroupCatalog')}
                      </div>
                      <div className="space-y-0.5">
                        {catalogEntries.map((entry) => {
                          const idx = runningIndex++;
                          const isActive = idx === activeIndex;
                          const { service, alreadyBoundCount } = entry;

                          return (
                            <button
                              key={entry.key}
                              type="button"
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => executeEntry(entry)}
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition-colors ${
                                isActive
                                  ? 'bg-black/[0.055] dark:bg-white/[0.08]'
                                  : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.05]'
                              }`}
                            >
                              <ServiceBadge
                                serviceId={service.id}
                                serviceName={service.name}
                                serviceDomain={service.domain}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium text-[#111113] dark:text-[#FAFAFA]">
                                    {language === 'zh' ? service.nameZh : service.name}
                                  </span>
                                  {service.nameZh !== service.name && (
                                    <span className="hidden truncate text-xs text-zinc-400 sm:inline">
                                      {language === 'zh' ? service.name : service.nameZh}
                                    </span>
                                  )}
                                </div>
                                {service.domain && (
                                  <p className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {service.domain}
                                  </p>
                                )}
                              </div>
                              {alreadyBoundCount > 0 && (
                                <span className="rounded-full bg-[#10B981]/12 px-2 py-0.5 text-[10px] font-semibold text-[#059669] dark:bg-[#10B981]/16 dark:text-[#34D399]">
                                  {language === 'zh'
                                    ? `已绑 ${alreadyBoundCount}`
                                    : `${alreadyBoundCount} bound`}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[#111113] dark:bg-white/[0.08] dark:text-[#FAFAFA]">
                                <Plus className="h-3 w-3" />
                                {language === 'zh' ? '绑定' : 'Bind'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quiet Monochrome Hint Footer */}
            <div className="flex items-center justify-between border-t border-black/[0.06] bg-black/[0.02] px-4 py-2.5 text-[11px] text-zinc-500 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  <CornerDownLeft className="h-3 w-3" />
                  {t('cmdHintEnter')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Network className="h-3 w-3" />
                  {language === 'zh' ? '右侧图标聚焦关系图' : 'Graph icon isolates node'}
                </span>
              </div>
              <span className="font-mono">{t('cmdHintEsc')}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
