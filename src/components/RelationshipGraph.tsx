import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Filter,
  GitBranch,
  KeyRound,
  Network,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import {
  getServiceById,
  SERVICE_CATEGORIES,
} from '../data/serviceCatalog';
import {
  getAuthMethodLabel,
  getBillingCycleLabel,
  getCategoryLabel,
  useT,
} from '../i18n/translations';
import { getBindingsForIdentity, useVaultStore } from '../store/useVaultStore';
import {
  type AppBinding,
  type CardTheme,
  type IdentityCard,
  type ServiceCategory,
} from '../types/vault';
import { formatAccountName, formatIdentityIdentifier } from '../utils/mask';
import {
  formatRenewalRelative,
  getRenewalCountdown,
  type RenewalCountdownInfo,
} from '../utils/renewal';
import { ScrambleText } from './MotionPrimitives';
import { IdentityLogoBadge, ServiceBadge } from './ServiceBadge';

export type GraphFocusTarget =
  | { kind: 'identity'; id: string }
  | { kind: 'service'; serviceId: string }
  | null;

type GraphMode = 'all' | 'login' | 'billing';

export interface RelationshipGraphProps {
  externalFocus?: GraphFocusTarget;
  onClearExternalFocus?: () => void;
  onJumpToWallet?: (identityId: string, bindingId?: string) => void;
  onOpenMigration?: (identityId: string) => void;
  onEditBinding?: (binding: AppBinding) => void;
  onOpenQuickPick?: (identityId?: string) => void;
}

interface ServiceNodeGroup {
  serviceId: string;
  serviceName: string;
  serviceDomain?: string;
  category: ServiceCategory;
  bindings: AppBinding[];
  identityIds: Set<string>;
  paymentCardIds: Set<string>;
  hasPaid: boolean;
  hasOAuth: boolean;
  soonestRenewal: RenewalCountdownInfo | null;
}

interface GraphEdge {
  id: string;
  binding: AppBinding;
  identityId: string;
  serviceId: string;
  edgeKind: 'login' | 'billing';
  isOAuth: boolean;
  isPaid: boolean;
  isSecondaryOAuthLink?: boolean;
}

interface MeasuredEdge extends GraphEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  path: string;
  labelX: number;
  labelY: number;
  strokeColor: string;
}

const SPRING_FAST = { type: 'spring', stiffness: 420, damping: 32 } as const;

function getEdgeColor(theme: CardTheme, isDark: boolean): string {
  const palette: Record<CardTheme, { light: string; dark: string }> = {
    titanium: { light: '#27272A', dark: '#E4E4E7' },
    navy: { light: '#1D4ED8', dark: '#60A5FA' },
    emerald: { light: '#059669', dark: '#34D399' },
    silver: { light: '#52525B', dark: '#A1A1AA' },
    amber: { light: '#B45309', dark: '#FBBF24' },
  };
  const pair = palette[theme] ?? palette.titanium;
  return isDark ? pair.dark : pair.light;
}

function getBillingStrokeColor(isDark: boolean): string {
  return isDark ? '#F59E0B' : '#D97706';
}

function formatCompactPrice(
  binding: AppBinding,
  language: 'zh' | 'en',
): string | null {
  const sub = binding.subscription;
  if (!sub?.isPaid) return null;
  const plan = sub.planName?.trim();
  const cycle = sub.cycle ? getBillingCycleLabel(language, sub.cycle, true) : '';
  const priceStr =
    typeof sub.price === 'number' && sub.price > 0
      ? `${sub.currency ?? 'MYR'} ${sub.price}${cycle}`
      : '';
  if (plan && priceStr) return `${plan} · ${priceStr}`;
  return plan || priceStr || (language === 'zh' ? '付费会员' : 'Paid');
}

function formatPriceOnly(
  binding: AppBinding,
  language: 'zh' | 'en',
): string | null {
  const sub = binding.subscription;
  if (!sub?.isPaid) return null;
  const cycle = sub.cycle ? getBillingCycleLabel(language, sub.cycle, true) : '';
  if (typeof sub.price === 'number' && sub.price > 0) {
    return `${sub.currency ?? 'MYR'} ${sub.price}${cycle}`;
  }
  return sub.planName?.trim() || (language === 'zh' ? '自动扣款' : 'Auto-debit');
}

export function RelationshipGraph({
  externalFocus,
  onClearExternalFocus,
  onJumpToWallet,
  onOpenMigration,
  onEditBinding,
  onOpenQuickPick,
}: RelationshipGraphProps) {
  const { t, language } = useT();
  const prefersReducedMotion = useReducedMotion();
  const identities = useVaultStore((s) => s.identities);
  const bindings = useVaultStore((s) => s.bindings);
  const privacyMode = useVaultStore((s) => s.privacyMode);
  const theme = useVaultStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [graphMode, setGraphMode] = useState<GraphMode>('all');
  const [paidOnly, setPaidOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [focused, setFocused] = useState<GraphFocusTarget>(null);
  const [hovered, setHovered] = useState<GraphFocusTarget>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [measuredEdges, setMeasuredEdges] = useState<MeasuredEdge[]>([]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const leftAnchorRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const rightAnchorRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Apply external jump focus (e.g., from Cmd+K Spotlight)
  useEffect(() => {
    if (!externalFocus) return;
    setGraphMode('all');
    setPaidOnly(false);
    setSelectedCategory('all');
    setFocused(externalFocus);
  }, [externalFocus]);

  // Close custom category dropdown on outside pointer click
  useEffect(() => {
    if (!isCategoryMenuOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isCategoryMenuOpen]);

  // Press Escape to close category dropdown first, or reset graph isolation
  useEffect(() => {
    if (!focused && !isCategoryMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCategoryMenuOpen) {
          setIsCategoryMenuOpen(false);
        } else if (focused) {
          setFocused(null);
          onClearExternalFocus?.();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focused, isCategoryMenuOpen, onClearExternalFocus]);

  const identityMap = useMemo(
    () => new Map(identities.map((card) => [card.id, card])),
    [identities],
  );

  const hasBankCards = useMemo(
    () => identities.some((c) => c.type === 'bank'),
    [identities],
  );

  // Filter Left-column identities based on graphMode (All / Login Identities / Bank Billing)
  const visibleIdentities = useMemo(() => {
    if (graphMode === 'login') {
      return identities.filter((c) => c.type !== 'bank');
    }
    if (graphMode === 'billing') {
      return identities.filter((c) => c.type === 'bank');
    }
    return identities;
  }, [identities, graphMode]);

  const visibleIdentityIds = useMemo(
    () => new Set(visibleIdentities.map((c) => c.id)),
    [visibleIdentities],
  );

  // Categories actually present in current bindings
  const availableCategories = useMemo(() => {
    const present = new Set<ServiceCategory>();
    for (const b of bindings) {
      const meta = getServiceById(b.serviceId, b.serviceName, b.serviceDomain);
      present.add(meta.category);
    }
    return SERVICE_CATEGORIES.filter((cat) => present.has(cat.id));
  }, [bindings]);

  // Filter bindings by Paid Only, Category, and GraphMode
  const filteredBindings = useMemo(() => {
    return bindings.filter((b) => {
      if (paidOnly && !b.subscription?.isPaid) return false;
      if (selectedCategory !== 'all') {
        const meta = getServiceById(b.serviceId, b.serviceName, b.serviceDomain);
        if (meta.category !== selectedCategory) return false;
      }

      const owner = identityMap.get(b.identityId);
      const payCardId = b.subscription?.paymentCardId;
      const payCard = payCardId ? identityMap.get(payCardId) : undefined;

      if (graphMode === 'billing') {
        const isDirectBank = owner?.type === 'bank' && visibleIdentityIds.has(owner.id);
        const hasBillingBank = Boolean(
          payCard && payCard.type === 'bank' && visibleIdentityIds.has(payCard.id),
        );
        return isDirectBank || hasBillingBank;
      }

      if (graphMode === 'login') {
        return Boolean(owner && owner.type !== 'bank' && visibleIdentityIds.has(owner.id));
      }

      // 'all' mode
      const hasOwner = Boolean(owner && visibleIdentityIds.has(owner.id));
      const hasBilling = Boolean(payCard && visibleIdentityIds.has(payCard.id));
      return hasOwner || hasBilling;
    });
  }, [bindings, paidOnly, selectedCategory, graphMode, identityMap, visibleIdentityIds]);

  // Build dual-link edges (Login/OAuth + Bank Billing auto-debit)
  const edges = useMemo<GraphEdge[]>(() => {
    const list: GraphEdge[] = [];
    for (const b of filteredBindings) {
      const owner = identityMap.get(b.identityId);
      const isOAuth = b.authMethod !== 'direct' && b.authMethod !== 'phone_otp';
      const isPaid = Boolean(b.subscription?.isPaid);

      // 1. Primary edge from owning card (login for email/phone; billing if directly attached to a bank card)
      if (owner && visibleIdentityIds.has(owner.id)) {
        const isOwnerBank = owner.type === 'bank';
        if (
          graphMode === 'all' ||
          (graphMode === 'login' && !isOwnerBank) ||
          (graphMode === 'billing' && isOwnerBank)
        ) {
          list.push({
            id: b.id,
            binding: b,
            identityId: b.identityId,
            serviceId: b.serviceId,
            edgeKind: isOwnerBank ? 'billing' : 'login',
            isOAuth: !isOwnerBank && isOAuth,
            isPaid,
          });
        }
      }

      // 2. Optional secondary OAuth provider identity link
      if (
        graphMode !== 'billing' &&
        b.oauthProviderId &&
        b.oauthProviderId !== b.identityId &&
        visibleIdentityIds.has(b.oauthProviderId)
      ) {
        list.push({
          id: `${b.id}-oauth`,
          binding: b,
          identityId: b.oauthProviderId,
          serviceId: b.serviceId,
          edgeKind: 'login',
          isOAuth: true,
          isPaid: false,
          isSecondaryOAuthLink: true,
        });
      }

      // 3. Billing / Auto-Debit edge from paymentCardId (Bank Card -> Paid App!)
      const paymentCardId = b.subscription?.paymentCardId;
      if (
        graphMode !== 'login' &&
        paymentCardId &&
        paymentCardId !== b.identityId &&
        visibleIdentityIds.has(paymentCardId)
      ) {
        list.push({
          id: `${b.id}-billing`,
          binding: b,
          identityId: paymentCardId,
          serviceId: b.serviceId,
          edgeKind: 'billing',
          isOAuth: false,
          isPaid: true,
        });
      }
    }
    return list;
  }, [filteredBindings, identityMap, visibleIdentityIds, graphMode]);

  // Group filtered bindings into right-column service nodes
  const serviceGroups = useMemo<ServiceNodeGroup[]>(() => {
    const map = new Map<string, ServiceNodeGroup>();
    for (const b of filteredBindings) {
      const meta = getServiceById(b.serviceId, b.serviceName, b.serviceDomain);
      const existing = map.get(b.serviceId);
      const isOAuth = b.authMethod !== 'direct' && b.authMethod !== 'phone_otp';
      const payId = b.subscription?.paymentCardId;
      const renewalInfo =
        b.subscription?.isPaid &&
        b.subscription.cycle !== 'lifetime' &&
        b.subscription.renewalDay
          ? getRenewalCountdown(b.subscription.renewalDay)
          : null;
      if (existing) {
        existing.bindings.push(b);
        existing.identityIds.add(b.identityId);
        if (payId && identityMap.has(payId)) existing.paymentCardIds.add(payId);
        if (b.subscription?.isPaid) existing.hasPaid = true;
        if (isOAuth) existing.hasOAuth = true;
        if (
          renewalInfo &&
          (!existing.soonestRenewal ||
            renewalInfo.daysUntil < existing.soonestRenewal.daysUntil)
        ) {
          existing.soonestRenewal = renewalInfo;
        }
      } else {
        const paymentCardIds = new Set<string>();
        if (payId && identityMap.has(payId)) paymentCardIds.add(payId);
        map.set(b.serviceId, {
          serviceId: b.serviceId,
          serviceName: b.serviceName || (language === 'zh' ? meta.nameZh : meta.name),
          serviceDomain: b.serviceDomain ?? meta.domain,
          category: meta.category,
          bindings: [b],
          identityIds: new Set([b.identityId]),
          paymentCardIds,
          hasPaid: Boolean(b.subscription?.isPaid),
          hasOAuth: isOAuth,
          soonestRenewal: renewalInfo,
        });
      }
    }

    const identityOrder = new Map(visibleIdentities.map((id, idx) => [id.id, idx]));
    return Array.from(map.values()).sort((a, b) => {
      const aIndices = a.bindings.map((x) => {
        const idIdx =
          graphMode === 'billing'
            ? identityOrder.get(x.subscription?.paymentCardId ?? x.identityId)
            : identityOrder.get(x.identityId);
        return idIdx ?? 99;
      });
      const bIndices = b.bindings.map((x) => {
        const idIdx =
          graphMode === 'billing'
            ? identityOrder.get(x.subscription?.paymentCardId ?? x.identityId)
            : identityOrder.get(x.identityId);
        return idIdx ?? 99;
      });
      const aMin = Math.min(...aIndices);
      const bMin = Math.min(...bIndices);
      if (aMin !== bMin) return aMin - bMin;
      if (a.hasPaid !== b.hasPaid) return Number(b.hasPaid) - Number(a.hasPaid);
      return a.serviceName.localeCompare(b.serviceName);
    });
  }, [filteredBindings, visibleIdentities, identityMap, graphMode, language]);

  // Count connected apps/subscriptions per visible identity (supports Bank Card billing links!)
  const identityBindingCounts = useMemo(() => {
    const counts = new Map<string, { total: number; paid: number }>();
    for (const card of visibleIdentities) {
      const linked = getBindingsForIdentity(filteredBindings, card);
      counts.set(card.id, {
        total: linked.length,
        paid: linked.filter((item) => Boolean(item.binding.subscription?.isPaid)).length,
      });
    }
    return counts;
  }, [visibleIdentities, filteredBindings]);

  // Compute isolated sets when an identity (Email/SIM/Bank) or app node is selected
  const isolation = useMemo(() => {
    if (!focused) {
      return {
        active: false,
        identityIds: new Set<string>(),
        serviceIds: new Set<string>(),
        edgeIds: new Set<string>(),
      };
    }

    const identityIds = new Set<string>();
    const serviceIds = new Set<string>();
    const edgeIds = new Set<string>();

    if (focused.kind === 'identity') {
      identityIds.add(focused.id);
      for (const edge of edges) {
        if (edge.identityId === focused.id) {
          edgeIds.add(edge.id);
          serviceIds.add(edge.serviceId);
        }
      }
    } else {
      serviceIds.add(focused.serviceId);
      for (const edge of edges) {
        if (edge.serviceId === focused.serviceId) {
          edgeIds.add(edge.id);
          identityIds.add(edge.identityId);
        }
      }
    }

    return { active: true, identityIds, serviceIds, edgeIds };
  }, [focused, edges]);

  // Subtle hover highlight preview (active only when no node is click-isolated)
  const hoverPreview = useMemo(() => {
    if (isolation.active || !hovered) {
      return {
        active: false,
        identityIds: new Set<string>(),
        serviceIds: new Set<string>(),
        edgeIds: new Set<string>(),
      };
    }

    const identityIds = new Set<string>();
    const serviceIds = new Set<string>();
    const edgeIds = new Set<string>();

    if (hovered.kind === 'identity') {
      identityIds.add(hovered.id);
      for (const edge of edges) {
        if (edge.identityId === hovered.id) {
          edgeIds.add(edge.id);
          serviceIds.add(edge.serviceId);
        }
      }
    } else {
      serviceIds.add(hovered.serviceId);
      for (const edge of edges) {
        if (edge.serviceId === hovered.serviceId) {
          edgeIds.add(edge.id);
          identityIds.add(edge.identityId);
        }
      }
    }

    return { active: true, identityIds, serviceIds, edgeIds };
  }, [isolation.active, hovered, edges]);

  // Clear stale focus if filtered out
  useEffect(() => {
    if (!focused) return;
    if (focused.kind === 'identity' && !visibleIdentityIds.has(focused.id)) {
      setFocused(null);
    } else if (
      focused.kind === 'service' &&
      !serviceGroups.some((g) => g.serviceId === focused.serviceId)
    ) {
      setFocused(null);
    }
  }, [focused, visibleIdentityIds, serviceGroups]);

  // Precision real-time SVG Bezier coordinate measurement
  const recomputeEdges = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    setCanvasSize((prev) =>
      Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
        ? prev
        : { width, height },
    );

    const nextMeasured: MeasuredEdge[] = [];
    const totalCount = edges.length;

    edges.forEach((edge, idx) => {
      const leftEl = leftAnchorRefs.current.get(edge.identityId);
      const rightEl = rightAnchorRefs.current.get(edge.serviceId);
      if (!leftEl || !rightEl) return;

      const lRect = leftEl.getBoundingClientRect();
      const rRect = rightEl.getBoundingClientRect();

      const x1 = lRect.left + lRect.width / 2 - containerRect.left;
      const y1 = lRect.top + lRect.height / 2 - containerRect.top;
      const x2 = rRect.left + rRect.width / 2 - containerRect.left;
      const y2 = rRect.top + rRect.height / 2 - containerRect.top;

      const spanX = Math.max(24, x2 - x1);
      const handle = Math.max(28, spanX * 0.46);
      const path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + handle).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - handle).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;

      // Place isolated pills where Bezier fan-out curves have maximum vertical separation:
      // - Identity/Bank focus (1 left -> N right): shift rightward (0.61 / 0.65)
      // - Service focus (N left -> 1 right, e.g. Login + Bank): shift leftward (0.36 / 0.40)
      const t =
        focused?.kind === 'service'
          ? edge.edgeKind === 'billing'
            ? 0.37
            : totalCount > 1 && idx % 2 === 1
              ? 0.41
              : 0.38
          : totalCount > 1 && idx % 2 === 1
            ? 0.65
            : 0.61;
      const inv = 1 - t;
      const c1x = x1 + handle;
      const c2x = x2 - handle;
      const labelX =
        inv * inv * inv * x1 +
        3 * inv * inv * t * c1x +
        3 * inv * t * t * c2x +
        t * t * t * x2;
      const labelY =
        inv * inv * inv * y1 +
        3 * inv * inv * t * y1 +
        3 * inv * t * t * y2 +
        t * t * t * y2;

      const identity = identityMap.get(edge.identityId);
      const strokeColor =
        edge.edgeKind === 'billing'
          ? getBillingStrokeColor(isDark)
          : getEdgeColor(identity?.cardTheme ?? 'titanium', isDark);

      nextMeasured.push({
        ...edge,
        x1,
        y1,
        x2,
        y2,
        path,
        labelX,
        labelY,
        strokeColor,
      });
    });

    setMeasuredEdges(nextMeasured);
  }, [edges, identityMap, isDark, focused?.kind]);

  useLayoutEffect(() => {
    let raf1 = 0;
    let raf2 = 0;

    const scheduleMeasure = () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      raf1 = requestAnimationFrame(() => {
        recomputeEdges();
        raf2 = requestAnimationFrame(recomputeEdges);
      });
    };

    scheduleMeasure();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleMeasure())
        : null;

    if (observer && canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    const onViewportChange = () => scheduleMeasure();
    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('scroll', onViewportChange, { passive: true });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer?.disconnect();
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange);
    };
  }, [
    recomputeEdges,
    visibleIdentities.length,
    serviceGroups.length,
    privacyMode,
    language,
    graphMode,
    paidOnly,
    selectedCategory,
  ]);

  const handleToggleIdentityFocus = (id: string) => {
    onClearExternalFocus?.();
    setFocused((prev) =>
      prev?.kind === 'identity' && prev.id === id ? null : { kind: 'identity', id },
    );
  };

  const handleToggleServiceFocus = (serviceId: string) => {
    onClearExternalFocus?.();
    setFocused((prev) =>
      prev?.kind === 'service' && prev.serviceId === serviceId
        ? null
        : { kind: 'service', serviceId },
    );
  };

  const handleResetFocus = () => {
    setFocused(null);
    onClearExternalFocus?.();
  };

  const focusedIdentity: IdentityCard | null =
    focused?.kind === 'identity' ? (identityMap.get(focused.id) ?? null) : null;

  const focusedService: ServiceNodeGroup | null =
    focused?.kind === 'service'
      ? (serviceGroups.find((g) => g.serviceId === focused.serviceId) ?? null)
      : null;

  const hasSufficientCorridorForPills = canvasSize.width >= 680;

  // Empty Vault State
  if (identities.length === 0 || bindings.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-3.5 pb-24 pt-6 sm:px-6 sm:pb-12">
        <div className="liquid-glass rounded-[28px] border border-black/[0.07] bg-white/82 p-12 text-center shadow-[0_18px_40px_-24px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#121216]/78 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.045] text-[#111113] dark:bg-white/[0.06] dark:text-[#FAFAFA]">
            <Network className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
            {t('graphEmptyTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            {t('graphEmptyDesc')}
          </p>
          {identities.length > 0 && onOpenQuickPick && (
            <button
              type="button"
              onClick={() => onOpenQuickPick(identities[0]?.id)}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#111113] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200"
            >
              <Sparkles className="h-4 w-4" />
              {t('quickPickAddApp')}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-3.5 pb-24 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
      {/* Editorial Header & Monochrome Segmented Filter Bar */}
      <div className="mb-5 flex flex-col gap-3.5 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[#111113] sm:text-2xl dark:text-[#FAFAFA]">
                {t('graphTitle')}
              </h1>
              <span className="inline-flex items-center rounded-full border border-black/[0.07] bg-white/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-600 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-zinc-300">
                {edges.length} {language === 'zh' ? '条链路' : 'links'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
              {t('graphSubtitle')}
            </p>
          </div>

          {/* Left-Side Mode Filter Pill: All / Login Identities / Bank Billing */}
          {hasBankCards && (
            <div
              role="group"
              aria-label={language === 'zh' ? '图谱视图模式' : 'Graph link mode'}
              data-testid="graph-mode-switcher"
              className="inline-flex w-fit items-center rounded-full border border-black/[0.07] bg-black/[0.04] p-0.5 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.05]"
            >
              {(
                [
                  { id: 'all' as const, label: t('graphModeAll') },
                  { id: 'login' as const, label: t('graphModeLogin') },
                  { id: 'billing' as const, label: t('graphModeBilling') },
                ]
              ).map((mode) => {
                const active = graphMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    data-testid={`graph-mode-${mode.id}`}
                    onClick={() => setGraphMode(mode.id)}
                    className={`relative cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'text-white dark:text-[#09090B]'
                        : 'text-zinc-600 hover:text-[#111113] dark:text-zinc-400 dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="graph-mode-pill"
                        transition={prefersReducedMotion ? { duration: 0 } : SPRING_FAST}
                        className="absolute inset-0 rounded-full bg-[#111113] shadow-xs dark:bg-[#FAFAFA]"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      {mode.id === 'billing' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      )}
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Secondary Filter Controls: Paid Only + Custom Liquid Glass Category Dropdown + Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Spring-Sliding Monochrome Paid Filter Toggle */}
          <div
            role="group"
            aria-label={language === 'zh' ? '订阅筛选' : 'Subscription filter'}
            className="inline-flex items-center rounded-full border border-black/[0.07] bg-black/[0.04] p-0.5 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.05]"
          >
            <button
              type="button"
              onClick={() => setPaidOnly(false)}
              className={`relative cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                !paidOnly
                  ? 'text-white dark:text-[#09090B]'
                  : 'text-zinc-600 hover:text-[#111113] dark:text-zinc-400 dark:hover:text-[#FAFAFA]'
              }`}
            >
              {!paidOnly && (
                <motion.span
                  layoutId="graph-paid-filter-pill"
                  transition={prefersReducedMotion ? { duration: 0 } : SPRING_FAST}
                  className="absolute inset-0 rounded-full bg-[#111113] shadow-xs dark:bg-[#FAFAFA]"
                />
              )}
              <span className="relative z-10">{t('filterAll')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaidOnly(true)}
              className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                paidOnly
                  ? 'text-white dark:text-[#09090B]'
                  : 'text-zinc-600 hover:text-[#111113] dark:text-zinc-400 dark:hover:text-[#FAFAFA]'
              }`}
            >
              {paidOnly && (
                <motion.span
                  layoutId="graph-paid-filter-pill"
                  transition={prefersReducedMotion ? { duration: 0 } : SPRING_FAST}
                  className="absolute inset-0 rounded-full bg-[#111113] shadow-xs dark:bg-[#FAFAFA]"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                {t('filterPaidOnly')}
              </span>
            </button>
          </div>

          {/* Custom Apple Liquid Glass Category Popover Dropdown */}
          {availableCategories.length > 1 && (
            <div ref={categoryDropdownRef} className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isCategoryMenuOpen}
                aria-label={t('cat_all')}
                data-testid="graph-category-trigger"
                onClick={() => setIsCategoryMenuOpen((open) => !open)}
                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium backdrop-blur-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111113] dark:focus-visible:ring-[#FAFAFA] ${
                  selectedCategory !== 'all' || isCategoryMenuOpen
                    ? 'border-black/22 bg-white text-[#111113] shadow-2xs dark:border-white/25 dark:bg-[#1A1A21] dark:text-[#FAFAFA]'
                    : 'border-black/[0.08] bg-white/82 text-[#111113] hover:border-black/20 dark:border-white/[0.08] dark:bg-[#121216]/85 dark:text-[#FAFAFA] dark:hover:border-white/20'
                }`}
              >
                <Filter className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span className="max-w-[116px] truncate">
                  {selectedCategory === 'all'
                    ? t('cat_all')
                    : getCategoryLabel(language, selectedCategory)}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
                    isCategoryMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isCategoryMenuOpen && (
                  <motion.div
                    role="listbox"
                    aria-label={t('cat_all')}
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                    transition={prefersReducedMotion ? { duration: 0 } : SPRING_FAST}
                    className="liquid-glass absolute left-0 top-10 z-40 min-w-[184px] max-w-[240px] origin-top-left overflow-hidden rounded-2xl p-1.5"
                  >
                    {(
                      [
                        { id: 'all' as const, label: t('cat_all') },
                        ...availableCategories.map((cat) => ({
                          id: cat.id,
                          label: getCategoryLabel(language, cat.id),
                        })),
                      ]
                    ).map((option) => {
                      const isOptionSelected = selectedCategory === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={isOptionSelected}
                          onClick={() => {
                            setSelectedCategory(option.id);
                            setIsCategoryMenuOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                            isOptionSelected
                              ? 'bg-black/[0.06] font-semibold text-[#111113] dark:bg-white/[0.1] dark:text-[#FAFAFA]'
                              : 'text-zinc-600 hover:bg-black/[0.04] hover:text-[#111113] dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          <span className="truncate">{option.label}</span>
                          {isOptionSelected && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[#111113] dark:text-[#FAFAFA]" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Reset Focus Monochrome Pill */}
          {isolation.active && (
            <button
              type="button"
              onClick={handleResetFocus}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-[#111113] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('graphResetFocus')}
            </button>
          )}
        </div>
      </div>

      {/* Contextual Floating Glass Focus Strip */}
      <AnimatePresence initial={false}>
        {isolation.active && (focusedIdentity || focusedService) && (
          <motion.div
            key="graph-focus-strip"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
            transition={prefersReducedMotion ? { duration: 0 } : SPRING_FAST}
            className="liquid-glass mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-black/[0.08] bg-white/84 px-4 py-2.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] dark:border-white/[0.09] dark:bg-[#121216]/82 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_32px_-12px_rgba(0,0,0,0.75)]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {focusedIdentity ? (
                <>
                  <IdentityLogoBadge identity={focusedIdentity} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#111113] dark:text-[#FAFAFA]">
                        {focusedIdentity.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${
                          focusedIdentity.type === 'bank'
                            ? 'bg-amber-500/14 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
                            : 'bg-black/[0.05] text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200'
                        }`}
                      >
                        {focusedIdentity.type === 'bank'
                          ? t('bankBoundSubsCount', { count: isolation.serviceIds.size })
                          : t('graphConnectedCount', { count: isolation.serviceIds.size })}
                      </span>
                    </div>
                    <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      <ScrambleText
                        text={formatIdentityIdentifier(
                          focusedIdentity.identifier,
                          focusedIdentity.type,
                          privacyMode,
                          { last4: focusedIdentity.cardLast4, compact: true },
                        )}
                        triggerKey={privacyMode}
                      />
                    </p>
                  </div>
                </>
              ) : focusedService ? (
                <>
                  <ServiceBadge
                    serviceId={focusedService.serviceId}
                    serviceName={focusedService.serviceName}
                    serviceDomain={focusedService.serviceDomain}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#111113] dark:text-[#FAFAFA]">
                        {focusedService.serviceName}
                      </span>
                      <span className="rounded-full bg-[#10B981]/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#059669] dark:bg-[#10B981]/16 dark:text-[#34D399]">
                        {t('graphConnectedCount', { count: isolation.identityIds.size })}
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {focusedService.bindings
                        .map((b) => {
                          const owner = identityMap.get(b.identityId);
                          const payCard = b.subscription?.paymentCardId
                            ? identityMap.get(b.subscription.paymentCardId)
                            : undefined;
                          const parts: string[] = [];
                          if (owner) {
                            parts.push(
                              `${owner.label} · ${getAuthMethodLabel(language, b.authMethod)}`,
                            );
                          }
                          if (payCard) {
                            const last4 = formatIdentityIdentifier(
                              payCard.identifier,
                              'bank',
                              privacyMode,
                              { last4: payCard.cardLast4, compact: true },
                            );
                            parts.push(
                              `${t('billingChipPrefix')}: ${payCard.bankName || payCard.label} ${last4}`,
                            );
                          }
                          return parts.join(' · ');
                        })
                        .filter(Boolean)
                        .join('  /  ')}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              {focusedIdentity && onJumpToWallet && (
                <button
                  type="button"
                  onClick={() => onJumpToWallet(focusedIdentity.id)}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-black/[0.045] px-3 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.085] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {language === 'zh' ? '在卡包查看' : 'Open Wallet'}
                </button>
              )}
              {focusedIdentity && onOpenMigration && (
                <button
                  type="button"
                  onClick={() => onOpenMigration(focusedIdentity.id)}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-500/18 dark:border-amber-400/25 dark:bg-amber-400/12 dark:text-amber-300 dark:hover:bg-amber-400/20"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {focusedIdentity.type === 'bank'
                    ? t('bankMigrationTitle')
                    : t('migrationChecklist')}
                </button>
              )}
              {focusedService && focusedService.bindings[0] && onJumpToWallet && (
                <button
                  type="button"
                  onClick={() =>
                    onJumpToWallet(
                      focusedService.bindings[0].identityId,
                      focusedService.bindings[0].id,
                    )
                  }
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-black/[0.045] px-3 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.085] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {language === 'zh' ? '定位绑定详情' : 'Inspect in Wallet'}
                </button>
              )}
              <button
                type="button"
                onClick={handleResetFocus}
                aria-label={t('graphResetFocus')}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Engineering Micro-Dot Liquid Glass Canvas */}
      <div
        ref={canvasRef}
        onClick={(e) => {
          if (e.target === e.currentTarget && isolation.active) {
            handleResetFocus();
          }
        }}
        className="dot-matrix-bg relative overflow-hidden rounded-[28px] border border-black/[0.07] bg-white/75 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_20px_50px_-28px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-6 dark:border-white/[0.08] dark:bg-[#0B0B0F]/82 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_70px_-28px_rgba(0,0,0,0.85)]"
      >
        {/* SVG Real-Time Cubic Bezier Energy-Flow Layer (Login + Bank Billing) */}
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <svg
            width={canvasSize.width}
            height={canvasSize.height}
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          >
            <defs>
              <style>{`
                @keyframes dash-flow {
                  from { stroke-dashoffset: 32; }
                  to { stroke-dashoffset: 0; }
                }
                .identideck-energy-flow {
                  animation: dash-flow 1.15s linear infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                  .identideck-energy-flow {
                    animation: none;
                  }
                }
              `}</style>
            </defs>

            {/* First pass: resting or dimmed background edges */}
            {measuredEdges.map((edge) => {
              const isHighlighted = !isolation.active || isolation.edgeIds.has(edge.id);
              if (isolation.active && isHighlighted) return null;
              if (hoverPreview.active && hoverPreview.edgeIds.has(edge.id)) return null;

              const isBilling = edge.edgeKind === 'billing';
              const baseOpacity = isolation.active
                ? 0.08
                : hoverPreview.active
                  ? 0.13
                  : isBilling
                    ? isDark
                      ? 0.48
                      : 0.46
                    : edge.isPaid
                      ? isDark
                        ? 0.48
                        : 0.4
                      : isDark
                        ? 0.26
                        : 0.24;

              return (
                <path
                  key={edge.id}
                  d={edge.path}
                  fill="none"
                  stroke={edge.strokeColor}
                  strokeWidth={isBilling ? 1.85 : edge.isPaid ? 1.8 : 1.45}
                  strokeDasharray={
                    isBilling ? '6 4' : edge.isOAuth ? '3 5' : undefined
                  }
                  strokeLinecap="round"
                  opacity={baseOpacity}
                  style={{ transition: 'opacity 180ms ease, stroke-width 180ms ease' }}
                />
              );
            })}

            {/* Hover preview pass: subtle illuminated curves before click-to-isolate */}
            {hoverPreview.active &&
              measuredEdges
                .filter((edge) => hoverPreview.edgeIds.has(edge.id))
                .map((edge) => {
                  const isBilling = edge.edgeKind === 'billing';
                  return (
                    <g key={`hover-${edge.id}`}>
                      <path
                        d={edge.path}
                        fill="none"
                        stroke={edge.strokeColor}
                        strokeWidth={6}
                        strokeLinecap="round"
                        opacity={isDark ? 0.18 : 0.12}
                      />
                      <path
                        d={edge.path}
                        fill="none"
                        stroke={edge.strokeColor}
                        strokeWidth={2.2}
                        strokeDasharray={
                          isBilling ? '6 4' : edge.isOAuth ? '4 4' : undefined
                        }
                        strokeLinecap="round"
                        opacity={0.9}
                      />
                    </g>
                  );
                })}

            {/* Second pass: active isolated glowing + animated energy-flow Bezier paths */}
            {isolation.active &&
              measuredEdges
                .filter((edge) => isolation.edgeIds.has(edge.id))
                .map((edge) => {
                  const isBilling = edge.edgeKind === 'billing';
                  return (
                    <g key={`active-${edge.id}`}>
                      {/* Luminous ambient aura */}
                      <path
                        d={edge.path}
                        fill="none"
                        stroke={isBilling ? '#10B981' : edge.strokeColor}
                        strokeWidth={8.5}
                        strokeLinecap="round"
                        opacity={isDark ? 0.24 : 0.16}
                      />
                      {/* Crisp glowing base Bezier stroke */}
                      <path
                        d={edge.path}
                        fill="none"
                        stroke={edge.strokeColor}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        opacity={0.95}
                      />
                      {/* Animated flowing dashed energy pulse (Identity/Bank -> App) */}
                      <path
                        d={edge.path}
                        fill="none"
                        stroke={isBilling ? '#34D399' : '#FFFFFF'}
                        strokeWidth={1.8}
                        strokeDasharray="6 10"
                        strokeLinecap="round"
                        opacity={isDark ? 0.92 : 0.82}
                        className="identideck-energy-flow"
                      />
                      {/* Crisp endpoint rings */}
                      <circle
                        cx={edge.x1}
                        cy={edge.y1}
                        r={4}
                        fill={edge.strokeColor}
                        stroke={isDark ? '#0B0B0F' : '#FFFFFF'}
                        strokeWidth={1.5}
                      />
                      <circle
                        cx={edge.x2}
                        cy={edge.y2}
                        r={4}
                        fill={isBilling ? '#10B981' : edge.strokeColor}
                        stroke={isDark ? '#0B0B0F' : '#FFFFFF'}
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                })}
          </svg>
        )}

        {/* Inline Floating Liquid-Glass Edge Pills (Desktop / Tablet when isolated) */}
        {isolation.active && hasSufficientCorridorForPills && (
          <div className="pointer-events-none absolute inset-0 z-30">
            {measuredEdges
              .filter((edge) => isolation.edgeIds.has(edge.id))
              .map((edge) => {
                const isBilling = edge.edgeKind === 'billing';
                const authLabel =
                  edge.binding.authMethod === 'direct'
                    ? language === 'zh'
                      ? '直注'
                      : 'Direct'
                    : edge.binding.authMethod === 'phone_otp'
                      ? 'SMS OTP'
                      : edge.binding.authMethod === 'google'
                        ? 'Google OAuth'
                        : edge.binding.authMethod === 'apple'
                          ? 'Apple ID'
                          : edge.binding.authMethod === 'github'
                            ? 'GitHub OAuth'
                            : language === 'zh'
                              ? '微信登录'
                              : 'WeChat';
                const priceTag = isBilling
                  ? formatPriceOnly(edge.binding, language)
                  : formatCompactPrice(edge.binding, language);

                return (
                  <div
                    key={`pill-${edge.id}`}
                    style={{
                      left: `${edge.labelX}px`,
                      top: `${edge.labelY}px`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                  >
                    {isBilling ? (
                      <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/35 bg-white/96 px-2.5 py-0.5 text-[10.5px] font-semibold text-amber-900 shadow-[0_4px_14px_-4px_rgba(217,119,6,0.28)] backdrop-blur-md dark:border-amber-400/35 dark:bg-[#161411]/95 dark:text-amber-200 dark:shadow-[inset_0_1px_0_rgba(251,191,36,0.16),0_6px_18px_-4px_rgba(0,0,0,0.8)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{t('billingChipPrefix')}</span>
                        {priceTag && (
                          <span className="rounded-full bg-[#10B981]/15 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-[#059669] dark:bg-[#10B981]/22 dark:text-[#34D399]">
                            {priceTag}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.08] bg-white/95 px-2.5 py-0.5 text-[10.5px] font-medium text-[#111113] shadow-[0_4px_14px_-4px_rgba(0,0,0,0.16)] backdrop-blur-md dark:border-white/[0.12] dark:bg-[#141419]/94 dark:text-[#FAFAFA] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_18px_-4px_rgba(0,0,0,0.7)]">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: edge.strokeColor }}
                        />
                        <span>{authLabel}</span>
                        {priceTag && !edge.binding.subscription?.paymentCardId && (
                          <span className="rounded-full bg-[#10B981]/14 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-[#059669] dark:bg-[#10B981]/20 dark:text-[#34D399]">
                            {priceTag}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Column Headers */}
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && isolation.active) handleResetFocus();
          }}
          className="relative z-20 mb-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.16fr)] gap-x-8 sm:mb-4 sm:gap-x-20 md:gap-x-36 lg:gap-x-60"
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[10.5px] font-semibold tracking-[0.08em] text-zinc-500 uppercase sm:text-[11px] dark:text-zinc-400">
              {graphMode === 'billing'
                ? `${t('bankCardType')} (${visibleIdentities.length})`
                : t('graphIdentitiesCol', { count: visibleIdentities.length })}
            </span>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[10.5px] font-semibold tracking-[0.08em] text-zinc-500 uppercase sm:text-[11px] dark:text-zinc-400">
              {t('graphAppsCol', { count: serviceGroups.length })}
            </span>
          </div>
        </div>

        {/* Empty Filter Result inside Canvas */}
        {serviceGroups.length === 0 || visibleIdentities.length === 0 ? (
          <div className="relative z-20 py-14 text-center">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {language === 'zh'
                ? '当前筛选条件下暂无匹配的绑定服务'
                : 'No bound apps match the current filter'}
            </p>
            <button
              type="button"
              onClick={() => {
                setGraphMode('all');
                setPaidOnly(false);
                setSelectedCategory('all');
              }}
              className="mt-3.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#111113] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {language === 'zh' ? '清除筛选' : 'Clear Filters'}
            </button>
          </div>
        ) : (
          /* Dual-Column Interactive Bipartite Layout */
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && isolation.active) handleResetFocus();
            }}
            className="relative z-20 grid grid-cols-[minmax(0,1fr)_minmax(0,1.16fr)] items-start gap-x-8 sm:gap-x-20 md:gap-x-36 lg:gap-x-60"
          >
            {/* LEFT COLUMN: Sleek Monochrome Glass Identity & Bank Nodes */}
            <div className="flex min-w-0 flex-col gap-3 sm:gap-3.5">
              {visibleIdentities.map((card) => {
                const isBank = card.type === 'bank';
                const stats = identityBindingCounts.get(card.id) ?? { total: 0, paid: 0 };
                const isSelected =
                  focused?.kind === 'identity' && focused.id === card.id;
                const isConnected =
                  !isolation.active || isolation.identityIds.has(card.id);
                const isHoverLinked =
                  hoverPreview.active && hoverPreview.identityIds.has(card.id);
                const cardOpacity = isolation.active
                  ? isConnected
                    ? 1
                    : 0.14
                  : hoverPreview.active
                    ? isHoverLinked
                      ? 1
                      : 0.58
                    : 1;
                const formattedId = formatIdentityIdentifier(
                  card.identifier,
                  card.type,
                  privacyMode,
                  { last4: card.cardLast4, compact: true },
                );
                const accentStroke = isBank
                  ? getBillingStrokeColor(isDark)
                  : getEdgeColor(card.cardTheme, isDark);

                return (
                  <button
                    key={card.id}
                    type="button"
                    data-graph-identity={card.id}
                    data-identity-type={card.type}
                    onClick={() => handleToggleIdentityFocus(card.id)}
                    onMouseEnter={() => setHovered({ kind: 'identity', id: card.id })}
                    onMouseLeave={() =>
                      setHovered((prev) =>
                        prev?.kind === 'identity' && prev.id === card.id ? null : prev,
                      )
                    }
                    style={{
                      opacity: cardOpacity,
                    }}
                    className={`group relative flex w-full cursor-pointer flex-col rounded-2xl border p-2.5 text-left backdrop-blur-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111113] sm:p-3.5 dark:focus-visible:ring-[#FAFAFA] ${
                      isSelected
                        ? isBank
                          ? 'border-amber-500/45 bg-white shadow-[0_12px_28px_-12px_rgba(217,119,6,0.22)] ring-1 ring-amber-500/20 dark:border-amber-400/45 dark:bg-[#171614] dark:shadow-[inset_0_1px_0_rgba(251,191,36,0.14),0_16px_36px_-12px_rgba(0,0,0,0.85)] dark:ring-amber-400/20'
                          : 'border-black/25 bg-white shadow-[0_12px_28px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/10 dark:border-white/30 dark:bg-[#17171C] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.85)] dark:ring-white/15'
                        : isHoverLinked
                          ? 'border-black/20 bg-white shadow-[0_8px_22px_-12px_rgba(0,0,0,0.15)] dark:border-white/24 dark:bg-[#16161B] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                          : 'border-black/[0.07] bg-white/86 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-black/15 hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,0.14)] dark:border-white/[0.08] dark:bg-[#121216]/84 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:border-white/18 dark:hover:bg-[#16161B]'
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-2.5">
                      {/* Identity / Bank / Email / SIM Real Official Logo */}
                      <IdentityLogoBadge identity={card} size="sm" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: accentStroke }}
                          />
                          <span className="truncate text-xs font-semibold tracking-tight text-[#111113] sm:text-sm dark:text-[#FAFAFA]">
                            {card.label}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">
                          <ScrambleText text={formattedId} triggerKey={privacyMode} />
                        </p>
                      </div>
                    </div>

                    {/* Subtle Metadata Pills */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-black/[0.045] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-700 uppercase dark:bg-white/[0.07] dark:text-zinc-300">
                        {isBank
                          ? (card.cardNetwork || 'BANK').toUpperCase()
                          : card.type === 'phone'
                            ? card.simCarrier || 'SIM'
                            : card.provider.toUpperCase()}
                      </span>

                      {isBank ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/14 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                          <CreditCard className="h-2.5 w-2.5" />
                          {t('bankBoundSubsCount', { count: stats.total })}
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center rounded-md bg-black/[0.045] px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-300">
                            {t('appsBoundCount', { count: stats.total })}
                          </span>
                          {stats.paid > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#10B981]/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#059669] dark:bg-[#10B981]/16 dark:text-[#34D399]">
                              <CreditCard className="h-2.5 w-2.5" />
                              {stats.paid} {language === 'zh' ? '付费' : 'paid'}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Right-Edge Precision Anchor Dot */}
                    <span
                      ref={(el) => {
                        if (el) leftAnchorRefs.current.set(card.id, el);
                        else leftAnchorRefs.current.delete(card.id);
                      }}
                      className="pointer-events-none absolute top-1/2 -right-[5px] h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white transition-transform duration-200 dark:border-[#0B0B0F]"
                      style={{
                        backgroundColor: accentStroke,
                        transform: isSelected
                          ? 'translateY(-50%) scale(1.28)'
                          : 'translateY(-50%)',
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* RIGHT COLUMN: Sleek Glass Bound App Nodes */}
            <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
              {serviceGroups.map((group) => {
                const isSelected =
                  focused?.kind === 'service' && focused.serviceId === group.serviceId;
                const isConnected =
                  !isolation.active || isolation.serviceIds.has(group.serviceId);
                const isHoverLinked =
                  hoverPreview.active && hoverPreview.serviceIds.has(group.serviceId);
                const nodeOpacity = isolation.active
                  ? isConnected
                    ? 1
                    : 0.14
                  : hoverPreview.active
                    ? isHoverLinked
                      ? 1
                      : 0.58
                    : 1;
                const primaryBinding = group.bindings[0];
                const priceTag = primaryBinding
                  ? formatCompactPrice(primaryBinding, language)
                  : null;
                const isMultiAccount = group.bindings.length > 1;
                const primaryAuth = primaryBinding?.authMethod ?? 'direct';
                const authBadgeShort =
                  primaryAuth === 'google'
                    ? 'Google OAuth'
                    : primaryAuth === 'apple'
                      ? 'Apple ID'
                      : primaryAuth === 'github'
                        ? 'GitHub'
                        : primaryAuth === 'wechat'
                          ? language === 'zh'
                            ? '微信登录'
                            : 'WeChat'
                          : primaryAuth === 'phone_otp'
                            ? 'SMS OTP'
                            : language === 'zh'
                              ? '直注'
                              : 'Direct';
                const linkedBankCard = primaryBinding?.subscription?.paymentCardId
                  ? identityMap.get(primaryBinding.subscription.paymentCardId)
                  : undefined;

                return (
                  <div
                    key={group.serviceId}
                    data-graph-service={group.serviceId}
                    onMouseEnter={() =>
                      setHovered({ kind: 'service', serviceId: group.serviceId })
                    }
                    onMouseLeave={() =>
                      setHovered((prev) =>
                        prev?.kind === 'service' && prev.serviceId === group.serviceId
                          ? null
                          : prev,
                      )
                    }
                    style={{ opacity: nodeOpacity }}
                    className={`group relative rounded-2xl border backdrop-blur-xl transition-all duration-200 ${
                      isSelected
                        ? 'border-black/25 bg-white shadow-[0_12px_28px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/10 dark:border-white/30 dark:bg-[#17171C] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.85)] dark:ring-white/15'
                        : isHoverLinked
                          ? 'border-black/20 bg-white shadow-[0_8px_22px_-12px_rgba(0,0,0,0.15)] dark:border-white/24 dark:bg-[#16161B] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                          : 'border-black/[0.07] bg-white/86 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-black/15 hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,0.14)] dark:border-white/[0.08] dark:bg-[#121216]/84 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:border-white/18 dark:hover:bg-[#16161B]'
                    }`}
                  >
                    {/* Subtle GPU Perimeter Beam for Urgent Renewals (<= 2d) */}
                    {group.soonestRenewal?.urgency === 'urgent' && (
                      <span aria-hidden="true" className="urgent-border-beam" />
                    )}

                    {/* Left-Edge Precision Anchor Dot */}
                    <span
                      ref={(el) => {
                        if (el) rightAnchorRefs.current.set(group.serviceId, el);
                        else rightAnchorRefs.current.delete(group.serviceId);
                      }}
                      className="pointer-events-none absolute top-1/2 -left-[5px] h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-400 transition-colors dark:border-[#0B0B0F] dark:bg-zinc-500"
                      style={{
                        backgroundColor:
                          isSelected || (isolation.active && isConnected)
                            ? isDark
                              ? '#FAFAFA'
                              : '#111113'
                            : undefined,
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleToggleServiceFocus(group.serviceId)}
                      className="flex w-full cursor-pointer items-center gap-2.5 p-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111113] sm:gap-3 sm:p-3 dark:focus-visible:ring-[#FAFAFA]"
                    >
                      <ServiceBadge
                        serviceId={group.serviceId}
                        serviceName={group.serviceName}
                        serviceDomain={group.serviceDomain}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate text-xs font-semibold tracking-tight text-[#111113] sm:text-sm dark:text-[#FAFAFA]">
                            {group.serviceName}
                          </span>
                          {isMultiAccount && (
                            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                              ×{group.bindings.length}
                            </span>
                          )}
                        </div>

                        {primaryBinding?.accountName && !isMultiAccount && (
                          <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">
                            <ScrambleText
                              text={formatAccountName(
                                primaryBinding.accountName,
                                privacyMode,
                              )}
                              triggerKey={privacyMode}
                            />
                          </p>
                        )}

                        {/* Quiet OAuth Micro-Label + Emerald Paid Pill + Linked Bank Chip */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.045] px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-300">
                            {group.hasOAuth && <KeyRound className="h-2.5 w-2.5 opacity-75" />}
                            {authBadgeShort}
                          </span>

                          {priceTag && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#10B981]/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#059669] dark:bg-[#10B981]/16 dark:text-[#34D399]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                              {priceTag}
                            </span>
                          )}

                          {group.soonestRenewal &&
                            (group.soonestRenewal.urgency === 'urgent' ||
                              group.soonestRenewal.urgency === 'soon') && (
                              <span
                                data-testid={`graph-renewal-chip-${group.serviceId}`}
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                  group.soonestRenewal.urgency === 'urgent'
                                    ? 'bg-rose-500/12 text-rose-700 dark:bg-rose-400/18 dark:text-rose-300'
                                    : 'bg-amber-500/14 text-amber-800 dark:bg-amber-400/16 dark:text-amber-300'
                                }`}
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {formatRenewalRelative(
                                  group.soonestRenewal,
                                  language,
                                  true,
                                )}
                              </span>
                            )}

                          {linkedBankCard && (
                            <span className="hidden items-center gap-1 rounded-md bg-amber-500/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800 sm:inline-flex dark:bg-amber-400/14 dark:text-amber-300">
                              <CreditCard className="h-2.5 w-2.5" />
                              {linkedBankCard.bankName || linkedBankCard.label}{' '}
                              <ScrambleText
                                text={formatIdentityIdentifier(
                                  linkedBankCard.identifier,
                                  'bank',
                                  privacyMode,
                                  { last4: linkedBankCard.cardLast4, compact: true },
                                )}
                                triggerKey={privacyMode}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Subtle Quick-Edit Trigger on Hover */}
                    {onEditBinding && primaryBinding && !isMultiAccount && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditBinding(primaryBinding);
                        }}
                        aria-label={t('editBinding')}
                        title={t('editBinding')}
                        className="absolute top-2 right-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-full text-zinc-400 opacity-0 transition-all hover:bg-black/[0.06] hover:text-[#111113] group-hover:opacity-100 focus:opacity-100 sm:flex dark:hover:bg-white/[0.1] dark:hover:text-[#FAFAFA]"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quiet Monochrome + Billing Legend */}
        <div className="relative z-20 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-3 text-[11px] text-zinc-500 dark:border-white/[0.07] dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded-full bg-zinc-500 dark:bg-zinc-300" />
              {language === 'zh' ? '直注 / 手机验证' : 'Direct / SMS OTP'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-dashed border-zinc-500 dark:border-zinc-300" />
              <GitBranch className="h-3 w-3" />
              {language === 'zh' ? 'OAuth 第三方授权' : 'OAuth Linked'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-dashed border-amber-500" />
              <CreditCard className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              {language === 'zh' ? '银行卡自动扣款' : 'Bank Auto-Debit'}
            </span>
          </div>
          <span className="hidden sm:inline">
            {language === 'zh'
              ? '点击空白区域或按 ESC 恢复全览'
              : 'Click background or press ESC to reset'}
          </span>
        </div>
      </div>
    </section>
  );
}
