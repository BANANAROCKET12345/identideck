import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  CreditCard,
  Mail,
  Search,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import {
  BANK_CATALOG,
  getBankPresetById,
  searchBanks,
  type BankPreset,
  type BankRegion,
} from '../data/bankCatalog';
import { getBankCardSkin, getCarrierSimSkin } from '../data/bankCardSkins';
import { getLocalIdentityLogoPath } from '../data/brandIcons';
import { useT } from '../i18n/translations';
import { useVaultStore } from '../store/useVaultStore';
import {
  CARD_THEMES,
  type BankCardKind,
  type CardNetwork,
  type CardTheme,
  type IdentityCard,
  type IdentityType,
} from '../types/vault';
import { IdentityCardVisual } from './IdentityCardVisual';
import { ServiceBadge } from './ServiceBadge';

export interface IdentityEditorModalProps {
  isOpen: boolean;
  identity?: IdentityCard | null;
  editingIdentity?: IdentityCard | null;
  defaultType?: IdentityType;
  onClose: () => void;
}

const EMAIL_PROVIDERS = [
  { id: 'gmail', label: 'Gmail' },
  { id: 'icloud', label: 'iCloud' },
  { id: 'outlook', label: 'Outlook' },
  { id: 'proton', label: 'Proton' },
  { id: 'qq', label: 'QQ Mail' },
  { id: '163', label: '163 Mail' },
  { id: 'yahoo', label: 'Yahoo' },
  { id: 'zoho', label: 'Zoho' },
  { id: 'fastmail', label: 'Fastmail' },
  { id: 'tuta', label: 'Tuta' },
  { id: 'custom', label: 'Custom' },
] as const;

const CARRIER_PRESETS = [
  { id: 'maxis', silkscreen: 'MAXIS 5G', countryCode: '+60', region: 'MY' },
  { id: 'hotlink', silkscreen: 'HOTLINK 5G', countryCode: '+60', region: 'MY' },
  { id: 'celcomdigi', silkscreen: 'CELCOMDIGI', countryCode: '+60', region: 'MY' },
  { id: 'umobile', silkscreen: 'U MOBILE', countryCode: '+60', region: 'MY' },
  { id: 'unifi', silkscreen: 'UNIFI 5G', countryCode: '+60', region: 'MY' },
  { id: 'yes5g', silkscreen: 'YES 5G', countryCode: '+60', region: 'MY' },
  { id: 'tunetalk', silkscreen: 'TUNE TALK', countryCode: '+60', region: 'MY' },
  { id: 'singtel', silkscreen: 'SINGTEL 5G', countryCode: '+65', region: 'SG' },
  { id: 'chinamobile', silkscreen: 'CHINA MOBILE', countryCode: '+86', region: 'CN' },
  { id: 'chinaunicom', silkscreen: 'CHINA UNICOM', countryCode: '+86', region: 'CN' },
  { id: 'chinatelecom', silkscreen: 'CHINA TELECOM', countryCode: '+86', region: 'CN' },
  { id: 'custom', silkscreen: 'CUSTOM SIM', countryCode: '+60', region: 'INTL' },
] as const;

const CARD_NETWORKS: Array<{ id: CardNetwork; label: string }> = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'mydebit', label: 'MyDebit' },
  { id: 'unionpay', label: 'UnionPay' },
  { id: 'amex', label: 'AMEX' },
  { id: 'ewallet', label: 'eWallet' },
];

const CARD_KINDS: BankCardKind[] = ['debit', 'credit', 'prepaid'];
const THEME_LIST: CardTheme[] = ['titanium', 'navy', 'emerald', 'silver', 'amber'];

export function IdentityEditorModal({
  isOpen,
  identity,
  editingIdentity,
  defaultType,
  onClose,
}: IdentityEditorModalProps) {
  const { t, language } = useT();
  const addIdentity = useVaultStore((s) => s.addIdentity);
  const updateIdentity = useVaultStore((s) => s.updateIdentity);
  const privacyMode = useVaultStore((s) => s.privacyMode);

  const target = editingIdentity ?? identity ?? null;

  const [type, setType] = useState<IdentityType>('email');
  const [label, setLabel] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [provider, setProvider] = useState('gmail');
  const [cardTheme, setCardTheme] = useState<CardTheme>('titanium');
  const [useAuthenticSkin, setUseAuthenticSkin] = useState(true);
  const [simCarrier, setSimCarrier] = useState('MAXIS 5G');
  const [simCountryCode, setSimCountryCode] = useState('+60');

  // Bank Card fields
  const [bankId, setBankId] = useState('maybank');
  const [bankName, setBankName] = useState('Maybank MAE');
  const [cardLast4, setCardLast4] = useState('');
  const [cardNetwork, setCardNetwork] = useState<CardNetwork>('visa');
  const [cardKind, setCardKind] = useState<BankCardKind>('debit');
  const [cardExpiry, setCardExpiry] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [bankRegion, setBankRegion] = useState<
    BankRegion | 'digital' | 'all' | 'custom'
  >('malaysia');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (target) {
      setType(target.type);
      setLabel(target.label);
      setIdentifier(target.identifier);
      setProvider(
        target.provider ||
          (target.type === 'phone'
            ? 'maxis'
            : target.type === 'bank'
              ? target.bankId || 'maybank'
              : 'gmail'),
      );
      setCardTheme(target.cardTheme || 'titanium');
      setUseAuthenticSkin(target.useAuthenticSkin !== false);
      setSimCarrier(target.simCarrier || 'MAXIS 5G');
      setSimCountryCode(target.simCountryCode || '+60');
      setBankId(target.bankId || 'maybank');
      setBankName(target.bankName || target.label || 'Maybank');
      setCardLast4(target.cardLast4 || '');
      setCardNetwork(target.cardNetwork || 'visa');
      setCardKind(target.cardKind || 'debit');
      setCardExpiry(target.cardExpiry || '');
      const preset = getBankPresetById(target.bankId);
      setBankRegion(preset ? preset.region : target.type === 'bank' ? 'custom' : 'malaysia');
    } else {
      const initType: IdentityType = defaultType ?? 'email';
      const defaultBank = BANK_CATALOG[0];
      setType(initType);
      setLabel('');
      setIdentifier('');
      setProvider(
        initType === 'phone'
          ? 'maxis'
          : initType === 'bank'
            ? defaultBank.id
            : 'gmail',
      );
      setCardTheme(
        initType === 'phone'
          ? 'emerald'
          : initType === 'bank'
            ? defaultBank.defaultTheme
            : 'titanium',
      );
      setUseAuthenticSkin(true);
      setSimCarrier('MAXIS 5G');
      setSimCountryCode('+60');
      setBankId(defaultBank.id);
      setBankName(language === 'zh' ? defaultBank.nameZh : defaultBank.nameEn);
      setCardLast4('');
      setCardNetwork(defaultBank.defaultNetwork);
      setCardKind('debit');
      setCardExpiry('');
      setBankRegion('malaysia');
    }
    setBankSearch('');
    setErrorMsg(null);
  }, [isOpen, target, defaultType, language]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const filteredBanks = useMemo(() => {
    if (bankRegion === 'custom') return [];
    return searchBanks(bankSearch, bankRegion);
  }, [bankSearch, bankRegion]);

  if (!isOpen) return null;

  const handleSelectBankPreset = (preset: BankPreset) => {
    const prevPreset = getBankPresetById(bankId);
    const nextDisplayName = language === 'zh' ? preset.nameZh : preset.nameEn;
    setBankId(preset.id);
    setProvider(preset.id);
    setBankName(nextDisplayName);
    setCardTheme(preset.defaultTheme);
    setUseAuthenticSkin(true);
    setCardNetwork(preset.defaultNetwork);
    if (
      !label.trim() ||
      label === prevPreset?.nameZh ||
      label === prevPreset?.nameEn
    ) {
      setLabel(nextDisplayName);
    }
    setErrorMsg(null);
  };

  const handleSwitchType = (nextType: IdentityType) => {
    setType(nextType);
    setErrorMsg(null);
    if (nextType === 'phone') {
      if (!CARRIER_PRESETS.some((c) => c.id === provider)) {
        setProvider('maxis');
        setSimCarrier('MAXIS 5G');
        setSimCountryCode('+60');
      }
      if (!target) setCardTheme('emerald');
    } else if (nextType === 'bank') {
      const preset = getBankPresetById(bankId) ?? BANK_CATALOG[0];
      setBankId(preset.id);
      setProvider(preset.id);
      setBankName(language === 'zh' ? preset.nameZh : preset.nameEn);
      if (!target) {
        setCardTheme(preset.defaultTheme);
        setCardNetwork(preset.defaultNetwork);
      }
    } else {
      if (!EMAIL_PROVIDERS.some((p) => p.id === provider)) {
        setProvider('gmail');
      }
      if (!target) setCardTheme('titanium');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (type === 'bank') {
      const cleanBankName = bankName.trim();
      const cleanLast4 = cardLast4.replace(/\D/g, '').slice(0, 4);
      const cleanLabel = label.trim() || cleanBankName;

      if (!cleanBankName) {
        setErrorMsg(
          language === 'zh'
            ? '请选择或输入银行名称'
            : 'Please select or enter a bank name.',
        );
        return;
      }
      if (cleanLast4.length !== 4) {
        setErrorMsg(
          language === 'zh'
            ? '请输入银行卡尾号 4 位数字（仅用于识别）'
            : 'Please enter the last 4 digits of your card.',
        );
        return;
      }

      const payload = {
        type: 'bank' as const,
        label: cleanLabel,
        identifier: `•••• ${cleanLast4}`,
        provider: bankRegion === 'custom' ? 'custom' : bankId || 'custom',
        cardTheme,
        useAuthenticSkin: bankRegion === 'custom' ? false : useAuthenticSkin,
        bankId: bankRegion === 'custom' ? undefined : bankId || undefined,
        bankName: cleanBankName,
        cardLast4: cleanLast4,
        cardNetwork,
        cardKind,
        cardExpiry: cardExpiry.trim() || undefined,
        simCarrier: undefined,
        simCountryCode: undefined,
      };

      if (target) {
        updateIdentity(target.id, payload);
      } else {
        addIdentity(payload);
      }
      onClose();
      return;
    }

    const cleanLabel = label.trim();
    const cleanIdentifier = identifier.trim();

    if (!cleanLabel) {
      setErrorMsg(
        language === 'zh'
          ? '请填写卡片名称（例如：主力个人邮箱）'
          : 'Please enter a label for this identity card.',
      );
      return;
    }
    if (!cleanIdentifier) {
      setErrorMsg(
        language === 'zh'
          ? type === 'phone'
            ? '请填写手机号码'
            : '请填写邮箱地址'
          : type === 'phone'
            ? 'Please enter a phone number.'
            : 'Please enter an email address.',
      );
      return;
    }

    const payload = {
      type,
      label: cleanLabel,
      identifier: cleanIdentifier,
      provider: provider.trim() || 'custom',
      cardTheme,
      ...(type === 'phone' ? { useAuthenticSkin } : { useAuthenticSkin: undefined }),
      bankId: undefined,
      bankName: undefined,
      cardLast4: undefined,
      cardNetwork: undefined,
      cardKind: undefined,
      cardExpiry: undefined,
      ...(type === 'phone'
        ? {
            simCarrier: simCarrier.trim() || 'SIM 5G',
            simCountryCode: simCountryCode.trim() || '+60',
          }
        : {
            simCarrier: undefined,
            simCountryCode: undefined,
          }),
    };

    if (target) {
      updateIdentity(target.id, payload);
    } else {
      addIdentity(payload);
    }
    onClose();
  };

  const previewLast4 = cardLast4.replace(/\D/g, '').slice(0, 4) || '4829';
  const previewCard: IdentityCard = {
    id: target?.id ?? 'preview',
    type,
    label:
      label.trim() ||
      (type === 'bank'
        ? bankName.trim() || 'Maybank MAE'
        : type === 'phone'
          ? language === 'zh'
            ? '马来西亚主力号码'
            : 'Malaysia Main SIM'
          : language === 'zh'
            ? '主力个人邮箱'
            : 'Primary Personal Email'),
    identifier:
      type === 'bank'
        ? `•••• ${previewLast4}`
        : identifier.trim() ||
          (type === 'phone' ? '+60 12-345 6789' : 'name@gmail.com'),
    provider: type === 'bank' ? (bankRegion === 'custom' ? 'custom' : bankId) : provider,
    cardTheme,
    useAuthenticSkin:
      type === 'bank'
        ? bankRegion !== 'custom' && useAuthenticSkin
        : type === 'phone'
          ? useAuthenticSkin
          : undefined,
    simCarrier: type === 'phone' ? simCarrier : undefined,
    simCountryCode: type === 'phone' ? simCountryCode : undefined,
    bankId: type === 'bank' && bankRegion !== 'custom' ? bankId : undefined,
    bankName: type === 'bank' ? bankName.trim() || 'Maybank MAE' : undefined,
    cardLast4: type === 'bank' ? previewLast4 : undefined,
    cardNetwork: type === 'bank' ? cardNetwork : undefined,
    cardKind: type === 'bank' ? cardKind : undefined,
    cardExpiry: type === 'bank' ? cardExpiry.trim() || undefined : undefined,
    order: 0,
    createdAt: Date.now(),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-black/[0.08] bg-[#FFFFFF]/95 shadow-2xl backdrop-blur-2xl dark:border-white/[0.09] dark:bg-[#111114]/95 sm:rounded-[28px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4 dark:border-white/[0.08]">
          <h2
            id="identity-editor-title"
            className="text-base font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
          >
            {target ? t('editorEditTitle') : t('editorNewTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.045] text-[#52525B] transition-colors hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.12] dark:hover:text-[#FAFAFA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="thin-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4"
        >
          {/* Live 1:1 Physical Card Preview Stage */}
          <div className="flex justify-center rounded-2xl bg-[#F5F5F7] px-3 py-4 dark:bg-[#050507]">
            <IdentityCardVisual
              identity={previewCard}
              boundCount={0}
              privacyMode={privacyMode}
            />
          </div>

          {/* 3-Tab Identity Type Segmented Switch: Email · Phone SIM · Bank Card */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
              {t('editorTypeLabel')}
            </label>
            <div className="grid grid-cols-3 rounded-full bg-black/[0.045] p-1 dark:bg-white/[0.06]">
              {(
                [
                  { id: 'email', label: t('filterTypeEmail'), Icon: Mail },
                  { id: 'phone', label: t('filterTypePhone'), Icon: Smartphone },
                  { id: 'bank', label: t('filterTypeBank'), Icon: CreditCard },
                ] as const
              ).map(({ id, label: tabLabel, Icon }) => {
                const active = type === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`editor-type-${id}`}
                    onClick={() => handleSwitchType(id)}
                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? 'bg-white text-[#111113] shadow-2xs ring-1 ring-black/[0.05] dark:bg-white/[0.14] dark:text-[#FAFAFA] dark:ring-white/[0.08]'
                        : 'text-[#52525B] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tabLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================== BANK CARD FORM ======================== */}
          {type === 'bank' ? (
            <div className="space-y-4">
              {/* Searchable 26-Bank Catalog Selector */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={bankSearch}
                    onChange={(e) => {
                      setBankSearch(e.target.value);
                      if (bankRegion === 'custom') setBankRegion('all');
                    }}
                    placeholder={t('bankSearchPlaceholder')}
                    data-testid="bank-preset-search"
                    className="h-9.5 w-full rounded-xl border border-black/[0.1] bg-white pl-9 pr-3 text-xs text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-[#FAFAFA]"
                  />
                </div>

                {/* Bank Region Filter Chips */}
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {(
                    [
                      { id: 'malaysia', label: t('bankRegionMalaysia') },
                      { id: 'digital', label: t('bankRegionDigital') },
                      { id: 'global', label: t('bankRegionGlobal') },
                      { id: 'china', label: t('bankRegionChina') },
                      { id: 'all', label: t('filterTypeAll') },
                      { id: 'custom', label: t('bankRegionCustom') },
                    ] as const
                  ).map((reg) => {
                    const active = bankRegion === reg.id;
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => {
                          setBankRegion(reg.id);
                          if (reg.id === 'custom') {
                            setBankId('');
                            setProvider('custom');
                          }
                        }}
                        className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                          active
                            ? 'bg-[#111113] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                            : 'bg-black/[0.045] text-[#52525B] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                        }`}
                      >
                        {reg.label}
                      </button>
                    );
                  })}
                </div>

                {/* 26-Bank Official Logo Preset Grid */}
                {bankRegion !== 'custom' && (
                  <div className="thin-scrollbar grid max-h-[184px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                    {filteredBanks.map((bank) => {
                      const active = bankId === bank.id;
                      return (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => handleSelectBankPreset(bank)}
                          data-testid={`bank-preset-${bank.id}`}
                          className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                            active
                              ? 'border-[#111113] bg-black/[0.04] ring-1 ring-[#111113] dark:border-[#FAFAFA] dark:bg-white/[0.08] dark:ring-[#FAFAFA]'
                              : 'border-black/[0.07] bg-white hover:border-black/20 dark:border-white/[0.08] dark:bg-[#09090B] dark:hover:border-white/20'
                          }`}
                        >
                          <ServiceBadge
                            serviceId={bank.id}
                            serviceName={bank.nameEn}
                            serviceDomain={bank.domain}
                            size="xs"
                          />
                          <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[#111113] dark:text-[#FAFAFA]">
                            {language === 'zh' ? bank.nameZh : bank.nameEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bank Name + Card Nickname */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="bank-name-input"
                    className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                  >
                    {t('bankNameLabel')}
                  </label>
                  <input
                    id="bank-name-input"
                    type="text"
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Maybank MAE"
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-sm text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#FAFAFA]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bank-label-input"
                    className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                  >
                    {t('editorNameLabel')}
                  </label>
                  <input
                    id="bank-label-input"
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={
                      language === 'zh' ? '例如：主力订阅扣款卡' : 'e.g. Subscriptions Visa'
                    }
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-sm text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#FAFAFA]"
                  />
                </div>
              </div>

              {/* Last 4 Digits (ONLY!) + Expiry MM/YY */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="bank-last4-input"
                    className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                  >
                    {t('bankLast4Label')}
                  </label>
                  <input
                    id="bank-last4-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => {
                      setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4));
                      setErrorMsg(null);
                    }}
                    placeholder={t('bankLast4Placeholder')}
                    data-testid="bank-last4-input"
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-sm tracking-[0.25em] text-[#111113] placeholder:tracking-normal placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#FAFAFA]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bank-expiry-input"
                    className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                  >
                    {t('bankExpiryLabel')}
                  </label>
                  <input
                    id="bank-expiry-input"
                    type="text"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                    placeholder={t('bankExpiryPlaceholder')}
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-sm text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#FAFAFA]"
                  />
                </div>
              </div>

              <p className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/[0.08] px-3 py-2 text-[11.5px] font-medium text-emerald-800 dark:bg-emerald-500/12 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>{t('bankZeroSecretNotice')}</span>
              </p>

              {/* Card Network + Card Kind */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                    {t('bankNetworkLabel')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CARD_NETWORKS.map((net) => {
                      const active = cardNetwork === net.id;
                      return (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => setCardNetwork(net.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? 'bg-[#111113] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                              : 'bg-black/[0.045] text-[#52525B] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          {net.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                    {t('bankKindLabel')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CARD_KINDS.map((kind) => {
                      const active = cardKind === kind;
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setCardKind(kind)}
                          className={`rounded-xl border py-2 text-xs font-medium transition-colors ${
                            active
                              ? 'border-[#111113] bg-[#111113] text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#09090B]'
                              : 'border-black/[0.08] bg-white text-[#52525B] hover:text-[#111113] dark:border-white/[0.08] dark:bg-[#09090B] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          {t(`cardKind_${kind}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ======================== EMAIL / PHONE SIM FORM ======================== */
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="identity-label-input"
                    className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                  >
                    {t('editorNameLabel')}
                  </label>
                  <input
                    id="identity-label-input"
                    type="text"
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={
                      type === 'phone'
                        ? t('editorNamePlaceholderPhone')
                        : t('editorNamePlaceholderEmail')
                    }
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-sm text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-[#FAFAFA]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="identity-identifier-input"
                    className="mb-1.5 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                  >
                    {type === 'phone'
                      ? t('editorIdentifierPhone')
                      : t('editorIdentifierEmail')}
                  </label>
                  <input
                    id="identity-identifier-input"
                    type={type === 'phone' ? 'tel' : 'email'}
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={
                      type === 'phone'
                        ? t('editorPhonePlaceholder')
                        : t('editorEmailPlaceholder')
                    }
                    className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-sm text-[#111113] placeholder:text-zinc-400 focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-[#FAFAFA]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  {t('editorProviderLabel')}
                </label>
                {type === 'email' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {EMAIL_PROVIDERS.map((p) => {
                      const active = provider === p.id;
                      const logoPath = getLocalIdentityLogoPath(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          data-testid={`email-provider-${p.id}`}
                          onClick={() => setProvider(p.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-xs font-medium transition-colors ${
                            active
                              ? 'bg-[#111113] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                              : 'bg-black/[0.045] text-[#52525B] hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.12] dark:hover:text-[#FAFAFA]'
                          }`}
                        >
                          {logoPath ? (
                            <span className="inline-flex h-[18px] w-[18px] shrink-0 overflow-hidden rounded-[26%] bg-white ring-1 ring-inset ring-black/10">
                              <img
                                src={logoPath}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            </span>
                          ) : (
                            <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[26%] bg-black/[0.08] dark:bg-white/[0.12]">
                              <Mail className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {CARRIER_PRESETS.map((preset) => {
                        const active = provider === preset.id;
                        const logoPath = getLocalIdentityLogoPath(preset.id);
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            data-testid={`sim-carrier-${preset.id}`}
                            onClick={() => {
                              setProvider(preset.id);
                              setSimCarrier(preset.silkscreen);
                              setSimCountryCode(preset.countryCode);
                              setUseAuthenticSkin(preset.id !== 'custom');
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-xs font-medium transition-colors ${
                              active
                                ? 'bg-[#111113] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]'
                                : 'bg-black/[0.045] text-[#52525B] hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.12] dark:hover:text-[#FAFAFA]'
                            }`}
                          >
                            {logoPath ? (
                              <span className="inline-flex h-[18px] w-[18px] shrink-0 overflow-hidden rounded-[26%] bg-white ring-1 ring-inset ring-black/10">
                                <img
                                  src={logoPath}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              </span>
                            ) : (
                              <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[26%] bg-black/[0.08] dark:bg-white/[0.12]">
                                <Smartphone className="h-2.5 w-2.5" />
                              </span>
                            )}
                            <span>{preset.silkscreen}</span>
                            <span className="font-mono text-[10px] opacity-65">
                              {preset.region}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label
                          htmlFor="sim-carrier-input"
                          className="mb-1 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                        >
                          {t('editorCarrierLabel')}
                        </label>
                        <input
                          id="sim-carrier-input"
                          type="text"
                          value={simCarrier}
                          onChange={(e) => setSimCarrier(e.target.value)}
                          className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-xs font-semibold uppercase text-[#111113] focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#FAFAFA]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="sim-cc-input"
                          className="mb-1 block text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA]"
                        >
                          {t('editorCountryCodeLabel')}
                        </label>
                        <input
                          id="sim-cc-input"
                          type="text"
                          value={simCountryCode}
                          onChange={(e) => setSimCountryCode(e.target.value)}
                          className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-3 font-mono text-xs font-semibold text-[#111113] focus:border-[#111113] focus:outline-none dark:border-white/[0.1] dark:bg-[#09090B] dark:text-[#FAFAFA] dark:focus:border-[#FAFAFA]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Card Surface Style (1:1 Authentic Official Card vs Custom Metallic Swatches) */}
          {(() => {
            const matchedBankSkin =
              type === 'bank' && bankRegion !== 'custom'
                ? getBankCardSkin(bankId)
                : undefined;
            const matchedSimSkin =
              type === 'phone'
                ? getCarrierSimSkin(provider, simCarrier)
                : undefined;
            const authenticSwatchBg =
              matchedBankSkin?.swatchBackground ?? matchedSimSkin?.swatchBackground;
            const authenticIsLight =
              matchedBankSkin?.isLightSurface ?? matchedSimSkin?.isLightSurface ?? false;
            const hasAuthenticOption = Boolean(authenticSwatchBg);

            return (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                    {t('editorThemeLabel')}
                  </label>
                  {hasAuthenticOption && useAuthenticSkin && (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      {t('editorAuthenticSkinHint')}
                    </span>
                  )}
                </div>
                <div
                  className={`grid gap-2 ${
                    hasAuthenticOption ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-5'
                  }`}
                >
                  {hasAuthenticOption && (
                    <button
                      type="button"
                      data-testid="skin-authentic-btn"
                      onClick={() => setUseAuthenticSkin(true)}
                      className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all ${
                        useAuthenticSkin
                          ? 'border-[#111113] bg-black/[0.04] dark:border-[#FAFAFA] dark:bg-white/[0.08]'
                          : 'border-black/[0.07] bg-white hover:border-black/20 dark:border-white/[0.08] dark:bg-[#09090B] dark:hover:border-white/20'
                      }`}
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-inset ring-black/15"
                        style={{ background: authenticSwatchBg }}
                      >
                        {useAuthenticSkin && (
                          <Check
                            className={`h-3.5 w-3.5 ${
                              authenticIsLight ? 'text-[#111113]' : 'text-white'
                            }`}
                          />
                        )}
                      </span>
                      <span className="truncate text-[10.5px] font-semibold text-[#111113] dark:text-[#FAFAFA]">
                        {t('editorAuthenticSkin')}
                      </span>
                    </button>
                  )}

                  {THEME_LIST.map((themeId) => {
                    const spec = CARD_THEMES[themeId];
                    const selected =
                      (!hasAuthenticOption || !useAuthenticSkin) &&
                      cardTheme === themeId;
                    return (
                      <button
                        key={themeId}
                        type="button"
                        onClick={() => {
                          setUseAuthenticSkin(false);
                          setCardTheme(themeId);
                        }}
                        className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all ${
                          selected
                            ? 'border-[#111113] bg-black/[0.04] dark:border-[#FAFAFA] dark:bg-white/[0.08]'
                            : 'border-black/[0.07] bg-white hover:border-black/20 dark:border-white/[0.08] dark:bg-[#09090B] dark:hover:border-white/20'
                        }`}
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-inset ring-black/15"
                          style={{
                            background: `linear-gradient(135deg, ${spec.swatchFrom}, ${spec.swatchTo})`,
                          }}
                        >
                          {selected && (
                            <Check
                              className={`h-3.5 w-3.5 ${
                                spec.isLightSurface ? 'text-[#111113]' : 'text-white'
                              }`}
                            />
                          )}
                        </span>
                        <span className="truncate text-[10.5px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                          {language === 'zh' ? spec.nameZh : spec.nameEn.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {errorMsg && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {errorMsg}
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 border-t border-black/[0.07] pt-4 safe-pb dark:border-white/[0.08]">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('zeroPasswordBadge')}</span>
            </span>

            <div className="flex w-full sm:w-auto items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-full bg-black/[0.045] px-4 text-xs font-medium text-[#111113] transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
              >
                {t('editorCancel')}
              </button>
              <button
                type="submit"
                data-testid="save-identity-btn"
                className="h-10 rounded-full bg-[#111113] px-5 text-xs font-medium text-white transition-colors hover:bg-[#27272A] dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-[#E4E4E7]"
              >
                {t('editorSave')}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
