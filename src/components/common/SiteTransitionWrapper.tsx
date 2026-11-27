import React, { useEffect, useState } from 'react';

interface SiteTransitionWrapperProps {
  activeKey: string;
  children: React.ReactNode;
  className?: string;
}

export const SiteTransitionWrapper: React.FC<SiteTransitionWrapperProps> = ({
  activeKey,
  children,
  className = ''
}) => {
  const [displayKey, setDisplayKey] = useState(activeKey);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (activeKey !== displayKey) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayKey(activeKey);
        // Scroll to top of window when switching main sites smoothly
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0 });
        }
        setIsFading(false);
      }, 140);
      return () => clearTimeout(timer);
    }
  }, [activeKey, displayKey]);

  return (
    <div
      // Only opacity is animated at rest: a lingering transform/filter/will-change would
      // turn this wrapper into the containing block of position:fixed descendants and
      // break pinned scroll scenes.
      className={`flex flex-1 flex-col transition-opacity duration-200 ease-out ${
        isFading ? 'pointer-events-none opacity-0' : 'animate-site-fade-in opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  );
};
