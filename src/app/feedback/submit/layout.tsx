
import type { Metadata } from 'next';
import { Icons } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Submit Feedback - SynergyFlow',
  description: 'Provide feedback for services received.',
};

export default function SubmitFeedbackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-background">
      <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Icons.logo className="w-8 h-8 mr-2" />
            SynergyFlow
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Your feedback is invaluable. It helps us improve and serve you better every day.&rdquo;
              </p>
              <footer className="text-sm">The SynergyFlow Team</footer>
            </blockquote>
          </div>
        </div>
        <div className="relative p-4 lg:p-8 h-full flex items-center justify-center overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
