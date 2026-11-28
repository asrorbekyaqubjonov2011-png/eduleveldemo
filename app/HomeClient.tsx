'use client';
import dynamic from 'next/dynamic';
import { HeroLoading } from '@/src/components/site1/HeroStatic';
const App = dynamic(() => import('@/src/App'), { ssr: false, loading: () => <HeroLoading/> });
export default function HomeClient() { return <App/>; }
