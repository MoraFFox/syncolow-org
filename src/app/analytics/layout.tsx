
import React from 'react';
import { AnalyticsTabs } from './_components/analytics-tabs';

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your business performance.</p>
      </div>
      
      <AnalyticsTabs />
      
      <div className="pt-6">
        {children}
      </div>
    </div>
  );
}
