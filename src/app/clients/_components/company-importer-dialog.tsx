
"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUp, Loader2, CheckCircle, PartyPopper } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { importCompanyData } from '@/ai/flows/import-company-data';
import type { ImportCompanyDataInput } from '@/ai/flows/import-company-data';
import { useOrderStore } from '@/store/use-order-store';

interface CompanyImporterDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function CompanyImporterDialog({ isOpen, onOpenChange }: CompanyImporterDialogProps) {
    const { fetchInitialData } = useOrderStore();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');

    const resetState = useCallback(() => {
        setFile(null);
        setIsLoading(false);
        setFileName('');
        const input = document.getElementById('json-upload-dialog') as HTMLInputElement;
        if (input) {
            input.value = '';
        }
    }, []);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/json') {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        } else {
            toast({ title: 'Invalid File Type', description: 'Please select a valid JSON file.', variant: 'destructive'});
        }
    };

    const handleImport = useCallback(async () => {
        if (!file) {
            toast({ title: 'No file selected', description: 'Please choose a JSON file to import.', variant: 'destructive'});
            return;
        }
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                
                // Handle both single company and array of companies
                const companiesToImport = Array.isArray(data) ? data : [data];
                let totalImported = 0;

                for (const companyData of companiesToImport) {
                    if (companyData.company || companyData.name) {
                        // Convert single company object to ImportCompanyDataInput format
                        const importData: ImportCompanyDataInput = {
                            company: {
                                name: companyData.company?.name || companyData.name,
                                industry: companyData.company?.industry || companyData.industry,
                                taxNumber: companyData.company?.taxNumber || companyData.taxNumber,
                                email: companyData.company?.email || companyData.email,
                                location: companyData.company?.location || companyData.location,
                                managerName: companyData.company?.managerName || companyData.managerName,
                            },
                            branches: companyData.branches || [],
                        };
                        
                        await importCompanyData(importData);
                        totalImported++;
                    }
                }

                toast({ title: 'Import Successful', description: `${totalImported} company(ies) have been imported successfully.` });
                await fetchInitialData();
                onOpenChange(false);

            } catch (error) {
                console.error("Import error:", error);
                toast({ title: 'Import Failed', description: (error as Error).message || 'Could not parse or import the JSON file.', variant: 'destructive'});
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            toast({ title: 'File Read Error', description: 'Could not read the selected file.', variant: 'destructive'});
            setIsLoading(false);
        };
        reader.readAsText(file);
    }, [file, fetchInitialData, onOpenChange]);

    const handleDialogChange = (open: boolean) => {
        if (!open) {
            resetState();
        }
        onOpenChange(open);
    }


    return (
        <Dialog open={isOpen} onOpenChange={handleDialogChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Import Company Data (JSON)</DialogTitle>
                    <DialogDescription>
                        Upload a JSON file to bulk-import companies, branches, baristas, and maintenance history.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                     <label htmlFor="json-upload-dialog" className="flex-1 shrink-0">
                        <Button asChild className="w-full">
                        <div className="flex items-center gap-2">
                            <FileUp className="h-4 w-4"/>
                            <span>{fileName || 'Select JSON File'}</span>
                        </div>
                        </Button>
                        <Input 
                            id="json-upload-dialog" 
                            type="file" 
                            accept=".json" 
                            onChange={handleFileChange} 
                            className="hidden"
                            disabled={isLoading}
                        />
                    </label>
                    
                    <Alert>
                        <PartyPopper className="h-4 w-4" />
                        <AlertTitle>JSON Structure</AlertTitle>
                        <AlertDescription>
                          The JSON file should be an array of company objects. Each company can have nested branches, baristas, and maintenance history.
                          Refer to the documentation for the exact schema.
                        </AlertDescription>
                    </Alert>
                </div>

                 <DialogFooter>
                    <Button variant="outline" onClick={() => handleDialogChange(false)} disabled={isLoading}>
                      Cancel
                    </Button>
                     <Button onClick={handleImport} disabled={!file || isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Import Data
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
