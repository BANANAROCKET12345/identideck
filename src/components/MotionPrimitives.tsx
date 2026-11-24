import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FINE_POINTER_QUERY = '(pointer: fine)';
const CIPHER_GLYPHS = '•*#019X';
const PRESERVED_CHARS = new Set(['@', '.', '+', '-', ' ', '/', ':', '(', ')']);
const SCRAMBLE_STEPS = 7;
const SCRAMBLE_STEP_MS = 27; // 7 × 27ms ≈ 189ms crisp cipher settle
const MAX_DURATION_MS = 450;

function getSafeMatchMedia(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

/**
 * Subscribes safely to `(prefers-reduced-motion: reduce)`.
 * Safe in SSR / jsdom environments where `window.matchMedia` may be missing or mocked.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    const mql = getSafeMatchMedia(REDUCED_MOTION_QUERY);
    return Boolean(mql?.matches);
  });

  useEffect(() => {
    const mql = getSafeMatchMedia(REDUCED_MOTION_QUERY);
    if (!mql) return;

    setPrefersReduced(Boolean(mql.matches));

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(Boolean(event.matches));
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }

    if (typeof mql.addListener === 'function') {
      mql.addListener(handleChange);
      return () => mql.removeListener(handleChange);
    }

    return undefined;
  }, []);

  return prefersReduced;
}

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Smooth tabular-nums count-up / count-down primitive.
 * - Renders `value` immediately on initial mount (zero count-from-0 flash).
 * - Smoothly interpolates on subsequent value changes via rAF + cubic-out easing.
 * - Snaps immediately when `prefers-reduced-motion: reduce` is enabled.
 */
export function AnimatedNumber({
  value,
  decimals,
  durationMs = 320,
  format,
  className,
}: AnimatedNumberProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const mountedRef = useRef<boolean>(false);
  const currentValueRef = useRef<number>(value);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      currentValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const from = currentValueRef.current;
    const to = value;
    const clampedDuration = Math.min(MAX_DURATION_MS, Math.max(0, durationMs));

    if (
      prefersReducedMotion ||
      typeof requestAnimationFrame === 'undefined' ||
      clampedDuration <= 0 ||
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      Object.is(from, to)
    ) {
      currentValueRef.current = to;
      setDisplayValue(to);
      return;
    }

    let rafId = 0;
    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / clampedDuration));
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = progress >= 1 ? to : from + (to - from) * eased;

      currentValueRef.current = next;
      setDisplayValue(next);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [value, durationMs, prefersReducedMotion]);

  const normalizedForFormat =
    decimals !== undefined && Number.isFinite(displayValue)
      ? Number(displayValue.toFixed(decimals))
      : displayValue;

  const renderedText = format
    ? format(normalizedForFormat)
    : decimals !== undefined && Number.isFinite(displayValue)
      ? displayValue.toFixed(decimals)
      : Number.isFinite(displayValue)
        ? Number.isInteger(value)
          ? String(Math.round(displayValue))
          : displayValue.toFixed(2)
        : String(displayValue);

  return (
    <span className={className ? `tabular-nums ${className}` : 'tabular-nums'}>
      {renderedText}
    </span>
  );
}

export interface ScrambleTextProps {
  text: string;
  triggerKey?: string | boolean | number;
  className?: string;
}

function buildScrambledFrame(target: string, step: number): string {
  const chars = Array.from(target);
  const revealCount = Math.floor((step / SCRAMBLE_STEPS) * chars.length);

  return chars
    .map((ch, idx) => {
      if (idx < revealCount || PRESERVED_CHARS.has(ch)) {
        return ch;
      }
      const glyphIndex = (idx * 7 + step * 3) % CIPHER_GLYPHS.length;
      return CIPHER_GLYPHS[glyphIndex];
    })
    .join('');
}

/**
 * Crisp 190ms character-cipher text transition triggered when `triggerKey` changes
 * (e.g. toggling Privacy Mode masking).
 * - Renders exact `text` immediately on initial mount.
 * - Preserves `@`, `.`, `+`, `-`, spaces, and separators during cipher steps.
 * - Always exposes clean semantic `text` via `.sr-only` for screen readers & DOM queries.
 */
export function ScrambleText({
  text,
  triggerKey,
  className,
}: ScrambleTextProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState<string>(text);
  const mountedRef = useRef<boolean>(false);
  const prevTriggerRef = useRef<string | boolean | number | undefined>(
    triggerKey,
  );

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevTriggerRef.current = triggerKey;
      setDisplay(text);
      return;
    }

    const triggerChanged = !Object.is(prevTriggerRef.current, triggerKey);
    prevTriggerRef.current = triggerKey;

    if (!triggerChanged || prefersReducedMotion || !text) {
      setDisplay(text);
      return;
    }

    let step = 1;
    setDisplay(buildScrambledFrame(text, step));

    const intervalId = setInterval(() => {
      step += 1;
      if (step >= SCRAMBLE_STEPS) {
        clearInterval(intervalId);
        setDisplay(text);
      } else {
        setDisplay(buildScrambledFrame(text, step));
      }
    }, SCRAMBLE_STEP_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [text, triggerKey, prefersReducedMotion]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}

export interface MagneticButtonWrapperProps {
  strength?: number;
  radiusPx?: number;
  className?: string;
  children: ReactNode;
}

const MAX_MAGNETIC_OFFSET_PX = 3.5;

/**
 * Subtle desktop-only (`pointer: fine`) magnetic hover pull capped to ±3.5px.
 * Uses GPU-composited `translate3d` only and disables completely under reduced motion.
 */
export function MagneticButtonWrapper({
  strength = 0.18,
  radiusPx = 96,
  className,
  children,
}: MagneticButtonWrapperProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const canMagnetize = useCallback(() => {
    if (prefersReducedMotion) return false;
    const fine = getSafeMatchMedia(FINE_POINTER_QUERY);
    return Boolean(fine?.matches);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setOffset({ x: 0, y: 0, active: false });
    }
  }, [prefersReducedMotion]);

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!canMagnetize()) return;
      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rawDx = event.clientX - centerX;
      const rawDy = event.clientY - centerY;
      const distance = Math.hypot(rawDx, rawDy);

      if (radiusPx > 0 && distance > radiusPx) {
        if (offset.active) {
          setOffset({ x: 0, y: 0, active: false });
        }
        return;
      }

      const clampedX = Math.max(
        -MAX_MAGNETIC_OFFSET_PX,
        Math.min(MAX_MAGNETIC_OFFSET_PX, rawDx * strength),
      );
      const clampedY = Math.max(
        -MAX_MAGNETIC_OFFSET_PX,
        Math.min(MAX_MAGNETIC_OFFSET_PX, rawDy * strength),
      );

      setOffset({
        x: Number(clampedX.toFixed(2)),
        y: Number(clampedY.toFixed(2)),
        active: true,
      });
    },
    [canMagnetize, offset.active, radiusPx, strength],
  );

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0, active: false });
  }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className ? `inline-flex ${className}` : 'inline-flex'}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: offset.active
          ? 'transform 90ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: offset.active ? 'transform' : undefined,
      }}
    >
      {children}
    </div>
  );
}
