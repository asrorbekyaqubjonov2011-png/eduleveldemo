import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EduLevel Mini App',
  robots: { index: false, follow: false }
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
