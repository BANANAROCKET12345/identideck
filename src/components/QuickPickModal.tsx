import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Globe,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getBankPresetById } from '../data/bankCatalog';
import { getBankLogoDomain } from '../data/brandIcons';
import {
  SERVICE_CATEGORIES,
  getServiceById,
  inferCustomServiceMeta,
  searchServices,
} from '../data/serviceCatalog';
import {
  getAuthMethodLabel,
  getBillingCycleLabel,
  getCategoryLabel,
  useT,
} from '../i18n/translations';
import {
  findDuplicateBindingMatches,
  useVaultStore,
} from '../store/useVaultStore';
import type {
  AppBinding,
  AuthMethod,
  BillingCycle,
  CurrencyCode,
  DuplicateBindingMatch,
  NewBindingInput,
  ServiceCatalogItem,
  ServiceCategory,
} from '../types/vault';
import { formatIdentityIdentifier } from '../utils/mask';
import { IdentityLogoBadge, ServiceBadge } from './ServiceBadge';

export interface QuickPickModalProps {
  isOpen: boolean;
  defaultIdentityId?: string | null;
  initialIdentityId?: string | null;
  editingBinding?: AppBinding | null;
  initialServiceId?: string | null;
  onClose: () => void;
}

const AUTH_METHODS: AuthMethod[] = [
  'direct',
  'google',
  'apple',
  'github',
  'wechat',
  'phone_otp',
];

const CURRENCIES: CurrencyCode[] = ['MYR', 'USD', 'CNY', 'SGD'];
const CYCLES: BillingCycle[] = ['monthly', 'yearly', 'lifetime'];

export function QuickPickModal({
  isOpen,
  defaultIdentityId,
  initialIdentityId,
  editingBinding,
  initialServiceId,
  onClose,
}: QuickPickModalProps) {
  const { t, language } = useT();

  const identities = useVaultStore((s) => s.identities);
  const bindings = useVaultStore((s) => s.bindings);
  const selectedIdentityId = useVaultStore((s) => s.selectedIdentityId);
  const privacyMode = useVaultStore((s) => s.privacyMode);
  const addBindingsBatch = useVaultStore((s) => s.addBindingsBatch);
  const updateBinding = useVaultStore((s) => s.updateBinding);

  const isEditMode = Boolean(editingBinding);

  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'all'>('all');
  const [customInput, setCustomInput] = useState('');
  const [selectedServices, setSelectedServices] = useState<ServiceCatalogItem[]>([]);

  // Step 2 Configuration State
  const [targetIdentityId, setTargetIdentityId] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('direct');
  const [oauthProviderId, setOauthProviderId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [planName, setPlanName] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('MYR');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [renewalDayStr, setRenewalDayStr] = useState('');
  const [paymentCardId, setPaymentCardId] = useState('');
  const [note, setNote] = useState('');

  const bankCards = useMemo(
    () => identities.filter((c) => c.type === 'bank'),
    [identities],
  );

  const identityById = useMemo(
    () => new Map(identities.map((c) => [c.id, c])),
    [identities],
  );

  useEffect(() => {
    if (!isOpen) return;

    const requestedId =
      editingBinding?.identityId ??
      initialIdentityId ??
      defaultIdentityId ??
      selectedIdentityId ??
      identities[0]?.id ??
      '';

    const requestedCard = identities.find((c) => c.id === requestedId);
    const firstNonBankCard = identities.find((c) => c.type !== 'bank');

    // If user triggered QuickPick while viewing a Bank Card, default login target to
    // their primary Email/Phone card (if any) AND pre-link this Bank Card as paymentCardId!
    const launchedFromBankCard =
      !editingBinding && requestedCard?.type === 'bank';

    const resolvedTargetId = launchedFromBankCard
      ? (firstNonBankCard?.id ?? requestedId)
      : requestedId;
    const resolvedTargetCard = identities.find((c) => c.id === resolvedTargetId);

    setSearchQuery('');
    setActiveCategory('all');
    setCustomInput('');
    setTargetIdentityId(resolvedTargetId);

    if (editingBinding) {
      const item = getServiceById(
        editingBinding.serviceId,
        editingBinding.serviceName,
        editingBinding.serviceDomain,
      );
      setSelectedServices([item]);
      setStep(2);
      setAuthMethod(editingBinding.authMethod);
      setOauthProviderId(editingBinding.oauthProviderId ?? '');
      setAccountName(editingBinding.accountName ?? '');
      setIsPaid(Boolean(editingBinding.subscription?.isPaid));
      setPlanName(editingBinding.subscription?.planName ?? '');
      setPriceStr(
        editingBinding.subscription?.price !== undefined
          ? String(editingBinding.subscription.price)
          : '',
      );
      setCurrency(editingBinding.subscription?.currency ?? 'MYR');
      setCycle(editingBinding.subscription?.cycle ?? 'monthly');
      setRenewalDayStr(
        editingBinding.subscription?.renewalDay !== undefined
          ? String(editingBinding.subscription.renewalDay)
          : '',
      );
      setPaymentCardId(editingBinding.subscription?.paymentCardId ?? '');
      setNote(editingBinding.note ?? '');
      return;
    }

    if (initialServiceId) {
      const preselected = getServiceById(initialServiceId);
      setSelectedServices([preselected]);
      setStep(2);
    } else {
      setSelectedServices([]);
      setStep(1);
    }

    setAuthMethod(resolvedTargetCard?.type === 'phone' ? 'phone_otp' : 'direct');
    setOauthProviderId('');
    setAccountName('');
    setIsPaid(launchedFromBankCard);
    setPlanName('');
    setPriceStr('');
    setCurrency('MYR');
    setCycle('monthly');
    setRenewalDayStr('');
    setPaymentCardId(launchedFromBankCard ? requestedId : '');
    setNote('');
  }, [
    isOpen,
    editingBinding,
    initialIdentityId,
    defaultIdentityId,
    selectedIdentityId,
    initialServiceId,
    identities,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const filteredCatalog = useMemo(
    () => searchServices(searchQuery, activeCategory),
    [searchQuery, activeCategory],
  );

  const existingServiceMap = useMemo(() => {
    const map = new Map<string, { count: number; hasPaid: boolean }>();
    for (const b of bindings) {
      if (editingBinding && b.id === editingBinding.id) continue;
      const key = b.serviceId.toLowerCase();
      const prev = map.get(key) ?? { count: 0, hasPaid: false };
      map.set(key, {
        count: prev.count + 1,
        hasPaid: prev.hasPaid || Boolean(b.subscription?.isPaid),
      });
    }
    return map;
  }, [bindings, editingBinding]);

  const selectedIds = useMemo(
    () => new Set(selectedServices.map((s) => s.id)),
    [selectedServices],
  );

  const duplicateAlerts = useMemo(() => {
    const alerts: Array<{
      service: ServiceCatalogItem;
      matches: DuplicateBindingMatch[];
    }> = [];

    for (const svc of selectedServices) {
      const rawMatches = findDuplicateBindingMatches(
        identities,
        bindings,
        svc.id,
      ).filter((m) => (editingBinding ? m.binding.id !== editingBinding.id : true));

      if (rawMatches.length > 0) {
        alerts.push({ service: svc, matches: rawMatches });
      }
    }
    return alerts.sort(
      (a, b) =>
        Number(b.matches.some((m) => m.isPaid)) -
        Number(a.matches.some((m) => m.isPaid)),
    );
  }, [selectedServices, identities, bindings, editingBinding]);

  if (!isOpen) return null;

  const toggleSelectService = (item: ServiceCatalogItem) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      if (exists) {
        return prev.filter((s) => s.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const handleAddCustomService = () => {
    const raw = customInput.trim();
    if (!raw) return;
    const customMeta = inferCustomServiceMeta(raw);
    setSelectedServices((prev) => {
      if (prev.some((s) => s.id === customMeta.id)) return prev;
      return [...prev, customMeta];
    });
    setCustomInput('');
  };

  const handleConfirmSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetIdentityId || selectedServices.length === 0) return;

    const parsedPrice = priceStr.trim() ? Number(priceStr) : undefined;
    const parsedRenewal = renewalDayStr.trim()
      ? Math.min(31, Math.max(1, Math.round(Number(renewalDayStr))))
      : undefined;

    const subscription = isPaid
      ? {
          isPaid: true,
          planName: planName.trim() || undefined,
          price:
            parsedPrice !== undefined &&
            Number.isFinite(parsedPrice) &&
            parsedPrice >= 0
              ? parsedPrice
              : undefined,
          currency,
          cycle,
          renewalDay:
            parsedRenewal !== undefined && Number.isFinite(parsedRenewal)
              ? parsedRenewal
              : undefined,
          paymentCardId: paymentCardId || undefined,
        }
      : undefined;

    const needsOAuthLink =
      authMethod === 'google' || authMethod === 'apple' || authMethod === 'github';

    if (editingBinding) {
      updateBinding(editingBinding.id, {
        identityId: targetIdentityId,
        authMethod,
        oauthProviderId:
          needsOAuthLink && oauthProviderId ? oauthProviderId : undefined,
        accountName: accountName.trim() || undefined,
        subscription,
        note: note.trim() || undefined,
      });
      onClose();
      return;
    }

    const inputs: NewBindingInput[] = selectedServices.map((svc) => ({
      identityId: targetIdentityId,
      serviceId: svc.id,
      serviceName: svc.name,
      serviceDomain: svc.domain,
      accountName: accountName.trim() || undefined,
      authMethod,
      oauthProviderId:
        needsOAuthLink && oauthProviderId ? oauthProviderId : undefined,
      subscription,
      note: note.trim() || undefined,
    }));

    addBindingsBatch(inputs);
    onClose();
  };

  const showOAuthLinkPicker =
    authMethod === 'google' || authMethod === 'apple' || authMethod === 'github';

  const renderDuplicateGuardBanner = () => {
    if (duplicateAlerts.length === 0) return null;

    return (
      <div
        role="alert"
        data-testid="duplicate-guard-banner"
        className="rounded-2xl border border-amber-500/40 bg-amber-50/95 p-3.5 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/45 dark:text-amber-100"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs font-bold tracking-tight">
              {t('duplicateGuardTitle')}
            </p>
            <ul className="space-y-1 text-xs leading-relaxed">
              {duplicateAlerts.slice(0, 4).map(({ service, matches }) => {
                const top = matches[0];
                const maskedId = formatIdentityIdentifier(
                  top.identity.identifier,
                  top.identity.type,
                  privacyMode,
                  { last4: top.identity.cardLast4, compact: true },
                );
                const svcLabel =
                  language === 'zh' ? service.nameZh || service.name : service.name;
                const planDetail = top.isPaid
                  ? [
                      top.binding.subscription?.planName || t('paidBadge'),
                      top.binding.subscription?.price
                        ? `${top.binding.subscription.currency ?? 'MYR'} ${top.binding.subscription.price}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : '';

                const linkedBank = top.binding.subscription?.paymentCardId
                  ? identityById.get(top.binding.subscription.paymentCardId)
                  : undefined;
                const bankSuffix =
                  top.isPaid && linkedBank
                    ? t('duplicateGuardBankSuffix', {
                        bank: `${linkedBank.bankName || linkedBank.label} ${formatIdentityIdentifier(
                          linkedBank.identifier,
                          'bank',
                          privacyMode,
                          { last4: linkedBank.cardLast4, compact: true },
                        )}`,
                      })
                    : '';

                const baseMsg = top.isPaid
                  ? t('duplicateGuardPaidWarn', {
                      service: svcLabel,
                      identity: top.identity.label,
                      identifier: maskedId,
                      plan: planDetail,
                    })
                  : t('duplicateGuardNormalWarn', {
                      service: svcLabel,
                      identity: top.identity.label,
                      identifier: maskedId,
                    });

                return (
                  <li
                    key={`${service.id}-${top.binding.id}`}
                    className="flex flex-wrap items-center gap-1"
                  >
                    <span>
                      {baseMsg}
                      {bankSuffix}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-pick-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-black/[0.08] bg-[#FFFFFF]/95 shadow-2xl backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#111114]/95 sm:rounded-[28px]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.07] px-5 py-4 dark:border-white/[0.08]">
          <div className="min-w-0">
            <h2
              id="quick-pick-title"
              className="truncate text-base font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
            >
              {isEditMode ? t('quickPickEditTitle') : t('quickPickTitle')}
            </h2>
            {!isEditMode && (
              <div className="mt-1 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`font-semibold transition-colors ${
                    step === 1
                      ? 'text-[#111113] dark:text-[#FAFAFA]'
                      : 'text-[#71717A] hover:text-[#111113] dark:text-[#8E8E98] dark:hover:text-[#FAFAFA]'
                  }`}
                >
                  {t('quickPickStep1')}
                </button>
                <span className="text-black/20 dark:text-white/20">/</span>
                <button
                  type="button"
                  disabled={selectedServices.length === 0}
                  onClick={() => {
                    if (selectedServices.length > 0) setStep(2);
                  }}
                  className={`font-semibold transition-colors disabled:opacity-40 ${
                    step === 2
                      ? 'text-[#111113] dark:text-[#FAFAFA]'
                      : 'text-[#71717A] hover:text-[#111113] dark:text-[#8E8E98] dark:hover:text-[#FAFAFA]'
                  }`}
                >
                  {t('quickPickStep2')}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.045] text-[#52525B] transition-colors hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.12] dark:hover:text-[#FAFAFA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ======================== STEP 1: CATALOG MULTI-SELECT ======================== */}
        {step === 1 && !isEditMode && (
          <>
            <div className="space-y-3 border-b border-black/[0.07] bg-[#F5F5F7]/85 px-5 py-3.5 dark:border-white/[0.08] dark:bg-[#09090B]/85">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                <div className="relative sm:col-span-6">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('quickPickSearchPlaceholder')}
                    data-testid="quick-pick-search"
                    className="h-10 w-full rounded-xl border border-black/[0.09] bg-white pl-9 pr-8 text-sm text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#141418] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-[#FAFAFA]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('close')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:text-[#111113] dark:hover:text-[#FAFAFA]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 sm:col-span-6">
                  <div className="relative flex-1">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomService();
                        }
                      }}
                      placeholder={t('quickPickCustomPlaceholder')}
                      className="h-10 w-full rounded-xl border border-black/[0.09] bg-white pl-8 pr-3 text-xs text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#141418] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-[#FAFAFA]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomService}
                    disabled={!customInput.trim()}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-black/[0.09] bg-white px-3 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/[0.1] dark:bg-[#18181D] dark:text-[#FAFAFA] dark:hover:bg-white/[0.09]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('quickPickAddCustom')}</span>
                  </button>
                </div>
              </div>

              <div className="mask-fade-right no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5 pr-8">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-[#111113] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                      : 'bg-white text-[#52525B] ring-1 ring-black/[0.07] hover:text-[#111113] dark:bg-[#141418] dark:text-[#A1A1AA] dark:ring-white/[0.08] dark:hover:text-[#FAFAFA]'
                  }`}
                >
                  {getCategoryLabel(language, 'all')}
                </button>
                {SERVICE_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#111113] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                          : 'bg-white text-[#52525B] ring-1 ring-black/[0.07] hover:text-[#111113] dark:bg-[#141418] dark:text-[#A1A1AA] dark:ring-white/[0.08] dark:hover:text-[#FAFAFA]'
                      }`}
                    >
                      {language === 'zh' ? cat.nameZh : cat.nameEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="thin-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {renderDuplicateGuardBanner()}

              {selectedServices.some((s) => s.id.startsWith('custom:')) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedServices
                    .filter((s) => s.id.startsWith('custom:'))
                    .map((svc) => (
                      <span
                        key={svc.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] py-1 pl-1.5 pr-2.5 text-xs font-medium text-[#111113] ring-1 ring-black/[0.08] dark:bg-white/[0.08] dark:text-[#FAFAFA] dark:ring-white/[0.1]"
                      >
                        <ServiceBadge service={svc} size="xs" />
                        <span>{svc.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleSelectService(svc)}
                          className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/15"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}

              {filteredCatalog.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#52525B] dark:text-[#A1A1AA]">
                  {t('cmdNoResults')}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {filteredCatalog.map((item) => {
                    const selected = selectedIds.has(item.id);
                    const existing = existingServiceMap.get(item.id.toLowerCase());
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSelectService(item)}
                        data-testid={`catalog-tile-${item.id}`}
                        aria-pressed={selected}
                        className={`relative flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all duration-150 ${
                          selected
                            ? 'border-[#111113] bg-black/[0.04] ring-1 ring-[#111113] dark:border-[#FAFAFA] dark:bg-white/[0.08] dark:ring-[#FAFAFA]'
                            : 'border-black/[0.07] bg-white hover:border-black/20 hover:bg-black/[0.015] dark:border-white/[0.08] dark:bg-[#0B0B0E] dark:hover:border-white/20 dark:hover:bg-[#141419]'
                        }`}
                      >
                        <ServiceBadge service={item} size="sm" />
                        <div className="min-w-0 flex-1 pr-5">
                          <span className="block truncate text-xs font-semibold text-[#111113] dark:text-[#FAFAFA]">
                            {language === 'zh' ? item.nameZh : item.name}
                          </span>
                          <span className="block truncate text-[10.5px] text-[#71717A] dark:text-[#8E8E98]">
                            {existing
                              ? existing.hasPaid
                                ? language === 'zh'
                                  ? '已绑 · 含会员'
                                  : 'Bound · Paid'
                                : language === 'zh'
                                  ? '已绑定过'
                                  : 'Already bound'
                              : item.domain || item.name}
                          </span>
                        </div>

                        <span
                          className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                            selected
                              ? 'border-[#111113] bg-[#111113] text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#09090B]'
                              : existing?.hasPaid
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'border-zinc-300 bg-transparent dark:border-zinc-700'
                          }`}
                        >
                          {selected ? (
                            <Check className="h-3 w-3" />
                          ) : existing?.hasPaid ? (
                            <CreditCard className="h-2.5 w-2.5" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/[0.07] bg-white/90 px-5 py-3.5 safe-pb dark:border-white/[0.08] dark:bg-[#111114]/90">
              <span className="text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                {t('quickPickSelectedCount', { count: selectedServices.length })}
              </span>
              <button
                type="button"
                disabled={selectedServices.length === 0}
                onClick={() => setStep(2)}
                data-testid="quick-pick-next-btn"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#111113] px-5 text-xs font-medium text-white transition-colors hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-[#E4E4E7]"
              >
                <span>{t('quickPickNextStep')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* ======================== STEP 2: IDENTITY, AUTH & SUBSCRIPTION + BILLING BANK ======================== */}
        {(step === 2 || isEditMode) && (
          <form onSubmit={handleConfirmSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="thin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Selected Service Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedServices.map((svc) => (
                  <span
                    key={svc.id}
                    className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-black/[0.03] py-1 pl-1.5 pr-3 text-xs font-semibold text-[#111113] dark:border-white/[0.09] dark:bg-white/[0.06] dark:text-[#FAFAFA]"
                  >
                    <ServiceBadge service={svc} size="xs" />
                    <span>{language === 'zh' ? svc.nameZh : svc.name}</span>
                    {!isEditMode && selectedServices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleSelectService(svc)}
                        aria-label={t('close')}
                        className="rounded-full p-0.5 text-zinc-400 hover:bg-black/10 hover:text-[#111113] dark:hover:bg-white/10 dark:hover:text-[#FAFAFA]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Duplicate-Binding Anti-Mistake Guard */}
              {renderDuplicateGuardBanner()}

              {/* Target Login Identity Card Selector */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  {t('quickPickTargetIdentity')}
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {identities.map((card) => {
                    const active = targetIdentityId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setTargetIdentityId(card.id)}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                          active
                            ? 'border-[#111113] bg-black/[0.04] ring-1 ring-[#111113] dark:border-[#FAFAFA] dark:bg-white/[0.08] dark:ring-[#FAFAFA]'
                            : 'border-black/[0.08] bg-white hover:bg-black/[0.02] dark:border-white/[0.08] dark:bg-[#09090B] dark:hover:bg-[#141419]'
                        }`}
                      >
                        <IdentityLogoBadge identity={card} size="xs" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-[#111113] dark:text-[#FAFAFA]">
                            {card.label}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-[#71717A] dark:text-[#8E8E98]">
                            {formatIdentityIdentifier(
                              card.identifier,
                              card.type,
                              privacyMode,
                              { last4: card.cardLast4, compact: true },
                            )}
                          </span>
                        </div>
                        {active && (
                          <Check className="h-4 w-4 shrink-0 text-[#111113] dark:text-[#FAFAFA]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auth Method Selector */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  {t('quickPickAuthMethod')}
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AUTH_METHODS.map((method) => {
                    const active = authMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setAuthMethod(method)}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                          active
                            ? 'border-[#111113] bg-[#111113] text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#09090B]'
                            : 'border-black/[0.08] bg-white text-[#52525B] hover:bg-black/[0.03] hover:text-[#111113] dark:border-white/[0.08] dark:bg-[#09090B] dark:text-[#A1A1AA] dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]'
                        }`}
                      >
                        {getAuthMethodLabel(language, method)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Linked OAuth Identity */}
              {showOAuthLinkPicker && identities.length > 0 && (
                <div>
                  <label
                    htmlFor="oauth-provider-select"
                    className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                  >
                    {t('quickPickOAuthCard')}
                  </label>
                  <select
                    id="oauth-provider-select"
                    value={oauthProviderId}
                    onChange={(e) => setOauthProviderId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-xs font-medium text-[#111113] focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#FAFAFA]"
                  >
                    <option value="">
                      {language === 'zh'
                        ? '使用当前绑定的身份卡'
                        : 'Same as bound identity card'}
                    </option>
                    {identities
                      .filter((c) => c.type !== 'bank')
                      .map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.label} (
                          {formatIdentityIdentifier(
                            card.identifier,
                            card.type,
                            privacyMode,
                          )}
                          )
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Optional Multi-Account Username */}
              <div>
                <label
                  htmlFor="binding-account-input"
                  className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                >
                  {t('quickPickAccountName')}
                </label>
                <input
                  id="binding-account-input"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={t('quickPickAccountPlaceholder')}
                  className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-sm text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-[#FAFAFA]"
                />
              </div>

              {/* Paid Subscription Switch, Pricing Fields & Auto-Debit Billing Bank Card Selector */}
              <div className="rounded-2xl border border-black/[0.08] bg-[#F5F5F7]/80 p-4 dark:border-white/[0.08] dark:bg-[#09090B]/80">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-[#111113] dark:text-[#FAFAFA]">
                      {t('quickPickPaidToggle')}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPaid}
                    data-testid="quick-pick-paid-switch"
                    onClick={() => setIsPaid((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      isPaid
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                        isPaid ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {isPaid && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="col-span-2">
                        <label
                          htmlFor="sub-plan-input"
                          className="mb-1 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                        >
                          {t('quickPickPlanName')}
                        </label>
                        <input
                          id="sub-plan-input"
                          type="text"
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          placeholder={t('quickPickPlanPlaceholder')}
                          className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-xs text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#141418] dark:text-[#FAFAFA]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="sub-price-input"
                          className="mb-1 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                        >
                          {t('quickPickPrice')}
                        </label>
                        <input
                          id="sub-price-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceStr}
                          onChange={(e) => setPriceStr(e.target.value)}
                          placeholder="20.00"
                          className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-xs text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#141418] dark:text-[#FAFAFA]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="sub-currency-select"
                          className="mb-1 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                        >
                          {t('quickPickCurrency')}
                        </label>
                        <select
                          id="sub-currency-select"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                          className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-2.5 font-mono text-xs font-semibold text-[#111113] focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#141418] dark:text-[#FAFAFA]"
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label
                          htmlFor="sub-cycle-select"
                          className="mb-1 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                        >
                          {t('quickPickCycle')}
                        </label>
                        <select
                          id="sub-cycle-select"
                          value={cycle}
                          onChange={(e) => setCycle(e.target.value as BillingCycle)}
                          className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-2.5 text-xs font-medium text-[#111113] focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#141418] dark:text-[#FAFAFA]"
                        >
                          {CYCLES.map((c) => (
                            <option key={c} value={c}>
                              {getBillingCycleLabel(language, c)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label
                          htmlFor="sub-renewal-input"
                          className="mb-1 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                        >
                          {t('quickPickRenewalDay')}
                        </label>
                        <input
                          id="sub-renewal-input"
                          type="number"
                          min="1"
                          max="31"
                          value={renewalDayStr}
                          onChange={(e) => setRenewalDayStr(e.target.value)}
                          placeholder="15"
                          className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-xs text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#141418] dark:text-[#FAFAFA]"
                        />
                      </div>
                    </div>

                    {/* Auto-Debit Billing Bank Card Picker */}
                    <div className="border-t border-black/[0.06] pt-3.5 dark:border-white/[0.07]">
                      <label className="mb-2 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                        {t('billingCardLabel')}
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setPaymentCardId('')}
                          data-testid="billing-card-none"
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                            paymentCardId === ''
                              ? 'border-[#111113] bg-black/[0.05] text-[#111113] dark:border-[#FAFAFA] dark:bg-white/[0.09] dark:text-[#FAFAFA]'
                              : 'border-black/[0.08] bg-white text-[#52525B] hover:text-[#111113] dark:border-white/[0.08] dark:bg-[#141418] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] dark:bg-white/[0.08]">
                            <X className="h-3.5 w-3.5 opacity-60" />
                          </span>
                          <span className="truncate">{t('billingCardNone')}</span>
                        </button>

                        {bankCards.map((bank) => {
                          const active = paymentCardId === bank.id;
                          const preset = getBankPresetById(bank.bankId || bank.provider);
                          return (
                            <button
                              key={bank.id}
                              type="button"
                              onClick={() => setPaymentCardId(bank.id)}
                              data-testid={`billing-card-${bank.id}`}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                                active
                                  ? 'border-[#111113] bg-black/[0.05] ring-1 ring-[#111113] dark:border-[#FAFAFA] dark:bg-white/[0.09] dark:ring-[#FAFAFA]'
                                  : 'border-black/[0.08] bg-white hover:border-black/20 dark:border-white/[0.08] dark:bg-[#141418] dark:hover:border-white/20'
                              }`}
                            >
                              <ServiceBadge
                                serviceId={bank.bankId || bank.provider || 'custom:bank'}
                                serviceName={bank.bankName || bank.label}
                                serviceDomain={
                                  getBankLogoDomain(bank.bankId || bank.provider) ??
                                  preset?.domain
                                }
                                size="xxs"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold text-[#111113] dark:text-[#FAFAFA]">
                                  {bank.bankName || bank.label}
                                </span>
                                <span className="block truncate font-mono text-[10.5px] text-[#71717A] dark:text-[#8E8E98]">
                                  {formatIdentityIdentifier(
                                    bank.identifier,
                                    'bank',
                                    privacyMode,
                                    { last4: bank.cardLast4, compact: true },
                                  )}
                                </span>
                              </div>
                              {active && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-[#111113] dark:text-[#FAFAFA]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Note + Zero Password Policy */}
              <div>
                <label
                  htmlFor="binding-note-input"
                  className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                >
                  {t('quickPickNote')}
                </label>
                <input
                  id="binding-note-input"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('quickPickNotePlaceholder')}
                  className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-xs text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-[#FAFAFA]"
                />
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('quickPickZeroPasswordReminder')}</span>
                </p>
              </div>
            </div>

            {/* Step 2 Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-black/[0.07] bg-white/90 px-5 py-3.5 safe-pb dark:border-white/[0.08] dark:bg-[#111114]/90">
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-black/[0.045] px-4 text-xs font-medium text-[#111113] transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{t('quickPickBack')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-full bg-black/[0.045] px-4 text-xs font-medium text-[#111113] transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                >
                  {t('editorCancel')}
                </button>
              )}

              <button
                type="submit"
                disabled={!targetIdentityId || selectedServices.length === 0}
                data-testid="quick-pick-confirm-btn"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#111113] px-5 text-xs font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-[#E4E4E7]"
              >
                <Check className="h-4 w-4" />
                <span>
                  {isEditMode
                    ? t('quickPickSaveChanges')
                    : t('quickPickConfirmAdd', { count: selectedServices.length })}
                </span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
