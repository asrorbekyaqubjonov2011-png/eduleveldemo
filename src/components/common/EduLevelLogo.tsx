'use client';

import React from 'react';

interface EduLevelLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  /** aurora = light surfaces, white = over dark hero imagery, glass = translucent chip */
  variant?: 'aurora' | 'glass' | 'white';
}

/**
 * EduLevelLogo — the brand mark.
 *
 * A molten ember tile carrying an open-book "E" glyph drawn as three rising
 * bars, paired with a tightly tracked wordmark. The mark reads at 28px as
 * clearly as at 64px because it avoids fine detail.
 */
export const EduLevelLogo: React.FC<EduLevelLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  className = '',
  variant = 'aurora',
}) => {
  const iconSizes: Record<string, string> = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const textSizes: Record<string, string> = {
    sm: 'text-[15px]',
    md: 'text-[18px]',
    lg: 'text-[22px]',
    xl: 'text-[28px]',
  };

  const isWhite = variant === 'white';

  return (
    <div className={`flex select-none items-center gap-2.5 ${className}`}>
      {/* Brand mark: graduation cap and open book from the EduLevel logo */}
      <div
        className={`${iconSizes[size]} relative shrink-0 -translate-y-[3px] overflow-hidden rounded-[11px] shadow-[0_8px_20px_-8px_rgba(2,8,24,0.6)] ring-1 transition-transform duration-300 group-hover:scale-[1.04] ${
          isWhite ? 'ring-white/25' : 'ring-ink/10 dark:ring-white/15'
        }`}
      >
        <img src="/brand/edulevel-mark.webp" alt="" width={512} height={512} className="h-full w-full object-cover" decoding="async" />
      </div>

      {/* Wordmark */}
      {showText && (
        <div className="flex min-w-0 flex-col">
          <span
            className={`${textSizes[size]} font-extrabold leading-none tracking-[-0.03em] ${
              isWhite ? 'text-white' : 'text-ink dark:text-white'
            }`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            EDU<span className="text-ember-500"> LEVEL</span>
          </span>
          {showSubtitle && (
            <span
              className={`mt-[3px] text-[9px] font-semibold uppercase leading-none tracking-[0.16em] ${
                isWhite ? 'text-white/55' : 'text-ink-muted/80 dark:text-stone-500'
              }`}
            >
              IELTS · CEFR · English
            </span>
          )}
        </div>
      )}
    </div>
  );
};
