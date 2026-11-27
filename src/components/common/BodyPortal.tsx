'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Renders children into document.body so full-screen layers escape parent stacking contexts. */
export function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
