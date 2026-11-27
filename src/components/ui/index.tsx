import React from 'react';
import { cn } from './styles';

/* =========================================================================
   GLASS SURFACES
   Four calibrated levels of "liquid glass". Level 1 is the lightest ink,
   level 4 is the opaque focused surface used behind modals.
   ========================================================================= */

type GlassLevel = 1 | 2 | 3 | 4;

interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel;
  /** Renders on dark cinematic surfaces instead of the light canvas */
  dark?: boolean;
  /** Adds a moving specular sheen on hover */
  sheen?: boolean;
  /** Rounds the surface (Tailwind radius classes) */
  radius?: string;
  as?: 'div' | 'section' | 'nav' | 'aside' | 'header' | 'article' | 'li';
}

export const Glass = React.forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { level = 1, dark = false, sheen = false, radius = 'rounded-[1.75rem]', className, children, as = 'div', ...rest },
  ref
) {
  const base = dark ? 'glass-dark' : `glass-${level}`;
  const Tag = as as any;
  return (
    <Tag ref={ref} className={cn(base, radius, sheen && 'glass-sheen', className)} {...rest}>
      {children}
    </Tag>
  );
});

/* =========================================================================
   BUTTON — one button, five weights. Renders <button> or <a> by props.
   ========================================================================= */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ember' | 'glass' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional icon rendered after the label */
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
}

const BTN_VARIANT: Record<string, string> = {
  primary:
    'bg-ink text-white shadow-[0_12px_32px_-14px_rgba(18,16,14,0.65)] hover:bg-[#23201c] dark:bg-white dark:text-ink dark:hover:bg-stone-100',
  ember:
    'bg-gradient-to-b from-[#FFB45C] to-[#EF6C12] text-white shadow-[0_16px_38px_-14px_rgba(239,108,18,0.7)] hover:from-[#FFC382] hover:to-[#F57A1E]',
  glass:
    'border border-white/60 bg-white/55 text-ink backdrop-blur-xl hover:bg-white/75 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
  outline:
    'border border-ink/15 text-ink hover:border-ink/35 hover:bg-ink/[0.04] dark:border-white/15 dark:text-white dark:hover:bg-white/5',
  ghost:
    'text-ink-muted hover:bg-ink/[0.05] hover:text-ink dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-white',
};

const BTN_SIZE: Record<string, string> = {
  sm: 'h-9 gap-1.5 px-4 text-[12.5px]',
  md: 'h-11 gap-2 px-5 text-[13.5px]',
  lg: 'h-[52px] gap-2 px-7 text-[14.5px]',
  xl: 'h-14 gap-2.5 px-8 text-[15px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', iconLeft, iconRight, className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'group relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all duration-200',
        'active:scale-[0.975] disabled:pointer-events-none disabled:opacity-45',
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className
      )}
      {...rest}
    >
      {iconLeft ? <span className="shrink-0">{iconLeft}</span> : null}
      {children}
      {iconRight ? (
        <span className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">{iconRight}</span>
      ) : null}
    </button>
  );
});

/* =========================================================================
   SECTION HEADER — shared editorial heading block
   ========================================================================= */

interface SectionHeaderProps {
  label?: string;
  title: React.ReactNode;
  lead?: string;
  align?: 'left' | 'center';
  className?: string;
  /** Slot rendered under the lead (filters, toggles) */
  footer?: React.ReactNode;
  tone?: 'light' | 'dark';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  title,
  lead,
  align = 'center',
  className,
  footer,
  tone = 'light',
}) => {
  const centered = align === 'center';
  return (
    <div className={cn(centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl text-left', className)}>
      {label ? (
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]',
            tone === 'dark'
              ? 'border-white/15 bg-white/[0.06] text-amber-200/90 backdrop-blur-md'
              : 'border-[#e5dfd5] bg-white/60 text-[#6b655c] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400'
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A2B]" />
          {label}
        </span>
      ) : null}

      <h2
        className={cn(
          'mt-5 font-display font-extrabold tracking-[-0.035em] text-balance',
          'text-[clamp(1.85rem,4vw,3rem)] leading-[1.05]',
          tone === 'dark' ? 'text-white' : 'text-[#12100e] dark:text-white'
        )}
      >
        {title}
      </h2>

      {lead ? (
        <p
          className={cn(
            'mt-5 text-[14.5px] leading-relaxed text-balance sm:mt-6',
            centered && 'mx-auto',
            tone === 'dark' ? 'text-white/65' : 'text-[#6b655c] dark:text-stone-400'
          )}
        >
          {lead}
        </p>
      ) : null}

      {footer ? <div className={cn('mt-8', centered && 'flex justify-center')}>{footer}</div> : null}
    </div>
  );
};

/* =========================================================================
   PILL / BADGE
   ========================================================================= */

export const Pill: React.FC<{
  children: React.ReactNode;
  tone?: 'neutral' | 'ember' | 'emerald' | 'ink' | 'glass';
  className?: string;
}> = ({ children, tone = 'neutral', className }) => {
  const tones: Record<string, string> = {
    neutral: 'border-[#e5dfd5] bg-white/70 text-[#6b655c] dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-400',
    ember: 'border-[#ffd0a3] bg-[#fff3e6] text-[#c9540a] dark:border-[#ff8a2b]/25 dark:bg-[#ff8a2b]/10 dark:text-[#ffb45c]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
    ink: 'border-transparent bg-[#12100e] text-white',
    glass: 'border-white/60 bg-white/55 text-[#12100e] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em]',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

/* =========================================================================
   STAT TILE — used in the hero glass bar and dashboards
   ========================================================================= */

export const StatTile: React.FC<{
  value: React.ReactNode;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
}> = ({ value, label, hint, icon, tone = 'light', className }) => (
  <div className={cn('flex items-center gap-3.5', className)}>
    {icon ? (
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          tone === 'dark' ? 'bg-white/10 text-amber-300' : 'bg-[#ff8a2b]/10 text-[#ef6c12] dark:bg-[#ff8a2b]/15 dark:text-[#ffb45c]'
        )}
      >
        {icon}
      </div>
    ) : null}
    <div className="min-w-0">
      <div
        className={cn(
          'font-display text-[21px] font-extrabold leading-none tabular-nums tracking-tight',
          tone === 'dark' ? 'text-white' : 'text-[#12100e] dark:text-white'
        )}
      >
        {value}
      </div>
      <div className={cn('mt-1 text-[11px] font-medium', tone === 'dark' ? 'text-white/60' : 'text-[#6b655c] dark:text-stone-400')}>
        {label}
      </div>
      {hint ? (
        <div className={cn('text-[10.5px]', tone === 'dark' ? 'text-white/40' : 'text-[#9b948a]')}>{hint}</div>
      ) : null}
    </div>
  </div>
);
