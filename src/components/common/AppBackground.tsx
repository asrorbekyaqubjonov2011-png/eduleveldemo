import React from 'react';
import { useApp } from '../../context/AppContext';
import { BackgroundThemeId } from '../../types';
import { DURATION } from '../../lib/motion/tokens';

/**
 * AppBackground — the atmospheric layer behind the entire product.
 *
 * A single composed light field per theme: a warm paper canvas, two or three
 * slow-drifting luminous orbs, and a fine grain that keeps gradients from
 * banding. Orbs are soft radial gradients (no CSS blur filter), so it stays cheap
 * on low-powered devices while still feeling alive.
 */
export const AppBackground: React.FC = () => {
  const { db, theme } = useApp();
  const activeBg: BackgroundThemeId =
    (db.siteTheme?.activeBackground as BackgroundThemeId) || 'ivory_editorial';
  const isDark = theme === 'dark';

  /** Per-theme palette: canvas + three orb colours */
  const palettes: Record<string, { light: string; dark: string; orbs: [string, string, string] }> = {
    midnight_aurora: {
      light: '#f7f4ef',
      dark: '#0d0f14',
      orbs: ['rgba(255,138,43,0.20)', 'rgba(255,209,102,0.16)', 'rgba(120,90,255,0.10)'],
    },
    formula_live: {
      light: '#f7f4ef',
      dark: '#0d0f14',
      orbs: ['rgba(255,138,43,0.20)', 'rgba(255,209,102,0.16)', 'rgba(120,90,255,0.10)'],
    },
    ivory_editorial: {
      light: '#f7f4ef',
      dark: '#141311',
      orbs: ['rgba(255,170,90,0.22)', 'rgba(255,214,150,0.18)', 'rgba(200,170,120,0.10)'],
    },
    ocean_glass: {
      light: '#f2f6f8',
      dark: '#07131d',
      orbs: ['rgba(72,202,228,0.20)', 'rgba(0,150,199,0.14)', 'rgba(255,190,120,0.10)'],
    },
    cosmic: {
      light: '#f2f6f8',
      dark: '#07131d',
      orbs: ['rgba(72,202,228,0.20)', 'rgba(0,150,199,0.14)', 'rgba(255,190,120,0.10)'],
    },
    emerald_academy: {
      light: '#f3f7f4',
      dark: '#061714',
      orbs: ['rgba(16,185,129,0.18)', 'rgba(212,175,55,0.14)', 'rgba(255,190,120,0.10)'],
    },
    emerald: {
      light: '#f3f7f4',
      dark: '#061714',
      orbs: ['rgba(16,185,129,0.18)', 'rgba(212,175,55,0.14)', 'rgba(255,190,120,0.10)'],
    },
    royal_violet: {
      light: '#f7f4fb',
      dark: '#0e0819',
      orbs: ['rgba(157,78,221,0.20)', 'rgba(255,112,166,0.14)', 'rgba(255,190,120,0.08)'],
    },
    sunset_coral: {
      light: '#fdf5f1',
      dark: '#180d10',
      orbs: ['rgba(255,138,43,0.24)', 'rgba(255,112,166,0.16)', 'rgba(255,209,102,0.14)'],
    },
    gold: {
      light: '#fdf5f1',
      dark: '#180d10',
      orbs: ['rgba(255,138,43,0.24)', 'rgba(255,112,166,0.16)', 'rgba(255,209,102,0.14)'],
    },
    minimal: {
      light: '#fdf5f1',
      dark: '#180d10',
      orbs: ['rgba(255,138,43,0.20)', 'rgba(255,112,166,0.12)', 'rgba(255,209,102,0.12)'],
    },
  };

  const palette = palettes[activeBg] || palettes.ivory_editorial;
  const canvas = isDark ? palette.dark : palette.light;

  return (
    <div
      aria-hidden="true"
      key={`bg-${activeBg}-${theme}`}
      data-scroll-progress=""
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen overflow-hidden select-none"
      style={{ backgroundColor: canvas, transition: `background-color ${DURATION.surface}ms ease` }}
    >
      {/* 1 — upper warm light source */}
      <div className="sd-orb-1 absolute inset-0">
      <div
        className="animate-orb absolute -top-[26%] -left-[12%] h-[46rem] w-[46rem] rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${palette.orbs[0]} 0%, transparent 68%)`,
          animationDelay: '-4s',
          translate: '0 calc(var(--sp, 0) * -260px)',
        }}
      />
      </div>

      {/* 2 — right cool light source */}
      <div className="sd-orb-2 absolute inset-0">
      <div
        className="animate-orb absolute top-[18%] -right-[18%] h-[52rem] w-[52rem] rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${palette.orbs[1]} 0%, transparent 70%)`,
          animationDelay: '-11s',
          translate: 'calc(var(--sp, 0) * -120px) calc(var(--sp, 0) * 340px)',
        }}
      />
      </div>

      {/* 3 — low horizon glow */}
      <div className="sd-orb-3 absolute inset-0">
      <div
        className="animate-orb absolute -bottom-[30%] left-[22%] h-[44rem] w-[44rem] rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${palette.orbs[2]} 0%, transparent 70%)`,
          animationDelay: '-18s',
          translate: 'calc(var(--sp, 0) * 220px) calc(var(--sp, 0) * -460px)',
        }}
      />
      </div>

      {/* Fine grain — stops wide gradients from banding */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Vignette — focuses the eye toward the centre */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(0,0,0,0.55) 100%)'
            : 'radial-gradient(ellipse at 50% 20%, transparent 45%, rgba(210,198,180,0.35) 100%)',
        }}
      />
    </div>
  );
};
