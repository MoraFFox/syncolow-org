'use client';

import { format } from 'date-fns';
import type { AnalyticsResponse, TopProduct, TopCategory, AreaPerformance, CustomerSegment } from '@/app/actions/analytics/types';

/**
 * Defines an exportable metric with its data extraction logic
 */
export interface ExportableMetric {
    id: string;
    name: string;
    category: 'kpi' | 'financial' | 'operational' | 'intelligence' | 'segments';
    icon?: string;
    getRows: (data: AnalyticsResponse) => ExportRow[];
    getHeaders: () => string[];
}

export interface ExportRow {
    [key: string]: string | number | undefined;
}

export interface ExportOptions {
    format: 'excel' | 'pdf';
    metrics: string[];
    dateRange?: { from: Date; to: Date };
    filename?: string;
}

/**
 * All available metrics for export
 */
export const EXPORTABLE_METRICS: ExportableMetric[] = [
    // KPIs
    {
        id: 'revenue',
        name: 'Revenue',
        category: 'kpi',
        getHeaders: () => ['Metric', 'Current Value', 'Previous Value', 'Change %', 'Trend'],
        getRows: (data) => [{
            Metric: 'Total Revenue',
            'Current Value': data.summary?.revenue.value ?? 0,
            'Previous Value': data.summary?.revenue.previousValue ?? 0,
            'Change %': data.summary?.revenue.change ?? 0,
            Trend: data.summary?.revenue.trend ?? 'neutral'
        }]
    },
    {
        id: 'orders',
        name: 'Orders',
        category: 'kpi',
        getHeaders: () => ['Metric', 'Current Value', 'Previous Value', 'Change %', 'Trend'],
        getRows: (data) => [{
            Metric: 'Total Orders',
            'Current Value': data.summary?.orders.value ?? 0,
            'Previous Value': data.summary?.orders.previousValue ?? 0,
            'Change %': data.summary?.orders.change ?? 0,
            Trend: data.summary?.orders.trend ?? 'neutral'
        }]
    },
    {
        id: 'aov',
        name: 'Average Order Value',
        category: 'kpi',
        getHeaders: () => ['Metric', 'Current Value', 'Previous Value', 'Change %', 'Trend'],
        getRows: (data) => [{
            Metric: 'AOV',
            'Current Value': data.summary?.aov.value ?? 0,
            'Previous Value': data.summary?.aov.previousValue ?? 0,
            'Change %': data.summary?.aov.change ?? 0,
            Trend: data.summary?.aov.trend ?? 'neutral'
        }]
    },
    {
        id: 'newClients',
        name: 'New Clients',
        category: 'kpi',
        getHeaders: () => ['Metric', 'Current Value', 'Change %', 'Trend'],
        getRows: (data) => [{
            Metric: 'New Clients',
            'Current Value': data.summary?.newClients?.value ?? 0,
            'Change %': data.summary?.newClients?.change ?? 0,
            Trend: data.summary?.newClients?.trend ?? 'neutral'
        }]
    },
    // Financial
    {
        id: 'debtAging',
        name: 'Debt Aging',
        category: 'financial',
        getHeaders: () => ['Category', 'Amount', 'Percentage'],
        getRows: (data) => {
            const debt = data.summary?.debtAging;
            if (!debt) return [];
            const total = debt.total || 1;
            return [
                { Category: 'Current (0-30 days)', Amount: debt.current, Percentage: ((debt.current / total) * 100).toFixed(1) },
                { Category: 'Overdue 31-60 days', Amount: debt.overdue30, Percentage: ((debt.overdue30 / total) * 100).toFixed(1) },
                { Category: 'Overdue 61-90 days', Amount: debt.overdue60, Percentage: ((debt.overdue60 / total) * 100).toFixed(1) },
                { Category: 'Overdue 90+ days', Amount: debt.overdue90, Percentage: ((debt.overdue90 / total) * 100).toFixed(1) },
                { Category: 'Total', Amount: debt.total, Percentage: '100' },
                { Category: 'Days Sales Outstanding', Amount: debt.dso, Percentage: '-' },
                { Category: 'Risk Score', Amount: debt.riskScore, Percentage: '-' }
            ];
        }
    },
    // Operational
    {
        id: 'operational',
        name: 'Operational Metrics',
        category: 'operational',
        getHeaders: () => ['Metric', 'Value', 'Change %', 'Trend'],
        getRows: (data) => {
            const ops = data.summary?.operational;
            if (!ops) return [];
            return [
                { Metric: 'Friction Rate', Value: ops.frictionRate?.value ?? 0, 'Change %': ops.frictionRate?.change ?? 0, Trend: ops.frictionRate?.trend ?? 'neutral' },
                { Metric: 'OTIF Rate', Value: ops.otifRate?.value ?? 0, 'Change %': ops.otifRate?.change ?? 0, Trend: ops.otifRate?.trend ?? 'neutral' },
                { Metric: 'Late Deliveries', Value: ops.lateDeliveries?.value ?? 0, 'Change %': ops.lateDeliveries?.change ?? 0, Trend: ops.lateDeliveries?.trend ?? 'neutral' }
            ];
        }
    },
    // Intelligence
    {
        id: 'topProducts',
        name: 'Top Products',
        category: 'intelligence',
        getHeaders: () => ['Rank', 'Product Name', 'Revenue', 'Quantity', '% of Total', 'Cumulative %'],
        getRows: (data) => (data.topProducts ?? []).map((p: TopProduct, i: number) => ({
            Rank: i + 1,
            'Product Name': p.name,
            Revenue: p.revenue,
            Quantity: p.quantity,
            '% of Total': p.percentageOfTotal.toFixed(1),
            'Cumulative %': p.cumulativePercentage.toFixed(1)
        }))
    },
    {
        id: 'topCategories',
        name: 'Top Categories',
        category: 'intelligence',
        getHeaders: () => ['Category', 'Revenue', 'Previous Revenue', 'Growth %', 'Trend'],
        getRows: (data) => (data.topCategories ?? []).map((c: TopCategory) => ({
            Category: c.name,
            Revenue: c.revenue,
            'Previous Revenue': c.previousRevenue,
            'Growth %': c.growthPercent.toFixed(1),
            Trend: c.trend
        }))
    },
    {
        id: 'topAreas',
        name: 'Top Areas',
        category: 'intelligence',
        getHeaders: () => ['Area', 'Revenue', 'Previous Revenue', 'Growth %', 'Status', 'Clients', 'Orders'],
        getRows: (data) => (data.topAreas ?? []).map((a: AreaPerformance) => ({
            Area: a.name,
            Revenue: a.revenue,
            'Previous Revenue': a.previousRevenue,
            'Growth %': a.growthPercent.toFixed(1),
            Status: a.status,
            Clients: a.clientCount,
            Orders: a.orderCount
        }))
    },
    // Segments
    {
        id: 'customerSegments',
        name: 'Customer Segments',
        category: 'segments',
        getHeaders: () => ['Segment', 'Count', 'Total Value', 'Percentage'],
        getRows: (data) => (data.summary?.customerSegments ?? []).map((s: CustomerSegment) => ({
            Segment: s.label,
            Count: s.count,
            'Total Value': s.totalValue,
            Percentage: s.percentage.toFixed(1)
        }))
    },
    {
        id: 'timeSeries',
        name: 'Time Series Data',
        category: 'intelligence',
        getHeaders: () => ['Date', 'Label', 'Revenue', 'Orders', 'AOV'],
        getRows: (data) => (data.timeSeries ?? []).map(t => ({
            Date: t.date,
            Label: t.label,
            Revenue: t.revenue,
            Orders: t.orders,
            AOV: t.aov
        }))
    }
];

/**
 * Get metrics by category
 */
export function getMetricsByCategory() {
    const categories = {
        kpi: { label: 'Key Performance Indicators', metrics: [] as ExportableMetric[] },
        financial: { label: 'Financial Metrics', metrics: [] as ExportableMetric[] },
        operational: { label: 'Operational Metrics', metrics: [] as ExportableMetric[] },
        intelligence: { label: 'Business Intelligence', metrics: [] as ExportableMetric[] },
        segments: { label: 'Customer Segments', metrics: [] as ExportableMetric[] }
    };

    EXPORTABLE_METRICS.forEach(m => {
        categories[m.category].metrics.push(m);
    });

    return categories;
}

/**
 * Export selected metrics to Excel
 */
export async function exportToExcel(data: AnalyticsResponse, options: ExportOptions): Promise<void> {
    const XLSX = await import('xlsx') as any;
    const workbook = XLSX.utils.book_new();

    const selectedMetrics = EXPORTABLE_METRICS.filter(m => options.metrics.includes(m.id));

    selectedMetrics.forEach(metric => {
        const rows = metric.getRows(data);
        if (rows.length === 0) return;

        const worksheet = XLSX.utils.json_to_sheet(rows, {
            header: metric.getHeaders()
        });

        // Auto-fit column widths
        const colWidths = metric.getHeaders().map(h => ({ wch: Math.max(h.length, 15) }));
        worksheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, metric.name.substring(0, 31));
    });

    const filename = options.filename || `analytics-export-${format(new Date(), 'yyyy-MM-dd')}`;
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export selected metrics to PDF (uses html2canvas approach)
 */
export async function exportToPDF(data: AnalyticsResponse, options: ExportOptions): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const selectedMetrics = EXPORTABLE_METRICS.filter(m => options.metrics.includes(m.id));
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 15;
    let yPos = margin;

    // Title
    pdf.setFillColor(5, 5, 5);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.setTextColor(16, 185, 129); // Emerald
    pdf.setFontSize(20);
    pdf.text('Analytics Export Report', margin, yPos);
    yPos += 10;

    pdf.setTextColor(150);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${format(new Date(), 'PPP p')}`, margin, yPos);
    if (options.dateRange) {
        pdf.text(`Period: ${format(options.dateRange.from, 'PP')} - ${format(options.dateRange.to, 'PP')}`, margin + 80, yPos);
    }
    yPos += 15;

    // Metrics
    selectedMetrics.forEach((metric, _index) => {
        if (yPos > pageHeight - 40) {
            pdf.addPage();
            pdf.setFillColor(5, 5, 5);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            yPos = margin;
        }

        const rows = metric.getRows(data);
        if (rows.length === 0) return;

        // Section Header
        pdf.setTextColor(255);
        pdf.setFontSize(14);
        pdf.text(metric.name, margin, yPos);
        yPos += 8;

        // Table Header
        const headers = metric.getHeaders();
        const colWidth = (pageWidth - 2 * margin) / headers.length;

        pdf.setFillColor(30, 30, 30);
        pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
        pdf.setTextColor(16, 185, 129);
        pdf.setFontSize(9);
        headers.forEach((h, i) => {
            pdf.text(h, margin + i * colWidth + 2, yPos);
        });
        yPos += 8;

        // Table Rows
        pdf.setTextColor(200);
        rows.slice(0, 10).forEach(row => {
            if (yPos > pageHeight - 20) {
                pdf.addPage();
                pdf.setFillColor(5, 5, 5);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                yPos = margin;
            }

            headers.forEach((h, i) => {
                const value = row[h];
                const text = typeof value === 'number' ? value.toLocaleString() : String(value ?? '-');
                pdf.text(text.substring(0, 20), margin + i * colWidth + 2, yPos);
            });
            yPos += 6;
        });

        yPos += 10;
    });

    const filename = options.filename || `analytics-export-${format(new Date(), 'yyyy-MM-dd')}`;
    pdf.save(`${filename}.pdf`);
}
