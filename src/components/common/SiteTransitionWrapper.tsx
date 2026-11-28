import React from 'react';

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
  return (
    <div key={activeKey} className={`flex flex-1 flex-col animate-site-fade-in ${className}`}>
      {children}
    </div>
  );
};
