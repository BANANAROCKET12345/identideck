import {
  si1password,
  siAirasia,
  siAirbnb,
  siAlipay,
  siAmericanexpress,
  siApple,
  siApplemusic,
  siAppletv,
  siAppstore,
  siBattledotnet,
  siBilibili,
  siBinance,
  siBitwarden,
  siBookingdotcom,
  siChase,
  siClaude,
  siCloudflare,
  siCoinbase,
  siCursor,
  siDeepseek,
  siDigitalocean,
  siDiscord,
  siDocker,
  siDropbox,
  siEa,
  siEbay,
  siEpicgames,
  siEvernote,
  siFacebook,
  siFigma,
  siFirebase,
  siFoodpanda,
  siGithub,
  siGitlab,
  siGmail,
  siGoogle,
  siGoogledrive,
  siGooglegemini,
  siGrab,
  siHbomax,
  siHsbc,
  siHuggingface,
  siIcloud,
  siIkea,
  siInstagram,
  siJira,
  siLine,
  siLinear,
  siMastercard,
  siMeituan,
  siMihoyo,
  siMonzo,
  siN26,
  siNeteasecloudmusic,
  siNetflix,
  siNetlify,
  siNotion,
  siObsidian,
  siPaypal,
  siPerplexity,
  siPlaystation,
  siPostman,
  siProtonmail,
  siQq,
  siRakuten,
  siRaycast,
  siReddit,
  siReplit,
  siRevolut,
  siRiotgames,
  siShopee,
  siSinaweibo,
  siSnapchat,
  siSpotify,
  siSteam,
  siStripe,
  siSupabase,
  siTaobao,
  siTelegram,
  siThreads,
  siTiktok,
  siTrello,
  siTripdotcom,
  siTuta,
  siTwitch,
  siUber,
  siVercel,
  siVisa,
  siWechat,
  siWhatsapp,
  siWise,
  siX,
  siXiaohongshu,
  siYoutube,
  siYoutubemusic,
  siZhihu,
  siZoho,
  siZoom,
  type SimpleIcon,
} from 'simple-icons';
import { BANK_BY_ID, BANK_CATALOG } from './bankCatalog';
import type { IdentityCard } from '../types/vault';

/**
 * All 52 banks bundled with local 128x128 official Apple App Store / official brand
 * WebP logos under `/public/bank-logos/<bankId>.webp` (100% real, crisp, zero 404, offline-ready).
 */
export const LOCAL_BANK_LOGO_IDS: ReadonlySet<string> = new Set(
  BANK_CATALOG.map((bank) => bank.id),
);

/**
 * All 10 Email providers bundled with local 128x128 official Apple App Store
 * WebP logos under `/public/identity-logos/<providerId>.webp`.
 */
export const LOCAL_EMAIL_LOGO_IDS: ReadonlySet<string> = new Set([
  'gmail',
  'icloud',
  'outlook',
  'proton',
  'qq',
  '163',
  'yahoo',
  'zoho',
  'fastmail',
  'tuta',
]);

/**
 * All 11 SIM Telco carriers (Malaysia / Singapore / China) bundled with local 128x128
 * official Apple App Store WebP logos under `/public/identity-logos/<carrierId>.webp`.
 */
export const LOCAL_SIM_LOGO_IDS: ReadonlySet<string> = new Set([
  'maxis',
  'hotlink',
  'celcomdigi',
  'umobile',
  'unifi',
  'yes5g',
  'tunetalk',
  'singtel',
  'chinamobile',
  'chinaunicom',
  'chinatelecom',
]);

/**
 * Combined 21 official Email + SIM carrier local logo IDs.
 */
export const LOCAL_IDENTITY_LOGO_IDS: ReadonlySet<string> = new Set([
  ...LOCAL_EMAIL_LOGO_IDS,
  ...LOCAL_SIM_LOGO_IDS,
]);

const LOCAL_BANK_LOGO_ALIASES: Record<string, string> = {
  'maybank-mae': 'maybank',
  'cimb-octo': 'cimb',
  'public-bank': 'publicbank',
  'rhb-bank': 'rhb',
  'hong-leong': 'hlb',
  'tng-ewallet': 'tng-visa',
  tng: 'tng-visa',
};

const LOCAL_IDENTITY_LOGO_ALIASES: Record<string, string> = {
  // Email aliases
  'icloud-mail': 'icloud',
  'apple-icloud': 'icloud',
  'me.com': 'icloud',
  'mac.com': 'icloud',
  'proton-mail': 'proton',
  protonmail: 'proton',
  'qq-mail': 'qq',
  qqmail: 'qq',
  foxmail: 'qq',
  '163-mail': '163',
  netease: '163',
  '126': '163',
  'yahoo-mail': 'yahoo',
  'zoho-mail': 'zoho',
  'tuta-mail': 'tuta',
  tutanota: 'tuta',
  hotmail: 'outlook',
  live: 'outlook',

  // SIM carrier aliases
  'maxis 5g': 'maxis',
  maxis5g: 'maxis',
  'hotlink 5g': 'hotlink',
  hotlink5g: 'hotlink',
  celcom: 'celcomdigi',
  digi: 'celcomdigi',
  'celcomdigi 5g': 'celcomdigi',
  'u mobile': 'umobile',
  myumobile: 'umobile',
  'unifi 5g': 'unifi',
  myunifi: 'unifi',
  yes: 'yes5g',
  'yes 5g': 'yes5g',
  myyes: 'yes5g',
  'tune talk': 'tunetalk',
  'singtel 5g': 'singtel',
  'china mobile': 'chinamobile',
  中国移动: 'chinamobile',
  'china unicom': 'chinaunicom',
  中国联通: 'chinaunicom',
  'china telecom': 'chinatelecom',
  中国电信: 'chinatelecom',
};

function resolveIdentityLogoKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase().replace(/^custom:/, '');
  if (!key || key === 'custom') return undefined;

  if (LOCAL_IDENTITY_LOGO_IDS.has(key)) return key;
  const directAlias = LOCAL_IDENTITY_LOGO_ALIASES[key];
  if (directAlias && LOCAL_IDENTITY_LOGO_IDS.has(directAlias)) return directAlias;

  const compact = key.replace(/\s+/g, '');
  if (LOCAL_IDENTITY_LOGO_IDS.has(compact)) return compact;
  const compactAlias = LOCAL_IDENTITY_LOGO_ALIASES[compact];
  if (compactAlias && LOCAL_IDENTITY_LOGO_IDS.has(compactAlias)) return compactAlias;

  // Email address / domain inference (e.g. "roy@gmail.com" -> "gmail")
  if (key.includes('@') || key.includes('.')) {
    const domain = key.includes('@') ? key.split('@').pop() ?? '' : key;
    if (domain.includes('gmail.') || domain.includes('googlemail.')) return 'gmail';
    if (domain.includes('icloud.') || domain === 'me.com' || domain === 'mac.com') return 'icloud';
    if (domain.includes('outlook.') || domain.includes('hotmail.') || domain.includes('live.')) return 'outlook';
    if (domain.includes('proton.') || domain.includes('protonmail.')) return 'proton';
    if (domain.includes('qq.com') || domain.includes('foxmail.')) return 'qq';
    if (domain.includes('163.com') || domain.includes('126.com') || domain.includes('yeah.net')) return '163';
    if (domain.includes('yahoo.')) return 'yahoo';
    if (domain.includes('zoho.')) return 'zoho';
    if (domain.includes('fastmail.')) return 'fastmail';
    if (domain.includes('tuta.') || domain.includes('tutanota.')) return 'tuta';
  }

  // Fuzzy SIM carrier substring inference (e.g. "MAXIS 5G POSTPAID" -> "maxis")
  if (compact.includes('hotlink')) return 'hotlink';
  if (compact.includes('maxis')) return 'maxis';
  if (compact.includes('celcom') || compact.includes('digi')) return 'celcomdigi';
  if (compact.includes('umobile')) return 'umobile';
  if (compact.includes('unifi')) return 'unifi';
  if (compact.includes('yes5g') || compact === 'yes' || compact.includes('myyes')) return 'yes5g';
  if (compact.includes('tunetalk')) return 'tunetalk';
  if (compact.includes('singtel')) return 'singtel';
  if (compact.includes('chinamobile') || compact.includes('移动')) return 'chinamobile';
  if (compact.includes('chinaunicom') || compact.includes('联通')) return 'chinaunicom';
  if (compact.includes('chinatelecom') || compact.includes('电信')) return 'chinatelecom';

  return undefined;
}

export function getLocalBankLogoPath(idOrProvider?: string): string | undefined {
  if (!idOrProvider) return undefined;
  const key = idOrProvider.trim().toLowerCase().replace(/^custom:/, '');
  const resolved = LOCAL_BANK_LOGO_ALIASES[key] ?? key;
  if (LOCAL_BANK_LOGO_IDS.has(resolved)) {
    return `/bank-logos/${resolved}.webp`;
  }
  return undefined;
}

export function getLocalIdentityLogoPath(
  idOrProvider?: string,
  secondaryHint?: string,
): string | undefined {
  const key =
    resolveIdentityLogoKey(idOrProvider) ?? resolveIdentityLogoKey(secondaryHint);
  return key ? `/identity-logos/${key}.webp` : undefined;
}

/**
 * Unified local 128x128 official App Store logo lookup across all 52 Banks + 10 Email + 11 SIM carriers.
 */
export function getLocalOfficialLogoPath(
  idOrProvider?: string,
  secondaryHint?: string,
): string | undefined {
  return (
    getLocalBankLogoPath(idOrProvider) ??
    getLocalIdentityLogoPath(idOrProvider, secondaryHint)
  );
}

/**
 * Resolves the canonical local official logo URL for any IdentityCard (Bank, Email, or Phone SIM).
 */
export function resolveIdentityCardLogoPath(
  identity?: Pick<IdentityCard, 'type' | 'provider' | 'bankId' | 'simCarrier' | 'identifier'> | null,
): string | undefined {
  if (!identity) return undefined;
  if (identity.type === 'bank') {
    return getLocalBankLogoPath(identity.bankId || identity.provider);
  }
  if (identity.type === 'phone') {
    return getLocalIdentityLogoPath(identity.provider, identity.simCarrier);
  }
  return getLocalIdentityLogoPath(identity.provider, identity.identifier);
}

export interface RealBrandSvg {
  path: string;
  hex: string;
  title: string;
}

function toBrandSvg(icon: SimpleIcon): RealBrandSvg {
  return {
    path: icon.path,
    hex: icon.hex,
    title: icon.title,
  };
}

/**
 * Tree-shaken official `simple-icons` vector SVGs indexed by both
 * `serviceCatalog` IDs and identity provider aliases.
 */
export const REAL_BRAND_SVGS: Record<string, RealBrandSvg> = {
  // Email & Identity
  gmail: toBrandSvg(siGmail),
  'icloud-mail': toBrandSvg(siIcloud),
  icloud: toBrandSvg(siIcloud),
  apple: toBrandSvg(siApple),
  'apple-icloud': toBrandSvg(siApple),
  'apple-store': toBrandSvg(siAppstore),
  'proton-mail': toBrandSvg(siProtonmail),
  proton: toBrandSvg(siProtonmail),
  'qq-mail': toBrandSvg(siQq),
  qq: toBrandSvg(siQq),
  qqmail: toBrandSvg(siQq),
  'zoho-mail': toBrandSvg(siZoho),
  zoho: toBrandSvg(siZoho),
  'tuta-mail': toBrandSvg(siTuta),
  tuta: toBrandSvg(siTuta),

  // AI & Dev
  claude: toBrandSvg(siClaude),
  gemini: toBrandSvg(siGooglegemini),
  github: toBrandSvg(siGithub),
  cursor: toBrandSvg(siCursor),
  vercel: toBrandSvg(siVercel),
  netlify: toBrandSvg(siNetlify),
  cloudflare: toBrandSvg(siCloudflare),
  supabase: toBrandSvg(siSupabase),
  firebase: toBrandSvg(siFirebase),
  docker: toBrandSvg(siDocker),
  huggingface: toBrandSvg(siHuggingface),
  linear: toBrandSvg(siLinear),
  figma: toBrandSvg(siFigma),
  postman: toBrandSvg(siPostman),
  perplexity: toBrandSvg(siPerplexity),
  deepseek: toBrandSvg(siDeepseek),
  gitlab: toBrandSvg(siGitlab),
  replit: toBrandSvg(siReplit),
  digitalocean: toBrandSvg(siDigitalocean),

  // Productivity & Cloud
  google: toBrandSvg(siGoogle),
  notion: toBrandSvg(siNotion),
  obsidian: toBrandSvg(siObsidian),
  dropbox: toBrandSvg(siDropbox),
  zoom: toBrandSvg(siZoom),
  '1password': toBrandSvg(si1password),
  raycast: toBrandSvg(siRaycast),
  bitwarden: toBrandSvg(siBitwarden),
  evernote: toBrandSvg(siEvernote),
  trello: toBrandSvg(siTrello),
  jira: toBrandSvg(siJira),
  'google-drive': toBrandSvg(siGoogledrive),

  // Social & Content
  wechat: toBrandSvg(siWechat),
  xiaohongshu: toBrandSvg(siXiaohongshu),
  douyin: toBrandSvg(siTiktok),
  tiktok: toBrandSvg(siTiktok),
  bilibili: toBrandSvg(siBilibili),
  zhihu: toBrandSvg(siZhihu),
  weibo: toBrandSvg(siSinaweibo),
  'x-twitter': toBrandSvg(siX),
  x: toBrandSvg(siX),
  instagram: toBrandSvg(siInstagram),
  threads: toBrandSvg(siThreads),
  discord: toBrandSvg(siDiscord),
  telegram: toBrandSvg(siTelegram),
  whatsapp: toBrandSvg(siWhatsapp),
  reddit: toBrandSvg(siReddit),
  youtube: toBrandSvg(siYoutube),
  facebook: toBrandSvg(siFacebook),
  line: toBrandSvg(siLine),
  snapchat: toBrandSvg(siSnapchat),
  twitch: toBrandSvg(siTwitch),

  // Shopping & Travel
  taobao: toBrandSvg(siTaobao),
  booking: toBrandSvg(siBookingdotcom),
  'trip-com': toBrandSvg(siTripdotcom),
  trip: toBrandSvg(siTripdotcom),
  uber: toBrandSvg(siUber),
  airbnb: toBrandSvg(siAirbnb),
  ikea: toBrandSvg(siIkea),
  ebay: toBrandSvg(siEbay),
  meituan: toBrandSvg(siMeituan),

  // Media & Gaming
  steam: toBrandSvg(siSteam),
  playstation: toBrandSvg(siPlaystation),
  'epic-games': toBrandSvg(siEpicgames),
  epicgames: toBrandSvg(siEpicgames),
  'riot-games': toBrandSvg(siRiotgames),
  riotgames: toBrandSvg(siRiotgames),
  hoyoverse: toBrandSvg(siMihoyo),
  spotify: toBrandSvg(siSpotify),
  netflix: toBrandSvg(siNetflix),
  'apple-music': toBrandSvg(siApplemusic),
  applemusic: toBrandSvg(siApplemusic),
  'netease-music': toBrandSvg(siNeteasecloudmusic),
  netease: toBrandSvg(siNeteasecloudmusic),
  'max-hbo': toBrandSvg(siHbomax),
  'apple-tv': toBrandSvg(siAppletv),
  'youtube-music': toBrandSvg(siYoutubemusic),
  battlenet: toBrandSvg(siBattledotnet),
  'ea-app': toBrandSvg(siEa),

  // Finance & Payments + Card Networks
  alipay: toBrandSvg(siAlipay),
  wise: toBrandSvg(siWise),
  paypal: toBrandSvg(siPaypal),
  stripe: toBrandSvg(siStripe),
  binance: toBrandSvg(siBinance),
  revolut: toBrandSvg(siRevolut),
  coinbase: toBrandSvg(siCoinbase),
  'rakuten-trade': toBrandSvg(siRakuten),
  hsbc: toBrandSvg(siHsbc),
  chase: toBrandSvg(siChase),
  monzo: toBrandSvg(siMonzo),
  n26: toBrandSvg(siN26),
  applecard: toBrandSvg(siApple),
  // Clean geometric vector emblem for Agrobank MY (whose domain blocks favicon crawlers)
  agrobank: {
    path: 'M12 2.2C7.4 5.2 5 9.3 5 13.8c0 3.7 2.8 6.9 6.2 7.8V14.4L8.4 11.6a.9.9 0 1 1 1.28-1.28L11.2 11.8V7.2a.9.9 0 0 1 1.8 0v4.6l1.52-1.48a.9.9 0 1 1 1.28 1.28L13 14.4v7.2c3.4-.9 6.2-4.1 6.2-7.8 0-4.5-2.4-8.6-7.2-11.6Z',
    hex: '008752',
    title: 'Agrobank Malaysia',
  },
  visa: toBrandSvg(siVisa),
  mastercard: toBrandSvg(siMastercard),
  amex: toBrandSvg(siAmericanexpress),

  // Malaysia Local (official vector fallback & direct vector brands)
  grab: toBrandSvg(siGrab),
  'shopee-my': toBrandSvg(siShopee),
  shopee: toBrandSvg(siShopee),
  foodpanda: toBrandSvg(siFoodpanda),
  'airasia-move': toBrandSvg(siAirasia),
  airasia: toBrandSvg(siAirasia),
};

/**
 * Verified official domains for Malaysian, regional, and trademark-removed brands
 * where real full-color high-res official icons should be rendered with Priority B
 * (and automatically cached via Workbox CacheFirst for offline PWA support).
 */
export const FULL_COLOR_LOGO_DOMAINS: Record<string, string> = {
  // Malaysia Local & Banks (19)
  'tng-ewallet': 'tngdigital.com.my',
  'tng-visa': 'tngdigital.com.my',
  tng: 'tngdigital.com.my',
  'maybank-mae': 'maybank2u.com.my',
  maybank: 'maybank2u.com.my',
  'cimb-octo': 'cimb.com.my',
  cimb: 'cimb.com.my',
  'public-bank': 'pbebank.com',
  publicbank: 'pbebank.com',
  'rhb-bank': 'rhbgroup.com',
  rhb: 'rhbgroup.com',
  'hong-leong': 'hlb.com.my',
  hlb: 'hlb.com.my',
  ambank: 'ambank.com.my',
  uob: 'uob.com.my',
  ocbc: 'ocbc.com.my',
  hsbc: 'hsbc.com.my',
  sc: 'sc.com',
  alliance: 'alliancebank.com.my',
  affin: 'affinalways.com',
  bankislam: 'bankislam.com',
  bsn: 'bsn.com.my',
  gxbank: 'gxbank.my',
  aeonbank: 'aeonbank.com.my',
  boostbank: 'myboostbank.co',
  rytbank: 'rytbank.my',
  kafbank: 'kafdigitalbank.com.my',
  rize: 'rize.com.my',
  bankrakyat: 'bankrakyat.com.my',
  muamalat: 'muamalat.com.my',
  mbsb: 'mbsbbank.com',
  alrajhi: 'alrajhibank.com.my',
  kfh: 'kfh.com.my',
  enrichmoney: 'malaysiaairlines.com',
  merchantrade: 'merchantrademoney.com',
  boost: 'myboost.co',
  setel: 'setel.com',
  bigpay: 'bigpay.link',
  'shopee-my': 'shopee.com.my',
  shopee: 'shopee.com.my',
  'lazada-my': 'lazada.com.my',
  lazada: 'lazada.com.my',
  grab: 'grab.com',
  unifi: 'unifi.com.my',
  maxis: 'maxis.com.my',
  celcomdigi: 'celcomdigi.com',
  umobile: 'u.com.my',
  astro: 'astro.com.my',
  mysejahtera: 'mysejahtera.moh.gov.my',
  myjpj: 'jpj.gov.my',
  carsome: 'carsome.my',
  'kwsp-epf': 'www.kwsp.gov.my',

  // Global, Singapore & China Banks
  dbs: 'dbs.com.sg',
  gxs: 'gxs.com.sg',
  trustbank: 'trustbank.sg',
  maribank: 'maribank.sg',
  youtrip: 'you.co',
  citi: 'citi.com',
  airwallex: 'airwallex.com',
  cmb: 'cmbchina.com',
  boc: 'www.boc.cn',
  icbc: 'icbc.com.cn',
  ccb: 'ccb.com',
  abc: 'www.abchina.com',
  bocom: 'bankcomm.com',
  psbc: 'www.psbc.com',
  pingan: 'bank.pingan.com',
  citic: 'creditcard.ecitic.com',

  // AI & Global Trademark-Removed Brands
  openai: 'chatgpt.com',
  chatgpt: 'chatgpt.com',
  midjourney: 'midjourney.com',
  aws: 'aws.amazon.com',
  outlook: 'outlook.live.com',
  'microsoft-365': 'microsoft365.com',
  microsoft365: 'microsoft365.com',
  onedrive: 'onedrive.live.com',
  slack: 'slack.com',
  linkedin: 'linkedin.com',
  amazon: 'amazon.com',
  agoda: 'agoda.com',
  shein: 'shein.com',
  temu: 'temu.com',
  jd: 'jd.hk',
  pinduoduo: 'pinduoduo.com',
  xbox: 'xbox.com',
  nintendo: 'nintendo.com',
  hoyoverse: 'hoyoverse.com',
  'disney-plus': 'disneyplus.com',
  disneyplus: 'disneyplus.com',
  'qq-music': 'y.qq.com',
  moomoo: 'moomoo.com',
  luno: 'luno.com',
  ibkr: 'interactivebrokers.com',
  webull: 'webull.com',
  'rakuten-trade': 'rakutentrade.my',
  'wechat-pay': 'pay.weixin.qq.com',
  '163-mail': 'mail.163.com',
  '163': 'mail.163.com',
  'yahoo-mail': 'yahoo.com',
  yahoo: 'yahoo.com',
  fastmail: 'fastmail.com',
};

function sanitizeLogoDomain(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const stripped = trimmed
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .trim()
    .toLowerCase();
  if (!stripped || !stripped.includes('.')) return null;
  return stripped;
}

/**
 * Returns ordered, reliable high-res official logo URLs for a domain.
 * Both endpoints are cached with Workbox CacheFirst (30d) for offline PWA use.
 */
export function getRealLogoUrls(domain?: string): string[] {
  const cleanDomain = sanitizeLogoDomain(domain);
  if (!cleanDomain) return [];
  const encoded = encodeURIComponent(cleanDomain);
  return [
    `https://www.google.com/s2/favicons?domain=${encoded}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`,
  ];
}

export function getRealBrandSvg(idOrProvider: string): RealBrandSvg | undefined {
  return REAL_BRAND_SVGS[idOrProvider.trim().toLowerCase()];
}

export function getFullColorLogoDomain(
  idOrProvider: string,
  fallbackDomain?: string,
): string | undefined {
  const key = idOrProvider.trim().toLowerCase();
  return FULL_COLOR_LOGO_DOMAINS[key] ?? sanitizeLogoDomain(fallbackDomain) ?? undefined;
}

export function getBankLogoDomain(bankId?: string): string | undefined {
  if (!bankId) return undefined;
  const key = bankId.trim().toLowerCase();
  return BANK_BY_ID[key]?.domain ?? FULL_COLOR_LOGO_DOMAINS[key];
}

/**
 * Returns true if this service should prioritize its real full-color high-res
 * official logo (`<img>`) over a monochrome vector SVG.
 */
export function prefersFullColorLogo(idOrProvider: string): boolean {
  const key = idOrProvider.trim().toLowerCase();
  return key in FULL_COLOR_LOGO_DOMAINS;
}
