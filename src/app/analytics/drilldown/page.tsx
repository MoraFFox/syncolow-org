"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { drillAnalytics, DrillAnalyticsMetrics } from '@/lib/drill-analytics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp } from 'lucide-react';

export default function DrilldownAnalyticsPage() {
  const [metrics, setMetrics] = useState<DrillAnalyticsMetrics | null>(null);

  useEffect(() => {
    const m = drillAnalytics.getMetrics();
    setMetrics(m);
  }, []);

  const handleExport = () => {
    const data = JSON.stringify(metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drilldown-analytics-${Date.now()}.json`;
    a.click();
  };

  if (!metrics) return <div className="p-6">Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Drill-Down Analytics</h1>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              {(metrics.previewToNavigateConversion * 100).toFixed(1)}%
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Preview → Detail</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Object.keys(metrics.eventsByKind).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most Viewed Entities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.mostViewedEntities.slice(0, 10).map((entity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                  <Badge variant="outline">{entity.kind}</Badge>
                  <span className="font-medium">{entity.entityId}</span>
                </div>
                <Badge>{entity.count} views</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events by Entity Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(metrics.eventsByKind).map(([kind, count]) => (
              <div key={kind} className="p-3 bg-muted rounded-md text-center">
                <Badge variant="outline" className="mb-2">{kind}</Badge>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
