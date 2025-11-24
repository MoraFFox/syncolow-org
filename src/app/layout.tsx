
import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/theme-provider';
import { DrillPreviewTooltip } from '@/components/drilldown/drill-preview-tooltip';
import { DrillDialogWrapper } from '@/components/drilldown/drill-dialog-wrapper';
import { cn } from '@/lib/utils';

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SynergyFlow',
  description: 'AI-powered ERP system to manage clients, sales, maintenance, and business analytics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', mulish.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
            <AuthProvider>
              <AppShell>{children}</AppShell>
              <DrillPreviewTooltip />
              <DrillDialogWrapper />
            </AuthProvider>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
