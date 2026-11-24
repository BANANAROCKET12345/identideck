import { useEffect, useId, useRef, useState, type HTMLAttributes, type MouseEvent } from 'react';
import { GripVertical, Mail } from 'lucide-react';
import { getBankPresetById } from '../data/bankCatalog';
import {
  getBankCardSkin,
  getCarrierSimSkin,
} from '../data/bankCardSkins';
import {
  getBankLogoDomain,
  getFullColorLogoDomain,
  getLocalIdentityLogoPath,
  getRealBrandSvg,
  getRealLogoUrls,
  prefersFullColorLogo,
} from '../data/brandIcons';
import { useT } from '../i18n/translations';
import {
  CARD_THEMES,
  type AppBinding,
  type CardNetwork,
  type CardTheme,
  type CurrencySubtotal,
  type IdentityCard,
} from '../types/vault';
import { formatIdentityIdentifier } from '../utils/mask';
import { BankCardArtwork } from './BankCardArtwork';
import { ScrambleText } from './MotionPrimitives';
import { ServiceBadge } from './ServiceBadge';
import { SimCardArtwork } from './SimCardArtwork';

export interface IdentityCardVisualProps {
  identity: IdentityCard;
  boundCount: number;
  previewBindings?: AppBinding[];
  subscriptionTotals?: CurrencySubtotal[];
  privacyMode: boolean;
  isActive?: boolean;
  compact?: boolean;
  onClick?: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  className?: string;
}

const SURFACE_GRADIENTS: Record<CardTheme, string> = {
  titanium: 'linear-gradient(142deg, #27282E 0%, #16171C 52%, #0A0A0D 100%)',
  navy: 'linear-gradient(142deg, #1E3B63 0%, #122644 54%, #091426 100%)',
  emerald: 'linear-gradient(142deg, #0E4F3D 0%, #083328 54%, #041C16 100%)',
  silver: 'linear-gradient(142deg, #FFFFFF 0%, #ECEEF2 52%, #D4D7DF 100%)',
  amber: 'linear-gradient(142deg, #5C431C 0%, #3A2910 54%, #1D1306 100%)',
};

function formatMonthlySummary(
  totals: CurrencySubtotal[] | undefined,
  lang: 'zh' | 'en',
): string | null {
  if (!totals || totals.length === 0) return null;
  const parts = totals
    .filter((item) => item.monthlyTotal > 0 || item.lifetimeTotal > 0)
    .slice(0, 2)
    .map((item) => {
      if (item.monthlyTotal > 0) {
        const amt = Number.isInteger(item.monthlyTotal)
          ? item.monthlyTotal.toString()
          : item.monthlyTotal.toFixed(2);
        return `${item.currency} ${amt}${lang === 'zh' ? '/月' : '/mo'}`;
      }
      return `${item.currency} ${item.lifetimeTotal}`;
    });
  if (parts.length === 0) return null;
  return totals.length > 2
    ? `${parts.join(' · ')} +${totals.length - 2}`
    : parts.join(' · ');
}

/**
 * Real Official Mail Provider Mark using local 128x128 App Store icons first,
 * with fallback to verified simple-icons SVGs & full-color domain logos.
 */
function MailProviderLogo({
  provider,
  identifier,
  isLight,
}: {
  provider: string;
  identifier?: string;
  isLight: boolean;
}) {
  const key = provider.trim().toLowerCase();
  const localLogoPath = getLocalIdentityLogoPath(provider, identifier);
  const brandSvg = getRealBrandSvg(key);
  const preferColorImg = prefersFullColorLogo(key);
  const logoDomain = getFullColorLogoDomain(key);
  const logoUrls = getRealLogoUrls(logoDomain);
  const [localFailed, setLocalFailed] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    setLocalFailed(false);
    setImgIdx(0);
  }, [key, logoDomain, localLogoPath]);

  if (localLogoPath && !localFailed) {
    return (
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[26%] bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.32)] ring-1 ring-inset ring-black/12">
        <img
          src={localLogoPath}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setLocalFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  if ((preferColorImg || !brandSvg) && logoUrls.length > 0 && imgIdx < logoUrls.length) {
    return (
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[26%] bg-white p-[5px] shadow-2xs ring-1 ring-inset ring-black/10">
        <img
          src={logoUrls[imgIdx]}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgIdx((i) => i + 1)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  if (brandSvg) {
    const isColorfulBrand =
      key === 'gmail' || key === 'proton' || key === 'proton-mail' || key === 'zoho';
    if (isColorfulBrand) {
      return (
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[26%] bg-white/95 shadow-2xs ring-1 ring-inset ring-black/10">
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill={`#${brandSvg.hex}`} aria-hidden="true">
            <path d={brandSvg.path} />
          </svg>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[26%] ring-1 ring-inset ${
          isLight
            ? 'bg-white/85 ring-black/10 shadow-2xs'
            : 'bg-white/[0.13] ring-white/16 backdrop-blur-xs'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[17px] w-[17px]"
          fill={isLight ? '#111113' : '#FFFFFF'}
          aria-hidden="true"
        >
          <path d={brandSvg.path} />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[26%] ring-1 ring-inset ${
        isLight
          ? 'bg-white/80 ring-black/10 shadow-2xs'
          : 'bg-white/[0.12] ring-white/15 backdrop-blur-xs'
      }`}
    >
      <Mail className="h-4 w-4" style={{ color: isLight ? '#111113' : '#FAFAFA' }} />
    </span>
  );
}

/**
 * Precision ISO-7816 Nano-SIM Gold Metal Contact Chip SVG (unique gradient IDs via useId)
 */
function SimGoldChip({ compact }: { compact?: boolean }) {
  const uid = useId();
  const goldId = `${uid}-gold`;
  const glossId = `${uid}-gloss`;

  return (
    <svg
      viewBox="0 0 64 48"
      fill="none"
      className={compact ? 'h-8 w-11 shrink-0' : 'h-[42px] w-[55px] shrink-0'}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={goldId} x1="0" y1="0" x2="64" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBEAB0" />
          <stop offset="35%" stopColor="#E4B854" />
          <stop offset="68%" stopColor="#C28824" />
          <stop offset="100%" stopColor="#F4D880" />
        </linearGradient>
        <linearGradient id={glossId} x1="4" y1="2" x2="54" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      <rect
        x="1"
        y="1"
        width="62"
        height="46"
        rx="8"
        fill={`url(#${goldId})`}
        stroke="#8C5F13"
        strokeOpacity="0.65"
        strokeWidth="1.2"
      />
      <rect x="2" y="2" width="60" height="44" rx="7" fill={`url(#${glossId})`} />

      <g stroke="#6B470D" strokeOpacity="0.66" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2V46" />
        <path d="M42 2V46" />
        <path d="M2 17H22" />
        <path d="M2 31H22" />
        <path d="M42 17H62" />
        <path d="M42 31H62" />
        <rect x="25.5" y="13.5" width="13" height="21" rx="3.2" fill="#E8C262" fillOpacity="0.4" />
        <path d="M32 2V13.5" />
        <path d="M32 34.5V46" />
      </g>

      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="43"
        rx="6.5"
        stroke="#FFF7D6"
        strokeOpacity="0.5"
        strokeWidth="0.75"
      />
    </svg>
  );
}

/**
 * Precision Metallic EMV Smartcard Payment Chip SVG for Physical Bank Cards
 */
function BankEmvChip({ compact, warm }: { compact?: boolean; warm?: boolean }) {
  const uid = useId();
  const baseId = `${uid}-emv`;
  const shineId = `${uid}-emv-shine`;

  return (
    <svg
      viewBox="0 0 52 38"
      fill="none"
      className={compact ? 'h-6 w-8.5 shrink-0' : 'h-[30px] w-[42px] shrink-0'}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={baseId} x1="0" y1="0" x2="52" y2="38" gradientUnits="userSpaceOnUse">
          {warm ? (
            <>
              <stop offset="0%" stopColor="#F9E59E" />
              <stop offset="48%" stopColor="#D7A747" />
              <stop offset="100%" stopColor="#F0CE73" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#F4F4F6" />
              <stop offset="46%" stopColor="#C8CCD4" />
              <stop offset="100%" stopColor="#E4E7EE" />
            </>
          )}
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="48" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      <rect
        x="1"
        y="1"
        width="50"
        height="36"
        rx="6.5"
        fill={`url(#${baseId})`}
        stroke={warm ? '#7A5412' : '#64748B'}
        strokeOpacity="0.55"
        strokeWidth="1.1"
      />
      <rect x="2" y="2" width="48" height="34" rx="5.5" fill={`url(#${shineId})`} />
      <g
        stroke={warm ? '#6B470D' : '#475569'}
        strokeOpacity="0.62"
        strokeWidth="1.15"
        strokeLinecap="round"
      >
        <path d="M17 1.5V36.5" />
        <path d="M35 1.5V36.5" />
        <path d="M1.5 13H17" />
        <path d="M1.5 25H17" />
        <path d="M35 13H50.5" />
        <path d="M35 25H50.5" />
        <rect x="20.5" y="10.5" width="11" height="17" rx="2.5" />
      </g>
    </svg>
  );
}

/**
 * Contactless NFC Payment Waves SVG
 */
function ContactlessNfcIcon({
  isLight,
  inkColor,
}: {
  isLight: boolean;
  inkColor?: string;
}) {
  const stroke = inkColor ?? (isLight ? '#111113' : '#FFFFFF');
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true">
      <path d="M6.2 12.6a3.5 3.5 0 0 0 0-5.2" stroke={stroke} strokeWidth="1.55" strokeLinecap="round" />
      <path d="M9.3 14.5a6.2 6.2 0 0 0 0-9" stroke={stroke} strokeWidth="1.55" strokeLinecap="round" />
      <path d="M12.5 16.4a8.9 8.9 0 0 0 0-12.8" stroke={stroke} strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Authentic 1:1 Vector Card Network Mark (Visa / Mastercard / AMEX / UnionPay / MyDebit / eWallet)
 */
function CardNetworkLogo({
  network,
  isLight,
  inkColor,
  visaInkColor,
}: {
  network?: CardNetwork;
  isLight: boolean;
  inkColor?: string;
  visaInkColor?: string;
}) {
  const ink = inkColor ?? (isLight ? '#111113' : '#FFFFFF');
  const resolved = network ?? 'visa';

  if (resolved === 'mastercard') {
    return (
      <span className="inline-flex flex-col items-center leading-none shrink-0">
        <svg viewBox="0 0 36 22" fill="none" className="h-[19px] w-[31px]" aria-hidden="true">
          <circle cx="13" cy="11" r="8.5" fill="#EB001B" fillOpacity="0.96" />
          <circle cx="23" cy="11" r="8.5" fill="#F79E1B" fillOpacity="0.96" />
          <path
            d="M18 4.2a8.5 8.5 0 0 0 0 13.6 8.5 8.5 0 0 0 0-13.6Z"
            fill="#FF5F00"
          />
        </svg>
        <span
          className="mt-[1px] text-[6px] font-semibold tracking-[0.04em] lowercase opacity-85"
          style={{ color: ink }}
        >
          mastercard
        </span>
      </span>
    );
  }

  if (resolved === 'visa') {
    const visaFill = visaInkColor ?? (isLight ? '#1A1F71' : '#FFFFFF');
    const visaSvg = getRealBrandSvg('visa');
    if (visaSvg) {
      return (
        <svg viewBox="0 0 24 24" className="h-[22px] w-10 shrink-0" fill={visaFill} aria-hidden="true">
          <path d={visaSvg.path} />
        </svg>
      );
    }
    return (
      <span
        className="font-mono text-xs font-extrabold italic tracking-wider"
        style={{ color: visaFill }}
      >
        VISA
      </span>
    );
  }

  if (resolved === 'amex') {
    const amexSvg = getRealBrandSvg('amex');
    if (amexSvg) {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-6 shrink-0" fill={ink} aria-hidden="true">
          <path d={amexSvg.path} />
        </svg>
      );
    }
    return (
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wider ring-1 ring-inset ${
          isLight ? 'ring-black/25 text-[#111113]' : 'ring-white/30 text-white'
        }`}
      >
        AMEX
      </span>
    );
  }

  if (resolved === 'unionpay') {
    return (
      <span className="inline-flex h-[19px] items-center overflow-hidden rounded-[4px] bg-[#007B84] ring-1 ring-inset ring-white/25 shadow-2xs">
        <span className="flex h-full items-center bg-[#D91F26] px-1 text-[7.5px] font-bold italic text-white">
          Union
        </span>
        <span className="flex h-full items-center bg-[#00447C] px-1 text-[7.5px] font-bold italic text-white">
          Pay
        </span>
        <span className="flex h-full items-center bg-[#007B84] px-0.5 text-[7px] font-bold text-white">
          银联
        </span>
      </span>
    );
  }

  if (resolved === 'mydebit') {
    return (
      <span className="inline-flex h-[19px] items-center gap-0.5 rounded-[4px] bg-white/95 px-1.5 font-sans text-[8.5px] font-extrabold tracking-tight text-[#00338D] ring-1 ring-inset ring-black/15 shadow-2xs">
        <span>My</span>
        <span className="text-[#E31837]">Debit</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-tight ring-1 ring-inset ${
        isLight
          ? 'bg-black/[0.08] text-[#111113] ring-black/15'
          : 'bg-white/[0.14] text-white ring-white/22'
      }`}
    >
      eWallet
    </span>
  );
}

function Signal5GBars({ isLight }: { isLight: boolean }) {
  const fill = isLight ? '#111113' : '#FFFFFF';
  return (
    <svg viewBox="0 0 22 14" fill="none" className="h-3.5 w-5 shrink-0" aria-hidden="true">
      <rect x="1" y="9" width="3" height="4" rx="1" fill={fill} fillOpacity="0.45" />
      <rect x="6" y="6.5" width="3" height="6.5" rx="1" fill={fill} fillOpacity="0.65" />
      <rect x="11" y="4" width="3" height="9" rx="1" fill={fill} fillOpacity="0.84" />
      <rect x="16" y="1.5" width="3" height="11.5" rx="1" fill={fill} />
    </svg>
  );
}

/**
 * Overlapping Apple-style mini iOS Squircle App Icon Dock on the card face
 */
function CardMiniAppDock({
  bindings,
  isLight,
}: {
  bindings: AppBinding[];
  isLight: boolean;
}) {
  const visible = bindings.slice(0, 5);
  const extra = bindings.length - visible.length;
  const ringClass = isLight
    ? 'ring-[1.5px] ring-[#E8EAEE]'
    : 'ring-[1.5px] ring-black/55';

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((b) => (
        <ServiceBadge
          key={b.id}
          serviceId={b.serviceId}
          serviceName={b.serviceName}
          serviceDomain={b.serviceDomain}
          size="xxs"
          className={ringClass}
        />
      ))}
      {extra > 0 && (
        <span
          className={`inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[26%] px-1 font-mono text-[9.5px] font-bold ${ringClass} ${
            isLight
              ? 'bg-black/10 text-[#111113]'
              : 'bg-white/16 text-white backdrop-blur-xs'
          }`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

export function IdentityCardVisual({
  identity,
  boundCount,
  previewBindings,
  subscriptionTotals,
  privacyMode,
  isActive = false,
  compact = false,
  onClick,
  dragHandleProps,
  className = '',
}: IdentityCardVisualProps) {
  const { t, language } = useT();
  const cardRef = useRef<HTMLDivElement>(null);
  const wasActiveRef = useRef<boolean>(isActive);
  const [shimmerSeed, setShimmerSeed] = useState(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    if (!compact && isActive && !wasActiveRef.current) {
      setShimmerSeed((seed) => seed + 1);
    }
    wasActiveRef.current = isActive;
  }, [isActive, compact]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [identity.bankId, identity.provider, identity.useAuthenticSkin]);

  const themeSpec = CARD_THEMES[identity.cardTheme] ?? CARD_THEMES.titanium;
  const isLight = themeSpec.isLightSurface;
  const surfaceGradient =
    SURFACE_GRADIENTS[identity.cardTheme] ?? SURFACE_GRADIENTS.titanium;

  const formattedIdentifier = formatIdentityIdentifier(
    identity.identifier,
    identity.type,
    privacyMode,
    { last4: identity.cardLast4 },
  );
  const spendSummary = formatMonthlySummary(subscriptionTotals, language);

  const canTilt = () => {
    if (compact || typeof window === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    if (window.matchMedia?.('(pointer: coarse)').matches) return false;
    return true;
  };

  const handlePointerMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!canTilt() || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - ny) * 11;
    const ry = (nx - 0.5) * 11;
    setTilt({
      rx,
      ry,
      gx: Math.round(nx * 100),
      gy: Math.round(ny * 100),
      active: true,
    });
  };

  const handlePointerLeave = () => {
    if (!tilt.active) return;
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  };

  const tiltStyle = {
    transform: tilt.active
      ? `perspective(900px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
      : 'perspective(900px) rotateX(0deg) rotateY(0deg)',
    transition: tilt.active
      ? 'transform 60ms linear'
      : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
    transformStyle: 'preserve-3d' as const,
  };

  const primaryText = isLight ? 'text-[#111113]' : 'text-[#FAFAFA]';
  const secondaryText = isLight ? 'text-[#52525B]' : 'text-white/70';
  const chipBg = isLight
    ? 'bg-black/[0.06] text-[#111113] ring-black/10'
    : 'bg-white/[0.11] text-white/95 ring-white/14';
  const spendBg = isLight
    ? 'bg-emerald-600/12 text-emerald-900 ring-emerald-700/20'
    : 'bg-emerald-400/14 text-emerald-200 ring-emerald-300/22';

  const hasMiniDock = Boolean(previewBindings && previewBindings.length > 0 && !compact);

  // ======================== 1:1 PHYSICAL AUTHENTIC BANK CARD ========================
  if (identity.type === 'bank') {
    const bankPreset = getBankPresetById(identity.bankId || identity.provider);
    const wantsAuthentic = identity.useAuthenticSkin !== false;
    const bankSkin = wantsAuthentic
      ? getBankCardSkin(identity.bankId || identity.provider)
      : undefined;

    const bankDomain =
      getBankLogoDomain(identity.bankId || identity.provider) ?? bankPreset?.domain;
    const bankDisplayName =
      identity.bankName ||
      (bankPreset
        ? language === 'zh'
          ? bankPreset.nameZh
          : bankPreset.nameEn
        : identity.label || t('bankCardType'));

    const cardIsLight = bankSkin ? bankSkin.isLightSurface : isLight;
    const cardBg = bankSkin ? bankSkin.background : surfaceGradient;
    const cardInk = bankSkin ? bankSkin.inkColor : cardIsLight ? '#111113' : '#FAFAFA';
    const cardMutedInk = bankSkin
      ? bankSkin.mutedInkColor
      : cardIsLight
        ? 'rgba(17,17,19,0.62)'
        : 'rgba(255,255,255,0.7)';
    const warmChip = bankSkin
      ? bankSkin.chipTone === 'gold'
      : identity.cardTheme === 'amber' || identity.cardTheme === 'emerald';

    const kindBadge = (identity.cardKind || 'debit').toUpperCase();
    const showEdition =
      Boolean(bankSkin?.editionLabel) &&
      bankDisplayName.length <= 16 &&
      !bankDisplayName.toUpperCase().includes(bankSkin!.editionLabel!.toUpperCase());

    const expiryText = identity.cardExpiry
      ? privacyMode
        ? '••/••'
        : identity.cardExpiry
      : null;

    // Razor-sharp contrast pills for vivid authentic bank surfaces (e.g. Yellow Maybank, Lime Wise, Crimson CIMB)
    const bankChipClass = bankSkin
      ? cardIsLight
        ? 'bg-black/[0.11] text-[#111113] ring-black/16'
        : 'bg-black/32 text-white ring-white/20 backdrop-blur-xs'
      : chipBg;
    const bankSpendClass = bankSkin
      ? cardIsLight
        ? 'bg-[#111113]/88 text-white ring-black/20 shadow-2xs'
        : 'bg-black/44 text-white ring-white/22 backdrop-blur-sm shadow-2xs'
      : spendBg;

    const hasNotch = Boolean(bankSkin?.hasRightNotch);
    const hasEdgeCore = Boolean(bankSkin?.edgeCoreGradient);
    const useRealCardPhoto = Boolean(bankSkin?.cardImageUrl && !photoFailed);
    const shortCardLast4 = identity.cardLast4
      ? privacyMode
        ? '•••• ••••'
        : `•••• ${identity.cardLast4}`
      : privacyMode
        ? '•••• ••••'
        : identity.identifier;

    const cardHeightClass = compact
      ? 'w-full min-h-[164px] rounded-[18px] p-4'
      : 'w-[306px] sm:w-[324px] h-[204px] rounded-[22px] p-4.5';

    const cardFaceContent = useRealCardPhoto ? (
      <>
        {/* 1:1 Authentic Official Physical Bank Card Artwork (Apple Wallet Full-Bleed) */}
        <img
          src={bankSkin!.cardImageUrl}
          alt={bankDisplayName}
          loading="eager"
          decoding="async"
          onError={() => setPhotoFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        {/* Specular physical card rim + 3D holographic pointer glare */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: `radial-gradient(240px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.28), transparent 64%)`,
          }}
        />
        {shimmerSeed > 0 && (
          <span
            key={shimmerSeed}
            aria-hidden="true"
            className="card-shimmer-sweep z-[5]"
          />
        )}

        {/* Subtle bottom gradient feather so floating personal badges stay razor-sharp on any real card */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.34) 55%, transparent 100%)',
          }}
        />

        {/* Top-right hover-only drag handle (leaves the real card artwork 100% pure & unobstructed!) */}
        <div className="relative z-10 flex items-center justify-end">
          {dragHandleProps && (
            <button
              type="button"
              aria-label={t('dragToReorder')}
              title={t('dragToReorder')}
              onClick={(e) => e.stopPropagation()}
              {...dragHandleProps}
              className={`inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg bg-black/45 text-white/90 ring-1 ring-inset ring-white/20 backdrop-blur-sm transition-all duration-200 hover:bg-black/65 active:cursor-grabbing opacity-65 sm:opacity-0 sm:group-hover/card:opacity-100 focus-visible:opacity-100 ${dragHandleProps.className ?? ''}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Bottom Apple Liquid Glass Micro-Overlay: Zero-overlap layout on Desktop & iPhone 17 Pro Max */}
        <div className="relative z-10 mt-auto flex flex-col gap-1.5">
          {hasMiniDock && (
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex shrink-0 items-center rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white ring-1 ring-inset ring-white/20 backdrop-blur-md shadow-2xs ${
                  privacyMode ? 'privacy-masked-text' : ''
                }`}
              >
                <ScrambleText text={shortCardLast4} triggerKey={privacyMode} />
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {hasMiniDock ? (
                <CardMiniAppDock bindings={previewBindings!} isLight={false} />
              ) : (
                <span
                  className={`inline-flex shrink-0 items-center rounded-full bg-black/62 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white ring-1 ring-inset ring-white/20 backdrop-blur-md shadow-2xs ${
                    privacyMode ? 'privacy-masked-text' : ''
                  }`}
                >
                  <ScrambleText text={shortCardLast4} triggerKey={privacyMode} />
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {spendSummary ? (
                <span className="inline-flex max-w-[184px] items-center gap-1 truncate rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-white ring-1 ring-inset ring-white/22 backdrop-blur-md shadow-2xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="truncate">{spendSummary}</span>
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-black/58 px-2 py-0.5 text-[10px] font-semibold text-white/95 ring-1 ring-inset ring-white/18 backdrop-blur-md shadow-2xs">
                  {t('bankBoundSubsCount', { count: boundCount })}
                </span>
              )}
            </div>
          </div>
        </div>
      </>
    ) : (
      <>
        {/* Top metallic specular rim */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: cardIsLight
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.92), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.46), transparent)',
          }}
        />

        {/* Bespoke 1:1 Authentic Bank Physical Card Vector Artwork */}
        {bankSkin ? (
          <BankCardArtwork artwork={bankSkin.artwork} />
        ) : (
          <svg
            viewBox="0 0 220 120"
            fill="none"
            className="pointer-events-none absolute -bottom-6 -right-8 h-32 w-52 opacity-[0.07]"
            aria-hidden="true"
          >
            <path
              d="M10 100C65 40 120 110 210 25"
              stroke={cardIsLight ? '#111113' : '#FFFFFF'}
              strokeWidth="1.4"
            />
            <path
              d="M10 118C75 62 130 120 215 48"
              stroke={cardIsLight ? '#111113' : '#FFFFFF'}
              strokeWidth="1.1"
            />
          </svg>
        )}

        {/* Sandblasted PVC / anodized micro-noise + satin sheen + 3D holographic glare */}
        <div className="card-micro-noise absolute inset-0" />
        <div className="wallet-brushed-grain pointer-events-none absolute inset-0" />
        <div
          className={`pointer-events-none absolute inset-0 ${
            cardIsLight ? 'wallet-card-sheen-light opacity-55' : 'wallet-card-sheen'
          }`}
        />
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: `radial-gradient(250px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${
              cardIsLight ? '0.46' : '0.24'
            }), transparent 65%)`,
          }}
        />
        {shimmerSeed > 0 && (
          <span
            key={shimmerSeed}
            aria-hidden="true"
            className="card-shimmer-sweep z-[5]"
          />
        )}

        {/* Top Row: Real Official Bank Logo + Bank Name + DEBIT/CREDIT + Edition + NFC + Drag Grip */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <ServiceBadge
              serviceId={identity.bankId || identity.provider || 'custom:bank'}
              serviceName={bankDisplayName}
              serviceDomain={bankDomain}
              size="xs"
              className="shadow-xs ring-1 ring-black/15"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`truncate text-[13px] font-bold tracking-tight ${
                    cardIsLight ? 'card-emboss-light' : 'card-emboss-dark'
                  }`}
                  style={{ color: cardInk }}
                >
                  {bankDisplayName}
                </span>
                {showEdition && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-[1px] font-mono text-[8px] font-bold tracking-[0.12em] uppercase ring-1 ring-inset ${
                      cardIsLight
                        ? 'bg-black/[0.1] ring-black/16'
                        : 'bg-white/[0.16] ring-white/22 backdrop-blur-2xs'
                    }`}
                    style={{ color: cardInk }}
                  >
                    {bankSkin?.editionLabel}
                  </span>
                )}
                <span
                  className={`shrink-0 rounded px-1.5 py-[1px] font-mono text-[8px] font-bold tracking-[0.12em] uppercase ring-1 ring-inset ${
                    cardIsLight
                      ? 'bg-black/[0.08] ring-black/14'
                      : 'bg-black/24 ring-white/18 backdrop-blur-2xs'
                  }`}
                  style={{ color: cardInk }}
                >
                  {kindBadge}
                </span>
              </div>
              {identity.label && identity.label !== bankDisplayName && (
                <p
                  className="truncate text-[10.5px] font-medium"
                  style={{ color: cardMutedInk }}
                >
                  {identity.label}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ContactlessNfcIcon isLight={cardIsLight} inkColor={cardInk} />
            {dragHandleProps && (
              <button
                type="button"
                aria-label={t('dragToReorder')}
                title={t('dragToReorder')}
                onClick={(e) => e.stopPropagation()}
                {...dragHandleProps}
                className={`inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg transition-all duration-200 active:cursor-grabbing opacity-55 sm:opacity-0 sm:group-hover/card:opacity-100 focus-visible:opacity-100 ${
                  cardIsLight
                    ? 'hover:bg-black/10'
                    : 'hover:bg-white/15'
                } ${dragHandleProps.className ?? ''}`}
                style={{ color: cardMutedInk }}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Middle Row: Authentic Metallic EMV Chip + Valid Thru + Embossed Masked Card Number */}
        <div className="relative z-10 my-auto flex flex-col justify-center gap-2 py-1">
          <div className="flex items-center justify-between gap-2">
            <BankEmvChip compact={compact} warm={warmChip} />
            {expiryText && (
              <div className={`text-right ${hasNotch ? 'pr-3' : ''}`}>
                <span
                  className="block font-mono text-[7.5px] font-bold tracking-[0.16em] uppercase"
                  style={{ color: cardMutedInk }}
                >
                  VALID THRU
                </span>
                <span
                  className={`font-mono text-[11px] font-bold tracking-wider ${
                    cardIsLight ? 'card-emboss-light' : 'card-emboss-dark'
                  }`}
                  style={{ color: cardInk }}
                >
                  {expiryText}
                </span>
              </div>
            )}
          </div>

          <p
            className={`truncate font-mono font-bold tracking-[0.12em] ${
              compact ? 'text-[13px]' : 'text-[14.5px]'
            } ${cardIsLight ? 'card-emboss-light' : 'card-emboss-dark'} ${
              privacyMode ? 'privacy-masked-text' : ''
            }`}
            style={{ color: cardInk }}
          >
            <ScrambleText text={formattedIdentifier} triggerKey={privacyMode} />
          </p>
        </div>

        {/* Bottom Row: Auto-Debit Mini App Icon Dock + High-Contrast Monthly Pill + Authentic Network Mark */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {hasMiniDock ? (
              <CardMiniAppDock bindings={previewBindings!} isLight={cardIsLight} />
            ) : (
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${bankChipClass}`}
              >
                {t('bankBoundSubsCount', { count: boundCount })}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {spendSummary && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset ${bankSpendClass}`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>{spendSummary}</span>
              </span>
            )}
            <CardNetworkLogo
              network={identity.cardNetwork}
              isLight={cardIsLight}
              inkColor={cardInk}
              visaInkColor={bankSkin?.visaInkColor}
            />
          </div>
        </div>
      </>
    );

    // Special Physical Wrapper for Wise Right-Edge Accessibility Notch or GXBank Colored PVC Core Edge
    if (hasNotch || hasEdgeCore) {
      return (
        <div
          ref={cardRef}
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          style={tiltStyle}
          data-active={isActive ? 'true' : 'false'}
          data-card-type="bank"
          data-authentic-skin={bankSkin?.bankId ?? 'custom'}
          className={`group/card sim-card-drop relative select-none ${
            compact ? 'w-full' : 'w-[306px] sm:w-[324px]'
          } ${className}`}
        >
          <div
            className={`${
              hasEdgeCore
                ? compact
                  ? 'rounded-[19px] p-[1.5px]'
                  : 'rounded-[23px] p-[1.5px]'
                : ''
            }`}
            style={hasEdgeCore ? { background: bankSkin!.edgeCoreGradient } : undefined}
          >
            <div
              role={onClick ? 'button' : undefined}
              tabIndex={onClick ? 0 : undefined}
              onClick={onClick}
              onKeyDown={
                onClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                      }
                    }
                  : undefined
              }
              style={{ background: cardBg }}
              className={`relative flex flex-col justify-between overflow-hidden text-left ${
                compact
                  ? hasEdgeCore
                    ? 'min-h-[161px] w-full rounded-[17.5px] p-4'
                    : 'min-h-[164px] w-full rounded-[18px] p-4'
                  : hasEdgeCore
                    ? 'h-[201px] w-full rounded-[21.5px] p-4.5'
                    : 'h-[204px] w-full rounded-[22px] p-4.5'
              } ${
                hasNotch
                  ? compact
                    ? 'wise-card-notch-compact'
                    : 'wise-card-notch'
                  : ''
              } ${
                !hasEdgeCore
                  ? isActive
                    ? cardIsLight
                      ? 'ring-1 ring-inset ring-black/22'
                      : 'ring-1 ring-inset ring-white/28'
                    : cardIsLight
                      ? 'ring-1 ring-inset ring-black/12'
                      : 'ring-1 ring-inset ring-white/14'
                  : ''
              }`}
            >
              {cardFaceContent}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={cardRef}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        style={{
          ...tiltStyle,
          background: cardBg,
        }}
        data-active={isActive ? 'true' : 'false'}
        data-card-type="bank"
        data-authentic-skin={bankSkin?.bankId ?? 'custom'}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={`group/card wallet-card-surface relative flex flex-col justify-between overflow-hidden text-left select-none ${cardHeightClass} ${
          isActive
            ? cardIsLight
              ? 'ring-1 ring-inset ring-black/24'
              : 'ring-1 ring-inset ring-white/30'
            : cardIsLight
              ? 'ring-1 ring-inset ring-black/12'
              : 'ring-1 ring-inset ring-white/14'
        } ${className}`}
      >
        {cardFaceContent}
      </div>
    );
  }

  // ======================== 1:1 AUTHENTIC PHONE NANO-SIM CARD ========================
  if (identity.type === 'phone') {
    const wantsAuthentic = identity.useAuthenticSkin !== false;
    const simSkin = wantsAuthentic
      ? getCarrierSimSkin(identity.provider, identity.simCarrier)
      : undefined;
    const simIsLight = simSkin ? simSkin.isLightSurface : isLight;
    const simBottomDark = simSkin ? !simIsLight || Boolean(simSkin.darkBottomBand) : !isLight;
    const simBg = simSkin ? simSkin.background : surfaceGradient;
    const simPrimaryText = simIsLight ? 'text-[#111113]' : 'text-[#FAFAFA]';
    const simSecondaryText = simIsLight ? 'text-[#52525B]' : 'text-white/80';
    const simChipBg = simSkin
      ? 'bg-black/38 text-white ring-white/24 backdrop-blur-xs shadow-2xs'
      : chipBg;
    const simSpendBg = simSkin
      ? 'bg-black/48 text-white ring-white/26 backdrop-blur-sm shadow-2xs'
      : spendBg;

    const carrierText = (
      identity.simCarrier ||
      identity.provider ||
      'SIM 5G'
    ).toUpperCase();
    const simLogoPath = getLocalIdentityLogoPath(
      identity.provider,
      identity.simCarrier,
    );
    const countryCode =
      identity.simCountryCode ||
      (identity.identifier.startsWith('+60') ? '+60' : undefined);
    const simRimBg = isActive
      ? simIsLight
        ? 'linear-gradient(135deg, rgba(17,17,19,0.55) 0%, rgba(17,17,19,0.18) 50%, rgba(17,17,19,0.55) 100%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.45) 100%)'
      : simIsLight
        ? 'rgba(0, 0, 0, 0.14)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.09) 100%)';

    return (
      <div
        ref={cardRef}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        style={tiltStyle}
        data-active={isActive ? 'true' : 'false'}
        data-card-type="phone"
        data-authentic-skin={simSkin?.carrierId ?? 'custom'}
        className={`group/card sim-card-drop relative select-none ${
          compact ? 'w-full' : 'w-[306px] sm:w-[324px]'
        } ${className}`}
      >
        <div
          className={`p-[1.5px] ${
            compact
              ? 'sim-card-chamfer-compact rounded-tl-[19px] rounded-bl-[19px] rounded-br-[19px]'
              : 'sim-card-chamfer rounded-tl-[23px] rounded-bl-[23px] rounded-br-[23px]'
          }`}
          style={{ background: simRimBg }}
        >
          <div
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={
              onClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClick();
                    }
                  }
                : undefined
            }
            className={`relative flex flex-col justify-between overflow-hidden text-left ${
              compact
                ? 'sim-card-chamfer-compact-inner min-h-[156px] rounded-tl-[18px] rounded-bl-[18px] rounded-br-[18px] p-4'
                : 'sim-card-chamfer-inner h-[201px] rounded-tl-[22px] rounded-bl-[22px] rounded-br-[22px] p-4.5'
            }`}
            style={{ background: simBg }}
          >
            {/* Authentic 1:1 Physical Triple-Cut 5G USIM Artwork & Punch-Out Grooves */}
            {simSkin && (
              <SimCardArtwork
                artwork={simSkin.artwork}
                isLightSurface={simIsLight}
              />
            )}

            {/* Authentic Carrier Top Silkscreen Stripe */}
            {simSkin && (
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{ background: simSkin.accentBar }}
              />
            )}

            <div className="card-micro-noise absolute inset-0" />
            <div className="wallet-brushed-grain pointer-events-none absolute inset-0" />
            <div
              className={`pointer-events-none absolute inset-0 ${
                simIsLight ? 'wallet-card-sheen-light' : 'wallet-card-sheen'
              }`}
            />

            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                opacity: tilt.active ? 1 : 0,
                background: `radial-gradient(240px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${
                  simIsLight ? '0.45' : '0.22'
                }), transparent 65%)`,
              }}
            />
            {shimmerSeed > 0 && (
              <span
                key={shimmerSeed}
                aria-hidden="true"
                className="card-shimmer-sweep z-[5]"
              />
            )}

            {!simSkin && (
              <svg
                viewBox="0 0 120 40"
                fill="none"
                className="pointer-events-none absolute bottom-3 right-4 h-8 w-24 opacity-[0.11]"
                aria-hidden="true"
              >
                <path
                  d="M12 16H96M36 28H96"
                  stroke={simIsLight ? '#111113' : '#FFFFFF'}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <circle cx="102" cy="16" r="2.1" fill={simIsLight ? '#111113' : '#FFFFFF'} />
                <circle cx="102" cy="28" r="2.1" fill={simIsLight ? '#111113' : '#FFFFFF'} />
              </svg>
            )}

            <div className="relative z-10 flex items-center justify-between gap-2 pr-7">
              <div className="flex min-w-0 items-center gap-2">
                {simLogoPath && (
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[26%] bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.42)] ring-1 ring-inset ring-black/15">
                    <img
                      src={simLogoPath}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </span>
                )}
                <span
                  className={`inline-flex min-w-0 items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase ring-1 ring-inset ${
                    simIsLight
                      ? 'bg-black/[0.07] text-[#111113] ring-black/12'
                      : 'bg-black/25 text-white ring-white/22 backdrop-blur-2xs'
                  }`}
                >
                  <span className="truncate">{carrierText}</span>
                </span>
                <Signal5GBars isLight={simIsLight} />
              </div>

              <div className="flex items-center gap-1.5">
                {dragHandleProps && (
                  <button
                    type="button"
                    aria-label={t('dragToReorder')}
                    title={t('dragToReorder')}
                    onClick={(e) => e.stopPropagation()}
                    {...dragHandleProps}
                    className={`inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg transition-all duration-200 active:cursor-grabbing opacity-55 sm:opacity-0 sm:group-hover/card:opacity-100 focus-visible:opacity-100 ${
                      simIsLight
                        ? 'text-zinc-600 hover:bg-black/10'
                        : 'text-white/75 hover:bg-white/15 hover:text-white'
                    } ${dragHandleProps.className ?? ''}`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative z-10 my-auto flex items-center gap-3 py-1.5">
              <SimGoldChip compact={compact} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {countryCode && (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        simIsLight
                          ? 'bg-black/[0.08] text-zinc-700'
                          : 'bg-black/25 text-white/95'
                      }`}
                    >
                      {countryCode}
                    </span>
                  )}
                  <p className={`truncate text-xs font-medium ${simSecondaryText}`}>
                    {identity.label || t('phoneCardType')}
                  </p>
                </div>
                <p
                  className={`mt-1 truncate font-mono font-bold tracking-wide ${
                    compact ? 'text-sm' : 'text-[15px]'
                  } ${simPrimaryText} ${simIsLight ? 'card-emboss-light' : 'card-emboss-dark'} ${
                    privacyMode ? 'privacy-masked-text' : ''
                  }`}
                >
                  <ScrambleText text={formattedIdentifier} triggerKey={privacyMode} />
                </p>
                {simSkin && !compact && (
                  <p
                    className={`mt-1 truncate font-mono text-[9px] font-semibold tracking-[0.14em] uppercase ${
                      simIsLight ? 'text-zinc-500' : 'text-white/62'
                    }`}
                  >
                    ICCID {simSkin.iccidPrefix} · {simSkin.simSpecLabel}
                  </p>
                )}
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {hasMiniDock ? (
                  <CardMiniAppDock bindings={previewBindings!} isLight={!simBottomDark} />
                ) : (
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${simChipBg}`}
                  >
                    {t('appsBoundCount', { count: boundCount })}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {spendSummary ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold ring-1 ring-inset ${simSpendBg}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{spendSummary}</span>
                  </span>
                ) : (
                  <span
                    className={`font-mono text-[9.5px] font-semibold tracking-[0.14em] uppercase ${
                      simBottomDark ? 'text-white/85' : 'text-zinc-500'
                    }`}
                  >
                    {simSkin ? simSkin.simSpecLabel : 'NANO-SIM'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================== ANODIZED METALLIC EMAIL CARD ========================
  return (
    <div
      ref={cardRef}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      style={{
        ...tiltStyle,
        background: surfaceGradient,
      }}
      data-active={isActive ? 'true' : 'false'}
      data-card-type="email"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`group/card wallet-card-surface relative flex flex-col justify-between overflow-hidden text-left select-none ${
        compact
          ? 'w-full min-h-[158px] rounded-[18px] p-4'
          : 'w-[306px] sm:w-[324px] h-[204px] rounded-[22px] p-4.5'
      } ${
        isActive
          ? isLight
            ? 'ring-1 ring-inset ring-black/20'
            : 'ring-1 ring-inset ring-white/25'
          : isLight
            ? 'ring-1 ring-inset ring-black/10'
            : 'ring-1 ring-inset ring-white/12'
      } ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: isLight
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent)',
        }}
      />

      <div className="card-micro-noise absolute inset-0" />
      <div className="wallet-brushed-grain pointer-events-none absolute inset-0" />
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLight ? 'wallet-card-sheen-light' : 'wallet-card-sheen'
        }`}
      />

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: tilt.active ? 1 : 0,
          background: `radial-gradient(250px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${
            isLight ? '0.52' : '0.2'
          }), transparent 65%)`,
        }}
      />
      {shimmerSeed > 0 && (
        <span
          key={shimmerSeed}
          aria-hidden="true"
          className="card-shimmer-sweep z-[5]"
        />
      )}

      <svg
        viewBox="0 0 180 180"
        fill="none"
        className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 opacity-[0.07]"
        aria-hidden="true"
      >
        <circle cx="90" cy="90" r="32" stroke={isLight ? '#111113' : '#FFFFFF'} strokeWidth="1.1" />
        <circle cx="90" cy="90" r="54" stroke={isLight ? '#111113' : '#FFFFFF'} strokeWidth="1.1" />
        <circle cx="90" cy="90" r="76" stroke={isLight ? '#111113' : '#FFFFFF'} strokeWidth="1.1" />
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <MailProviderLogo
            provider={identity.provider}
            identifier={identity.identifier}
            isLight={isLight}
          />
          <span
            className={`truncate font-mono text-[10px] font-semibold tracking-[0.14em] uppercase ${
              isLight ? 'text-zinc-600' : 'text-white/60'
            }`}
          >
            {identity.provider && identity.provider !== 'custom'
              ? `${identity.provider} · ${t('emailCardType')}`
              : t('emailCardType')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {dragHandleProps && (
            <button
              type="button"
              aria-label={t('dragToReorder')}
              title={t('dragToReorder')}
              onClick={(e) => e.stopPropagation()}
              {...dragHandleProps}
              className={`inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg transition-all duration-200 active:cursor-grabbing opacity-55 sm:opacity-0 sm:group-hover/card:opacity-100 focus-visible:opacity-100 ${
                isLight
                  ? 'text-zinc-600 hover:bg-black/10'
                  : 'text-white/70 hover:bg-white/15 hover:text-white'
              } ${dragHandleProps.className ?? ''}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 my-auto py-1.5">
        <h3
          className={`truncate font-semibold tracking-tight ${
            compact ? 'text-[15px]' : 'text-[17px]'
          } ${primaryText}`}
        >
          {identity.label || t('emailCardType')}
        </h3>
        <p
          className={`mt-1 truncate font-mono ${
            compact ? 'text-xs' : 'text-[13px]'
          } ${secondaryText} ${privacyMode ? 'privacy-masked-text' : ''}`}
        >
          <ScrambleText text={formattedIdentifier} triggerKey={privacyMode} />
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {hasMiniDock ? (
            <CardMiniAppDock bindings={previewBindings!} isLight={isLight} />
          ) : (
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${chipBg}`}
            >
              {t('appsBoundCount', { count: boundCount })}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {spendSummary ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold ring-1 ring-inset ${spendBg}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{spendSummary}</span>
            </span>
          ) : hasMiniDock ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${chipBg}`}
            >
              {t('appsBoundCount', { count: boundCount })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
