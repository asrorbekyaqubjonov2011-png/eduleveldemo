import React, { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { cn } from './styles';
import { subscribeScroll, type ScrollFrame } from '../../lib/motion/scrollEngine';
import { DURATION, EASE } from '../../lib/motion/tokens';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function watchMotionPreference(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function useStaticMotion() {
  return useSyncExternalStore(
    watchMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches || typeof IntersectionObserver === 'undefined',
    () => false,
  );
}

/* =========================================================================
   REVEAL — the entrance is driven globally by ScrollReveals (data-reveal).
   The wrapper only declares the motion; without the driver, content stays visible.
   ========================================================================= */

type RevealKind = 'rise' | 'fade' | 'scale' | 'mask' | 'left' | 'right' | 'zoom' | 'blur' | 'grow';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms */
  delay?: number;
  /** Duration in ms */
  duration?: number;
  kind?: RevealKind;
  /** Distance in px for directional reveals */
  distance?: number;
  /** Accepted for compatibility. The driver always reveals once. */
  once?: boolean;
  /** Accepted for compatibility. The driver uses a fixed visibility threshold. */
  amount?: number;
  as?: 'div' | 'section' | 'span' | 'li' | 'article' | 'header' | 'footer';
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  duration = 900,
  kind = 'rise',
  distance = 44,
  as = 'div',
}) => {
  const Tag = as as any;
  return (
    <Tag
      className={className}
      data-reveal={kind}
      data-reveal-delay={delay}
      data-reveal-duration={duration}
      data-reveal-distance={distance}
    >
      {children}
    </Tag>
  );
};

/* =========================================================================
   SPLIT TEXT — word-by-word masked reveal for headlines.
   ========================================================================= */

interface SplitTextProps {
  /** Text split on spaces; each word animates in sequence */
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  /** When false, animates immediately on mount (hero). When true, waits for scroll. */
  onScroll?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 60,
  onScroll = false,
  as = 'span',
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(!onScroll);
  const reduced = useStaticMotion();

  useEffect(() => {
    if (!onScroll || reduced) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onScroll, reduced]);

  const Tag = as as any;
  const words = text.split(' ');

  if (reduced) {
    return (
      <Tag ref={ref} className={className}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className={cn('inline-block overflow-hidden align-bottom', wordClassName)}
          style={{ paddingBottom: '0.08em', marginBottom: '-0.08em' }}
        >
          <span
            className="inline-block"
            style={{
              transform: visible ? 'translate3d(0,0,0)' : 'translate3d(0, 108%, 0)',
              opacity: visible ? 1 : 0,
              transition: `transform ${DURATION.wordRise}ms ${EASE.expo} ${delay + i * stagger}ms, opacity ${DURATION.wordFade}ms ease ${delay + i * stagger}ms`,
              willChange: 'transform',
            }}
          >
            {word}
          </span>
          {i < words.length - 1 ? <span aria-hidden="true">&nbsp;</span> : null}
        </span>
      ))}
    </Tag>
  );
};

/* =========================================================================
   PARALLAX — translate an element gently as it travels through the viewport
   ========================================================================= */

interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  /** Negative = moves up faster; positive = moves slower/down */
  speed?: number;
  scale?: boolean;
}

export const Parallax: React.FC<ParallaxProps> = ({ children, className, speed = -0.08, scale = false }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // The scroll engine writes the transform; no React state changes on each frame. 0 when the element's bottom
  // reaches the viewport bottom, 1 when its top leaves the top.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let progress = 0;
    return subscribeScroll({
      read: (f: ScrollFrame) => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        progress = Math.max(0, Math.min(1, 1 - (rect.top + rect.height / 2) / (f.vh / 2 + rect.height / 2)));
      },
      write: () => {
        const node = ref.current;
        if (!node) return false;
        node.style.transform = `translate3d(0, ${progress * 100 * speed}px, 0)${scale ? ` scale(${1 + progress * 0.04})` : ''}`;
        return false;
      },
    });
  }, [speed, scale]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
};

/* =========================================================================
   COUNTER — animated number that counts up when scrolled into view
   ========================================================================= */

interface CounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
}

export const Counter: React.FC<CounterProps> = ({
  value,
  suffix = '',
  prefix = '',
  duration = 1600,
  className,
  decimals = 0,
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const reduced = useStaticMotion();

  useEffect(() => {
    if (reduced || started) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStarted(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, started]);

  useEffect(() => {
    if (reduced || !started) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, started, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {(reduced ? value : display).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};

/* =========================================================================
   MAGNETIC — subtle cursor-follow for primary interactive elements
   ========================================================================= */

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const Magnetic: React.FC<MagneticProps> = ({ children, className, strength = 8 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState('translate3d(0,0,0)');

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (window.matchMedia('(hover: none)').matches) return;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      setTransform(`translate3d(${x * strength}px, ${y * strength}px, 0)`);
    },
    [strength]
  );

  const handleLeave = useCallback(() => setTransform('translate3d(0,0,0)'), []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transform, transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)' }}
    >
      {children}
    </div>
  );
};

/* =========================================================================
   SCROLL PROGRESS — thin ember line at the very top of the viewport
   ========================================================================= */

export const ScrollProgress: React.FC = () => {
  const bar = useRef<HTMLDivElement | null>(null);

  // A transform, written by the scroll engine: the line grows without a layout or a React render per frame.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    return subscribeScroll({
      write: (f: ScrollFrame) => {
        const node = bar.current;
        if (node) node.style.transform = `scaleX(${f.max > 0 ? Math.min(1, Math.max(0, f.y / f.max)).toFixed(4) : 0})`;
        return false;
      },
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]">
      <div ref={bar} className="h-full w-full origin-left bg-gradient-to-r from-sun-400 via-ember-500 to-ember-700" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
};

/* =========================================================================
   TILT CARD — 3D perspective hover used on premium cards
   ========================================================================= */

export const TiltCard: React.FC<{ children: React.ReactNode; className?: string; max?: number }> = ({
  children,
  className,
  max = 6,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMove = (e: React.MouseEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setStyle({
      transform: `perspective(900px) rotateX(${(0.5 - py) * max * 2}deg) rotateY(${(px - 0.5) * max * 2}deg) translateZ(0)`,
      transition: 'transform 120ms ease-out',
    });
  };

  const onLeave = () => {
    setStyle({ transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)', transition: 'transform 500ms cubic-bezier(0.22,1,0.36,1)' });
  };

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave} style={style}>
      {children}
    </div>
  );
};
