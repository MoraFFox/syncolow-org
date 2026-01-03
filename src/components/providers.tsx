"use client";

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { queryClient } from '@/lib/query-client';
import { ServiceWorkerInitializer } from '@/components/service-worker-initializer';
import { CorrelationProvider } from '@/contexts/correlation-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerInitializer />
      <CorrelationProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </CorrelationProvider>
    </QueryClientProvider>
  );
}
