import type { CarrierSimArtworkId } from '../components/SimCardArtwork';
import type { CardTheme, IdentityCard } from '../types/vault';

export type BankArtworkId =
  | 'maybank-mae'
  | 'gxbank-stealth'
  | 'cimb-prism'
  | 'pbe-classic'
  | 'hlb-stripe'
  | 'rhb-wave'
  | 'ambank-slash'
  | 'uob-bars'
  | 'ocbc-crest'
  | 'hsbc-lion'
  | 'sc-ribbon'
  | 'alliance-tri'
  | 'affin-wing'
  | 'bankislam-lattice'
  | 'bsn-teal'
  | 'aeon-pink'
  | 'boost-pulse'
  | 'tng-splash'
  | 'bigpay-matte'
  | 'wise-flag'
  | 'dbs-spark'
  | 'revolut-holo'
  | 'cmb-gold'
  | 'boc-coin'
  | 'icbc-peony'
  | 'ccb-dragon'
  | 'ryt-ai'
  | 'kaf-gradient'
  | 'rakyat-touch'
  | 'muamalat-geo'
  | 'mbsb-teal'
  | 'agro-horizon'
  | 'alrajhi-crest'
  | 'rize-aurora'
  | 'kfh-emerald'
  | 'enrich-mas'
  | 'mtm-slash'
  | 'gxs-cosmic'
  | 'trust-clear'
  | 'mari-orange'
  | 'youtrip-violet'
  | 'citi-arch'
  | 'chase-sapphire'
  | 'apple-titanium'
  | 'amex-centurion'
  | 'monzo-coral'
  | 'airwallex-prism'
  | 'abc-wheat'
  | 'bocom-silk'
  | 'pingan-flame'
  | 'citic-red'
  | 'psbc-wing';

export interface BankCardSkin {
  bankId: string;
  /** CSS linear/radial background replicating the real physical card base */
  background: string;
  /** True when the card surface is bright (e.g. Maybank Yellow, Wise Lime, AmBank Yellow) */
  isLightSurface: boolean;
  /** Primary foreground ink color */
  inkColor: string;
  /** Secondary muted ink color */
  mutedInkColor: string;
  /** EMV smartcard chip plating tone matching the real card */
  chipTone: 'gold' | 'silver';
  /** Ambient studio stage aura hex color */
  auraHex: string;
  /** Bespoke vector artwork layer replicating real physical card graphics */
  artwork: BankArtworkId;
  /** Optional authentic Visa brand wordmark color override (e.g. #1A1F71 on bright yellow) */
  visaInkColor?: string;
  /** Optional physical colored PVC card core bezel (e.g. GXBank stealth black w/ magenta-purple edge) */
  edgeCoreGradient?: string;
  /** Authentic physical right-edge semicircular accessibility notch (Wise Card) */
  hasRightNotch?: boolean;
  /** Authentic subtle edition/series silkscreen tag (e.g. MAE, GX CARD, DEBIT-i) */
  editionLabel?: string;
  /** Swatch preview CSS gradient for the editor picker */
  swatchBackground: string;
  /** Optional local 1:1 real official physical bank card front artwork (/bank-cards/<bankId>.webp) */
  cardImageUrl?: string;
}

/**
 * Verified 46 real official physical bank card face images bundled under /public/bank-cards/<bankId>.webp
 * (sourced from official Malaysia RinggitPlus, Apple Wallet official artwork, and bank CDNs — 520x328 ISO 1.585:1).
 */
export const REAL_BANK_CARD_IMAGE_IDS: ReadonlySet<string> = new Set([
  'abc',
  'aeonbank',
  'affin',
  'agrobank',
  'airwallex',
  'alliance',
  'alrajhi',
  'ambank',
  'amex',
  'applecard',
  'bankislam',
  'bankrakyat',
  'bigpay',
  'boc',
  'bocom',
  'boostbank',
  'bsn',
  'ccb',
  'chase',
  'cimb',
  'citi',
  'citic',
  'cmb',
  'dbs',
  'enrichmoney',
  'gxbank',
  'hlb',
  'hsbc',
  'icbc',
  'kfh',
  'maribank',
  'maybank',
  'mbsb',
  'merchantrade',
  'monzo',
  'ocbc',
  'pingan',
  'psbc',
  'publicbank',
  'revolut',
  'rhb',
  'rytbank',
  'sc',
  'trustbank',
  'uob',
  'wise',
]);

export function getBankCardImageUrl(bankIdOrProvider?: string): string | undefined {
  if (!bankIdOrProvider) return undefined;
  const key = bankIdOrProvider.trim().toLowerCase();
  if (REAL_BANK_CARD_IMAGE_IDS.has(key)) {
    return `/bank-cards/${key}.webp`;
  }
  return undefined;
}

export const BANK_CARD_SKINS: Record<string, BankCardSkin> = {
  // ======================== MALAYSIA (19) ========================
  maybank: {
    bankId: 'maybank',
    // Real Maybank MAE Visa Debit Card: iconic vibrant Canary Yellow with crisp clean finish
    background:
      'linear-gradient(138deg, #FFE033 0%, #FFD000 48%, #F5B800 100%)',
    isLightSurface: true,
    inkColor: '#111113',
    mutedInkColor: 'rgba(17, 17, 19, 0.72)',
    chipTone: 'gold',
    auraHex: '#FFD000',
    artwork: 'maybank-mae',
    visaInkColor: '#1A1F71',
    editionLabel: 'MAE',
    swatchBackground: 'linear-gradient(135deg, #FFE033, #F5B800)',
  },
  cimb: {
    bankId: 'cimb',
    // Real CIMB Malaysia Crimson Red corporate card with faceted diamond prism
    background:
      'linear-gradient(138deg, #E30613 0%, #B80412 52%, #7D020C 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'silver',
    auraHex: '#E30613',
    artwork: 'cimb-prism',
    editionLabel: 'OCTO',
    swatchBackground: 'linear-gradient(135deg, #E30613, #8A030D)',
  },
  publicbank: {
    bankId: 'publicbank',
    // Real Public Bank PB Debit: corporate royal navy with subtle crimson/silver speed lines
    background:
      'linear-gradient(138deg, #173F82 0%, #0E2B5C 54%, #081A3A 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.74)',
    chipTone: 'gold',
    auraHex: '#1D4ED8',
    artwork: 'pbe-classic',
    editionLabel: 'PB',
    swatchBackground: 'linear-gradient(135deg, #173F82, #091C3E)',
  },
  hlb: {
    bankId: 'hlb',
    // Real Hong Leong Bank card: sleek deep navy with iconic crimson diagonal stripe
    background:
      'linear-gradient(138deg, #003A80 0%, #002759 54%, #00183A 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.75)',
    chipTone: 'silver',
    auraHex: '#0047AB',
    artwork: 'hlb-stripe',
    editionLabel: 'CONNECT',
    swatchBackground: 'linear-gradient(135deg, #003A80 58%, #E31937 100%)',
  },
  rhb: {
    bankId: 'rhb',
    // Real RHB Ocean Harmoni / Corporate Sky-Cyan card
    background:
      'linear-gradient(138deg, #00AEEF 0%, #0072BC 52%, #00437A 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'silver',
    auraHex: '#00AEEF',
    artwork: 'rhb-wave',
    swatchBackground: 'linear-gradient(135deg, #00AEEF, #004A87)',
  },
  ambank: {
    bankId: 'ambank',
    // Real AmBank signature sunny yellow with bold AmBank crimson corner slash
    background:
      'linear-gradient(138deg, #FFDC2E 0%, #FFC800 54%, #F2B000 100%)',
    isLightSurface: true,
    inkColor: '#111113',
    mutedInkColor: 'rgba(17, 17, 19, 0.72)',
    chipTone: 'gold',
    auraHex: '#E31837',
    artwork: 'ambank-slash',
    visaInkColor: '#1A1F71',
    swatchBackground: 'linear-gradient(135deg, #FFC800 55%, #DA291C 100%)',
  },
  uob: {
    bankId: 'uob',
    // Real UOB Malaysia card: prestigious deep royal navy + 5 signature crimson bars
    background:
      'linear-gradient(138deg, #00326E 0%, #00214B 55%, #00132E 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.74)',
    chipTone: 'silver',
    auraHex: '#0033A0',
    artwork: 'uob-bars',
    editionLabel: 'TMRW',
    swatchBackground: 'linear-gradient(135deg, #00326E 62%, #D71920 100%)',
  },
  ocbc: {
    bankId: 'ocbc',
    // Real OCBC Malaysia card: bold vermilion crimson red with white keel crest
    background:
      'linear-gradient(138deg, #E31B23 0%, #B81018 54%, #7E080F 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'silver',
    auraHex: '#ED1C24',
    artwork: 'ocbc-crest',
    swatchBackground: 'linear-gradient(135deg, #E31B23, #8A0910)',
  },
  hsbc: {
    bankId: 'hsbc',
    // Real HSBC Malaysia card: sleek graphite-obsidian with geometric lion & red hexagon
    background:
      'linear-gradient(138deg, #272B33 0%, #17191F 54%, #0C0D11 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.72)',
    chipTone: 'silver',
    auraHex: '#DB0011',
    artwork: 'hsbc-lion',
    swatchBackground: 'linear-gradient(135deg, #272B33 60%, #DB0011 100%)',
  },
  sc: {
    bankId: 'sc',
    // Real Standard Chartered card: deep midnight slate with green & royal blue ribbon
    background:
      'linear-gradient(138deg, #0E3156 0%, #09213B 56%, #051324 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.74)',
    chipTone: 'silver',
    auraHex: '#0473EA',
    artwork: 'sc-ribbon',
    swatchBackground: 'linear-gradient(135deg, #0473EA, #38D200)',
  },
  alliance: {
    bankId: 'alliance',
    // Real Alliance Bank card: corporate sapphire with ascending geometric facets
    background:
      'linear-gradient(138deg, #0066B3 0%, #004785 54%, #002C57 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.76)',
    chipTone: 'silver',
    auraHex: '#0056A4',
    artwork: 'alliance-tri',
    swatchBackground: 'linear-gradient(135deg, #0066B3, #002C57)',
  },
  affin: {
    bankId: 'affin',
    // Real Affin Bank card: royal cobalt with crimson & cyan wing curve
    background:
      'linear-gradient(138deg, #0047BA 0%, #003187 54%, #001D54 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.76)',
    chipTone: 'silver',
    auraHex: '#003DA5',
    artwork: 'affin-wing',
    swatchBackground: 'linear-gradient(135deg, #0047BA, #001D54)',
  },
  bankislam: {
    bankId: 'bankislam',
    // Real Bank Islam card: deep regal burgundy with subtle Islamic geometric star lattice
    background:
      'linear-gradient(138deg, #A3122E 0%, #750A20 55%, #470513 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.76)',
    chipTone: 'gold',
    auraHex: '#A3122E',
    artwork: 'bankislam-lattice',
    editionLabel: 'DEBIT-i',
    swatchBackground: 'linear-gradient(135deg, #A3122E, #4D0615)',
  },
  bsn: {
    bankId: 'bsn',
    // Real BSN Malaysia card: lush teal-emerald gradient
    background:
      'linear-gradient(138deg, #00B2A9 0%, #00827D 54%, #005250 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'silver',
    auraHex: '#00A99D',
    artwork: 'bsn-teal',
    swatchBackground: 'linear-gradient(135deg, #00B2A9, #005250)',
  },
  gxbank: {
    bankId: 'gxbank',
    // Real GXBank Physical GX Card: Stealth Matte Black with iconic purple-magenta luminous core & reflective GX mark
    background:
      'linear-gradient(142deg, #1A1822 0%, #100F16 52%, #09080D 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.70)',
    chipTone: 'silver',
    auraHex: '#C026D3',
    artwork: 'gxbank-stealth',
    edgeCoreGradient:
      'linear-gradient(135deg, #EC1C69 0%, #8B2CF5 48%, #E11D74 100%)',
    editionLabel: 'GX CARD',
    swatchBackground: 'linear-gradient(135deg, #16141F 45%, #D91B60 100%)',
  },
  aeonbank: {
    bankId: 'aeonbank',
    // Real AEON Bank Debit Card-i: Iconic vibrant AEON Magenta-Pink
    background:
      'linear-gradient(138deg, #FF3B9A 0%, #E6007E 48%, #A80063 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.82)',
    chipTone: 'silver',
    auraHex: '#E6007E',
    artwork: 'aeon-pink',
    editionLabel: 'DEBIT-i',
    swatchBackground: 'linear-gradient(135deg, #FF3B9A, #B30068)',
  },
  boostbank: {
    bankId: 'boostbank',
    // Real Boost Bank Debit Card: Striking fiery Boost Red
    background:
      'linear-gradient(138deg, #F62B3A 0%, #D91426 52%, #9A0918 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'silver',
    auraHex: '#EE2737',
    artwork: 'boost-pulse',
    swatchBackground: 'linear-gradient(135deg, #F62B3A, #9E0A19)',
  },
  'tng-visa': {
    bankId: 'tng-visa',
    // Real Touch 'n Go eWallet Visa: Vibrant TNG Royal Blue with contemporary multi-color splash
    background:
      'linear-gradient(135deg, #0066DB 0%, #0048B0 52%, #002F82 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.82)',
    chipTone: 'silver',
    auraHex: '#0088FF',
    artwork: 'tng-splash',
    editionLabel: 'eWALLET',
    swatchBackground:
      'linear-gradient(135deg, #00C2FF 0%, #005CE6 55%, #FF4D94 100%)',
  },
  bigpay: {
    bankId: 'bigpay',
    // Real BigPay Physical Card: Iconic minimalist Matte Electric Cobalt Blue
    background:
      'linear-gradient(138deg, #0F7CFF 0%, #005BE6 54%, #003FB5 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.82)',
    chipTone: 'silver',
    auraHex: '#006BFF',
    artwork: 'bigpay-matte',
    swatchBackground: 'linear-gradient(135deg, #0F7CFF, #0044C2)',
  },

  // ======================== GLOBAL & CHINA (7) ========================
  wise: {
    bankId: 'wise',
    // Real Wise Green Multi-Currency Card: Electric Lime Green + Deep Forest Ink + Authentic Right-Edge Notch!
    background:
      'linear-gradient(138deg, #A9EE7B 0%, #9FE870 50%, #87DB53 100%)',
    isLightSurface: true,
    inkColor: '#163300',
    mutedInkColor: 'rgba(22, 51, 0, 0.72)',
    chipTone: 'silver',
    auraHex: '#9FE870',
    artwork: 'wise-flag',
    visaInkColor: '#163300',
    hasRightNotch: true,
    swatchBackground: 'linear-gradient(135deg, #A9EE7B, #7FD64B)',
  },
  dbs: {
    bankId: 'dbs',
    // Real DBS Card: Matte Charcoal Obsidian with DBS Crimson Spark
    background:
      'linear-gradient(138deg, #25262B 0%, #141519 54%, #090A0D 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.72)',
    chipTone: 'silver',
    auraHex: '#E31837',
    artwork: 'dbs-spark',
    swatchBackground: 'linear-gradient(135deg, #25262B 58%, #E31837 100%)',
  },
  revolut: {
    bankId: 'revolut',
    // Real Revolut Card: Signature Iridescent Electric Blue-Violet-Magenta Chrome
    background:
      'linear-gradient(132deg, #1E6BFF 0%, #5B48F5 46%, #BD3EF5 82%, #1BB9FF 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.82)',
    chipTone: 'silver',
    auraHex: '#6366F1',
    artwork: 'revolut-holo',
    swatchBackground: 'linear-gradient(135deg, #1E6BFF, #BD3EF5)',
  },
  cmb: {
    bankId: 'cmb',
    // Real China Merchants Bank (招行一卡通金卡): Imperial Crimson-Burgundy + Champagne Gold Silk
    background:
      'linear-gradient(138deg, #BD172B 0%, #830E1D 54%, #4D0610 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 240, 215, 0.8)',
    chipTone: 'gold',
    auraHex: '#C7152D',
    artwork: 'cmb-gold',
    editionLabel: '金葵花',
    swatchBackground: 'linear-gradient(135deg, #BD172B, #590812)',
  },
  boc: {
    bankId: 'boc',
    // Real Bank of China (中行长城卡): Classic Deep Wine-Red with ancient coin filigree
    background:
      'linear-gradient(138deg, #A41C34 0%, #711022 54%, #420713 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 240, 235, 0.78)',
    chipTone: 'gold',
    auraHex: '#A71E32',
    artwork: 'boc-coin',
    editionLabel: '长城卡',
    swatchBackground: 'linear-gradient(135deg, #A41C34, #4A0815)',
  },
  icbc: {
    bankId: 'icbc',
    // Real ICBC (工行牡丹卡): Obsidian-Crimson brushed metallic with gold accent
    background:
      'linear-gradient(138deg, #32161C 0%, #1C0B0F 54%, #0E0507 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 236, 224, 0.74)',
    chipTone: 'gold',
    auraHex: '#C7000B',
    artwork: 'icbc-peony',
    editionLabel: '牡丹卡',
    swatchBackground: 'linear-gradient(135deg, #32161C 48%, #C7000B 100%)',
  },
  ccb: {
    bankId: 'ccb',
    // Real CCB (建行龙卡): Classic Sapphire Blue with subtle gold wave
    background:
      'linear-gradient(138deg, #0066C2 0%, #00428C 54%, #002557 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'gold',
    auraHex: '#0066B3',
    artwork: 'ccb-dragon',
    editionLabel: '龙卡',
    swatchBackground: 'linear-gradient(135deg, #0066C2, #00275C)',
  },

  // ======================== NEW MALAYSIA DIGITAL BANKS, ISLAMIC BANKS, DFIs & PREPAID ========================
  rytbank: {
    bankId: 'rytbank',
    // Real Ryt Bank (YTL × Sea): Sleek Matte Pearl-White Ryt Card
    background:
      'linear-gradient(138deg, #E8E7EC 0%, #D6D5DA 52%, #C3C2C8 100%)',
    isLightSurface: true,
    inkColor: '#111113',
    mutedInkColor: 'rgba(17, 17, 19, 0.68)',
    chipTone: 'silver',
    auraHex: '#3B82F6',
    artwork: 'ryt-ai',
    editionLabel: 'RYT CARD',
    swatchBackground: 'linear-gradient(135deg, #F1F0F4, #C8C7CE)',
  },
  kafbank: {
    bankId: 'kafbank',
    // Real KAF Digital Bank Visa Debit Card-i: Vibrant multi-color gradient + tactile edge notch
    background:
      'linear-gradient(132deg, #312082 0%, #0077B6 52%, #00BFA6 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.82)',
    chipTone: 'silver',
    auraHex: '#00BFA6',
    artwork: 'kaf-gradient',
    hasRightNotch: true,
    editionLabel: 'DEBIT-i',
    swatchBackground: 'linear-gradient(135deg, #312082, #00BFA6)',
  },
  rize: {
    bankId: 'rize',
    // Real Rize (by Al Rajhi Bank Malaysia): Electric Indigo-Violet + Luminous Aqua digital card
    background:
      'linear-gradient(135deg, #271E7A 0%, #3F2B96 50%, #00B4D8 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'silver',
    auraHex: '#3F2B96',
    artwork: 'rize-aurora',
    editionLabel: 'DIGITAL',
    swatchBackground: 'linear-gradient(135deg, #3F2B96, #00B4D8)',
  },
  bankrakyat: {
    bankId: 'bankrakyat',
    // Real Bank Rakyat Debit Card-i: Corporate Royal Blue & Sunset Orange + Mastercard Touch Card notch
    background:
      'linear-gradient(138deg, #0058B3 0%, #003B80 54%, #002352 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'gold',
    auraHex: '#F58220',
    artwork: 'rakyat-touch',
    hasRightNotch: true,
    editionLabel: 'DEBIT-i',
    swatchBackground: 'linear-gradient(135deg, #0058B3 58%, #F58220 100%)',
  },
  muamalat: {
    bankId: 'muamalat',
    // Real Bank Muamalat Debit Card-i: Vibrant Cobalt Blue & Tangerine Orange geometric lines
    background:
      'linear-gradient(138deg, #005AB8 0%, #003C82 54%, #002454 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'gold',
    auraHex: '#FF6B00',
    artwork: 'muamalat-geo',
    editionLabel: 'DEBIT-i',
    swatchBackground: 'linear-gradient(135deg, #005AB8 55%, #FF6B00 100%)',
  },
  mbsb: {
    bankId: 'mbsb',
    // Real MBSB Bank Visa Debit Card-i: Clean Sapphire & Corporate Teal
    background:
      'linear-gradient(138deg, #0E428A 0%, #007285 56%, #004759 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'silver',
    auraHex: '#007A8C',
    artwork: 'mbsb-teal',
    editionLabel: 'DEBIT-i',
    swatchBackground: 'linear-gradient(135deg, #0E428A, #007A8C)',
  },
  agrobank: {
    bankId: 'agrobank',
    // Real Agrobank Agro Visa Debit Card-i: Emerald Green & Horizon Blue
    background:
      'linear-gradient(138deg, #009459 0%, #006E48 52%, #004A6E 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'gold',
    auraHex: '#008752',
    artwork: 'agro-horizon',
    editionLabel: 'AGRO-i',
    swatchBackground: 'linear-gradient(135deg, #009459, #004A6E)',
  },
  alrajhi: {
    bankId: 'alrajhi',
    // Real Al Rajhi Bank Malaysia: Royal Indigo Blue & Clean White Crest
    background:
      'linear-gradient(138deg, #244BC4 0%, #15318F 54%, #0B1D5C 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'silver',
    auraHex: '#1C3FAA',
    artwork: 'alrajhi-crest',
    swatchBackground: 'linear-gradient(135deg, #244BC4, #0B1D5C)',
  },
  kfh: {
    bankId: 'kfh',
    // Real Kuwait Finance House Malaysia: Deep Islamic Emerald & Warm Gold Filigree
    background:
      'linear-gradient(138deg, #007D4E 0%, #005737 54%, #003421 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'gold',
    auraHex: '#006B42',
    artwork: 'kfh-emerald',
    swatchBackground: 'linear-gradient(135deg, #007D4E, #003823)',
  },
  enrichmoney: {
    bankId: 'enrichmoney',
    // Real EnrichMoney Visa (Malaysia Airlines × Merchantrade): Deep Aviation Navy + Wau Crimson-Gold Arc
    background:
      'linear-gradient(138deg, #122E6E 0%, #0A1B45 54%, #050E26 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.76)',
    chipTone: 'gold',
    auraHex: '#1D4ED8',
    artwork: 'enrich-mas',
    editionLabel: 'ENRICH',
    swatchBackground: 'linear-gradient(135deg, #122E6E 62%, #E11D48 100%)',
  },
  merchantrade: {
    bankId: 'merchantrade',
    // Real Merchantrade Money Multi-Currency Visa Card: Bold Crimson Red & Clean Diagonal White
    background:
      'linear-gradient(138deg, #E3202E 0%, #B81120 54%, #7E0914 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'silver',
    auraHex: '#D81E2B',
    artwork: 'mtm-slash',
    swatchBackground: 'linear-gradient(135deg, #E3202E, #870A15)',
  },

  // ======================== NEW SINGAPORE & GLOBAL DIGITAL / MAJOR BANKS ========================
  gxs: {
    bankId: 'gxs',
    // Real GXS Bank Singapore: Space-inspired Cosmic Dark Purple & Neon Violet
    background:
      'linear-gradient(138deg, #4C1699 0%, #260A54 52%, #110429 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'silver',
    auraHex: '#7C3AED',
    artwork: 'gxs-cosmic',
    edgeCoreGradient:
      'linear-gradient(135deg, #C084FC 0%, #7C3AED 50%, #E879F9 100%)',
    editionLabel: 'GXS',
    swatchBackground: 'linear-gradient(135deg, #7C3AED, #180638)',
  },
  trustbank: {
    bankId: 'trustbank',
    // Real Trust Bank Singapore: Iconic Translucent Frosted Ice-Blue/White card with Giant Cut-out T
    background:
      'linear-gradient(138deg, #F5FAFF 0%, #DFEEFF 52%, #C2DEFF 100%)',
    isLightSurface: true,
    inkColor: '#0A2559',
    mutedInkColor: 'rgba(10, 37, 89, 0.72)',
    chipTone: 'silver',
    auraHex: '#3B82F6',
    artwork: 'trust-clear',
    visaInkColor: '#0A2559',
    swatchBackground: 'linear-gradient(135deg, #F5FAFF, #93C5FD)',
  },
  maribank: {
    bankId: 'maribank',
    // Real MariBank Singapore: Signature Vibrant Bright Orange Card
    background:
      'linear-gradient(138deg, #FF7433 0%, #F05212 52%, #BD3804 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.84)',
    chipTone: 'silver',
    auraHex: '#FF6422',
    artwork: 'mari-orange',
    swatchBackground: 'linear-gradient(135deg, #FF7433, #BD3804)',
  },
  youtrip: {
    bankId: 'youtrip',
    // Real YouTrip Multi-Currency Card: Signature Electric Purple with Mint-Teal Travel Swoosh
    background:
      'linear-gradient(138deg, #5B2FB8 0%, #3E1C8A 54%, #240E59 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'silver',
    auraHex: '#6D28D9',
    artwork: 'youtrip-violet',
    swatchBackground: 'linear-gradient(135deg, #5B2FB8, #2EE6A6)',
  },
  monzo: {
    bankId: 'monzo',
    // Real Monzo Card: Iconic Unmistakable Hot Coral Fluorescent Pink-Red
    background:
      'linear-gradient(138deg, #FF6459 0%, #FF4B40 52%, #E63228 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.84)',
    chipTone: 'silver',
    auraHex: '#FF5449',
    artwork: 'monzo-coral',
    swatchBackground: 'linear-gradient(135deg, #FF6459, #E63228)',
  },
  airwallex: {
    bankId: 'airwallex',
    // Real Airwallex Borderless Card: Stealth Graphite with Flame-Orange & Indigo Slash
    background:
      'linear-gradient(138deg, #21232B 0%, #13151B 54%, #090A0E 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.72)',
    chipTone: 'silver',
    auraHex: '#FF4F1F',
    artwork: 'airwallex-prism',
    swatchBackground: 'linear-gradient(135deg, #1E2028 52%, #FF4F1F 100%)',
  },
  applecard: {
    bankId: 'applecard',
    // Real Apple Card: Laser-Etched Titanium Pearl Matte White
    background:
      'linear-gradient(142deg, #FFFFFF 0%, #F2F3F7 52%, #E2E5EC 100%)',
    isLightSurface: true,
    inkColor: '#1D1D1F',
    mutedInkColor: 'rgba(29, 29, 31, 0.65)',
    chipTone: 'silver',
    auraHex: '#A1A1AA',
    artwork: 'apple-titanium',
    swatchBackground: 'linear-gradient(135deg, #FFFFFF, #D4D7DF)',
  },
  citi: {
    bankId: 'citi',
    // Real Citibank Card: Classic Citi Royal Blue with Iconic Crimson Arch
    background:
      'linear-gradient(138deg, #005CA8 0%, #003D78 54%, #00244A 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'silver',
    auraHex: '#004B8D',
    artwork: 'citi-arch',
    swatchBackground: 'linear-gradient(135deg, #005CA8 65%, #EE1C25 100%)',
  },
  chase: {
    bankId: 'chase',
    // Real Chase Sapphire: Deep Textured Midnight Sapphire Blue
    background:
      'linear-gradient(138deg, #184A9E 0%, #0E3170 52%, #071B42 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.76)',
    chipTone: 'silver',
    auraHex: '#117ACA',
    artwork: 'chase-sapphire',
    editionLabel: 'SAPPHIRE',
    swatchBackground: 'linear-gradient(135deg, #184A9E, #071B42)',
  },
  amex: {
    bankId: 'amex',
    // Real American Express Gold Card: Iconic Champagne Metallic Gold with Centurion Frame
    background:
      'linear-gradient(138deg, #EFD38A 0%, #D4AC54 50%, #AF842B 100%)',
    isLightSurface: true,
    inkColor: '#1C1406',
    mutedInkColor: 'rgba(28, 20, 6, 0.72)',
    chipTone: 'gold',
    auraHex: '#D4AC54',
    artwork: 'amex-centurion',
    swatchBackground: 'linear-gradient(135deg, #EFD38A, #AF842B)',
  },

  // ======================== NEW CHINA MAJOR BANKS ========================
  abc: {
    bankId: 'abc',
    // Real ABC (中国农业银行金穗卡): Iconic ABC Emerald Teal-Green & Gold Wheat Arc
    background:
      'linear-gradient(138deg, #009E7A 0%, #007058 54%, #004537 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'gold',
    auraHex: '#008E6D',
    artwork: 'abc-wheat',
    editionLabel: '金穗卡',
    swatchBackground: 'linear-gradient(135deg, #009E7A, #004537)',
  },
  bocom: {
    bankId: 'bocom',
    // Real BoCom (交通银行太平洋卡): Classic Royal Sapphire Blue & Silver-Gold Ribbon
    background:
      'linear-gradient(138deg, #004EB3 0%, #003178 54%, #001B47 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.78)',
    chipTone: 'silver',
    auraHex: '#003B8E',
    artwork: 'bocom-silk',
    editionLabel: '太平洋',
    swatchBackground: 'linear-gradient(135deg, #004EB3, #001B47)',
  },
  psbc: {
    bankId: 'psbc',
    // Real PSBC (中国邮政储蓄绿卡通): Iconic Deep Postal Forest Green & Gold Wing Lines
    background:
      'linear-gradient(138deg, #008F4F 0%, #006637 54%, #003D20 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 255, 255, 0.8)',
    chipTone: 'gold',
    auraHex: '#007B43',
    artwork: 'psbc-wing',
    editionLabel: '绿卡通',
    swatchBackground: 'linear-gradient(135deg, #008F4F, #003D20)',
  },
  pingan: {
    bankId: 'pingan',
    // Real Ping An Bank: Vibrant Flame Orange-Gold Gradient
    background:
      'linear-gradient(138deg, #FF6D26 0%, #D9460A 52%, #942B00 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 244, 232, 0.82)',
    chipTone: 'gold',
    auraHex: '#F25918',
    artwork: 'pingan-flame',
    swatchBackground: 'linear-gradient(135deg, #FF6D26, #9E2E00)',
  },
  citic: {
    bankId: 'citic',
    // Real CITIC Bank: Classic Imperial Chinese Red with Warm Gold Geometric Ring
    background:
      'linear-gradient(138deg, #D91E26 0%, #9E0E15 54%, #5C060B 100%)',
    isLightSurface: false,
    inkColor: '#FFFFFF',
    mutedInkColor: 'rgba(255, 240, 235, 0.8)',
    chipTone: 'gold',
    auraHex: '#C8161D',
    artwork: 'citic-red',
    swatchBackground: 'linear-gradient(135deg, #D91E26, #61070C)',
  },
};

export interface CarrierSimSkin {
  carrierId: string;
  background: string;
  accentBar: string;
  isLightSurface: boolean;
  /** True when the bottom ribbon zone is a saturated carrier band needing dark-surface pill contrast */
  darkBottomBand?: boolean;
  auraHex: string;
  swatchBackground: string;
  artwork: CarrierSimArtworkId;
  /** Public telecom issuer IIN prefix (zero personal data — standard ITU-T E.118 prefix) */
  iccidPrefix: string;
  /** Authentic carrier product silkscreen label */
  simSpecLabel: string;
}

export const CARRIER_SIM_SKINS: Record<string, CarrierSimSkin> = {
  maxis: {
    carrierId: 'maxis',
    // Authentic Maxis 5G Emerald Green Matte PVC Triple-Cut SIM
    background:
      'linear-gradient(138deg, #00B843 0%, #008234 54%, #004E20 100%)',
    accentBar: 'linear-gradient(90deg, #A6F738, #00E676)',
    isLightSurface: false,
    auraHex: '#00B140',
    swatchBackground: 'linear-gradient(135deg, #00B140, #005C25)',
    artwork: 'maxis',
    iccidPrefix: '8960 12••',
    simSpecLabel: '5G USIM',
  },
  hotlink: {
    carrierId: 'hotlink',
    // Authentic Hotlink 5G Electric Crimson PVC SIM
    background:
      'linear-gradient(138deg, #EC0016 0%, #B80010 54%, #7A000A 100%)',
    accentBar: 'linear-gradient(90deg, #FF6675, #FF1E32)',
    isLightSurface: false,
    auraHex: '#E60012',
    swatchBackground: 'linear-gradient(135deg, #E60012, #85000A)',
    artwork: 'hotlink',
    iccidPrefix: '8960 12••',
    simSpecLabel: 'PREPAID 5G',
  },
  celcomdigi: {
    carrierId: 'celcomdigi',
    // Authentic CelcomDigi Royal Blue + Sunny Yellow Butterfly Wing SIM
    background:
      'linear-gradient(138deg, #005AC2 0%, #003B8C 54%, #00235B 100%)',
    accentBar: 'linear-gradient(90deg, #FFD100, #38BDF8)',
    isLightSurface: false,
    auraHex: '#0057B8',
    swatchBackground: 'linear-gradient(135deg, #0057B8 60%, #FFD100 100%)',
    artwork: 'celcomdigi',
    iccidPrefix: '8960 19••',
    simSpecLabel: '5G USIM',
  },
  umobile: {
    carrierId: 'umobile',
    // Authentic U Mobile ULTRA 5G Vivid Orange SIM
    background:
      'linear-gradient(138deg, #FF7000 0%, #DB4F00 54%, #A33500 100%)',
    accentBar: 'linear-gradient(90deg, #FFC266, #FF7700)',
    isLightSurface: false,
    auraHex: '#FF6B00',
    swatchBackground: 'linear-gradient(135deg, #FF6B00, #A83800)',
    artwork: 'umobile',
    iccidPrefix: '8960 18••',
    simSpecLabel: 'ULTRA 5G',
  },
  unifi: {
    carrierId: 'unifi',
    // Authentic Unifi Mobile (TM) Pearl-White Top + Unifi Orange Diagonal + TM Royal Blue Base
    background:
      'linear-gradient(142deg, #FFFFFF 0%, #F4F6FA 48%, #E6ECF5 100%)',
    accentBar: 'linear-gradient(90deg, #FF6A00, #002D72)',
    isLightSurface: true,
    darkBottomBand: true,
    auraHex: '#FF6A00',
    swatchBackground: 'linear-gradient(135deg, #FFFFFF 30%, #FF6A00 55%, #002D72 100%)',
    artwork: 'unifi',
    iccidPrefix: '8960 15••',
    simSpecLabel: 'UNI5G',
  },
  yes5g: {
    carrierId: 'yes5g',
    // Authentic Yes 5G Vivid Magenta-Pink Prism SIM
    background:
      'linear-gradient(138deg, #FF0084 0%, #CC0068 54%, #820042 100%)',
    accentBar: 'linear-gradient(90deg, #FF85C8, #FF1A8C)',
    isLightSurface: false,
    auraHex: '#E6007E',
    swatchBackground: 'linear-gradient(135deg, #FF0080, #99004D)',
    artwork: 'yes5g',
    iccidPrefix: '8960 15••',
    simSpecLabel: '5G SA',
  },
  tunetalk: {
    carrierId: 'tunetalk',
    // Authentic Tune Talk Satin Obsidian Black + Crimson Slash SIM
    background:
      'linear-gradient(138deg, #1E2026 0%, #121317 54%, #08090B 100%)',
    accentBar: 'linear-gradient(90deg, #E31823, #FF5C66)',
    isLightSurface: false,
    auraHex: '#E31823',
    swatchBackground: 'linear-gradient(135deg, #16171C 52%, #E31823 100%)',
    artwork: 'tunetalk',
    iccidPrefix: '8960 19••',
    simSpecLabel: 'EPIK 5G',
  },
  singtel: {
    carrierId: 'singtel',
    // Authentic Singtel 5G+ Satin Pearl-White PVC + Iconic Crimson Red Wave
    background:
      'linear-gradient(142deg, #FFFFFF 0%, #F7F7F9 52%, #ECECEF 100%)',
    accentBar: 'linear-gradient(90deg, #ED1C24, #FF5E65)',
    isLightSurface: true,
    darkBottomBand: true,
    auraHex: '#ED1C24',
    swatchBackground: 'linear-gradient(135deg, #FFFFFF 45%, #ED1C24 100%)',
    artwork: 'singtel',
    iccidPrefix: '8965 01••',
    simSpecLabel: '5G+ USIM',
  },
  chinamobile: {
    carrierId: 'chinamobile',
    // Authentic China Mobile 5G Satin White PVC + Azure & Lime-Green Ribbons
    background:
      'linear-gradient(142deg, #FFFFFF 0%, #F4F9FD 52%, #E6F2FA 100%)',
    accentBar: 'linear-gradient(90deg, #0085D0, #8CC63F)',
    isLightSurface: true,
    darkBottomBand: true,
    auraHex: '#0085D0',
    swatchBackground: 'linear-gradient(135deg, #FFFFFF 35%, #0085D0 72%, #8CC63F 100%)',
    artwork: 'chinamobile',
    iccidPrefix: '8986 02••',
    simSpecLabel: '5G · 10086',
  },
  chinaunicom: {
    carrierId: 'chinaunicom',
    // Authentic China Unicom 5G Satin White PVC + Vermilion Red Knot & Ribbon
    background:
      'linear-gradient(142deg, #FFFFFF 0%, #FDF6F6 52%, #F9EBEB 100%)',
    accentBar: 'linear-gradient(90deg, #E60012, #FF6A3D)',
    isLightSurface: true,
    darkBottomBand: true,
    auraHex: '#E60012',
    swatchBackground: 'linear-gradient(135deg, #FFFFFF 45%, #E60012 100%)',
    artwork: 'chinaunicom',
    iccidPrefix: '8986 01••',
    simSpecLabel: '5G · 10010',
  },
  chinatelecom: {
    carrierId: 'chinatelecom',
    // Authentic China Telecom 5G Satin White PVC + Classic Cobalt Blue & Emerald Ribbon
    background:
      'linear-gradient(142deg, #FFFFFF 0%, #F3F8FD 52%, #E5EFF9 100%)',
    accentBar: 'linear-gradient(90deg, #0072CE, #00A86B)',
    isLightSurface: true,
    darkBottomBand: true,
    auraHex: '#0072CE',
    swatchBackground: 'linear-gradient(135deg, #FFFFFF 35%, #0072CE 72%, #00A86B 100%)',
    artwork: 'chinatelecom',
    iccidPrefix: '8986 03••',
    simSpecLabel: '5G · 10000',
  },
};

const THEME_AURA_FALLBACK: Record<CardTheme, string> = {
  titanium: '#71717A',
  navy: '#2563EB',
  emerald: '#10B981',
  silver: '#94A3B8',
  amber: '#D97706',
};

export function getBankCardSkin(bankIdOrProvider?: string): BankCardSkin | undefined {
  if (!bankIdOrProvider) return undefined;
  const key = bankIdOrProvider.trim().toLowerCase();
  const base = BANK_CARD_SKINS[key];
  if (!base) return undefined;
  const cardImageUrl = getBankCardImageUrl(base.bankId);
  return cardImageUrl ? { ...base, cardImageUrl } : base;
}

export function getCarrierSimSkin(
  providerOrCarrier?: string,
  simCarrier?: string,
): CarrierSimSkin | undefined {
  const candidates = [providerOrCarrier, simCarrier]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase().replace(/\s+/g, ''));

  for (const raw of candidates) {
    if (CARRIER_SIM_SKINS[raw]) return CARRIER_SIM_SKINS[raw];
    if (raw.includes('maxis')) return CARRIER_SIM_SKINS.maxis;
    if (raw.includes('hotlink')) return CARRIER_SIM_SKINS.hotlink;
    if (raw.includes('celcom') || raw.includes('digi')) {
      return CARRIER_SIM_SKINS.celcomdigi;
    }
    if (raw.includes('umobile')) return CARRIER_SIM_SKINS.umobile;
    if (raw.includes('unifi')) return CARRIER_SIM_SKINS.unifi;
    if (raw.includes('yes')) return CARRIER_SIM_SKINS.yes5g;
    if (raw.includes('tunetalk')) return CARRIER_SIM_SKINS.tunetalk;
    if (raw.includes('singtel')) return CARRIER_SIM_SKINS.singtel;
    if (raw.includes('chinamobile') || raw.includes('移动')) {
      return CARRIER_SIM_SKINS.chinamobile;
    }
    if (raw.includes('chinaunicom') || raw.includes('联通')) {
      return CARRIER_SIM_SKINS.chinaunicom;
    }
    if (raw.includes('chinatelecom') || raw.includes('电信')) {
      return CARRIER_SIM_SKINS.chinatelecom;
    }
  }
  return undefined;
}

export function resolveIdentityAuraHex(identity?: IdentityCard | null): string {
  if (!identity) return '#71717A';
  const wantsAuthentic = identity.useAuthenticSkin !== false;
  if (wantsAuthentic && identity.type === 'bank') {
    const bankSkin = getBankCardSkin(identity.bankId || identity.provider);
    if (bankSkin) return bankSkin.auraHex;
  }
  if (wantsAuthentic && identity.type === 'phone') {
    const simSkin = getCarrierSimSkin(identity.provider, identity.simCarrier);
    if (simSkin) return simSkin.auraHex;
  }
  return THEME_AURA_FALLBACK[identity.cardTheme] ?? '#71717A';
}
