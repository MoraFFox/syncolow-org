'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaStats } from '@/app/actions/orders/get-area-stats';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface AreaAnalyticsViewProps {
    areas: AreaStats[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function AreaAnalyticsView({ areas }: AreaAnalyticsViewProps) {
    // Sort areas by revenue for the chart
    const sortedByRevenue = [...areas].sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Data for Pie Chart (Active Clients)
    const clientData = areas.map(a => ({ name: a.name, value: a.activeClients })).filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 border border-border/50 p-2 rounded shadow-xl backdrop-blur-md">
                    <p className="font-bold border-b border-white/10 mb-2 pb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: <span className="font-mono text-foreground font-semibold">{
                                entry.name === 'Total Revenue' ? formatCurrency(entry.value) : entry.value
                            }</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-muted/40 bg-card/50 backdrop-blur-sm lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Revenue by Delivery Area</CardTitle>
                        <CardDescription>Comparison of total revenue across all active areas.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sortedByRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={70}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                />
                                <YAxis
                                    tickFormatter={(value) => `${value / 1000}k`}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                                <Bar dataKey="totalRevenue" name="Total Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-muted/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Order Volume</CardTitle>
                        <CardDescription>Total number of orders processed per area.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sortedByRevenue} layout="vertical" margin={{ left: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                                <Bar dataKey="totalOrders" name="Orders" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-muted/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Client Distribution</CardTitle>
                        <CardDescription>Share of active clients across delivery areas.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={clientData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {clientData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
