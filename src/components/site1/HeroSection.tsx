'use client';
import React from 'react';
import { useApp } from '../../context/AppContext';
import { HeroStatic } from './HeroStatic';

/** Preserve Site Builder visibility and the existing authenticated CTA, without a second hero layout. */
export const HeroSection: React.FC = () => {
  const { db, currentUser, setActiveSite } = useApp();
  const hero = db.siteSections.find(s => s.key === 'hero');
  if (hero && !hero.isVisible) return null;
  return <HeroStatic signedIn={Boolean(currentUser)} onStart={() => setActiveSite(currentUser ? 'site2_lms' : 'auth')}/>;
};
