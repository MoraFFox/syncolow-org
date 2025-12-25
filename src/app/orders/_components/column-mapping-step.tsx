
"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CsvRow } from '@/lib/types';
import { X, RotateCcw, Eye, AlertCircle, CheckCircle2, MinusCircle, Database, Save } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ColumnMappingStepProps {
  originalData: CsvRow[];
  onMappingComplete: (mappedData: CsvRow[]) => void;
  onBack: () => void;
}

interface MappingCardProps {
  field: { key: string; label: string; description?: string };
  mappings: Record<string, string>;
  availableColumns: string[];
  onMap: (val: string) => void;
  isRequired: boolean;
  children?: React.ReactNode;
}

import { REQUIRED_IMPORT_FIELDS as REQUIRED_FIELDS, OPTIONAL_IMPORT_FIELDS as OPTIONAL_FIELDS, HEADER_SYNONYMS } from '@/lib/import-schema';

const MAPPING_STORAGE_KEY = 'orderImportMapping';

const ColumnMappingStep = ({
  originalData,
  onMappingComplete,
  onBack,
}: ColumnMappingStepProps) => {
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isMappingValid, setIsMappingValid] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  useEffect(() => {
    if (originalData.length > 0) {
      const columns = Object.keys(originalData[0]);
      setAvailableColumns(columns);

      const savedMapping = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (savedMapping) {
        try {
          const parsed = JSON.parse(savedMapping);
          const validMapping: Record<string, string> = {};
          const usedCols = new Set<string>();

          Object.entries(parsed).forEach(([key, value]) => {
            if (typeof value === 'string' && columns.includes(value)) {
              validMapping[key] = value;
              usedCols.add(value);
            }
          });

          if (Object.keys(validMapping).length > 0) {
            setMappings(validMapping);
            toast({ title: 'Mapping Loaded', description: 'Previously saved column mapping has been applied.' });
            return;
          }
        } catch (e) {
          console.error('Failed to load saved mapping:', e);
        }
      }

      const autoMappings: Record<string, string> = {};
      const usedColumns = new Set<string>();

      const tryMapField = (field: { key: string, label: string }) => {
        if (autoMappings[field.key]) return; // Already mapped

        // 1. Try Exact Match or Synonym Match from Schema
        const synonyms = HEADER_SYNONYMS[field.key] || [];
        // Add exact key and label as quasi-synonyms
        const allVariations = [
          field.key.toLowerCase(),
          field.label.toLowerCase(),
          ...synonyms.map(s => s.toLowerCase())
        ];

        let match = columns.find(col => {
          if (usedColumns.has(col)) return false;
          const lowerCol = col.toLowerCase();
          // Exact match on column name vs variations
          return allVariations.includes(lowerCol);
        });

        // 2. Fuzzy Match if no exact match
        if (!match) {
          match = columns.find(col => {
            if (usedColumns.has(col)) return false;
            const lowerCol = col.toLowerCase().replace(/[_\s-]/g, '');
            const lowerKey = field.key.toLowerCase().replace(/[_\s-]/g, '');
            const lowerLabel = field.label.toLowerCase().replace(/[_\s-]/g, '');

            // Be stricter: Column must equal Key/Label or contain them clearly
            return lowerCol === lowerKey ||
              lowerCol === lowerLabel ||
              (synonyms.some(s => lowerCol === s.replace(/[_\s-]/g, '')));
          });
        }

        // 3. Super Fuzzy Match (Fallback - dangerous but helpful)
        if (!match) {
          match = columns.find(col => {
            if (usedColumns.has(col)) return false;
            const lowerCol = col.toLowerCase().replace(/[_\s-]/g, '');
            const lowerKey = field.key.toLowerCase().replace(/[_\s-]/g, '');
            const lowerLabel = field.label.toLowerCase().replace(/[_\s-]/g, '');

            return lowerCol.includes(lowerKey) || lowerCol.includes(lowerLabel) || lowerKey.includes(lowerCol);
          });
        }

        if (match) {
          autoMappings[field.key] = match;
          usedColumns.add(match);
        }
      };

      REQUIRED_FIELDS.forEach(tryMapField);
      OPTIONAL_FIELDS.forEach(tryMapField);

      setMappings(autoMappings);
    }
  }, [originalData]);

  useEffect(() => {
    const requiredFieldsMapped = REQUIRED_FIELDS.every(field =>
      mappings[field.key] && mappings[field.key] !== ''
    );

    setIsMappingValid(requiredFieldsMapped);
  }, [mappings]);

  useEffect(() => {
    if (originalData.length > 0 && Object.keys(mappings).length > 0) {
      const preview = originalData.slice(0, 5).map(row => {
        const newRow: CsvRow = {};
        Object.entries(mappings).forEach(([mappedKey, actualColumn]) => {
          if (actualColumn && actualColumn !== '') {
            newRow[mappedKey] = row[actualColumn] || '';
          }
        });
        return newRow;
      });
      setPreviewData(preview);
    }
  }, [mappings, originalData]);

  const handleConfirm = () => {
    const transformedData = originalData.map(row => {
      const newRow: CsvRow = {};
      Object.entries(mappings).forEach(([mappedKey, actualColumn]) => {
        if (actualColumn && actualColumn !== '') {
          const val = row[actualColumn];
          if (val && typeof val === 'string' && val.trim() !== '') {
            newRow[mappedKey] = val.trim();
          } else if (val) {
            newRow[mappedKey] = val;
          }
        }
      });
      if (mappings['discount'] && Object.keys(newRow).length > 0) {
        newRow['discountType'] = discountType;
      }
      return newRow;
    }).filter(r => Object.keys(r).filter(k => k !== 'discountType').length > 0);

    // Verify save mapping on confirm as well
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mappings));
    onMappingComplete(transformedData);
  };

  const handleSaveMapping = () => {
    try {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mappings));
      toast({
        title: 'Mapping Saved',
        description: 'Your column mapping configuration has been saved for future imports.',
        className: "bg-emerald-950 border-emerald-800 text-emerald-100"
      });
    } catch (e) {
      console.error('Failed to save mapping', e);
      toast({
        title: 'Save Failed',
        description: 'Could not save mapping configuration.',
        variant: 'destructive'
      });
    }
  };

  const mappedCount = Object.keys(mappings).length;
  const totalFields = REQUIRED_FIELDS.length + OPTIONAL_FIELDS.length;

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Top Stats Bar - Holographic Panel */}
      <div className="flex items-center justify-between bg-zinc-950/40 p-5 rounded-2xl border border-white/5 backdrop-blur-md shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="flex items-center gap-8 relative z-10">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Status // Progress</span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-light tracking-tighter text-white tabular-nums">{String(mappedCount).padStart(2, '0')}</span>
              <span className="text-xs text-zinc-500 font-mono">OF {String(totalFields).padStart(2, '0')} FIELDS</span>
            </div>
          </div>

          <div className="h-10 w-px bg-white/5" />

          <div className="flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-mono">Required</span>
              <span className={cn("text-lg font-light tracking-tight tabular-nums", isMappingValid ? "text-emerald-400" : "text-amber-400")}>
                {String(REQUIRED_FIELDS.filter(f => mappings[f.key]).length).padStart(2, '0')} <span className="text-zinc-600 text-xs">/ {String(REQUIRED_FIELDS.length).padStart(2, '0')}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">Optional</span>
              <span className="text-lg font-light tracking-tight text-zinc-400 tabular-nums">
                {String(OPTIONAL_FIELDS.filter(f => mappings[f.key]).length).padStart(2, '0')} <span className="text-zinc-600 text-xs">/ {String(OPTIONAL_FIELDS.length).padStart(2, '0')}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 relative z-10">
          <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-white hover:bg-white/5 uppercase tracking-widest text-xs font-mono">
            Back
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveMapping}
            disabled={Object.keys(mappings).length === 0}
            className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 uppercase tracking-widest text-xs font-mono transition-all"
          >
            <Save className="mr-2 h-3 w-3" />
            Save Preset
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isMappingValid}
            className={cn(
              "uppercase tracking-widest text-xs font-mono transition-all duration-300 shadow-lg border",
              isMappingValid
                ? "bg-emerald-500 hover:bg-emerald-400 text-black border-transparent shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105"
                : "bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed"
            )}
          >
            <CheckCircle2 className="mr-2 h-3 w-3" />
            Confirm Mapping
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

        {/* Left Panel: Source Columns */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-widest px-1">
            <Database className="h-4 w-4" /> Source Columns
          </div>
          <ScrollArea className="flex-1 bg-zinc-900/20 rounded-xl border border-zinc-800/50 p-3">
            <div className="flex flex-col gap-2">
              {availableColumns.map((col) => {
                const isMapped = Object.values(mappings).includes(col);
                return (
                  <div key={col} className={cn(
                    "px-3 py-2 rounded-lg text-sm transition-all duration-200 border",
                    isMapped
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="truncate" title={col}>{col}</span>
                      {isMapped && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel: Mapping Engine */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-widest px-1">
            <RotateCcw className="h-4 w-4" /> Field Mapping
          </div>
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="flex flex-col gap-8 pb-10">

              {/* Required Fields Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">Required</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
                </div>
                <div className="grid gap-3">
                  {REQUIRED_FIELDS.map((field) => (
                    <MappingCard
                      key={field.key}
                      field={field}
                      mappings={mappings}
                      availableColumns={availableColumns}
                      onMap={(val: string) => {
                        const newMappings = { ...mappings, [field.key]: val };
                        if (val === 'ignore') delete newMappings[field.key];
                        setMappings(newMappings);
                      }}
                      isRequired={true}
                    />
                  ))}
                </div>
              </section>

              {/* Optional Fields Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase">Optional</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                </div>
                <div className="grid gap-3">
                  {OPTIONAL_FIELDS.map((field) => (
                    <MappingCard
                      key={field.key}
                      field={field}
                      mappings={mappings}
                      availableColumns={availableColumns}
                      onMap={(val: string) => {
                        const newMappings = { ...mappings, [field.key]: val };
                        if (val === 'ignore') delete newMappings[field.key];
                        setMappings(newMappings);
                      }}
                      isRequired={false}
                    >
                      {field.key === 'discount' && mappings['discount'] && (
                        <div className="ml-2 flex items-center gap-2 animate-in fade-in duration-300">
                          <div className="h-4 w-px bg-zinc-800" />
                          <ToggleGroup type="single" value={discountType} onValueChange={(value: 'percentage' | 'fixed') => value && setDiscountType(value)} className="scale-75 origin-left">
                            <ToggleGroupItem value="percentage" size="sm" className="h-7 px-2 text-[10px] data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400">%</ToggleGroupItem>
                            <ToggleGroupItem value="fixed" size="sm" className="h-7 px-2 text-[10px] data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400">Fixed</ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                      )}
                    </MappingCard>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel: Preview */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-widest px-1">
            <Eye className="h-4 w-4" /> Live Preview
          </div>
          <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex flex-col">
            <div className="p-3 bg-zinc-900 border-b border-zinc-800">
              <span className="text-xs text-zinc-500">Row 1 Preview (Based on current mapping)</span>
            </div>
            <ScrollArea className="flex-1 p-0">
              <div className="divide-y divide-zinc-800/50">
                {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
                  const mappedCol = mappings[field.key];
                  const val = mappedCol && originalData[0] ? originalData[0][mappedCol] : '-';
                  const isMapped = !!mappedCol;

                  if (!isMapped && !field.required) return null; // Skip unmapped optional in preview to save space

                  return (
                    <div key={field.key} className="p-3 flex flex-col gap-1 hover:bg-zinc-900/30 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className={cn("text-xs font-medium", field.required ? "text-amber-500/80" : "text-blue-500/80")}>
                          {field.label}
                        </span>
                        {isMapped ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 truncate max-w-[80px]" title={mappedCol}>{mappedCol}</span>
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic">Unmapped</span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-300 font-mono bg-zinc-900/50 p-1 rounded border border-zinc-800/50 truncate min-h-[28px] flex items-center">
                        {val}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

      </div>

      {/* Preview Dialog */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl">
            <div className="flex flex-row items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900/50">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-500" />
                Data Preview (First 5 Rows)
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 sticky top-0 z-10">
                  <tr>
                    {Object.keys(mappings).map(key => (
                      <th key={key} className="p-3 text-left font-medium border-b border-zinc-800 text-zinc-400 font-mono text-xs uppercase tracking-wider">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {previewData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                      {Object.keys(mappings).map(key => (
                        <td key={key} className="p-3 border-zinc-800 text-zinc-300 truncate max-w-[200px]">{row[mappings[key]]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Subcomponent for Mapping Cards to keep main render clean
const MappingCard = ({ field, mappings, availableColumns, onMap, isRequired, children }: MappingCardProps) => {
  const mappedCol = mappings[field.key];
  const isMapped = !!mappedCol;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group p-0 rounded-xl border transition-all duration-300 flex items-center gap-0 bg-zinc-950/40 backdrop-blur-sm relative overflow-hidden",
        isMapped
          ? isRequired
            ? "border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
            : "border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]"
          : "border-white/5 hover:border-white/10"
      )}
    >
      {/* Background Selection Active Pulse */}
      {isMapped && <div className={cn("absolute inset-0 opacity-10 pointer-events-none", isRequired ? "bg-emerald-500" : "bg-blue-500")} />}

      <div className={cn(
        "h-full w-14 flex items-center justify-center shrink-0 border-r transition-colors self-stretch",
        isMapped
          ? isRequired ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-blue-500/20 bg-blue-500/10 text-blue-400"
          : "border-white/5 bg-zinc-900/30 text-zinc-600 group-hover:text-zinc-500"
      )}>
        {isMapped ? <CheckCircle2 className="h-5 w-5" /> : (isRequired ? <AlertCircle className="h-5 w-5" /> : <MinusCircle className="h-5 w-5" />)}
      </div>

      <div className="flex-1 min-w-0 p-3">
        <div className="flex items-center gap-3 mb-1.5">
          <span className={cn("text-xs font-mono uppercase tracking-wide", isMapped ? "text-white" : "text-zinc-500")}>{field.label}</span>
          {isRequired && !isMapped && <span className="text-[9px] text-amber-500 font-mono border border-amber-500/20 px-1 rounded bg-amber-500/5">REQUIRED</span>}
        </div>

        <div className="relative">
          <Select value={mappedCol || ''} onValueChange={onMap}>
            <SelectTrigger className={cn(
              "h-9 border-0 bg-zinc-900 text-xs focus:ring-1 text-zinc-300 w-full pl-3 font-mono transition-all",
              isMapped
                ? isRequired ? "ring-1 ring-emerald-500/30 text-emerald-100 bg-emerald-950/30" : "ring-1 ring-blue-500/30 text-blue-100 bg-blue-950/30"
                : "hover:bg-zinc-800"
            )}>
              <SelectValue placeholder="Select column..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
              <SelectItem value="ignore">-- Ignore --</SelectItem>
              {availableColumns.map((col: string) => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export default ColumnMappingStep;
