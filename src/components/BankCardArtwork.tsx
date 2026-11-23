import { useId } from 'react';
import type { BankArtworkId } from '../data/bankCardSkins';

export function BankCardArtwork({ artwork }: { artwork: BankArtworkId }) {
  const uid = useId();

  switch (artwork) {
    case 'maybank-mae':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Crisp white-and-gold architectural sweep inspired by the real Yellow & White MAE card */}
          <path
            d="M198 -16C228 42 266 96 340 124L340 -16Z"
            fill="#FFFFFF"
            fillOpacity="0.22"
          />
          <path
            d="M150 220C214 172 262 128 338 112L338 220Z"
            fill="#FFFFFF"
            fillOpacity="0.34"
          />
          <path
            d="M172 220C226 184 274 150 338 138L338 220Z"
            fill="#FFFFFF"
            fillOpacity="0.26"
          />
          {/* Subtle embossed MAE monogram watermark */}
          <text
            x="212"
            y="112"
            fill="#111113"
            fillOpacity="0.085"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="900"
            fontSize="46"
            letterSpacing="-2"
          >
            MAE
          </text>
          <circle cx="298" cy="30" r="46" stroke="#111113" strokeOpacity="0.06" strokeWidth="1.2" />
        </svg>
      );

    case 'gxbank-stealth': {
      const gxGrad = `${uid}-gx`;
      const gxGlow = `${uid}-gxglow`;
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gxGrad} x1="160" y1="24" x2="305" y2="176" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A838FF" />
              <stop offset="52%" stopColor="#EC1C69" />
              <stop offset="100%" stopColor="#FF5733" />
            </linearGradient>
            <radialGradient id={gxGlow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(244 102) rotate(90) scale(96 112)">
              <stop offset="0%" stopColor="#C026D3" stopOpacity="0.26" />
              <stop offset="58%" stopColor="#7C2AE8" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#09080D" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Ambient purple-magenta reflective sheen on matte obsidian */}
          <rect x="0" y="0" width="324" height="204" fill={`url(#${gxGlow})`} />
          {/* Iconic reflective purple-to-magenta GX centerpiece mark */}
          <text
            x="176"
            y="134"
            fill={`url(#${gxGrad})`}
            fillOpacity="0.46"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="900"
            fontSize="82"
            letterSpacing="-5"
          >
            GX
          </text>
          {/* Subtle laser-etched geometric diagonal sheen */}
          <path d="M180 0L292 204" stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="1" />
          <path d="M210 0L322 204" stroke="#EC1C69" strokeOpacity="0.16" strokeWidth="1.2" />
        </svg>
      );
    }

    case 'cimb-prism':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic CIMB faceted crimson origami prism geometry */}
          <polygon points="186,0 324,0 248,128" fill="#FFFFFF" fillOpacity="0.08" />
          <polygon points="248,128 324,0 324,204" fill="#4A0007" fillOpacity="0.26" />
          <polygon points="138,204 248,128 324,204" fill="#FFFFFF" fillOpacity="0.06" />
          <polygon points="212,62 292,16 268,108" fill="#FF4D5E" fillOpacity="0.16" />
          <path d="M186 0L248 128L138 204" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" />
        </svg>
      );

    case 'pbe-classic':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Classic Public Bank red-and-silver speed ribbons & subtle corporate arcs */}
          <path d="M174 -12L340 76L340 100L158 4Z" fill="#C8102E" fillOpacity="0.58" />
          <path d="M160 8L340 104L340 112L152 14Z" fill="#E2E8F0" fillOpacity="0.22" />
          <circle cx="282" cy="156" r="78" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1.2" />
          <circle cx="282" cy="156" r="52" stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="1" />
        </svg>
      );

    case 'hlb-stripe':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Signature Hong Leong Bank bold crimson diagonal ribbon */}
          <polygon points="222,0 264,0 168,204 126,204" fill="#E31937" fillOpacity="0.45" />
          <polygon points="266,0 284,0 188,204 170,204" fill="#FFFFFF" fillOpacity="0.1" />
          <circle cx="290" cy="40" r="68" fill="#0066CC" fillOpacity="0.18" />
        </svg>
      );

    case 'rhb-wave':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Flowing RHB Ocean Harmoni wave curves */}
          <path
            d="M-10 148C58 104 134 176 218 118C268 84 304 92 338 72L338 214L-10 214Z"
            fill="#002D5C"
            fillOpacity="0.28"
          />
          <path
            d="M24 180C102 122 178 188 262 126C294 102 316 106 338 94"
            stroke="#7CE0FF"
            strokeOpacity="0.42"
            strokeWidth="2"
          />
          <path
            d="M54 196C130 144 202 198 282 142C308 124 324 126 338 118"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'ambank-slash':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Signature AmBank bold red corner slash over sunny yellow */}
          <polygon points="248,0 324,0 324,116 196,204 148,204" fill="#DA291C" fillOpacity="0.24" />
          <polygon points="274,0 324,0 324,78 242,0" fill="#DA291C" fillOpacity="0.78" />
          <path d="M236 0L324 88" stroke="#FFFFFF" strokeOpacity="0.38" strokeWidth="2.5" />
        </svg>
      );

    case 'uob-bars':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic 5 UOB crimson vertical bars on the right half */}
          <g fill="#E31837" fillOpacity="0.58">
            <rect x="218" y="28" width="9" height="110" rx="2" />
            <rect x="234" y="28" width="9" height="110" rx="2" />
            <rect x="250" y="28" width="9" height="110" rx="2" />
            <rect x="266" y="28" width="9" height="110" rx="2" />
            <rect x="282" y="28" width="9" height="110" rx="2" />
          </g>
          <path d="M0 162C96 146 212 152 324 128" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1.2" />
        </svg>
      );

    case 'ocbc-crest':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Sweeping minimalist white sailing keel arc */}
          <path
            d="M128 214C178 134 236 68 334 18"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M164 218C208 152 256 96 336 52"
            stroke="#FFFFFF"
            strokeOpacity="0.12"
            strokeWidth="6"
          />
        </svg>
      );

    case 'hsbc-lion':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic HSBC Red Hexagon bowtie & faceted geometric lion prism */}
          <g opacity="0.88">
            <polygon points="244,58 278,58 261,78" fill="#DB0011" fillOpacity="0.72" />
            <polygon points="244,98 278,98 261,78" fill="#DB0011" fillOpacity="0.72" />
            <polygon points="244,58 244,98 224,78" fill="#DB0011" fillOpacity="0.92" />
            <polygon points="278,58 278,98 298,78" fill="#DB0011" fillOpacity="0.92" />
          </g>
          {/* Subtle low-poly lion geometric facet lines */}
          <polygon points="154,204 224,78 261,148" fill="#FFFFFF" fillOpacity="0.045" />
          <polygon points="224,78 298,78 261,148" fill="#FFFFFF" fillOpacity="0.03" />
          <path d="M180 204L224 78L261 148L324 108" stroke="#FFFFFF" strokeOpacity="0.1" strokeWidth="0.9" />
        </svg>
      );

    case 'sc-ribbon':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic Standard Chartered intertwined emerald & royal blue ribbons */}
          <path
            d="M190 -10C244 46 210 110 278 164C298 180 318 190 338 196"
            stroke="#38D200"
            strokeOpacity="0.56"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M230 -10C188 54 274 96 226 168C214 186 198 198 182 212"
            stroke="#0473EA"
            strokeOpacity="0.62"
            strokeWidth="14"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'alliance-tri':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon points="212,188 272,42 332,188" fill="#38BDF8" fillOpacity="0.16" />
          <polygon points="172,204 228,84 284,204" fill="#FFFFFF" fillOpacity="0.08" />
          <path d="M212 188L272 42L332 188" stroke="#7DD3FC" strokeOpacity="0.28" strokeWidth="1.2" />
        </svg>
      );

    case 'affin-wing':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M174 204C202 122 254 58 334 26L334 78C276 102 238 144 218 204Z"
            fill="#E31837"
            fillOpacity="0.38"
          />
          <path
            d="M222 204C244 146 280 104 334 84L334 126C296 142 272 168 258 204Z"
            fill="#38BDF8"
            fillOpacity="0.3"
          />
        </svg>
      );

    case 'bankislam-lattice':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Refined Islamic 8-point geometric star filigree in muted champagne gold */}
          <g transform="translate(248 102)" stroke="#FDE68A" strokeOpacity="0.22" strokeWidth="1.1">
            <rect x="-42" y="-42" width="84" height="84" />
            <rect x="-42" y="-42" width="84" height="84" transform="rotate(45)" />
            <rect x="-26" y="-26" width="52" height="52" />
            <rect x="-26" y="-26" width="52" height="52" transform="rotate(45)" />
            <circle cx="0" cy="0" r="64" strokeOpacity="0.14" />
          </g>
        </svg>
      );

    case 'bsn-teal':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M168 204C198 112 254 44 334 10L334 204Z"
            fill="#FFFFFF"
            fillOpacity="0.08"
          />
          <path
            d="M206 204C232 132 274 82 334 54"
            stroke="#5EEAD4"
            strokeOpacity="0.38"
            strokeWidth="2.5"
          />
        </svg>
      );

    case 'aeon-pink':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Real AEON Bank vibrant pink glossy satin diagonal curves */}
          <path
            d="M-20 154C64 98 158 142 246 66C280 36 308 18 340 6L340 94C292 118 242 156 174 176C100 198 34 182 -20 204Z"
            fill="#FFFFFF"
            fillOpacity="0.15"
          />
          <circle cx="282" cy="48" r="64" fill="#FF9ED2" fillOpacity="0.24" />
          <path
            d="M150 212C212 162 270 128 336 112"
            stroke="#FFFFFF"
            strokeOpacity="0.28"
            strokeWidth="1.6"
          />
        </svg>
      );

    case 'boost-pulse':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Fiery Boost Red kinetic forward speed stripes */}
          <polygon points="212,0 242,0 182,204 152,204" fill="#FFFFFF" fillOpacity="0.1" />
          <polygon points="254,0 272,0 212,204 194,204" fill="#FFFFFF" fillOpacity="0.07" />
          <polygon points="284,0 324,0 264,204 224,204" fill="#45040B" fillOpacity="0.22" />
        </svg>
      );

    case 'tng-splash':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Real Touch 'n Go Visa vibrant contemporary multi-color splash accents */}
          <circle cx="272" cy="46" r="56" fill="#00E5FF" fillOpacity="0.34" />
          <circle cx="232" cy="142" r="46" fill="#FF3B8D" fillOpacity="0.30" />
          <circle cx="298" cy="126" r="34" fill="#FFD600" fillOpacity="0.32" />
          <path
            d="M174 196C204 128 248 92 332 48"
            stroke="#00E5FF"
            strokeOpacity="0.58"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M210 208C242 152 278 122 336 96"
            stroke="#FFD600"
            strokeOpacity="0.52"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="218" cy="64" r="5" fill="#A3FF12" fillOpacity="0.68" />
          <circle cx="256" cy="94" r="3.5" fill="#FFFFFF" fillOpacity="0.72" />
          <circle cx="198" cy="122" r="4" fill="#00E5FF" fillOpacity="0.6" />
        </svg>
      );

    case 'bigpay-matte':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Minimalist matte electric cobalt fintech curve */}
          <circle cx="276" cy="36" r="96" fill="#60A5FA" fillOpacity="0.18" />
          <path
            d="M126 212C184 148 242 110 336 86L336 212Z"
            fill="#00297A"
            fillOpacity="0.24"
          />
        </svg>
      );

    case 'wise-flag':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic Wise fast-flag bold geometric chevron watermark in deep forest green */}
          <path
            d="M206 34H294L266 78H224L246 106L218 150H278"
            stroke="#163300"
            strokeOpacity="0.09"
            strokeWidth="16"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <circle cx="48" cy="182" r="76" fill="#FFFFFF" fillOpacity="0.16" />
        </svg>
      );

    case 'dbs-spark':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic DBS Crimson Red geometric 8-ray spark on matte charcoal */}
          <g transform="translate(262 96)" fill="#E31837" fillOpacity="0.64">
            <polygon points="0,-44 7,-12 0,-6 -7,-12" />
            <polygon points="0,44 7,12 0,6 -7,12" />
            <polygon points="-44,0 -12,7 -6,0 -12,-7" />
            <polygon points="44,0 12,7 6,0 12,-7" />
            <polygon points="-31,-31 -5,-12 -8,-8 -12,-5" />
            <polygon points="31,31 5,12 8,8 12,5" />
            <polygon points="31,-31 12,-5 8,-8 5,-12" />
            <polygon points="-31,31 -12,5 -8,8 -5,12" />
          </g>
        </svg>
      );

    case 'revolut-holo':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon points="118,0 198,0 112,204 32,204" fill="#FFFFFF" fillOpacity="0.12" />
          <polygon points="222,0 264,0 178,204 136,204" fill="#FFFFFF" fillOpacity="0.08" />
          <circle cx="272" cy="154" r="74" fill="#38BDF8" fillOpacity="0.22" />
        </svg>
      );

    case 'cmb-gold':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Flowing champagne-gold sunflower silk ribbons */}
          <path
            d="M112 214C166 138 228 84 336 42"
            stroke="#F6D365"
            strokeOpacity="0.34"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M150 218C198 156 254 106 336 74"
            stroke="#FDE68A"
            strokeOpacity="0.22"
            strokeWidth="4"
          />
          <circle cx="268" cy="72" r="46" stroke="#F6D365" strokeOpacity="0.18" strokeWidth="1.2" />
        </svg>
      );

    case 'boc-coin':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Subtle Bank of China iconic ancient coin concentric filigree */}
          <g transform="translate(262 98)" stroke="#FCD34D" strokeOpacity="0.24">
            <circle cx="0" cy="0" r="52" strokeWidth="2" />
            <circle cx="0" cy="0" r="36" strokeWidth="1.2" />
            <rect x="-11" y="-11" width="22" height="22" strokeWidth="2" />
            <line x1="0" y1="-52" x2="0" y2="-11" strokeWidth="2" />
            <line x1="0" y1="11" x2="0" y2="52" strokeWidth="2" />
          </g>
        </svg>
      );

    case 'icbc-peony':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Striking crimson-gold sweeping peony ribbon on obsidian */}
          <path
            d="M148 208C198 122 252 62 336 20L336 86C268 114 226 154 196 208Z"
            fill="#C7000B"
            fillOpacity="0.45"
          />
          <path
            d="M174 208C214 140 264 90 336 58"
            stroke="#F5C563"
            strokeOpacity="0.42"
            strokeWidth="2"
          />
        </svg>
      );

    case 'ccb-dragon':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Classic CCB Dragon Card concentric gold wave filigree */}
          <g transform="translate(268 106)" stroke="#FDE68A" strokeOpacity="0.22" strokeWidth="1.4">
            <circle cx="0" cy="0" r="56" />
            <circle cx="0" cy="0" r="38" />
            <rect x="-12" y="-12" width="24" height="24" />
          </g>
          <path
            d="M0 166C92 140 192 174 324 132"
            stroke="#7DD3FC"
            strokeOpacity="0.24"
            strokeWidth="1.5"
          />
        </svg>
      );

    case 'ryt-ai': {
      const rytGlow = `${uid}-ryt`;
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={rytGlow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(254 96) rotate(90) scale(92 108)">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.34" />
              <stop offset="55%" stopColor="#3B82F6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#050B1C" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="324" height="204" fill={`url(#${rytGlow})`} />
          <text
            x="184"
            y="128"
            fill="#60A5FA"
            fillOpacity="0.18"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="900"
            fontSize="64"
            letterSpacing="-3"
          >
            ryt
          </text>
          <path d="M170 204L266 0" stroke="#38BDF8" strokeOpacity="0.22" strokeWidth="1.2" />
        </svg>
      );
    }

    case 'kaf-gradient':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* KAF Digital Bank vibrant multi-color ecosystem waves */}
          <circle cx="278" cy="44" r="74" fill="#34D399" fillOpacity="0.28" />
          <circle cx="206" cy="170" r="64" fill="#818CF8" fillOpacity="0.26" />
          <path
            d="M118 210C178 138 242 96 334 52"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'rakyat-touch':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Bank Rakyat corporate sunset-orange & royal blue curve */}
          <path
            d="M188 208C222 132 268 78 336 42L336 106C284 128 248 162 224 208Z"
            fill="#F58220"
            fillOpacity="0.56"
          />
          <path d="M168 208C208 122 256 64 336 22" stroke="#FDBA74" strokeOpacity="0.34" strokeWidth="2" />
        </svg>
      );

    case 'muamalat-geo':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon points="220,0 262,0 184,204 142,204" fill="#FF6B00" fillOpacity="0.46" />
          <polygon points="266,0 288,0 210,204 188,204" fill="#38BDF8" fillOpacity="0.22" />
        </svg>
      );

    case 'mbsb-teal':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle cx="282" cy="146" r="88" fill="#2DD4BF" fillOpacity="0.2" />
          <path d="M140 204C194 128 254 80 334 46" stroke="#99F6E4" strokeOpacity="0.28" strokeWidth="2" />
        </svg>
      );

    case 'agro-horizon':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d="M0 156C98 112 204 168 334 94L334 210L0 210Z" fill="#003852" fillOpacity="0.3" />
          <path d="M140 198C204 134 264 114 334 78" stroke="#86EFAC" strokeOpacity="0.34" strokeWidth="2.5" />
        </svg>
      );

    case 'alrajhi-crest':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon points="222,0 324,0 324,132" fill="#FFFFFF" fillOpacity="0.1" />
          <circle cx="268" cy="108" r="54" stroke="#93C5FD" strokeOpacity="0.22" strokeWidth="1.4" />
          <circle cx="268" cy="108" r="34" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1.2" />
        </svg>
      );

    case 'rize-aurora':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle cx="272" cy="54" r="78" fill="#22D3EE" fillOpacity="0.28" />
          <path d="M138 208C194 128 248 92 334 36" stroke="#A5F3FC" strokeOpacity="0.36" strokeWidth="4" />
        </svg>
      );

    case 'kfh-emerald':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <g transform="translate(256 102)" stroke="#FDE68A" strokeOpacity="0.24" strokeWidth="1.1">
            <polygon points="0,-46 40,-23 40,23 0,46 -40,23 -40,-23" />
            <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" />
          </g>
        </svg>
      );

    case 'enrich-mas':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Malaysia Airlines Wau crimson & champagne-gold flight arcs */}
          <path
            d="M148 212C196 132 252 80 338 36"
            stroke="#E11D48"
            strokeOpacity="0.62"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M180 214C224 146 272 100 338 64"
            stroke="#F6D365"
            strokeOpacity="0.48"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'mtm-slash':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon points="234,0 286,0 202,204 150,204" fill="#FFFFFF" fillOpacity="0.16" />
          <polygon points="292,0 324,0 248,204 216,204" fill="#3B0208" fillOpacity="0.24" />
        </svg>
      );

    case 'gxs-cosmic': {
      const gxsGlow = `${uid}-gxs`;
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={gxsGlow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(248 94) rotate(90) scale(96 112)">
              <stop offset="0%" stopColor="#E879F9" stopOpacity="0.34" />
              <stop offset="56%" stopColor="#7C3AED" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#110429" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="324" height="204" fill={`url(#${gxsGlow})`} />
          <text
            x="166"
            y="130"
            fill="#F0ABFC"
            fillOpacity="0.26"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="900"
            fontSize="68"
            letterSpacing="-4"
          >
            GXS
          </text>
        </svg>
      );
    }

    case 'trust-clear':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic Trust Bank Singapore oversized minimalist geometric T silhouette */}
          <path
            d="M196 34H306V66H268V172H234V66H196V34Z"
            fill="#0A2559"
            fillOpacity="0.09"
          />
          <circle cx="62" cy="180" r="82" fill="#FFFFFF" fillOpacity="0.45" />
        </svg>
      );

    case 'mari-orange':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle cx="282" cy="40" r="82" fill="#FDE047" fillOpacity="0.22" />
          <path d="M138 212C196 144 252 106 336 74L336 212Z" fill="#7C2200" fillOpacity="0.22" />
        </svg>
      );

    case 'youtrip-violet':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M148 214C198 134 252 84 336 40"
            stroke="#2EE6A6"
            strokeOpacity="0.54"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <circle cx="284" cy="148" r="56" fill="#C084FC" fillOpacity="0.22" />
        </svg>
      );

    case 'monzo-coral':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Minimalist Hot Coral matte sheen */}
          <circle cx="280" cy="36" r="96" fill="#FFFFFF" fillOpacity="0.12" />
        </svg>
      );

    case 'airwallex-prism':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon points="228,0 278,0 198,204 148,204" fill="#FF4F1F" fillOpacity="0.46" />
          <polygon points="278,0 324,0 244,204 198,204" fill="#6C5CE7" fillOpacity="0.34" />
        </svg>
      );

    case 'apple-titanium':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Ultra-minimalist titanium matte satin diagonal gleam */}
          <polygon points="164,0 246,0 132,204 50,204" fill="#FFFFFF" fillOpacity="0.45" />
        </svg>
      );

    case 'citi-arch':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Iconic Citi crimson umbrella arch */}
          <path
            d="M174 116C208 48 274 48 310 116"
            stroke="#EE1C25"
            strokeOpacity="0.72"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle cx="242" cy="148" r="68" fill="#38BDF8" fillOpacity="0.12" />
        </svg>
      );

    case 'chase-sapphire':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Classic Chase Sapphire faceted metallic geometric blocks */}
          <polygon points="196,0 274,0 236,102 158,102" fill="#3B82F6" fillOpacity="0.16" />
          <polygon points="236,102 324,102 286,204 198,204" fill="#FFFFFF" fillOpacity="0.08" />
          <polygon points="274,0 324,0 324,102 236,102" fill="#041028" fillOpacity="0.28" />
        </svg>
      );

    case 'amex-centurion':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Classic American Express Centurion ornate border frame */}
          <rect
            x="10"
            y="10"
            width="304"
            height="184"
            rx="14"
            stroke="#594012"
            strokeOpacity="0.24"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <circle cx="262" cy="102" r="46" stroke="#594012" strokeOpacity="0.16" strokeWidth="1.4" />
          <circle cx="262" cy="102" r="32" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1.2" />
        </svg>
      );

    case 'abc-wheat':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d="M140 212C194 134 252 86 336 44" stroke="#F6D365" strokeOpacity="0.34" strokeWidth="8" strokeLinecap="round" />
          <circle cx="272" cy="96" r="46" stroke="#FDE68A" strokeOpacity="0.2" strokeWidth="1.4" />
        </svg>
      );

    case 'bocom-silk':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d="M126 212C186 132 248 80 338 36" stroke="#E2E8F0" strokeOpacity="0.24" strokeWidth="14" strokeLinecap="round" />
          <path d="M168 214C216 148 268 104 338 68" stroke="#60A5FA" strokeOpacity="0.32" strokeWidth="6" />
        </svg>
      );

    case 'psbc-wing':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d="M132 184C198 134 258 92 336 42" stroke="#F6D365" strokeOpacity="0.36" strokeWidth="6" strokeLinecap="round" />
          <path d="M162 204C218 158 270 118 336 74" stroke="#86EFAC" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'pingan-flame':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle cx="276" cy="54" r="78" fill="#FDE047" fillOpacity="0.22" />
          <path d="M148 212C200 138 256 96 336 62" stroke="#FDE68A" strokeOpacity="0.34" strokeWidth="8" strokeLinecap="round" />
        </svg>
      );

    case 'citic-red':
      return (
        <svg
          viewBox="0 0 324 204"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <g transform="translate(262 98)" stroke="#F6D365" strokeOpacity="0.28" strokeWidth="1.6">
            <circle cx="0" cy="0" r="48" />
            <rect x="-18" y="-18" width="36" height="36" transform="rotate(45)" />
          </g>
        </svg>
      );
  }
}
