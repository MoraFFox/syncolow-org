'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Loader2, Printer, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { AnalyticsResponse } from '@/app/actions/analytics/types';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface VisualExportDialogProps {
    data: AnalyticsResponse | null;
    dateRange?: { from: Date; to: Date };
    isOpen: boolean;
    onClose: () => void;
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function VisualExportDialog({ data, dateRange, isOpen, onClose }: VisualExportDialogProps) {
    const [isPrinting, setIsPrinting] = useState(false);
    const exportContainerRef = useRef<HTMLDivElement>(null);

    const handlePrint = useCallback(async () => {
        setIsPrinting(true);

        // Small delay to ensure content is rendered
        await new Promise(resolve => setTimeout(resolve, 100));

        // Use browser's print functionality
        window.print();

        setIsPrinting(false);
    }, []);

    const handleExportPDF = useCallback(async () => {
        if (!exportContainerRef.current) return;

        setIsPrinting(true);

        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const element = exportContainerRef.current;

            // Capture all pages
            const pages = element.querySelectorAll('[data-export-page]');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = 210;
            const pageHeight = 297;

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) pdf.addPage();

                const canvas = await html2canvas(pages[i] as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
            }

            pdf.save(`analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setIsPrinting(false);
        }
    }, []);

    if (!data) return null;

    const summary = data.summary;
    const timeSeries = data.timeSeries || [];
    const topProducts = data.topProducts || [];
    const topCategories = data.topCategories || [];
    const customerSegments = summary?.customerSegments || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm print:hidden"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-4 z-[101] flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden print:hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                            <div className="flex items-center gap-3">
                                <Eye className="h-5 w-5 text-emerald-500" />
                                <div>
                                    <h2 className="text-lg font-bold text-white">Export Preview</h2>
                                    <p className="text-xs text-zinc-500">Preview your analytics report before exporting</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handlePrint}
                                    disabled={isPrinting}
                                    className="border-zinc-700"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                </Button>
                                <Button
                                    onClick={handleExportPDF}
                                    disabled={isPrinting}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {isPrinting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Export PDF
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onClose}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Preview Container */}
                        <div className="flex-1 overflow-auto p-8 bg-zinc-800">
                            <div
                                ref={exportContainerRef}
                                className="mx-auto space-y-8"
                                style={{ maxWidth: '800px' }}
                            >
                                {/* Page 1: Header & KPIs */}
                                <div data-export-page className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
                                    <div className="border-b-2 border-emerald-500 pb-4 mb-8">
                                        <h1 className="text-3xl font-bold text-gray-900">SynergyFlow</h1>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Analytics Report • {dateRange ? `${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}` : 'All Time'}
                                        </p>
                                    </div>

                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <KPICard
                                            title="Total Revenue"
                                            value={`$${(summary?.revenue.value || 0).toLocaleString()}`}
                                            change={summary?.revenue.change}
                                            trend={summary?.revenue.trend}
                                        />
                                        <KPICard
                                            title="Total Orders"
                                            value={(summary?.orders.value || 0).toLocaleString()}
                                            change={summary?.orders.change}
                                            trend={summary?.orders.trend}
                                        />
                                        <KPICard
                                            title="Average Order Value"
                                            value={`$${(summary?.aov.value || 0).toLocaleString()}`}
                                            change={summary?.aov.change}
                                            trend={summary?.aov.trend}
                                        />
                                        <KPICard
                                            title="New Clients"
                                            value={(summary?.newClients?.value || 0).toLocaleString()}
                                            change={summary?.newClients?.change}
                                            trend={summary?.newClients?.trend}
                                        />
                                    </div>

                                    {/* Revenue Trend Chart */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Growth</h3>
                                        <p className="text-sm text-gray-500 mb-4">Monthly revenue trends for the selected period</p>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={timeSeries.slice(-30)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <Tooltip />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="revenue"
                                                        stroke="#10b981"
                                                        strokeWidth={2}
                                                        dot={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Page 2: Charts & Visuals */}
                                <div data-export-page className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">Charts & Visuals</h2>

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Top Products */}
                                        <ChartCard title="Top Products by Revenue" subtitle="Best-selling products for the selected period">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} stroke="#9ca3af" />
                                                    <Tooltip />
                                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </ChartCard>

                                        {/* Customer Segments */}
                                        <ChartCard title="Customer Segments" subtitle="Customer classification based on behavior">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <PieChart>
                                                    <Pie
                                                        data={customerSegments}
                                                        dataKey="count"
                                                        nameKey="label"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={70}
                                                        label={(entry) => entry.label}
                                                    >
                                                        {customerSegments.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </ChartCard>

                                        {/* AOV Trend */}
                                        <ChartCard title="Average Order Value" subtitle="Monthly AOV trend for the selected period">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={timeSeries.slice(-30)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <Tooltip />
                                                    <Line type="monotone" dataKey="aov" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </ChartCard>

                                        {/* Top Categories */}
                                        <ChartCard title="Top Categories" subtitle="Revenue by product category">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={topCategories.slice(0, 5)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                                                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <Tooltip />
                                                    <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </ChartCard>
                                    </div>
                                </div>

                                {/* Page 3: Advanced Analytics */}
                                <div data-export-page className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">Advanced Analytics</h2>

                                    {/* Orders Trend */}
                                    <ChartCard title="Orders Over Time" subtitle="Daily order count for the selected period" className="mb-6">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <LineChart data={timeSeries.slice(-30)}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartCard>

                                    {/* Debt Aging */}
                                    {summary?.debtAging && (
                                        <ChartCard title="Debt Aging" subtitle="Receivables breakdown by age" className="mb-6">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={[
                                                    { name: 'Current', value: summary.debtAging.current },
                                                    { name: '31-60 days', value: summary.debtAging.overdue30 },
                                                    { name: '61-90 days', value: summary.debtAging.overdue60 },
                                                    { name: '90+ days', value: summary.debtAging.overdue90 }
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                                                    <Tooltip />
                                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                        <Cell fill="#10b981" />
                                                        <Cell fill="#f59e0b" />
                                                        <Cell fill="#f97316" />
                                                        <Cell fill="#ef4444" />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </ChartCard>
                                    )}

                                    {/* Footer */}
                                    <div className="border-t border-gray-200 pt-4 mt-8">
                                        <p className="text-xs text-gray-400 text-center">
                                            Generated by SynergyFlow • {format(new Date(), 'PPP p')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Helper Components
function KPICard({ title, value, change, trend }: {
    title: string;
    value: string;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
}) {
    return (
        <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change !== undefined && (
                <p className={cn(
                    "text-sm mt-1",
                    trend === 'up' ? "text-green-600" : trend === 'down' ? "text-red-600" : "text-gray-500"
                )}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(change).toFixed(1)}%
                </p>
            )}
        </div>
    );
}

function ChartCard({ title, subtitle, children, className }: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("border border-gray-200 rounded-lg p-4", className)}>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
            {children}
        </div>
    );
}
