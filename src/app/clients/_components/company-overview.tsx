

"use client";

import { useMemo } from 'react';
import type { Company, Order, Branch, Barista, Feedback } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Star, Users, ArrowUp, ArrowDown, Minus, AreaChart } from 'lucide-react';
import { calculatePerformanceScore } from '@/lib/performance-score';
import { useCompanyStore } from '@/store/use-company-store';
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart as RechartsAreaChart,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  ResponsiveContainer,
} from "recharts";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useOrderStore } from '@/store/use-order-store';

interface CompanyOverviewProps {
    company: Company;
    branches: (Company & { isBranch: true })[];
    orders: Order[];
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
};

function BranchPerformance({ branches }: { branches: (Company & { isBranch: true })[] }) {
    const { orders } = useOrderStore();
    const { baristas, feedback } = useCompanyStore();

    const performanceTiers = useMemo(() => {
        const scores = branches.map(branch => ({
            ...branch,
            score: calculatePerformanceScore(branch.id, orders, feedback, baristas)
        }));

        return {
            top: scores.filter(b => b.score >= 8).sort((a,b) => b.score - a.score),
            average: scores.filter(b => b.score >= 4 && b.score < 8).sort((a,b) => b.score - a.score),
            low: scores.filter(b => b.score < 4).sort((a,b) => b.score - a.score)
        };
    }, [branches, orders, feedback, baristas]);

    const PerformanceTier = ({ title, branches, icon, color, description }: { title: string, branches: {id: string, name: string, score: number, parentCompanyId?: string | null}[], icon: React.ReactNode, color: string, description: string }) => (
        <Card>
            <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-base ${color}`}>
                    {icon} {title} ({branches.length})
                </CardTitle>
                 <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {branches.length > 0 ? branches.slice(0, 3).map(branch => (
                     <Link href={`/clients/${branch.parentCompanyId}/${branch.id}`} key={branch.id}>
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                            <span className="text-sm font-medium">{branch.name}</span>
                            <Badge variant="outline">{branch.score.toFixed(1)}</Badge>
                        </div>
                    </Link>
                )) : <p className="text-sm text-muted-foreground text-center py-4">None</p>}
                {branches.length > 3 && <Button variant="link" size="sm" className="p-0 h-auto">View all {branches.length}...</Button>}
            </CardContent>
        </Card>
    );

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Branch Performance</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <PerformanceTier title="Top Performers" branches={performanceTiers.top} icon={<ArrowUp />} color="text-green-500" description="Branches excelling in all metrics."/>
                <PerformanceTier title="Average Performers" branches={performanceTiers.average} icon={<Minus />} color="text-amber-500" description="Branches with steady performance."/>
                <PerformanceTier title="Needs Attention" branches={performanceTiers.low} icon={<ArrowDown />} color="text-red-500" description="Branches requiring review and support." />
            </div>
        </div>
    );
}


export function CompanyOverview({ company, branches, orders }: CompanyOverviewProps) {
  const { baristas, feedback } = useCompanyStore();

  const analytics = useMemo(() => {
      const companyOrders = orders.filter(o => o.status !== 'Cancelled');
      const totalRevenue = companyOrders.reduce((sum, order) => sum + order.total, 0);
      const activeOrders = companyOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
      
      const perfScores = branches.map(b => calculatePerformanceScore(b.id, orders, feedback, baristas));
      const avgPerformance = perfScores.length > 0 ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length : 0;
      
      const totalBaristas = baristas.filter(b => branches.some(br => br.id === b.branchId)).length;
      
      return { totalRevenue, activeOrders, avgPerformance, totalBaristas };
  }, [orders, branches, baristas, feedback]);

  const revenueTrendData = useMemo(() => {
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
    const now = endOfMonth(new Date());
    
    const monthlyRevenue: { [key: string]: number } = {};

    orders.forEach(order => {
        const orderDate = parseISO(order.orderDate);
        if (isValid(orderDate) && orderDate >= twelveMonthsAgo && orderDate <= now) {
            const monthKey = format(orderDate, 'yyyy-MM');
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + order.total;
        }
    });

    const months = eachMonthOfInterval({ start: twelveMonthsAgo, end: now });
        
    return months.map(month => {
        const monthKey = format(month, 'yyyy-MM');
        return {
            date: format(month, 'MMM yyyy'),
            revenue: monthlyRevenue[monthKey] || 0
        }
    });
  }, [orders]);


  return (
    <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{analytics.activeOrders}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{analytics.avgPerformance.toFixed(1)}/10</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Baristas</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalBaristas}</div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AreaChart className="h-5 w-5" /> Revenue Trend</CardTitle>
                <CardDescription>Revenue from all branches over the last 12 months.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <RechartsAreaChart data={revenueTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                             <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => `$${Number(value) / 1000}k`}
                            />
                             <Tooltip
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Area
                                dataKey="revenue"
                                type="natural"
                                fill="url(#fillRevenue)"
                                stroke="var(--color-revenue)"
                                stackId="a"
                            />
                        </RechartsAreaChart>
                    </ResponsiveContainer>
                 </ChartContainer>
            </CardContent>
        </Card>

        {branches.length > 0 && <BranchPerformance branches={branches} />}
    </div>
  );
}
