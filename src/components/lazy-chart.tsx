"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-[300px]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { loading: LoadingFallback, ssr: false }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { loading: LoadingFallback, ssr: false }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  { loading: LoadingFallback, ssr: false }
);

export const LazyAreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { loading: LoadingFallback, ssr: false }
);
