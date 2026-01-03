'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText, Table as TableIcon } from "lucide-react";
import { generateAnalyticsPDF } from "@/lib/generate-analytics-pdf";
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

interface ExportButtonProps {
    targetId?: string; // ID of the container to capture for PDF
    title?: string;
    className?: string;
    data?: any[]; // Data to export for CSV
    filename?: string;
}

export function ExportButton({ targetId, title, className, data, filename = 'analytics-report' }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handlePdfExport = async () => {
        setIsExporting(true);
        // Slight delay to allow UI to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        await generateAnalyticsPDF({
            filename: `${filename}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
            title,
            elementId: targetId
        });

        setIsExporting(false);
    };

    const handleCsvExport = () => {
        if (!data || data.length === 0) return;

        setIsExporting(true);

        try {
            // Flatten data if needed, basic implementation for now
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const cell = row[header];
                    // Escape quotes and wrap in quotes
                    return `"${String(cell ?? '').replace(/"/g, '""')}"`;
                }).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("CSV Export Failed", error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                    className={cn(
                        "border-zinc-800 bg-black/40 text-zinc-300 hover:text-white hover:bg-zinc-900 backdrop-blur-sm",
                        className
                    )}
                >
                    {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-500" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <DropdownMenuItem onClick={handlePdfExport} className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800">
                    <FileText className="mr-2 h-4 w-4 text-emerald-500" />
                    <span>Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleCsvExport}
                    disabled={!data || data.length === 0}
                    className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 disabled:opacity-50"
                >
                    <TableIcon className="mr-2 h-4 w-4 text-blue-500" />
                    <span>Export as CSV</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
