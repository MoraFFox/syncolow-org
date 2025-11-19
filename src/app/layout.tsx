
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/theme-provider';

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
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
