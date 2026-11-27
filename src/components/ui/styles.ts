/**
 * EDU LEVEL — shared class recipes.
 * Small helpers so surfaces stay visually consistent across the product.
 */
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Page / section shell spacing — generous, editorial */
export const shell = 'mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10';

/** Section headings */
export const sectionLabel =
  'inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/60 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-stone-400';

export const sectionTitle =
  'text-display text-[clamp(1.9rem,4.2vw,3.1rem)] text-ink dark:text-white';

export const sectionLead =
  'text-[15px] leading-relaxed text-ink-muted dark:text-stone-400';

/** Surfaces */
export const cardSurface =
  'rounded-[1.75rem] border border-line/70 bg-paper-raised/80 backdrop-blur-xl dark:border-white/8 dark:bg-white/[0.035]';

export const divider = 'h-px w-full bg-gradient-to-r from-transparent via-line/90 to-transparent dark:via-white/10';

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export const buttonBase =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45';

export const buttonVariants = cva(buttonBase, {
  variants: {
    variant: {
      primary:
        'bg-ink text-white shadow-[0_10px_30px_-12px_rgba(18,16,14,0.55)] hover:bg-ink-soft dark:bg-white dark:text-ink dark:hover:bg-stone-100',
      ember:
        'bg-gradient-to-b from-ember-400 to-ember-600 text-white shadow-[0_14px_34px_-12px_rgba(239,108,18,0.65)] hover:from-ember-300 hover:to-ember-500',
      glass:
        'glass-1 text-ink hover:bg-white/75 dark:text-white dark:hover:bg-white/10',
      outline:
        'border border-line bg-transparent text-ink hover:border-ink/25 hover:bg-white/50 dark:border-white/15 dark:text-white dark:hover:bg-white/5',
      ghost:
        'text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-white',
    },
    size: {
      sm: 'h-9 px-4 text-[12.5px]',
      md: 'h-11 px-5 text-[13.5px]',
      lg: 'h-13 px-7 text-[14.5px]',
      xl: 'h-14 px-8 text-[15px]',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

export const field =
  'w-full rounded-2xl border border-line bg-white/70 px-4 py-3 text-[13.5px] text-ink placeholder:text-ink-muted/70 outline-none transition-all focus:border-ember-500/70 focus:bg-white focus:ring-4 focus:ring-ember-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-ember-400/60 dark:focus:bg-white/[0.07]';

export const label = 'mb-1.5 block text-[12px] font-semibold text-ink-muted dark:text-stone-400';

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
