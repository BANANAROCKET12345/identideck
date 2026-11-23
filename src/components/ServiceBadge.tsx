import { useEffect, useState } from 'react';
import { CreditCard, Mail, Smartphone } from 'lucide-react';
import {
  getBankLogoDomain,
  getFullColorLogoDomain,
  getLocalOfficialLogoPath,
  getRealBrandSvg,
  getRealLogoUrls,
  prefersFullColorLogo,
  resolveIdentityCardLogoPath,
} from '../data/brandIcons';
import { getServiceById } from '../data/serviceCatalog';
import {
  CARD_THEMES,
  type IdentityCard,
  type ServiceCatalogItem,
} from '../types/vault';

export interface ServiceBadgeProps {
  serviceId?: string;
  service?: ServiceCatalogItem;
  serviceName?: string;
  serviceDomain?: string;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<
  NonNullable<ServiceBadgeProps['size']>,
  {
    box: string;
    svg: string;
    imgPad: string;
    text2: string;
    text3: string;
  }
> = {
  xxs: {
    box: 'h-[22px] w-[22px] rounded-[26%]',
    svg: 'h-[13px] w-[13px]',
    imgPad: 'p-[2.5px]',
    text2: 'text-[8px]',
    text3: 'text-[6.5px]',
  },
  xs: {
    box: 'h-7 w-7 rounded-[26%]',
    svg: 'h-4 w-4',
    imgPad: 'p-[3.5px]',
    text2: 'text-[10px]',
    text3: 'text-[8.5px]',
  },
  sm: {
    box: 'h-9 w-9 rounded-[26%]',
    svg: 'h-[19px] w-[19px]',
    imgPad: 'p-1.5',
    text2: 'text-xs',
    text3: 'text-[10px]',
  },
  md: {
    box: 'h-11 w-11 rounded-[26%]',
    svg: 'h-[22px] w-[22px]',
    imgPad: 'p-1.5',
    text2: 'text-sm',
    text3: 'text-[11px]',
  },
  lg: {
    box: 'h-13 w-13 rounded-[26%]',
    svg: 'h-[26px] w-[26px]',
    imgPad: 'p-2',
    text2: 'text-base',
    text3: 'text-xs',
  },
};

/**
 * Computes WCAG relative luminance (0..1) of a 6-digit hex color
 * so official simple-icons glyphs ALWAYS achieve crisp contrast.
 */
function hexLuminance(rawHex: string): number {
  const clean = rawHex.replace(/^#/, '');
  if (clean.length !== 6) return 0.2;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function ServiceBadge({
  serviceId,
  service,
  serviceName,
  serviceDomain,
  size = 'md',
  className = '',
}: ServiceBadgeProps) {
  const item =
    service ??
    getServiceById(serviceId ?? 'custom:app', serviceName, serviceDomain);
  const spec = SIZE_CLASSES[size];

  const lookupId = (serviceId ?? item.id).replace(/^custom:/, '');
  const localOfficialLogoPath = getLocalOfficialLogoPath(lookupId);
  const brandSvg = getRealBrandSvg(lookupId) ?? getRealBrandSvg(item.id);
  const preferFullColor =
    prefersFullColorLogo(lookupId) || prefersFullColorLogo(item.id);
  const logoDomain = getFullColorLogoDomain(
    lookupId,
    serviceDomain ?? item.domain,
  );
  const logoUrls = getRealLogoUrls(logoDomain);

  // Track fallback index across ordered real official favicon endpoints
  const [imgIdx, setImgIdx] = useState(0);
  const [localFailed, setLocalFailed] = useState(false);

  useEffect(() => {
    setImgIdx(0);
    setLocalFailed(false);
  }, [logoDomain, item.id, localOfficialLogoPath]);

  // 0) Local 128x128 Official Apple App Store Logo (52 Banks + 10 Email + 11 SIM — crisp full-bleed iOS squircle!)
  if (localOfficialLogoPath && !localFailed) {
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_8px_-2px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-black/[0.1] dark:ring-white/[0.16] ${spec.box} ${className}`}
        aria-hidden="true"
        title={item.name}
      >
        <img
          src={localOfficialLogoPath}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setLocalFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  // Priority A: Official simple-icons vector SVG (unless brand prefers full-color regional/app icon)
  const useOfficialVectorFirst = Boolean(brandSvg) && !preferFullColor;
  // Priority B: Real official high-res full-color app/site logo <img>
  const canRenderFullColorImg =
    !useOfficialVectorFirst && logoUrls.length > 0 && imgIdx < logoUrls.length;

  // 1) Official Full-Color App/Site Logo (Priority B — Malaysian, regional, trademark-removed, custom domains)
  if (canRenderFullColorImg) {
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_-2px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-black/[0.08] dark:ring-white/[0.14] ${spec.box} ${spec.imgPad} ${className}`}
        aria-hidden="true"
      >
        <img
          src={logoUrls[imgIdx]}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgIdx((prev) => prev + 1)}
          className="relative z-10 h-full w-full object-contain"
        />
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 48%, rgba(0,0,0,0.03) 100%)',
          }}
        />
      </span>
    );
  }

  // 2) Official simple-icons Vector SVG (Priority A — OR automatic offline fallback if full-color img failed)
  if (brandSvg) {
    const rawHex = `#${brandSvg.hex}`;
    const lum = hexLuminance(rawHex);
    const tileBg = lum > 0.9 ? '#111113' : rawHex;
    const glyphFill = lum > 0.9 ? '#FFFFFF' : lum > 0.44 ? '#111113' : '#FFFFFF';

    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_8px_-2px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-black/10 dark:ring-white/14 ${spec.box} ${className}`}
        style={{ backgroundColor: tileBg }}
        aria-hidden="true"
      >
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.03) 44%, rgba(0,0,0,0.14) 100%)',
          }}
        />
        <svg
          viewBox="0 0 24 24"
          className={`relative z-10 ${spec.svg}`}
          fill={glyphFill}
          aria-hidden="true"
        >
          <path d={brandSvg.path} />
        </svg>
      </span>
    );
  }

  // 3) Offline & uncached fallback: crisp typographic monogram
  const fg = item.textColor ?? '#FFFFFF';
  const mono = item.monogram || item.name.slice(0, 2).toUpperCase();
  const monoClass = mono.length >= 3 ? spec.text3 : spec.text2;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden font-bold tracking-tight select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_8px_-2px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-black/10 dark:ring-white/14 ${spec.box} ${className}`}
      style={{
        backgroundColor: item.brandColor,
        color: fg,
      }}
      aria-hidden="true"
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.03) 44%, rgba(0,0,0,0.14) 100%)',
        }}
      />
      <span className="relative z-10 flex items-center justify-center leading-none">
        <span
          className={`font-mono font-semibold uppercase tracking-tighter ${monoClass}`}
        >
          {mono}
        </span>
      </span>
    </span>
  );
}

export interface IdentityLogoBadgeProps {
  identity: IdentityCard;
  size?: 'micro' | 'xxs' | 'xs' | 'sm' | 'md';
  className?: string;
}

const IDENTITY_BADGE_SIZES: Record<
  NonNullable<IdentityLogoBadgeProps['size']>,
  { box: string; icon: string }
> = {
  micro: { box: 'h-4 w-4 rounded-[26%]', icon: 'h-2.5 w-2.5' },
  xxs: { box: 'h-[22px] w-[22px] rounded-[26%]', icon: 'h-3 w-3' },
  xs: { box: 'h-7 w-7 rounded-[26%]', icon: 'h-3.5 w-3.5' },
  sm: { box: 'h-8 w-8 sm:h-9 sm:w-9 rounded-[26%]', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10 rounded-[26%]', icon: 'h-5 w-5' },
};

/**
 * Renders the real official local App Store logo for ANY IdentityCard
 * (Bank Card, Email Card, or Phone SIM Card), gracefully falling back
 * to a themed icon only for unknown/custom providers.
 */
export function IdentityLogoBadge({
  identity,
  size = 'sm',
  className = '',
}: IdentityLogoBadgeProps) {
  const localPath = resolveIdentityCardLogoPath(identity);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [localPath, identity.id]);

  const spec = IDENTITY_BADGE_SIZES[size];

  if (localPath && !failed) {
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white select-none shadow-[0_1px_5px_-1px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-black/[0.1] dark:ring-white/[0.16] ${spec.box} ${className}`}
        aria-hidden="true"
        title={identity.label}
      >
        <img
          src={localPath}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  // Bank custom fallback via ServiceBadge (domain favicon / monogram)
  if (identity.type === 'bank' && size !== 'micro') {
    return (
      <ServiceBadge
        serviceId={identity.bankId || identity.provider || 'custom:bank'}
        serviceName={identity.bankName || identity.label}
        serviceDomain={getBankLogoDomain(identity.bankId || identity.provider)}
        size={size}
        className={className}
      />
    );
  }

  const themeSpec = CARD_THEMES[identity.cardTheme] ?? CARD_THEMES.titanium;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center shadow-2xs ring-1 ring-inset ring-white/20 ${spec.box} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${themeSpec.swatchFrom}, ${themeSpec.swatchTo})`,
        color: themeSpec.isLightSurface ? '#111113' : '#FAFAFA',
      }}
      aria-hidden="true"
    >
      {identity.type === 'phone' ? (
        <Smartphone className={spec.icon} />
      ) : identity.type === 'bank' ? (
        <CreditCard className={spec.icon} />
      ) : (
        <Mail className={spec.icon} />
      )}
    </span>
  );
}
