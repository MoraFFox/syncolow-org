"use client"

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle, TrendingDown, Users } from 'lucide-react';
import { PaymentScoreBadge } from '@/components/payment-score-badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DrillTarget } from '@/components/drilldown/drill-target';

export default function PaymentAnalyticsPage() {
  const { orders } = useOrderStore();
  const { companies } = useCompanyStore();

  const analytics = useMemo(() => {
    const unpaidOrders = orders.filter(o => !o.isPaid && o.paymentStatus !== 'Paid');
    const overdueOrders = unpaidOrders.filter(o => (o.daysOverdue || 0) > 7);
    
    const totalOutstanding = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOverdue = overdueOrders.reduce((sum, o) => sum + o.total, 0);
    
    const parentCompanies = companies.filter(c => !c.isBranch);
    const companiesWithScores = parentCompanies.filter(c => c.currentPaymentScore !== undefined);
    const avgPaymentScore = companiesWithScores.length > 0
      ? companiesWithScores.reduce((sum, c) => sum + (c.currentPaymentScore || 0), 0) / companiesWithScores.length
      : 100;
    
    const atRiskCompanies = parentCompanies.filter(c => 
      c.paymentStatus === 'poor' || c.paymentStatus === 'critical'
    ).length;

    const statusDistribution = [
      { name: 'Excellent', value: parentCompanies.filter(c => c.paymentStatus === 'excellent').length, color: '#22c55e' },
      { name: 'Good', value: parentCompanies.filter(c => c.paymentStatus === 'good').length, color: '#84cc16' },
      { name: 'Fair', value: parentCompanies.filter(c => c.paymentStatus === 'fair').length, color: '#eab308' },
      { name: 'Poor', value: parentCompanies.filter(c => c.paymentStatus === 'poor').length, color: '#f97316' },
      { name: 'Critical', value: parentCompanies.filter(c => c.paymentStatus === 'critical').length, color: '#ef4444' },
    ].filter(item => item.value > 0);

    const agingBuckets = [
      { name: '0-30 days', amount: 0, count: 0 },
      { name: '31-60 days', amount: 0, count: 0 },
      { name: '61-90 days', amount: 0, count: 0 },
      { name: '90+ days', amount: 0, count: 0 },
    ];

    unpaidOrders.forEach(order => {
      const days = order.daysOverdue || 0;
      if (days <= 30) {
        agingBuckets[0].amount += order.total;
        agingBuckets[0].count++;
      } else if (days <= 60) {
        agingBuckets[1].amount += order.total;
        agingBuckets[1].count++;
      } else if (days <= 90) {
        agingBuckets[2].amount += order.total;
        agingBuckets[2].count++;
      } else {
        agingBuckets[3].amount += order.total;
        agingBuckets[3].count++;
      }
    });

    const delinquentClients = parentCompanies
      .filter(c => (c.totalUnpaidOrders || 0) > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        score: c.currentPaymentScore || 100,
        status: c.paymentStatus || 'excellent',
        unpaidOrders: c.totalUnpaidOrders || 0,
        outstanding: c.totalOutstandingAmount || 0,
        paymentTerms: c.paymentDueType === 'immediate' ? 'Immediate' :
                      c.paymentDueType === 'monthly_date' ? `Monthly (${c.paymentDueDate})` :
                      `Net ${c.paymentDueDays}`,
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);

    return {
      totalOutstanding,
      totalOverdue,
      avgPaymentScore,
      atRiskCompanies,
      statusDistribution,
      agingBuckets,
      delinquentClients,
    };
  }, [orders, companies]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Payment Analytics</h1>
        <p className="text-muted-foreground">
          Monitor payment performance and identify at-risk clients
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.totalOutstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all unpaid orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${analytics.totalOverdue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Past grace period (7+ days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Payment Score</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.avgPaymentScore.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all active clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Clients</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics.atRiskCompanies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Poor or Critical status
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusDistribution.map((entry, index) => (
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
            <CardTitle>Aging Report</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.agingBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  labelFormatter={(label) => `Age: ${label}`}
                />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Outstanding Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Delinquent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Client</th>
                  <th className="text-left py-3 px-4 font-medium">Payment Score</th>
                  <th className="text-right py-3 px-4 font-medium">Unpaid Orders</th>
                  <th className="text-right py-3 px-4 font-medium">Outstanding</th>
                  <th className="text-left py-3 px-4 font-medium">Payment Terms</th>
                </tr>
              </thead>
              <tbody>
                {analytics.delinquentClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No delinquent clients found
                    </td>
                  </tr>
                ) : (
                  analytics.delinquentClients.map((client) => (
                    <DrillTarget key={client.id} kind="company" payload={{ id: client.id, name: client.name, status: client.status }} asChild>
                    <tr className="border-b hover:bg-muted/50 cursor-pointer">
                      <td className="py-3 px-4 font-medium">{client.name}</td>
                      <td className="py-3 px-4">
                        <PaymentScoreBadge score={client.score} status={client.status} />
                      </td>
                      <td className="py-3 px-4 text-right">{client.unpaidOrders}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        ${client.outstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {client.paymentTerms}
                      </td>
                    </tr>
                    </DrillTarget>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
