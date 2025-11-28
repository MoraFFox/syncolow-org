"use client";

import { useDrillDownStore } from '@/store/use-drilldown-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ComparePanel() {
  const { compareMode, compareItems, removeFromCompare, clearCompare, toggleCompareMode } = useDrillDownStore();

  if (!compareMode || compareItems.length === 0) return null;

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Arabic translations
      const translations = {
        comparisonReport: 'تقرير المقارنة',
        exportDate: 'تاريخ التصدير',
        type: 'النوع',
        itemCount: 'عدد العناصر',
        index: '#',
        itemType: 'النوع',
        id: 'المعرف',
        status: 'الحالة',
        amount: 'المبلغ',
        total: 'الإجمالي',
        date: 'التاريخ',
        deliveryDate: 'تاريخ التسليم',
        paymentStatus: 'حالة الدفع',
        order: 'طلب',
        product: 'منتج',
        company: 'شركة',
        customer: 'عميل',
        name: 'الاسم',
        price: 'السعر',
        stock: 'المخزون',
        value: 'القيمة',
      };

      const typeMap: Record<string, string> = {
        order: translations.order,
        product: translations.product,
        company: translations.company,
        customer: translations.customer,
      };

      // Prepare header row based on item type
      const firstItem = compareItems[0];
      const headers = [translations.index, translations.itemType];
      
      // Add dynamic columns based on payload keys
      if (firstItem) {
        const samplePayload = firstItem.payload as any;
        if (samplePayload.id) headers.push(translations.id);
        if (samplePayload.name) headers.push(translations.name);
        if (samplePayload.status) headers.push(translations.status);
        if (samplePayload.total !== undefined) headers.push(translations.total);
        if (samplePayload.amount !== undefined) headers.push(translations.amount);
        if (samplePayload.price !== undefined) headers.push(translations.price);
        if (samplePayload.stock !== undefined) headers.push(translations.stock);
        if (samplePayload.deliveryDate) headers.push(translations.deliveryDate);
        if (samplePayload.paymentStatus) headers.push(translations.paymentStatus);
        if (samplePayload.value) headers.push(translations.value);
      }

      // Prepare data rows with formatting
      const { formatDate } = await import('@/lib/utils');
      
      const dataRows = compareItems.map((item, idx) => {
        const payload = item.payload as any;
        const row: any[] = [
          idx + 1,
          typeMap[item.kind] || item.kind,
        ];

        if (payload.id) {
          // Truncate long IDs
          const id = payload.id.length > 20 ? payload.id.substring(0, 20) + '...' : payload.id;
          row.push(id);
        }
        if (payload.name) row.push(payload.name);
        if (payload.status) row.push(payload.status);
        if (payload.total !== undefined) row.push(payload.total);
        if (payload.amount !== undefined) row.push(payload.amount);
        if (payload.price !== undefined) row.push(payload.price);
        if (payload.stock !== undefined) row.push(payload.stock);
        if (payload.deliveryDate) {
          row.push(formatDate(payload.deliveryDate));
        }
        if (payload.paymentStatus) row.push(payload.paymentStatus);
        if (payload.value) row.push(payload.value);

        return row;
      });

      // Combine data - Title, Summary, Empty Row, Headers, Data
      const titleRow = [translations.comparisonReport];
      const dateRow = [`${translations.exportDate}: ${new Date().toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' })}`];
      const typeRow = [`${translations.type}: ${typeMap[compareItems[0]?.kind] || compareItems[0]?.kind || 'متنوع'}`];
      const countRow = [`${translations.itemCount}: ${compareItems.length}`];
      
      const worksheetData = [
        titleRow,
        dateRow,
        typeRow,
        countRow,
        [], // Empty row
        headers,
        ...dataRows
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Auto-size columns based on content
      const maxColumnWidths = headers.map((header, colIndex) => {
        const headerLength = String(header).length;
        const dataLengths = dataRows.map(row => String(row[colIndex] || '').length);
        return Math.min(Math.max(headerLength, ...dataLengths) + 2, 30); // Max 30 chars
      });

      worksheet['!cols'] = maxColumnWidths.map(wch => ({ wch }));

      // Merge title cells
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, // Title row
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }, // Date row
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }, // Type row
        { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } }, // Count row
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'المقارنة');

      // Download file
      const timestamp = new Date().toISOString().split('T')[0];
      const itemType = typeMap[compareItems[0]?.kind] || 'مقارنة';
      XLSX.writeFile(workbook, `${itemType}-${timestamp}.xlsx`);
    } catch (error) {
      console.error('Failed to export comparison:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Compare ({compareItems.length}/4)</CardTitle>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleExport}>
              <Download className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={toggleCompareMode}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {compareItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{item.kind}</Badge>
                <span className="text-sm">{(item.payload as any).id || (item.payload as any).value}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCompare(idx)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {compareItems.length > 1 && (
            <Button className="w-full" size="sm" onClick={clearCompare}>
              Clear All
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
