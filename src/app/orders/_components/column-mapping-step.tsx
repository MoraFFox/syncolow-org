
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import type { CsvRow } from '@/lib/types';
import { Check, X, RotateCcw, Eye, Save, AlertCircle, Upload, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ColumnMappingStepProps {
  originalData: CsvRow[];
  onMappingComplete: (mappedData: CsvRow[]) => void;
  onBack: () => void;
  onSaveMapping: (mapping: Record<string, string>) => void;
  onLoadMapping: (mapping: Record<string, string>) => void;
}

const REQUIRED_FIELDS = [
  { key: 'customerName', label: 'Customer Name', description: 'Name of the customer/company', dataType: 'string' },
  { key: 'itemName', label: 'Item Name', description: 'Name of the product/service', dataType: 'string' },
  { key: 'quantity', label: 'Quantity', description: 'Number of items ordered', dataType: 'number' },
  { key: 'price', label: 'Price', description: 'Price per unit', dataType: 'number' },
];

const OPTIONAL_FIELDS = [
  { key: 'orderDate', label: 'Order Date', description: 'Date of the order', dataType: 'date' },
  { key: 'deliveryDate', label: 'Delivery Date', description: 'Expected delivery date', dataType: 'date' },
  { key: 'paymentDueDate', label: 'Payment Due Date', description: 'When payment is due', dataType: 'date' },
  { key: 'deliveryNotes', label: 'Delivery Notes', description: 'Special delivery instructions', dataType: 'string' },
  { key: 'area', label: 'Area', description: 'Delivery area', dataType: 'string' },
  { key: 'discount', label: 'Discount', description: 'Discount value (number or percentage)', dataType: 'string' },
  { key: 'tax', label: 'Tax/VAT', description: 'Tax percentage (e.g., 14 for 14%)', dataType: 'number' },
];

const MAPPING_STORAGE_KEY = 'orderImportMapping';

const ColumnMappingStep = ({ 
  originalData, 
  onMappingComplete, 
  onBack,
  onSaveMapping,
  onLoadMapping
}: ColumnMappingStepProps) => {
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isMappingValid, setIsMappingValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dataTypeErrors, setDataTypeErrors] = useState<Record<string, string[]>>({});
  const [mappingProgress, setMappingProgress] = useState(0);
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
          Object.entries(parsed).forEach(([key, value]) => {
            if (typeof value === 'string' && columns.includes(value)) {
              validMapping[key] = value;
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
      
      REQUIRED_FIELDS.forEach(field => {
        const possibleColumns = columns.filter(col => {
          const lowerCol = col.toLowerCase().replace(/[_\s-]/g, '');
          const lowerKey = field.key.toLowerCase().replace(/[_\s-]/g, '');
          const lowerLabel = field.label.toLowerCase().replace(/[_\s-]/g, '');
          return lowerCol.includes(lowerKey) || lowerCol.includes(lowerLabel) || lowerKey.includes(lowerCol);
        });
        
        if (possibleColumns.length > 0) {
          autoMappings[field.key] = possibleColumns[0];
        }
      });
      
      OPTIONAL_FIELDS.forEach(field => {
        const possibleColumns = columns.filter(col => {
          const lowerCol = col.toLowerCase().replace(/[_\s-]/g, '');
          const lowerKey = field.key.toLowerCase().replace(/[_\s-]/g, '');
          const lowerLabel = field.label.toLowerCase().replace(/[_\s-]/g, '');
          return lowerCol.includes(lowerKey) || lowerCol.includes(lowerLabel) || lowerKey.includes(lowerCol);
        });
        
        if (possibleColumns.length > 0) {
          autoMappings[field.key] = possibleColumns[0];
        }
      });
      
      setMappings(autoMappings);
    }
  }, [originalData]);

  useEffect(() => {
    const errors: string[] = [];
    const typeErrors: Record<string, string[]> = {};
    
    const requiredFieldsMapped = REQUIRED_FIELDS.every(field => 
      mappings[field.key] && mappings[field.key] !== ''
    );
    
    if (!requiredFieldsMapped) {
      const unmappedRequired = REQUIRED_FIELDS.filter(field => 
        !mappings[field.key] || mappings[field.key] === ''
      ).map(field => field.label);
      errors.push(`Missing required mappings: ${unmappedRequired.join(', ')}`);
    }
    
    const mappedValues = Object.values(mappings).filter(value => value && value !== '');
    const uniqueValues = new Set(mappedValues);
    if (mappedValues.length !== uniqueValues.size) {
      errors.push('Multiple fields mapped to the same column. Each column should map to only one field.');
    }
    
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
      const columnName = mappings[field.key];
      if (columnName && columnName !== '') {
        const sampleValues = originalData.slice(0, 10).map(row => row[columnName]).filter(v => v && v !== '');
        const invalidValues: string[] = [];
        
        if (field.dataType === 'number') {
          sampleValues.forEach(val => {
            const trimmed = val.trim();
            if (trimmed && isNaN(Number(trimmed))) {
              invalidValues.push(val);
            }
          });
          if (invalidValues.length > 0) {
            typeErrors[field.key] = invalidValues.slice(0, 3);
          }
        } else if (field.dataType === 'date') {
          sampleValues.forEach(val => {
            const date = new Date(val);
            if (isNaN(date.getTime())) {
              invalidValues.push(val);
            }
          });
          if (invalidValues.length > 0) {
            typeErrors[field.key] = invalidValues.slice(0, 3);
          }
        }
      }
    });
    
    setDataTypeErrors(typeErrors);
    setValidationErrors(errors);
    setIsMappingValid(errors.length === 0 && requiredFieldsMapped);
    
    const totalFields = REQUIRED_FIELDS.length + OPTIONAL_FIELDS.length;
    const mappedCount = Object.values(mappings).filter(v => v && v !== '').length;
    setMappingProgress(Math.round((mappedCount / totalFields) * 100));
  }, [mappings, originalData]);

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

  const handleColumnSelect = (fieldKey: string, column: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldKey]: column
    }));
  };

  const handleClearMapping = (fieldKey: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldKey]: ''
    }));
  };

  const handleResetMappings = () => {
    setMappings({});
  };

  const handleSaveMapping = () => {
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mappings));
    toast({ title: 'Mapping Saved', description: 'Your column mapping has been saved for future imports.' });
    onSaveMapping(mappings);
  };

  const handleContinue = () => {
    const transformedData = originalData
      .map(row => {
        const newRow: CsvRow = {};
        
        Object.entries(mappings).forEach(([mappedKey, actualColumn]) => {
          if (actualColumn && actualColumn !== '') {
            const value = row[actualColumn];
            if (value && value.trim && value.trim() !== '') {
              newRow[mappedKey] = value.trim();
            }
          }
        });
        
        if (mappings['discount'] && Object.keys(newRow).length > 0) {
          newRow['discountType'] = discountType;
        }
        
        return newRow;
      })
      .filter(row => {
        const keys = Object.keys(row).filter(k => k !== 'discountType');
        return keys.length > 0;
      });
    
    console.log('Filtered data:', transformedData.length, 'rows');
    onMappingComplete(transformedData);
  };

  const unmappedColumns = useMemo(() => 
    availableColumns.filter(col => !Object.values(mappings).includes(col)),
    [availableColumns, mappings]
  );
  
  const mappedColumns = useMemo(() => 
    Object.values(mappings).filter(v => v && v !== ''),
    [mappings]
  );
  
  const getFieldStatus = (fieldKey: string) => {
    const mapped = mappings[fieldKey] && mappings[fieldKey] !== '';
    const hasTypeError = dataTypeErrors[fieldKey] && dataTypeErrors[fieldKey].length > 0;
    if (!mapped) return 'unmapped';
    if (hasTypeError) return 'error';
    return 'mapped';
  };
  
  const getColumnStatus = (column: string) => {
    const isMapped = Object.values(mappings).includes(column);
    if (isMapped) return 'mapped';
    return 'unused';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">Map Excel Columns to Order Fields</h2>
            <p className="text-sm text-muted-foreground mt-1">Match your file columns to the required order fields</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Mapping Progress</span>
            <span>{mappingProgress}%</span>
          </div>
          <Progress value={mappingProgress} className="w-full" />
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>{mappedColumns.length} Mapped</span>
            </div>
            <div className="flex items-center gap-1">
              <MinusCircle className="h-3 w-3 text-gray-400" />
              <span>{unmappedColumns.length} Unused</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span>{Object.keys(dataTypeErrors).length} Type Errors</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="default" className="bg-red-500">Required</Badge>
              Required Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {REQUIRED_FIELDS.map(field => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {field.label}
                    <span className="text-red-500">*</span>
                    {getFieldStatus(field.key) === 'mapped' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {getFieldStatus(field.key) === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </label>
                  {mappings[field.key] && mappings[field.key] !== '' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearMapping(field.key)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select 
                  value={mappings[field.key] || ''} 
                  onValueChange={(value) => handleColumnSelect(field.key, value)}
                >
                  <SelectTrigger className={cn(
                    "w-full",
                    getFieldStatus(field.key) === 'error' && "border-red-500"
                  )}>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(col => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{field.description}</p>
                {dataTypeErrors[field.key] && dataTypeErrors[field.key].length > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      Invalid {field.dataType} values found: {dataTypeErrors[field.key].join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="secondary">Optional</Badge>
              Optional Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {OPTIONAL_FIELDS.map(field => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {field.label}
                    {getFieldStatus(field.key) === 'mapped' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {getFieldStatus(field.key) === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </label>
                  {mappings[field.key] && mappings[field.key] !== '' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearMapping(field.key)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {field.key === 'discount' ? (
                  <div className="space-y-2">
                    <Select 
                      value={mappings[field.key] || ''} 
                      onValueChange={(value) => handleColumnSelect(field.key, value)}
                    >
                      <SelectTrigger className={cn(
                        "w-full",
                        getFieldStatus(field.key) === 'error' && "border-red-500"
                      )}>
                        <SelectValue placeholder="Select column or skip..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map(col => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Discount Type:</span>
                      <ToggleGroup type="single" value={discountType} onValueChange={(value: 'percentage' | 'fixed') => value && setDiscountType(value)} size="sm">
                        <ToggleGroupItem value="percentage" className="text-xs">%</ToggleGroupItem>
                        <ToggleGroupItem value="fixed" className="text-xs">Fixed</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                ) : (
                  <Select 
                    value={mappings[field.key] || ''} 
                    onValueChange={(value) => handleColumnSelect(field.key, value)}
                  >
                    <SelectTrigger className={cn(
                      "w-full",
                      getFieldStatus(field.key) === 'error' && "border-red-500"
                    )}>
                      <SelectValue placeholder="Select column or skip..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">{field.description}</p>
                {dataTypeErrors[field.key] && dataTypeErrors[field.key].length > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      Invalid {field.dataType} values found: {dataTypeErrors[field.key].join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mapping Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Mapped Columns ({mappedColumns.length}):</h4>
              {mappedColumns.length > 0 ? (
                <ScrollArea className="max-h-40">
                  <ul className="text-sm space-y-1 pr-4">
                    {Object.entries(mappings).filter(([_, value]) => value && value !== '').map(([fieldKey, column]) => {
                      const fieldLabel = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]
                        .find(f => f.key === fieldKey)?.label || fieldKey;
                      const status = getFieldStatus(fieldKey);
                      return (
                        <li key={fieldKey} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-muted/50">
                          <span className="truncate text-xs">{fieldLabel}</span>
                          <div className="flex items-center gap-1">
                            {status === 'error' ? (
                              <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                            )}
                            <span className="font-medium text-xs truncate">{column}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">No columns mapped yet</p>
              )}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Unused Columns ({unmappedColumns.length}):</h4>
              {unmappedColumns.length > 0 ? (
                <ScrollArea className="max-h-32">
                  <ul className="text-sm space-y-1 pr-4">
                    {unmappedColumns.map(col => (
                      <li key={col} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50">
                        <MinusCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate text-xs">{col}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">All columns mapped</p>
              )}
            </div>
            
            <div className="pt-4 space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetMappings}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Mappings
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreview(!showPreview)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveMapping}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Mapping
              </Button>
            </div>
            
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong className="block mb-1">Validation Errors:</strong>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {isMappingValid && Object.keys(dataTypeErrors).length === 0 && (
              <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs">
                  All required fields are mapped correctly!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Data Preview (First 5 Rows)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 w-full rounded-md border overflow-x-auto overflow-y-auto">
              <table className="min-w-max">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="border-b">
                      <th className="p-2 text-left text-xs font-medium whitespace-nowrap">#</th>
                      {Object.entries(mappings).filter(([_, value]) => value && value !== '').map(([fieldKey, _]) => {
                        const field = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].find(f => f.key === fieldKey);
                        const status = getFieldStatus(fieldKey);
                        return (
                          <th key={fieldKey} className="p-2 text-left text-xs font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              {status === 'error' ? (
                                <XCircle className="h-3 w-3 text-red-600" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              )}
                              <span>{field?.label || fieldKey}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{rowIndex + 1}</td>
                        {Object.entries(mappings).filter(([_, value]) => value && value !== '').map(([fieldKey, _]) => {
                          const value = row[fieldKey];
                          const field = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].find(f => f.key === fieldKey);
                          let isInvalid = false;
                          
                          if (value && field) {
                            const trimmed = value.trim();
                            if (field.dataType === 'number' && trimmed && isNaN(Number(trimmed))) {
                              isInvalid = true;
                            } else if (field.dataType === 'date' && isNaN(new Date(value).getTime())) {
                              isInvalid = true;
                            }
                          }
                          
                          return (
                            <td key={fieldKey} className={cn(
                              "p-2 text-xs whitespace-nowrap",
                              isInvalid && "text-red-600 bg-red-50 dark:bg-red-950/20"
                            )}>
                              {value || <span className="text-muted-foreground">-</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>Showing first 5 rows of {originalData.length} total rows</span>
              {Object.keys(dataTypeErrors).length > 0 && (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Data type issues detected
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetMappings}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSaveMapping}
            disabled={!isMappingValid}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Mapping
          </Button>
        </div>
        
        <Button 
          onClick={handleContinue} 
          disabled={!isMappingValid || Object.keys(dataTypeErrors).length > 0}
          className="flex items-center"
        >
          <Upload className="h-4 w-4 mr-2" />
          Continue to Import
        </Button>
      </div>
    </div>
  );
};

export default ColumnMappingStep;
