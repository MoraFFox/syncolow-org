"use client";

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  calculateNotificationMetrics, 
  calculateTrendData, 
  calculateEngagementMetrics,
  analyzeNotificationPatterns,
  generateAnalyticsReport 
} from '@/lib/notification-analytics';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const COLORS = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export default function NotificationAnalyticsPage() {
  const { notifications } = useOrderStore();

  const report = useMemo(() => generateAnalyticsReport(notifications, 30), [notifications]);
  const { metrics, trends, engagement, analysis } = report;

  const priorityData = [
    { name: 'Critical', value: metrics.byPriority.critical, color: COLORS.critical },
    { name: 'Warning', value: metrics.byPriority.warning, color: COLORS.warning },
    { name: 'Info', value: metrics.byPriority.info, color: COLORS.info },
  ];

  const sourceData = Object.entries(metrics.bySource).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Analytics</h1>
        <p className="text-muted-foreground">
          Insights and metrics for the last 30 days
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.unread} unread
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.actionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.actionRate > 50 ? 'Good engagement' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Time to read notification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.byPriority.critical}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.byPriority.critical / metrics.total) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {(analysis.patterns.length > 0 || analysis.anomalies.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {analysis.patterns.length > 0 && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <strong>Patterns Detected:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  {analysis.patterns.map((pattern, i) => (
                    <li key={i}>• {pattern}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {analysis.anomalies.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Anomalies:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  {analysis.anomalies.map((anomaly, i) => (
                    <li key={i}>• {anomaly}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Actions to improve notification effectiveness</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Trends</CardTitle>
              <CardDescription>Daily notification volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="critical" stroke={COLORS.critical} name="Critical" />
                  <Line type="monotone" dataKey="warning" stroke={COLORS.warning} name="Warning" />
                  <Line type="monotone" dataKey="info" stroke={COLORS.info} name="Info" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Source</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sourceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Open Rate</span>
                    <span className="text-sm font-bold">{engagement.openRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${engagement.openRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Action Completion</span>
                    <span className="text-sm font-bold">{engagement.actionCompletionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${engagement.actionCompletionRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Avg Time to Action</span>
                    <span className="text-sm font-bold">{engagement.avgTimeToAction.toFixed(1)}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Engaged Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {engagement.mostEngagedTypes.map((type, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm">{type.type.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{type.rate.toFixed(1)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
