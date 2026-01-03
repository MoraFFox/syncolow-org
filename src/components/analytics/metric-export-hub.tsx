'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    X,
    FileSpreadsheet,
    FileText,
    Check,
    Loader2,
    ChevronDown,
    ChevronRight,
    Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    EXPORTABLE_METRICS,
    getMetricsByCategory,
    exportToExcel,
    exportToPDF,
    type ExportOptions
} from '@/lib/metric-export-service';
import type { AnalyticsResponse } from '@/app/actions/analytics/types';
import { VisualExportDialog } from './visual-export-dialog';
import { BarChart3 } from 'lucide-react';

interface MetricExportHubProps {
    data: AnalyticsResponse | null;
    dateRange?: { from: Date; to: Date };
    className?: string;
}

export function MetricExportHub({ data, dateRange, className }: MetricExportHubProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
    const [isExporting, setIsExporting] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['kpi']);
    const [showVisualExport, setShowVisualExport] = useState(false);

    const categories = getMetricsByCategory();

    const toggleMetric = (id: string) => {
        setSelectedMetrics(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedMetrics(EXPORTABLE_METRICS.map(m => m.id));
    };

    const clearAll = () => {
        setSelectedMetrics([]);
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const selectCategory = (category: string) => {
        const categoryMetrics = categories[category as keyof typeof categories].metrics.map(m => m.id);
        const allSelected = categoryMetrics.every(id => selectedMetrics.includes(id));

        if (allSelected) {
            setSelectedMetrics(prev => prev.filter(id => !categoryMetrics.includes(id)));
        } else {
            setSelectedMetrics(prev => [...new Set([...prev, ...categoryMetrics])]);
        }
    };

    const handleExport = async () => {
        if (!data || selectedMetrics.length === 0) return;

        setIsExporting(true);
        try {
            const options: ExportOptions = {
                format,
                metrics: selectedMetrics,
                dateRange,
                filename: `synergyflow-analytics-${format}`
            };

            if (format === 'excel') {
                await exportToExcel(data, options);
            } else {
                await exportToPDF(data, options);
            }

            // Success feedback
            setIsOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full",
                    "bg-gradient-to-br from-emerald-500 to-emerald-700",
                    "shadow-lg shadow-emerald-500/30",
                    "flex items-center justify-center",
                    "hover:scale-110 transition-transform duration-200",
                    "border border-emerald-400/30",
                    className
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <Download className="h-6 w-6 text-white" />
            </motion.button>

            {/* Export Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                            <Package className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Export Hub</h2>
                                            <p className="text-xs text-zinc-500 font-mono">SELECT METRICS TO EXPORT</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsOpen(false)}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={selectAll}
                                        className="text-xs border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800"
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearAll}
                                        className="text-xs border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800"
                                    >
                                        Clear All
                                    </Button>
                                    <div className="flex-1" />
                                    <span className="text-xs text-zinc-500 self-center font-mono">
                                        {selectedMetrics.length}/{EXPORTABLE_METRICS.length} selected
                                    </span>
                                </div>
                            </div>

                            {/* Metrics List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {Object.entries(categories).map(([key, category]) => (
                                    <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                                        {/* Category Header */}
                                        <div className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors">
                                            <button
                                                onClick={() => toggleCategory(key)}
                                                className="flex items-center gap-3 flex-1"
                                            >
                                                {expandedCategories.includes(key) ? (
                                                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                                                )}
                                                <span className="text-sm font-medium text-zinc-200">{category.label}</span>
                                                <span className="text-xs text-zinc-600 font-mono">
                                                    ({category.metrics.length})
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => selectCategory(key)}
                                                className="text-xs text-emerald-500 hover:text-emerald-400 h-6 px-2"
                                            >
                                                {category.metrics.every(m => selectedMetrics.includes(m.id)) ? 'Deselect' : 'Select'} All
                                            </button>
                                        </div>

                                        {/* Metrics */}
                                        <AnimatePresence>
                                            {expandedCategories.includes(key) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-zinc-800/50"
                                                >
                                                    {category.metrics.map(metric => (
                                                        <label
                                                            key={metric.id}
                                                            className="flex items-center gap-3 p-3 pl-10 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                                                        >
                                                            <Checkbox
                                                                checked={selectedMetrics.includes(metric.id)}
                                                                onCheckedChange={() => toggleMetric(metric.id)}
                                                                className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                            />
                                                            <span className="text-sm text-zinc-300">{metric.name}</span>
                                                        </label>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>

                            {/* Footer - Format & Export */}
                            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 space-y-4">
                                {/* Visual PDF Banner */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowVisualExport(true);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                                >
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                    <div className="text-left flex-1">
                                        <span className="text-sm font-medium text-purple-300">Visual PDF Export</span>
                                        <p className="text-xs text-purple-400/70">Export with charts & visualizations</p>
                                    </div>
                                    <Download className="h-4 w-4 text-purple-400" />
                                </button>

                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <div className="h-px flex-1 bg-zinc-800" />
                                    <span>or export data only</span>
                                    <div className="h-px flex-1 bg-zinc-800" />
                                </div>

                                {/* Format Selection */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFormat('excel')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                                            format === 'excel'
                                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                                : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                                        )}
                                    >
                                        <FileSpreadsheet className="h-5 w-5" />
                                        <span className="font-medium">Excel</span>
                                        {format === 'excel' && <Check className="h-4 w-4 ml-auto" />}
                                    </button>
                                    <button
                                        onClick={() => setFormat('pdf')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                                            format === 'pdf'
                                                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                                : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                                        )}
                                    >
                                        <FileText className="h-5 w-5" />
                                        <span className="font-medium">PDF</span>
                                        {format === 'pdf' && <Check className="h-4 w-4 ml-auto" />}
                                    </button>
                                </div>

                                {/* Export Button */}
                                <Button
                                    onClick={handleExport}
                                    disabled={selectedMetrics.length === 0 || isExporting || !data}
                                    className={cn(
                                        "w-full h-12 font-bold text-base",
                                        format === 'excel'
                                            ? "bg-emerald-600 hover:bg-emerald-700"
                                            : "bg-blue-600 hover:bg-blue-700"
                                    )}
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="mr-2 h-5 w-5" />
                                            Export {selectedMetrics.length} Metric{selectedMetrics.length !== 1 ? 's' : ''}
                                        </>
                                    )}
                                </Button>

                                {!data && (
                                    <p className="text-xs text-amber-500 text-center">
                                        ⚠️ No analytics data available. Please wait for data to load.
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Visual Export Dialog */}
            <VisualExportDialog
                data={data}
                dateRange={dateRange}
                isOpen={showVisualExport}
                onClose={() => setShowVisualExport(false)}
            />
        </>
    );
}
