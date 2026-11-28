'use client';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const subscribe = () => () => {};

/** Renders children into document.body so full-screen layers escape parent stacking contexts. */
export function BodyPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
