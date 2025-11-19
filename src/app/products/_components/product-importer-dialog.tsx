
"use client";

import { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useOrderStore } from '@/store/use-order-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileUp as FileUpIcon,
  Loader2,
  CheckCircle2 as CheckCircle,
  Table,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { importProductsFlow } from '@/ai/flows/import-products-flow';
import type { Product } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CsvRow = Record<string, string>;

type ImportStage =
  | 'upload'
  | 'mapping'
  | 'importing'
  | 'complete';
  
const PRODUCT_FIELDS: (keyof Product | 'manufacturerName')[] = [
  'name', 'description', 'price', 'stock', 'sku', 'category', 'manufacturerName'
];

// Mapping from canonical field to common header names
const HEADER_MAPPING_HINTS: Record<string, string[]> = {
    name: ['name', 'product name', 'title', 'code'],
    description: ['description', 'desc', 'details', 'packing'],
    price: ['price', 'cost', 'price/unit'],
    stock: ['stock', 'quantity', 'qty', 'inventory'],
    sku: ['sku', 'product code'],
    category: ['category', 'type'],
    manufacturerName: ['manufacturer', 'brand'],
};

export function ProductImporterDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { fetchInitialData } = useOrderStore();
  const [stage, setStage] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string | undefined>>({});
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetState = useCallback(() => {
    setStage('upload');
    setFile(null);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setImportResult(null);
    setIsLoading(false);
    const input = document.getElementById('product-importer-file-input') as HTMLInputElement;
    if (input) input.value = '';
  }, []);

  useEffect(() => {
    if (headers.length > 0) {
        const initialMapping: Record<string, string> = {};
        PRODUCT_FIELDS.forEach(field => {
            const hints = HEADER_MAPPING_HINTS[field as string] || [field as string];
            const foundHeader = headers.find(h => hints.some(hint => h.toLowerCase().includes(hint.toLowerCase())));
            if(foundHeader) {
                initialMapping[field as string] = foundHeader;
            }
        });
        setColumnMapping(initialMapping);
    }
  }, [headers]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
    }
  };

  const handleParseFile = useCallback(() => {
    if (!file) return;
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target?.result;
        let workbook;
        if(file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const buffer = e.target?.result as ArrayBuffer;
            workbook = XLSX.read(buffer, { type: 'array' });
        }

        if (workbook) {
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
            
            if (json.length > 0) {
                const parsedHeaders = json[0].map((h: any) => String(h)).filter((h: string) => h.trim() !== ''); // Filter out empty headers
                const parsedRows = json.slice(1).map((rowArray: any[]) => {
                    const row: CsvRow = {};
                    parsedHeaders.forEach((header: string, index: number) => {
                        row[header] = String(rowArray[index] || '');
                    });
                    return row;
                });
                
                setHeaders(parsedHeaders);
                setRows(parsedRows);
                setStage('mapping');
            } else {
                toast({ title: 'Empty file', variant: 'destructive' });
            }
        } else { // Fallback to CSV
             Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setHeaders((results.meta.fields || []).filter(h => h.trim() !== '')); // Filter out empty headers
                    setRows(results.data as CsvRow[]);
                    setStage('mapping');
                },
                error: () => toast({ title: 'CSV Parsing Error', variant: 'destructive'})
            });
        }
        setIsLoading(false);
    };
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
  }, [file]);

  const handleImport = useCallback(async () => {
    if (!columnMapping.name) {
        toast({ title: 'Name field must be mapped', variant: 'destructive' });
        return;
    }
    setIsLoading(true);
    setStage('importing');

    const mappedData = rows.map(row => {
        const product: {
            name?: string;
            description?: string;
            price?: string | number;
            stock?: string | number;
            sku?: string;
            category?: string;
            manufacturerName?: string;
        } = {};
        for (const key in columnMapping) {
            if (columnMapping[key]) {
                let rawValue: string | undefined = row[columnMapping[key]];
                
                if (rawValue === null || rawValue === '') {
                    rawValue = undefined;
                }
                
                if (key === 'price' && typeof rawValue === 'string') {
                    const numericValue = parseFloat(rawValue.replace(',', '.'));
                    product[key] = isNaN(numericValue) ? undefined : numericValue;
                } else if (key === 'stock' && typeof rawValue === 'string') {
                    const numericValue = parseInt(rawValue, 10);
                    product[key] = isNaN(numericValue) ? undefined : numericValue;
                } else if (key === 'sku' && rawValue === null) {
                    product[key] = undefined;
                } else {
                    if (rawValue !== undefined) {
                        (product as any)[key] = rawValue;
                    }
                }
            }
        }
        return product;
    }).filter(product => product.name && product.name.trim() !== '');

    const result = await importProductsFlow({ products: mappedData });
    setImportResult(result);
    setStage('complete');
    await fetchInitialData();
    setIsLoading(false);

  }, [rows, columnMapping, fetchInitialData]);

  const handleDialogChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };
  
  const renderUploadStage = () => (
    <div className="space-y-4">
        <label htmlFor="product-importer-file-input" className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
            <FileUpIcon className="h-10 w-10 text-muted-foreground" />
            <span className="mt-2 text-sm text-muted-foreground">{fileName || 'Click to select or drop a CSV/Excel file'}</span>
        </label>
        <Input id="product-importer-file-input" type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} className="hidden" />
        <DialogFooter>
            <Button onClick={handleParseFile} disabled={!file || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Next
            </Button>
        </DialogFooter>
    </div>
  );
  
  const renderMappingStage = () => (
    <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Map the columns from your file to the product fields.</p>
        <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
            {PRODUCT_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-4 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                      {field === 'name' && <span className="text-destructive">*</span>}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                     <Select value={columnMapping[field as string] || undefined} onValueChange={(value) => setColumnMapping(prev => ({...prev, [field]: value || undefined} satisfies Record<string, string | undefined>))}>
                        <SelectTrigger className="w-60">
                            <SelectValue placeholder="Select file column..." />
                        </SelectTrigger>
                        <SelectContent>
                            {headers.map(header => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ))}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setStage('upload')}>Back</Button>
            <Button onClick={handleImport} disabled={!columnMapping.name || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Import
            </Button>
        </DialogFooter>
    </div>
  );

  const renderCompleteStage = () => (
    <div className="space-y-4 text-center p-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-xl font-semibold">Import Complete</h3>
        <p>{importResult?.successCount} products imported successfully.</p>
        {importResult && importResult.errorCount > 0 && (
            <Alert variant="destructive">
                <Sparkles className="h-4 w-4" />
                <AlertTitle>{importResult.errorCount} Errors</AlertTitle>
                <AlertDescription className="text-xs max-h-40 overflow-y-auto">
                    <ul>
                    {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        )}
        <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Finish</Button>
        </DialogFooter>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Import Products</DialogTitle>
                <DialogDescription>
                    {stage === 'upload' && 'Upload a CSV or Excel file to import products.'}
                    {stage === 'mapping' && 'Map your file columns to product fields.'}
                    {stage === 'importing' && 'Please wait while we import your products.'}
                    {stage === 'complete' && 'Your import is complete.'}
                </DialogDescription>
            </DialogHeader>

            {stage === 'upload' && renderUploadStage()}
            {stage === 'mapping' && renderMappingStage()}
            {stage === 'importing' && <div className="flex justify-center p-12"><Loader2 className="h-12 w-12 animate-spin"/></div>}
            {stage === 'complete' && renderCompleteStage()}

        </DialogContent>
    </Dialog>
  );
}
