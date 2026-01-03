
import type { Metadata } from 'next';
import { Mulish, JetBrains_Mono, Outfit } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';
import { DrillPreviewTooltip } from '@/components/drilldown/drill-preview-tooltip';
import { DrillDialogWrapper } from '@/components/drilldown/drill-dialog-wrapper';
import { DrillDownProvider } from '@/components/drilldown/drill-down-provider';
import { DrilldownSettingsInitializer } from '@/components/drilldown/drilldown-settings-initializer';
import { DrillPeekModal } from '@/components/drilldown/drill-peek-modal';
import { DrilldownSearch } from '@/components/drilldown/drilldown-search';
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SynergyFlow',
  description: 'AI-powered ERP system to manage clients, sales, maintenance, and business analytics.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const correlationId = headersList.get('x-correlation-id') || '';
  const traceId = headersList.get('x-trace-id') || '';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {correlationId && <meta name="correlation-id" content={correlationId} />}
        {traceId && <meta name="trace-id" content={traceId} />}
      </head>
      <body className={cn(
        'min-h-screen bg-background font-sans antialiased',
        mulish.variable,
        jetbrainsMono.variable,
        outfit.variable
      )}>
        <Providers>
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <DrillPreviewTooltip />
            <DrillDialogWrapper />
            <DrillPeekModal />
            <DrillDownProvider />
            <DrilldownSettingsInitializer />
            <DrilldownSearch />
          </AuthProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
