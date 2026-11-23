import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { getBankPresetById } from '../data/bankCatalog';
import { resolveIdentityAuraHex } from '../data/bankCardSkins';
import { getBankLogoDomain } from '../data/brandIcons';
import { getServiceById } from '../data/serviceCatalog';
import {
  getAuthMethodLabel,
  getBillingCycleLabel,
  useT,
} from '../i18n/translations';
import {
  computeMigrationStats,
  computeSubscriptionTotals,
  getBindingsForIdentity,
  useVaultStore,
} from '../store/useVaultStore';
import type {
  AppBinding,
  AuthMethod,
  CurrencySubtotal,
  IdentityCard,
  IdentityType,
} from '../types/vault';
import { formatAccountName, formatIdentityIdentifier } from '../utils/mask';
import {
  formatRenewalRelative,
  getRenewalCountdown,
  type RenewalUrgency,
} from '../utils/renewal';
import { IdentityCardVisual } from './IdentityCardVisual';
import { IdentityLogoBadge, ServiceBadge } from './ServiceBadge';

export interface WalletDeckProps {
  onAddIdentity: () => void;
  onAddIdentityWithType?: (type: IdentityType) => void;
  onEditIdentity: (identity: IdentityCard) => void;
  onOpenQuickPick: (identityId?: string, preselectedServiceId?: string) => void;
  onEditBinding: (binding: AppBinding) => void;
  onOpenMigration: (identityId: string) => void;
  onOpenSubOverview?: () => void;
  highlightedBindingId?: string | null;
}

function getRenewalTone(urgency: RenewalUrgency): {
  text: string;
  bar: string;
} {
  switch (urgency) {
    case 'urgent':
      return {
        text: 'text-rose-600 dark:text-rose-400',
        bar: 'bg-rose-500/80 dark:bg-rose-400/85',
      };
    case 'soon':
      return {
        text: 'text-amber-700 dark:text-amber-300',
        bar: 'bg-amber-500/80 dark:bg-amber-400/85',
      };
    default:
      return {
        text: 'text-[#71717A] dark:text-[#8E8E98]',
        bar: 'bg-emerald-500/55 dark:bg-emerald-400/55',
      };
  }
}

type CardTypeFilter = 'all' | IdentityType;

const SPRING_PILL = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
};

function getAuthBadgeStyle(method: AuthMethod): string {
  switch (method) {
    case 'google':
    case 'apple':
    case 'github':
    case 'wechat':
    case 'phone_otp':
      return 'bg-black/[0.045] text-[#3F3F46] ring-black/[0.06] dark:bg-white/[0.065] dark:text-[#D4D4D8] dark:ring-white/[0.08]';
    default:
      return 'bg-black/[0.035] text-[#52525B] ring-black/[0.05] dark:bg-white/[0.045] dark:text-[#A1A1AA] dark:ring-white/[0.06]';
  }
}

function formatPriceAmount(amount: number): string {
  return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}

function formatGlobalTotals(
  totals: CurrencySubtotal[],
  lang: 'zh' | 'en',
): string | null {
  const parts = totals
    .filter((item) => item.monthlyTotal > 0 || item.lifetimeTotal > 0)
    .map((item) => {
      const amt = formatPriceAmount(
        item.monthlyTotal > 0 ? item.monthlyTotal : item.lifetimeTotal,
      );
      return `${item.currency} ${amt}`;
    });
  if (parts.length === 0) return null;
  const suffix = totals.some((item) => item.monthlyTotal > 0)
    ? lang === 'zh'
      ? '/月'
      : '/mo'
    : '';
  return `${parts.join(' + ')}${suffix}`;
}

function SortableIdentityItem({
  identity,
  boundCount,
  previewBindings,
  totals,
  privacyMode,
  isActive,
  onSelect,
  registerNode,
}: {
  identity: IdentityCard;
  boundCount: number;
  previewBindings: AppBinding[];
  totals: CurrencySubtotal[];
  privacyMode: boolean;
  isActive: boolean;
  onSelect: () => void;
  registerNode: (el: HTMLDivElement | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: identity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : isActive ? 10 : 1,
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        registerNode(el);
      }}
      style={style}
      className={`shrink-0 snap-center transition-all duration-300 ease-out ${
        isDragging
          ? 'scale-[1.03] opacity-95'
          : isActive
            ? 'scale-100 opacity-100'
            : 'scale-[0.95] opacity-80 hover:scale-[0.98] hover:opacity-100'
      }`}
    >
      <IdentityCardVisual
        identity={identity}
        boundCount={boundCount}
        previewBindings={previewBindings}
        subscriptionTotals={totals}
        privacyMode={privacyMode}
        isActive={isActive}
        onClick={onSelect}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function WalletDeck({
  onAddIdentity,
  onAddIdentityWithType,
  onEditIdentity,
  onOpenQuickPick,
  onEditBinding,
  onOpenMigration,
  onOpenSubOverview,
  highlightedBindingId,
}: WalletDeckProps) {
  const { t, language } = useT();

  const identities = useVaultStore((s) => s.identities);
  const bindings = useVaultStore((s) => s.bindings);
  const selectedIdentityId = useVaultStore((s) => s.selectedIdentityId);
  const setSelectedIdentityId = useVaultStore((s) => s.setSelectedIdentityId);
  const privacyMode = useVaultStore((s) => s.privacyMode);
  const reorderIdentities = useVaultStore((s) => s.reorderIdentities);
  const deleteIdentity = useVaultStore((s) => s.deleteIdentity);
  const deleteBinding = useVaultStore((s) => s.deleteBinding);
  const resetDemoData = useVaultStore((s) => s.resetDemoData);

  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'paid'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBindingId, setCopiedBindingId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didMountRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const typeCounts = useMemo(
    () => ({
      all: identities.length,
      email: identities.filter((c) => c.type === 'email').length,
      phone: identities.filter((c) => c.type === 'phone').length,
      bank: identities.filter((c) => c.type === 'bank').length,
    }),
    [identities],
  );

  const visibleIdentities = useMemo(() => {
    if (typeFilter === 'all') return identities;
    return identities.filter((c) => c.type === typeFilter);
  }, [identities, typeFilter]);

  const activeIdentity = useMemo(() => {
    if (visibleIdentities.length === 0) return null;
    return (
      visibleIdentities.find((card) => card.id === selectedIdentityId) ??
      visibleIdentities[0]
    );
  }, [visibleIdentities, selectedIdentityId]);

  // If external jump (Cmd+K / Graph) selects a card outside current typeFilter, reset typeFilter to 'all'
  useEffect(() => {
    if (!selectedIdentityId || typeFilter === 'all') return;
    const selectedCard = identities.find((c) => c.id === selectedIdentityId);
    if (selectedCard && selectedCard.type !== typeFilter) {
      setTypeFilter('all');
    }
  }, [selectedIdentityId, identities, typeFilter]);

  const activeIndex = useMemo(() => {
    if (!activeIdentity) return 0;
    const idx = visibleIdentities.findIndex((c) => c.id === activeIdentity.id);
    return idx === -1 ? 0 : idx;
  }, [visibleIdentities, activeIdentity]);

  const identityById = useMemo(
    () => new Map(identities.map((c) => [c.id, c])),
    [identities],
  );

  const globalSubscriptionTotals = useMemo(
    () => computeSubscriptionTotals(bindings),
    [bindings],
  );
  const globalSpendText = useMemo(
    () => formatGlobalTotals(globalSubscriptionTotals, language),
    [globalSubscriptionTotals, language],
  );

  const perIdentityMeta = useMemo(() => {
    const map = new Map<
      string,
      { count: number; cardBindings: AppBinding[]; totals: CurrencySubtotal[] }
    >();
    for (const card of identities) {
      const links = getBindingsForIdentity(bindings, card);
      const cardBindings = links.map((l) => l.binding);
      const totals = computeSubscriptionTotals(bindings, card.id, identities);
      map.set(card.id, { count: cardBindings.length, cardBindings, totals });
    }
    return map;
  }, [identities, bindings]);

  const activeBindingLinks = useMemo(() => {
    if (!activeIdentity) return [];
    return getBindingsForIdentity(bindings, activeIdentity);
  }, [bindings, activeIdentity]);

  const paidBindingsCount = useMemo(
    () => activeBindingLinks.filter((l) => l.binding.subscription?.isPaid).length,
    [activeBindingLinks],
  );

  const filteredBindingLinks = useMemo(() => {
    if (filterMode === 'paid') {
      return activeBindingLinks.filter((l) => l.binding.subscription?.isPaid);
    }
    return activeBindingLinks;
  }, [activeBindingLinks, filterMode]);

  const activeTotals = useMemo(
    () =>
      activeIdentity
        ? computeSubscriptionTotals(bindings, activeIdentity.id, identities)
        : [],
    [bindings, activeIdentity, identities],
  );

  const activeMigrationStats = useMemo(
    () =>
      activeIdentity
        ? computeMigrationStats(bindings, activeIdentity.id)
        : null,
    [bindings, activeIdentity],
  );

  const handleStepCard = useCallback(
    (dir: -1 | 1) => {
      if (visibleIdentities.length <= 1) return;
      const nextIdx =
        (activeIndex + dir + visibleIdentities.length) % visibleIdentities.length;
      setSelectedIdentityId(visibleIdentities[nextIdx].id);
    },
    [visibleIdentities, activeIndex, setSelectedIdentityId],
  );

  const handleJumpToIdentity = useCallback(
    (targetId: string) => {
      const targetCard = identityById.get(targetId);
      if (!targetCard) return;
      if (typeFilter !== 'all' && targetCard.type !== typeFilter) {
        setTypeFilter('all');
      }
      setSelectedIdentityId(targetId);
    },
    [identityById, typeFilter, setSelectedIdentityId],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      if (visibleIdentities.length <= 1) return;
      e.preventDefault();
      handleStepCard(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visibleIdentities.length, handleStepCard]);

  useEffect(() => {
    setFilterMode('all');
  }, [activeIdentity?.id]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!activeIdentity) return;
    const el = cardRefs.current.get(activeIdentity.id);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeIdentity?.id]);

  useEffect(() => {
    if (!highlightedBindingId) return;
    const escaped =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(highlightedBindingId)
        : highlightedBindingId.replace(/"/g, '\\"');
    const el = document.querySelector(`[data-binding-id="${escaped}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedBindingId, activeIdentity?.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = identities.findIndex((c) => c.id === active.id);
    const newIndex = identities.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextOrder = arrayMove(identities, oldIndex, newIndex).map((c) => c.id);
    reorderIdentities(nextOrder);
  };

  const handleCopyIdentifier = async (card: IdentityCard) => {
    if (privacyMode) return;
    try {
      await navigator.clipboard.writeText(card.identifier);
      setCopiedId(card.id);
      window.setTimeout(
        () => setCopiedId((prev) => (prev === card.id ? null : prev)),
        1800,
      );
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  const handleCopyBinding = async (binding: AppBinding, fallbackId: string) => {
    if (privacyMode) return;
    const valueToCopy = binding.accountName?.trim() || fallbackId;
    if (!valueToCopy) return;
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopiedBindingId(binding.id);
      window.setTimeout(
        () => setCopiedBindingId((prev) => (prev === binding.id ? null : prev)),
        1800,
      );
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  // ======================== EMPTY WALLET STATE ========================
  if (identities.length === 0) {
    const triggerAddType = (kind: IdentityType) => {
      if (onAddIdentityWithType) onAddIdentityWithType(kind);
      else onAddIdentity();
    };

    return (
      <section className="mx-auto max-w-2xl px-4 pb-28 pt-12 sm:px-6 sm:py-18">
        <div className="liquid-glass rounded-[28px] px-6 py-10 text-center sm:px-10 sm:py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[26%] bg-black/[0.05] text-[#111113] dark:bg-white/[0.08] dark:text-[#FAFAFA]">
            <CreditCard className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
            {t('emptyWalletTitle')}
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
            {t('emptyWalletDesc')}
          </p>

          {/* 3-Shortcut Actionable Apple Card Launcher */}
          <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {(
              [
                {
                  kind: 'email' as const,
                  label: t('emptyAddEmail'),
                  Icon: Mail,
                },
                {
                  kind: 'phone' as const,
                  label: t('emptyAddPhone'),
                  Icon: Smartphone,
                },
                {
                  kind: 'bank' as const,
                  label: t('emptyAddBank'),
                  Icon: CreditCard,
                },
              ] as const
            ).map(({ kind, label, Icon }) => (
              <button
                key={kind}
                type="button"
                data-testid={`empty-add-${kind}`}
                onClick={() => triggerAddType(kind)}
                className="tactile-press group flex h-12 sm:h-auto sm:flex-col items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-white/85 px-4 py-3 text-xs font-semibold text-[#111113] transition-all hover:-translate-y-0.5 hover:border-black/20 hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-[#FAFAFA] dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111113] text-white transition-transform group-hover:scale-105 dark:bg-[#FAFAFA] dark:text-[#09090B]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={resetDemoData}
              className="tactile-press inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-black/[0.045] px-5 text-xs font-medium text-[#52525B] transition-colors hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.11] dark:hover:text-[#FAFAFA]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('loadDemoData')}</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const auraHex = resolveIdentityAuraHex(activeIdentity);
  const fitsThreeCardsCentered = visibleIdentities.length <= 3;
  const isBankActive = activeIdentity?.type === 'bank';

  return (
    <div className="space-y-6 pb-28 pt-5 sm:pb-14 sm:pt-7">
      {/* Minimalist Editorial Stage Header + Global Spend Summary Pill + Card Type Filter */}
      <section className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.03em] text-[#111113] dark:text-[#FAFAFA]">
                {t('walletTitle')}
              </h1>
              {globalSpendText && (
                <button
                  type="button"
                  onClick={() => onOpenSubOverview?.()}
                  data-testid="global-spend-pill"
                  title={t('subOverviewTitle')}
                  className="tactile-press group liquid-glass inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-2 font-mono text-[11px] font-semibold text-[#111113] transition-all hover:-translate-y-px hover:border-black/15 dark:text-[#FAFAFA] dark:hover:border-white/18"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="font-sans text-[#52525B] dark:text-[#A1A1AA]">
                    {t('globalSpendLabel')}:
                  </span>
                  <span className="tabular-nums">{globalSpendText}</span>
                  <ChevronRight className="h-3 w-3 text-[#71717A] transition-transform group-hover:translate-x-0.5 dark:text-[#8E8E98]" />
                </button>
              )}
            </div>
            <p className="text-xs sm:text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
              {t('walletSummary', {
                identities: identities.length,
                bindings: bindings.length,
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={onAddIdentity}
            data-testid="add-identity-btn"
            className="tactile-press inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#111113] px-4 text-xs sm:text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#27272A] dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-[#E4E4E7]"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addIdentityCard')}</span>
          </button>
        </div>

        {/* Clean 3-in-1 Card Type Filter Pills (All / Email / SIM / Bank) */}
        <div className="flex items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Filter cards by type"
            className="no-scrollbar inline-flex max-w-full items-center overflow-x-auto rounded-full bg-black/[0.045] p-1 dark:bg-white/[0.06]"
          >
            {(
              [
                { id: 'all', label: t('filterTypeAll'), count: typeCounts.all },
                { id: 'email', label: t('filterTypeEmail'), count: typeCounts.email },
                { id: 'phone', label: t('filterTypePhone'), count: typeCounts.phone },
                { id: 'bank', label: t('filterTypeBank'), count: typeCounts.bank },
              ] as const
            ).map(({ id, label, count }) => {
              const active = typeFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`deck-filter-${id}`}
                  onClick={() => {
                    setTypeFilter(id);
                    if (id !== 'all') {
                      const firstMatch = identities.find((c) => c.type === id);
                      if (firstMatch) setSelectedIdentityId(firstMatch.id);
                    }
                  }}
                  className={`relative inline-flex h-7.5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors ${
                    active
                      ? 'text-[#111113] dark:text-[#FAFAFA]'
                      : 'text-[#52525B] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="wallet-type-filter-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 rounded-full bg-white shadow-2xs ring-1 ring-black/[0.05] dark:bg-white/[0.13] dark:ring-white/[0.08]"
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                  <span className="relative z-10 font-mono text-[10.5px] opacity-65">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tactile Card Stage (max-w-6xl) */}
      <section
        aria-label={t('walletTitle')}
        className="relative mx-auto w-full max-w-6xl px-4 sm:px-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-56 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700 opacity-[0.09] dark:opacity-[0.17]"
          style={{ backgroundColor: auraHex }}
        />

        {visibleIdentities.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => handleStepCard(-1)}
              aria-label={language === 'zh' ? '上一张卡片' : 'Previous card'}
              className={`liquid-glass hidden md:inline-flex ${
                fitsThreeCardsCentered ? 'xl:hidden' : ''
              } absolute left-1 top-[104px] z-20 h-9 w-9 items-center justify-center rounded-full text-[#52525B] transition-all hover:scale-105 hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleStepCard(1)}
              aria-label={language === 'zh' ? '下一张卡片' : 'Next card'}
              className={`liquid-glass hidden md:inline-flex ${
                fitsThreeCardsCentered ? 'xl:hidden' : ''
              } absolute right-1 top-[104px] z-20 h-9 w-9 items-center justify-center rounded-full text-[#52525B] transition-all hover:scale-105 hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        <div className="w-full overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleIdentities.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div
                className={`no-scrollbar flex items-center gap-4 sm:gap-5 overflow-x-auto px-1 pb-6 pt-3 snap-x snap-mandatory sm:snap-none ${
                  fitsThreeCardsCentered ? 'xl:justify-center' : ''
                }`}
              >
                {visibleIdentities.map((card) => {
                  const meta = perIdentityMeta.get(card.id) ?? {
                    count: 0,
                    cardBindings: [],
                    totals: [],
                  };
                  return (
                    <SortableIdentityItem
                      key={card.id}
                      identity={card}
                      boundCount={meta.count}
                      previewBindings={meta.cardBindings}
                      totals={meta.totals}
                      privacyMode={privacyMode}
                      isActive={activeIdentity?.id === card.id}
                      onSelect={() => setSelectedIdentityId(card.id)}
                      registerNode={(el) => {
                        if (el) cardRefs.current.set(card.id, el);
                        else cardRefs.current.delete(card.id);
                      }}
                    />
                  );
                })}

                <button
                  type="button"
                  onClick={onAddIdentity}
                  aria-label={t('addIdentityCard')}
                  title={t('addIdentityCard')}
                  className={`group flex h-[204px] shrink-0 snap-center flex-col items-center justify-center gap-2.5 rounded-[22px] border border-dashed border-black/15 bg-white/45 text-center transition-all duration-200 hover:border-black/30 hover:bg-white/80 dark:border-white/14 dark:bg-white/[0.025] dark:hover:border-white/28 dark:hover:bg-white/[0.055] ${
                    fitsThreeCardsCentered
                      ? 'w-[180px] px-4 xl:w-[64px] xl:px-0'
                      : 'w-[180px] sm:w-[196px] px-4'
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.05] text-[#111113] transition-transform duration-200 group-hover:scale-105 group-hover:bg-[#111113] group-hover:text-white dark:bg-white/[0.07] dark:text-[#FAFAFA] dark:group-hover:bg-[#FAFAFA] dark:group-hover:text-[#09090B]">
                    <Plus className="h-5 w-5" />
                  </span>
                  <div className={fitsThreeCardsCentered ? 'xl:hidden' : ''}>
                    <span className="block text-[13px] font-semibold text-[#111113] dark:text-[#FAFAFA]">
                      {t('addIdentityCard')}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#52525B] dark:text-[#A1A1AA]">
                      {language === 'zh'
                        ? '邮箱 / SIM / 银行卡'
                        : 'Email / SIM / Bank'}
                    </span>
                  </div>
                </button>
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Crisp Quick Card Selector Pills showing Email / SIM / Bank ••Last4 */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
          {visibleIdentities.map((card) => {
            const selected = activeIdentity?.id === card.id;
            const bankShortLast4 =
              card.type === 'bank' && card.cardLast4
                ? privacyMode
                  ? '••••'
                  : `••${card.cardLast4}`
                : null;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedIdentityId(card.id)}
                data-testid={`card-pill-${card.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-xs font-medium transition-all duration-200 ${
                  selected
                    ? 'bg-[#111113] text-white shadow-2xs dark:bg-[#FAFAFA] dark:text-[#09090B]'
                    : 'bg-black/[0.045] text-[#52525B] hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.11] dark:hover:text-[#FAFAFA]'
                }`}
              >
                <IdentityLogoBadge identity={card} size="micro" />
                <span className="max-w-[120px] truncate">{card.label}</span>
                {bankShortLast4 && (
                  <span className="font-mono text-[10.5px] opacity-75">
                    {bankShortLast4}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Airy Editorial Active Identity Section w/ Smooth 160ms Card-Switch Fade */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {activeIdentity && (
            <motion.section
              key={activeIdentity.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5 pt-2"
            >
              {/* Editorial Active Card Header Bar */}
              <div className="flex flex-col gap-4 border-b border-black/[0.07] pb-5 dark:border-white/[0.08] lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] py-0.5 pl-1 pr-2.5 text-[11px] font-medium text-[#52525B] dark:bg-white/[0.07] dark:text-[#A1A1AA]">
                      <IdentityLogoBadge identity={activeIdentity} size="micro" />
                      <span>
                        {activeIdentity.type === 'phone'
                          ? activeIdentity.simCarrier || t('phoneCardType')
                          : activeIdentity.type === 'bank'
                            ? `${activeIdentity.bankName || t('bankCardType')}${
                                activeIdentity.cardKind
                                  ? ` · ${activeIdentity.cardKind.toUpperCase()}`
                                  : ''
                              }`
                            : activeIdentity.provider &&
                                activeIdentity.provider !== 'custom'
                              ? `${activeIdentity.provider.toUpperCase()} · ${t('emailCardType')}`
                              : t('emailCardType')}
                      </span>
                    </span>

                    {activeTotals.map((sub) => (
                      <span
                        key={sub.currency}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/14 dark:text-emerald-300 dark:ring-emerald-400/20"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>
                          {isBankActive && `${t('bankMonthlyAutoDebit')}: `}
                          {sub.currency}{' '}
                          {formatPriceAmount(
                            sub.monthlyTotal > 0 ? sub.monthlyTotal : sub.lifetimeTotal,
                          )}
                          {sub.monthlyTotal > 0
                            ? language === 'zh'
                              ? '/月'
                              : '/mo'
                            : ''}
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="truncate text-xl font-semibold tracking-[-0.02em] text-[#111113] dark:text-[#FAFAFA]">
                      {activeIdentity.label}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <span
                        data-testid="active-identity-identifier"
                        className={`font-mono text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA] ${
                          privacyMode ? 'privacy-masked-text' : ''
                        }`}
                      >
                        {formatIdentityIdentifier(
                          activeIdentity.identifier,
                          activeIdentity.type,
                          privacyMode,
                          { last4: activeIdentity.cardLast4, compact: true },
                        )}
                      </span>
                      {!privacyMode && activeIdentity.type !== 'bank' && (
                        <button
                          type="button"
                          onClick={() => void handleCopyIdentifier(activeIdentity)}
                          aria-label={language === 'zh' ? '复制标识' : 'Copy identifier'}
                          className="inline-flex h-6 items-center gap-1 rounded-full bg-black/[0.045] px-2 text-[10.5px] font-medium text-[#52525B] transition-colors hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.11] dark:hover:text-[#FAFAFA]"
                        >
                          {copiedId === activeIdentity.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{t('copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>{language === 'zh' ? '复制' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Strip — Strictly whitespace-nowrap h-10 on mobile 430px */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenQuickPick(activeIdentity.id)}
                    data-testid="quick-pick-btn"
                    className="tactile-press inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#111113] px-4 text-xs sm:text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#27272A] dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-[#E4E4E7]"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>{t('quickPickAddApp')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenMigration(activeIdentity.id)}
                    data-testid="migration-btn"
                    className="tactile-press liquid-glass inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 sm:px-3.5 text-xs sm:text-[13px] font-medium text-[#111113] transition-colors hover:bg-white dark:text-[#FAFAFA] dark:hover:bg-white/[0.1]"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                    {isBankActive ? (
                      <>
                        <span className="sm:hidden">
                          {language === 'zh' ? '换卡解绑清单' : 'Card Checklist'}
                        </span>
                        <span className="hidden sm:inline">
                          {t('bankMigrationTitle')}
                        </span>
                      </>
                    ) : (
                      <span>{t('migrationChecklist')}</span>
                    )}
                    {activeMigrationStats && activeMigrationStats.migrated > 0 && (
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
                        {activeMigrationStats.migrated}/{activeMigrationStats.total}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditIdentity(activeIdentity)}
                    aria-label={t('editCard')}
                    title={t('editCard')}
                    className="liquid-glass inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#52525B] transition-colors hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteIdentity(activeIdentity.id)}
                    aria-label={t('deleteCard')}
                    title={t('deleteCard')}
                    className="liquid-glass inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#52525B] transition-colors hover:border-red-500/30 hover:bg-red-50 hover:text-red-600 dark:text-[#A1A1AA] dark:hover:border-red-400/30 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quiet Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
                    {isBankActive ? t('bankBoundSubsSection') : t('boundAppsSection')}
                  </h3>
                  <span className="rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#52525B] dark:bg-white/[0.07] dark:text-[#A1A1AA]">
                    {activeBindingLinks.length}
                  </span>
                </div>

                {!isBankActive && (
                  <div className="inline-flex items-center rounded-full bg-black/[0.045] p-1 dark:bg-white/[0.06]">
                    {(
                      [
                        {
                          id: 'all',
                          label: `${t('filterAll')} (${activeBindingLinks.length})`,
                        },
                        {
                          id: 'paid',
                          label: `${t('filterPaidOnly')} (${paidBindingsCount})`,
                        },
                      ] as const
                    ).map(({ id, label }) => {
                      const active = filterMode === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setFilterMode(id)}
                          className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            active
                              ? 'text-[#111113] dark:text-[#FAFAFA]'
                              : 'text-[#52525B] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="wallet-filter-pill"
                              transition={SPRING_PILL}
                              className="absolute inset-0 rounded-full bg-white shadow-2xs ring-1 ring-black/[0.05] dark:bg-white/[0.13] dark:ring-white/[0.08]"
                            />
                          )}
                          <span className="relative z-10">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Floating iOS Bento App Cards Grid */}
              {filteredBindingLinks.length === 0 ? (
                <div className="liquid-glass rounded-[24px] px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-[#111113] dark:text-[#FAFAFA]">
                    {isBankActive
                      ? t('bankEmptyBindingsTitle')
                      : filterMode === 'paid'
                        ? t('noPaidSubs')
                        : t('emptyBindingsTitle')}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-md text-xs text-[#52525B] dark:text-[#A1A1AA]">
                    {isBankActive
                      ? t('bankEmptyBindingsDesc')
                      : t('emptyBindingsDesc')}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenQuickPick(activeIdentity.id)}
                    className="mt-5 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#111113] px-4 text-xs font-medium text-white transition-colors hover:bg-[#27272A] dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-[#E4E4E7]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('quickPickAddApp')}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBindingLinks.map(({ binding, linkKind }) => {
                    const catalog = getServiceById(
                      binding.serviceId,
                      binding.serviceName,
                      binding.serviceDomain,
                    );
                    const displayName =
                      language === 'zh'
                        ? catalog.nameZh || binding.serviceName
                        : catalog.name || binding.serviceName;
                    const linkedOAuthCard =
                      binding.oauthProviderId &&
                      binding.oauthProviderId !== binding.identityId
                        ? identityById.get(binding.oauthProviderId)
                        : undefined;
                    const originIdentity = identityById.get(binding.identityId);
                    const billingBankCard = binding.subscription?.paymentCardId
                      ? identityById.get(binding.subscription.paymentCardId)
                      : undefined;
                    const billingBankPreset = billingBankCard
                      ? getBankPresetById(
                          billingBankCard.bankId || billingBankCard.provider,
                        )
                      : undefined;

                    const isHighlighted = highlightedBindingId === binding.id;
                    const sub = binding.subscription;
                    const renewalInfo =
                      sub?.isPaid && sub.cycle !== 'lifetime'
                        ? getRenewalCountdown(sub.renewalDay)
                        : null;
                    const renewalTone = renewalInfo
                      ? getRenewalTone(renewalInfo.urgency)
                      : null;
                    const maskedAccount = formatAccountName(
                      binding.accountName,
                      privacyMode,
                    );
                    const isCopied = copiedBindingId === binding.id;

                    return (
                      <article
                        key={binding.id}
                        data-binding-id={binding.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onEditBinding(binding)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onEditBinding(binding);
                          }
                        }}
                        className={`group liquid-glass relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[22px] p-4 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.985] ${
                          isHighlighted
                            ? 'ring-2 ring-[#111113] dark:ring-[#FAFAFA]'
                            : ''
                        }`}
                      >
                        <div>
                          {/* Top Row: Real Official Logo Squircle + Name + 1-Click Copy/Edit/Delete */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <ServiceBadge
                                service={catalog}
                                serviceId={binding.serviceId}
                                serviceName={binding.serviceName}
                                serviceDomain={binding.serviceDomain}
                                size="md"
                              />
                              <div className="min-w-0">
                                <h4
                                  title={displayName}
                                  className="truncate text-[13.5px] font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
                                >
                                  {displayName}
                                </h4>
                                {(binding.serviceDomain || catalog.domain) && (
                                  <p className="truncate font-mono text-[11px] text-[#71717A] dark:text-[#8E8E98]">
                                    {binding.serviceDomain || catalog.domain}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div
                              className="flex shrink-0 items-center gap-0.5 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!privacyMode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyBinding(
                                      binding,
                                      originIdentity?.identifier ??
                                        activeIdentity.identifier,
                                    )
                                  }
                                  aria-label={isCopied ? t('copied') : t('copyAccount')}
                                  title={isCopied ? t('copied') : t('copyAccount')}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#52525B] transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:bg-white/[0.1] dark:hover:text-[#FAFAFA]"
                                >
                                  {isCopied ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onEditBinding(binding)}
                                aria-label={t('editBinding')}
                                title={t('editBinding')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#52525B] transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:bg-white/[0.1] dark:hover:text-[#FAFAFA]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteBinding(binding.id)}
                                aria-label={t('deleteBinding')}
                                title={t('deleteBinding')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#52525B] transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-[#A1A1AA] dark:hover:bg-red-500/15 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Quiet OAuth Pill + Emerald Paid Pill */}
                          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${getAuthBadgeStyle(
                                binding.authMethod,
                              )}`}
                            >
                              <KeyRound className="h-3 w-3 shrink-0 opacity-70" />
                              <span>
                                {getAuthMethodLabel(language, binding.authMethod)}
                              </span>
                              {linkedOAuthCard && (
                                <span className="opacity-70">
                                  · {linkedOAuthCard.label}
                                </span>
                              )}
                            </span>

                            {sub?.isPaid && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/14 dark:text-emerald-300 dark:ring-emerald-400/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>{sub.planName || t('paidBadge')}</span>
                                {typeof sub.price === 'number' && sub.price > 0 && (
                                  <span>
                                    · {sub.currency ?? 'MYR'}{' '}
                                    {formatPriceAmount(sub.price)}
                                    {getBillingCycleLabel(
                                      language,
                                      sub.cycle ?? 'monthly',
                                      true,
                                    )}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Dual-Link Cross-Card Interactive Chip */}
                          {isBankActive && linkKind === 'billing' && originIdentity && (
                            <div className="mt-2.5">
                              <button
                                type="button"
                                data-testid={`origin-jump-${binding.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJumpToIdentity(originIdentity.id);
                                }}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/[0.045] py-0.5 pl-1 pr-2.5 text-[11px] font-medium text-[#111113] ring-1 ring-inset ring-black/[0.07] transition-colors hover:bg-black/[0.09] dark:bg-white/[0.07] dark:text-[#FAFAFA] dark:ring-white/[0.1] dark:hover:bg-white/[0.13]"
                              >
                                <IdentityLogoBadge identity={originIdentity} size="micro" />
                                <span className="shrink-0 opacity-70">
                                  {t('accountOriginPrefix')}:
                                </span>
                                <span className="truncate font-semibold">
                                  {originIdentity.label}
                                </span>
                                <span className="hidden sm:inline truncate font-mono text-[10px] opacity-65">
                                  ·{' '}
                                  {formatIdentityIdentifier(
                                    originIdentity.identifier,
                                    originIdentity.type,
                                    privacyMode,
                                  )}
                                </span>
                                <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60" />
                              </button>
                            </div>
                          )}

                          {!isBankActive && billingBankCard && (
                            <div className="mt-2.5">
                              <button
                                type="button"
                                data-testid={`billing-jump-${binding.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJumpToIdentity(billingBankCard.id);
                                }}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-500/[0.09] py-0.5 pl-1 pr-2.5 text-[11px] font-medium text-amber-900 ring-1 ring-inset ring-amber-500/25 transition-colors hover:bg-amber-500/[0.16] dark:bg-amber-400/[0.11] dark:text-amber-200 dark:ring-amber-400/25 dark:hover:bg-amber-400/[0.18]"
                              >
                                <ServiceBadge
                                  serviceId={
                                    billingBankCard.bankId ||
                                    billingBankCard.provider ||
                                    'custom:bank'
                                  }
                                  serviceName={
                                    billingBankCard.bankName || billingBankCard.label
                                  }
                                  serviceDomain={
                                    getBankLogoDomain(
                                      billingBankCard.bankId ||
                                        billingBankCard.provider,
                                    ) ?? billingBankPreset?.domain
                                  }
                                  size="xxs"
                                />
                                <span className="shrink-0 opacity-80">
                                  {t('billingChipPrefix')}:
                                </span>
                                <span className="truncate font-semibold">
                                  {billingBankCard.bankName || billingBankCard.label}
                                </span>
                                <span className="shrink-0 font-mono text-[10.5px] opacity-80">
                                  {formatIdentityIdentifier(
                                    billingBankCard.identifier,
                                    'bank',
                                    privacyMode,
                                    {
                                      last4: billingBankCard.cardLast4,
                                      compact: true,
                                    },
                                  )}
                                </span>
                                <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
                              </button>
                            </div>
                          )}

                          {/* Multi-Account Handle (Auto-masked in Privacy Mode) */}
                          {maskedAccount && (
                            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#52525B] dark:text-[#A1A1AA]">
                              <User className="h-3.5 w-3.5 shrink-0 opacity-60" />
                              <span className="opacity-80">{t('accountLabel')}:</span>
                              <span
                                data-testid="binding-account-name"
                                className={`truncate font-mono font-medium ${
                                  privacyMode
                                    ? 'rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[#111113] dark:bg-white/[0.09] dark:text-[#FAFAFA] privacy-masked-text'
                                    : 'text-[#111113] dark:text-[#FAFAFA]'
                                }`}
                              >
                                {maskedAccount}
                              </span>
                            </div>
                          )}

                          {binding.note && (
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                              {binding.note}
                            </p>
                          )}
                        </div>

                        {renewalInfo && renewalTone && (
                          <>
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2 text-[11px] font-medium dark:border-white/[0.06]">
                              <span className={`font-semibold ${renewalTone.text}`}>
                                {formatRenewalRelative(renewalInfo, language)}
                              </span>
                              <span className="font-mono text-[10.5px] text-[#71717A] dark:text-[#8E8E98]">
                                {language === 'zh'
                                  ? `每月 ${renewalInfo.renewalDay} 日`
                                  : `Day ${renewalInfo.renewalDay}`}
                              </span>
                            </div>

                            {/* Whisper-thin 2px billing cycle progress rail along bottom edge */}
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-black/[0.05] dark:bg-white/[0.06]"
                            >
                              <div
                                className={`h-full transition-[width] duration-300 ${renewalTone.bar}`}
                                style={{
                                  width: `${Math.max(
                                    4,
                                    Math.round(renewalInfo.cycleProgress * 100),
                                  )}%`,
                                }}
                              />
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
