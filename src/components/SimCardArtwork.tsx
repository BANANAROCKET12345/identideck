import { useId } from 'react';

export type CarrierSimArtworkId =
  | 'maxis'
  | 'hotlink'
  | 'celcomdigi'
  | 'umobile'
  | 'unifi'
  | 'yes5g'
  | 'tunetalk'
  | 'singtel'
  | 'chinamobile'
  | 'chinaunicom'
  | 'chinatelecom';

export interface SimCardArtworkProps {
  artwork: CarrierSimArtworkId;
  isLightSurface?: boolean;
}

/**
 * Renders 1:1 authentic physical 3-in-1 Triple-Cut 5G USIM plastic card graphics:
 * 1) Real-world carrier silkscreen motifs (Maxis wave ribbon, Hotlink crimson pulse,
 *    CelcomDigi blue/yellow butterfly wing, U Mobile bold U curve, Unifi blue+orange swoosh,
 *    Yes 5G magenta prism beams, Tune Talk black+crimson slash, Singtel white+red 5G+ arc,
 *    China Mobile blue/green 5G ribbon, China Unicom red knot filigree, China Telecom blue/teal horizon).
 * 2) Realistic molded 3-in-1 (Standard / Micro / Nano) punch-out die-cut grooves & breakaway tabs
 *    framing the left-side ISO-7816 gold contact chip.
 */
export function SimCardArtwork({ artwork, isLightSurface }: SimCardArtworkProps) {
  const uid = useId();

  // Subtle recessed die-cut groove colors for dark PVC vs satin pearl-white PVC
  const grooveDark = isLightSurface ? 'rgba(15, 23, 42, 0.14)' : 'rgba(0, 0, 0, 0.28)';
  const grooveLight = isLightSurface ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.16)';

  return (
    <svg
      viewBox="0 0 324 201"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {/* ======================== CARRIER AUTHENTIC SILKSCREEN LAYER ======================== */}
      {artwork === 'maxis' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-mxs`} x1="160" y1="0" x2="324" y2="201" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A6F738" stopOpacity="0.34" />
              <stop offset="52%" stopColor="#FFFFFF" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#003D18" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          {/* Giant iconic Maxis organic 4-ribbon wave watermark on right half */}
          <g stroke={`url(#${uid}-mxs)`} strokeLinecap="round" fill="none">
            <path d="M196 32 C228 18, 272 22, 304 42" strokeWidth="14" />
            <path d="M180 62 C226 42, 282 48, 326 76" strokeWidth="16" />
            <path d="M186 96 C234 78, 286 84, 330 112" strokeWidth="15" />
            <path d="M204 130 C244 116, 288 122, 324 146" strokeWidth="12" />
          </g>
          {/* Subtle Maxis 5G micro-grid dot accent */}
          <path d="M0 164 Q112 146 210 170 T324 156 L324 201 L0 201 Z" fill="#002E13" fillOpacity="0.28" />
        </g>
      )}

      {artwork === 'hotlink' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-htl`} x1="140" y1="0" x2="324" y2="201" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF5263" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#5C0008" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          {/* Dynamic Hotlink diagonal energy band + iconic wave motif */}
          <path d="M168 0 L324 0 L324 201 L108 201 Z" fill={`url(#${uid}-htl)`} />
          <g stroke="#FFFFFF" strokeOpacity="0.15" strokeLinecap="round">
            <path d="M210 38 C242 24, 284 28, 316 48" strokeWidth="13" />
            <path d="M196 68 C238 50, 290 56, 330 82" strokeWidth="15" />
            <path d="M202 100 C246 84, 294 90, 330 114" strokeWidth="14" />
            <path d="M218 132 C254 118, 294 124, 326 144" strokeWidth="11" />
          </g>
          <path d="M150 201 L234 0" stroke="#FF8A95" strokeOpacity="0.26" strokeWidth="2" />
        </g>
      )}

      {artwork === 'celcomdigi' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-cd-y`} x1="200" y1="16" x2="310" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFE14D" />
              <stop offset="100%" stopColor="#F5B800" />
            </linearGradient>
            <linearGradient id={`${uid}-cd-b`} x1="170" y1="20" x2="324" y2="195" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.58" />
              <stop offset="100%" stopColor="#003399" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {/* Iconic CelcomDigi post-merger butterfly wing sweeping curves (cleanly framed on right half) */}
          <path
            d="M266 96 C260 52, 282 22, 316 18 C324 52, 312 88, 276 106 Z"
            fill={`url(#${uid}-cd-b)`}
          />
          <path
            d="M264 102 C240 84, 212 82, 198 98 C218 114, 242 118, 262 108 Z"
            fill={`url(#${uid}-cd-y)`}
            fillOpacity="0.46"
          />
          <path
            d="M272 112 C288 112, 306 122, 318 138 C298 146, 278 140, 266 122 Z"
            fill={`url(#${uid}-cd-y)`}
            fillOpacity="0.88"
          />
          <path
            d="M264 126 C272 152, 260 182, 232 201 L324 201 L324 118 C298 114, 276 116, 264 126 Z"
            fill="#001F5C"
            fillOpacity="0.34"
          />
        </g>
      )}

      {artwork === 'umobile' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-um`} x1="150" y1="0" x2="324" y2="201" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFB347" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8A2400" stopOpacity="0.32" />
            </linearGradient>
          </defs>
          {/* U Mobile ULTRA 5G bold curved U-arc + racing speed bands */}
          <path d="M180 0 L324 0 L324 201 L126 201 Z" fill={`url(#${uid}-um)`} />
          <path
            d="M214 14 L214 112 C214 148, 240 168, 272 168 C304 168, 326 146, 326 112 L326 14"
            stroke="#FFFFFF"
            strokeOpacity="0.2"
            strokeWidth="28"
            strokeLinecap="round"
          />
          <path
            d="M158 201 L236 0"
            stroke="#FFFFFF"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
          <text
            x="224"
            y="162"
            fill="#FFFFFF"
            fillOpacity="0.16"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="40"
            letterSpacing="-2"
          >
            ULTRA 5G
          </text>
        </g>
      )}

      {artwork === 'unifi' && (
        <g>
          {/* Authentic Unifi Mobile pearl-white upper PVC + vibrant Unifi orange diagonal + TM royal blue base */}
          <path d="M0 166 L324 150 L324 201 L0 201 Z" fill="#002D72" fillOpacity="0.96" />
          <path d="M0 156 L324 140 L324 153 L0 169 Z" fill="#FF6A00" />
          <path d="M0 153 L324 137 L324 140 L0 156 Z" fill="#FF9E40" fillOpacity="0.72" />
          {/* Subtle Unifi smiley dot-arc emblem on upper-right */}
          <path
            d="M252 68 C262 84, 286 84, 296 68"
            stroke="#FF6A00"
            strokeWidth="5"
            strokeLinecap="round"
            strokeOpacity="0.22"
          />
          <circle cx="263" cy="54" r="3.5" fill="#FF6A00" fillOpacity="0.22" />
          <circle cx="285" cy="54" r="3.5" fill="#FF6A00" fillOpacity="0.22" />
          <text
            x="232"
            y="104"
            fill="#002D72"
            fillOpacity="0.09"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="24"
            letterSpacing="-1"
          >
            UNI5G
          </text>
        </g>
      )}

      {artwork === 'yes5g' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-yes`} x1="120" y1="0" x2="324" y2="201" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF7AC3" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#FF1A8C" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#5C0030" stopOpacity="0.36" />
            </linearGradient>
          </defs>
          {/* Authentic Yes 5G vibrant magenta faceted prism beams (matches Yes 5G official pack!) */}
          <polygon points="154,0 264,0 184,201 74,201" fill="#FFFFFF" fillOpacity="0.11" />
          <polygon points="240,0 324,0 324,142 196,201" fill={`url(#${uid}-yes)`} />
          <path
            d="M232 48 L294 34 L294 114 L232 132 Z"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="3"
            fill="#FFFFFF"
            fillOpacity="0.06"
          />
          <text
            x="240"
            y="102"
            fill="#FFFFFF"
            fillOpacity="0.18"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="36"
            letterSpacing="-2"
          >
            yes
          </text>
        </g>
      )}

      {artwork === 'tunetalk' && (
        <g>
          {/* Authentic Tune Talk matte obsidian-black PVC with iconic vibrant red diagonal ribbon */}
          <path d="M188 0 L324 0 L324 201 L126 201 Z" fill="#1C1D22" />
          <path d="M184 0 L246 0 L176 201 L114 201 Z" fill="#E31823" fillOpacity="0.92" />
          <path d="M254 0 L268 0 L198 201 L184 201 Z" fill="#FF4B55" fillOpacity="0.55" />
          <circle cx="272" cy="96" r="46" stroke="#E31823" strokeOpacity="0.22" strokeWidth="14" />
          <circle cx="272" cy="96" r="26" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="2" />
        </g>
      )}

      {artwork === 'singtel' && (
        <g>
          {/* Authentic Singtel 5G+ Satin Pearl-White PVC with signature crimson red lower sweep & dotted arc */}
          <path
            d="M0 164 C112 158, 218 150, 324 140 L324 201 L0 201 Z"
            fill="#ED1C24"
            fillOpacity="0.95"
          />
          <path
            d="M0 158 C114 152, 220 143, 324 133 L324 142 C218 152, 112 159, 0 164 Z"
            fill="#FF525A"
            fillOpacity="0.34"
          />
          {/* Iconic Singtel 5-dot arc watermark in crisp red-tint on white upper-right */}
          <g fill="#ED1C24" fillOpacity="0.14">
            <circle cx="238" cy="70" r="3.2" />
            <circle cx="250" cy="61" r="4.0" />
            <circle cx="264" cy="55" r="4.8" />
            <circle cx="280" cy="54" r="5.5" />
            <circle cx="296" cy="59" r="4.6" />
          </g>
          <text
            x="246"
            y="96"
            fill="#ED1C24"
            fillOpacity="0.12"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="28"
            letterSpacing="-1"
          >
            5G+
          </text>
        </g>
      )}

      {artwork === 'chinamobile' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-cmcc-b`} x1="0" y1="145" x2="324" y2="201" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0085D0" />
              <stop offset="100%" stopColor="#005BA1" />
            </linearGradient>
            <linearGradient id={`${uid}-cmcc-g`} x1="120" y1="138" x2="324" y2="195" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8CC63F" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#00A651" stopOpacity="0.75" />
            </linearGradient>
          </defs>
          {/* Authentic China Mobile 5G Satin White PVC with blue + fresh lime-green flowing ribbons */}
          <path
            d="M0 162 C98 154, 196 146, 324 156 L324 201 L0 201 Z"
            fill={`url(#${uid}-cmcc-b)`}
          />
          <path
            d="M96 158 C180 148, 250 142, 324 146 L324 158 C244 150, 174 154, 96 158 Z"
            fill={`url(#${uid}-cmcc-g)`}
          />
          {/* Subtle China Mobile swirl watermark top-right */}
          <g stroke="#0085D0" strokeOpacity="0.11" strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M242 46 C262 28, 294 34, 302 58" />
            <path d="M234 66 C258 46, 290 54, 298 78" stroke="#8CC63F" strokeOpacity="0.16" />
            <path d="M244 84 C264 68, 290 74, 296 94" />
          </g>
        </g>
      )}

      {artwork === 'chinaunicom' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-cu-r`} x1="0" y1="145" x2="324" y2="201" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E60012" />
              <stop offset="100%" stopColor="#A6000D" />
            </linearGradient>
          </defs>
          {/* Authentic China Unicom 5G Satin White PVC with vermilion red ribbon + Chinese knot filigree */}
          <path
            d="M0 164 C110 156, 214 148, 324 154 L324 201 L0 201 Z"
            fill={`url(#${uid}-cu-r)`}
          />
          <path
            d="M110 158 C196 148, 260 143, 324 146 L324 155 C256 149, 190 153, 110 158 Z"
            fill="#FF784F"
            fillOpacity="0.55"
          />
          {/* Iconic China Unicom interlaced knot geometric watermark */}
          <g transform="translate(232 22)" stroke="#E60012" strokeOpacity="0.12" strokeWidth="4.5" fill="none">
            <rect x="18" y="18" width="38" height="38" rx="9" transform="rotate(45 37 37)" />
            <rect x="26" y="26" width="22" height="22" rx="5" transform="rotate(45 37 37)" />
            <circle cx="37" cy="14" r="7" />
            <circle cx="37" cy="60" r="7" />
            <circle cx="14" cy="37" r="7" />
            <circle cx="60" cy="37" r="7" />
          </g>
        </g>
      )}

      {artwork === 'chinatelecom' && (
        <g>
          <defs>
            <linearGradient id={`${uid}-ct-b`} x1="0" y1="145" x2="324" y2="201" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0072CE" />
              <stop offset="100%" stopColor="#003E80" />
            </linearGradient>
          </defs>
          {/* Authentic China Telecom 5G Satin White PVC with blue + emerald orbital wave */}
          <path
            d="M0 162 C104 154, 206 146, 324 154 L324 201 L0 201 Z"
            fill={`url(#${uid}-ct-b)`}
          />
          <path
            d="M72 158 C166 148, 248 142, 324 146 L324 155 C246 148, 162 154, 72 158 Z"
            fill="#00A86B"
            fillOpacity="0.82"
          />
          {/* Stylized China Telecom globe-wing arcs watermark */}
          <g stroke="#0072CE" strokeOpacity="0.12" strokeWidth="5" strokeLinecap="round" fill="none">
            <ellipse cx="272" cy="64" rx="34" ry="18" transform="rotate(-24 272 64)" />
            <ellipse cx="272" cy="64" rx="34" ry="18" transform="rotate(24 272 64)" />
          </g>
        </g>
      )}

      {/* ======================== REAL PHYSICAL 3-IN-1 TRIPLE-CUT SIM DIE-CUT GROOVES ======================== */}
      {/* Symmetrically centered around the left ISO-7816 gold chip (x:18..73, y:79..122), cleanly stopping before text at x=85 */}
      <g opacity="0.95">
        {/* Standard 2FF outer punch-out slot (x:8..83, y:68..133 with 10px 45° chamfer top-right) */}
        <path
          d="M14 68 H73 L83 78 V127 Q83 133 77 133 H14 Q8 133 8 127 V74 Q8 68 14 68 Z"
          stroke={grooveDark}
          strokeWidth="1.25"
          strokeDasharray="20 4 24 4 22 4 28 4"
        />
        <path
          d="M14.5 69 H72.5 L82 78.5 V126.5 Q82 132 76.5 132 H14.5 Q9 132 9 126.5 V74.5 Q9 69 14.5 69 Z"
          stroke={grooveLight}
          strokeWidth="0.7"
          strokeDasharray="20 4 24 4 22 4 28 4"
        />

        {/* Middle Micro-SIM 3FF punch-out slot (x:13..78, y:74..127 with 8px 45° chamfer top-right) */}
        <path
          d="M18 74 H70 L78 82 V122 Q78 127 73 127 H18 Q13 127 13 122 V79 Q13 74 18 74 Z"
          stroke={grooveDark}
          strokeWidth="1.05"
          strokeDasharray="16 3.5 18 3.5 16 3.5"
        />
        <path
          d="M18.5 75 H69.5 L77 82.5 V121.5 Q77 126 72.5 126 H18.5 Q14 126 14 121.5 V79.5 Q14 75 18.5 75 Z"
          stroke={grooveLight}
          strokeWidth="0.6"
          strokeDasharray="16 3.5 18 3.5 16 3.5"
        />
      </g>
    </svg>
  );
}
