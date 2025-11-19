
"use client";

import { Controller, useFieldArray } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, PlusCircle, Trash2 } from 'lucide-react';

interface ProblemDiagnosisSectionProps {
    control: any;
    watch: any;
    setValue: any;
    onOpenReasonSelector: () => void;
}

export function ProblemDiagnosisSection({ control, watch, setValue, onOpenReasonSelector }: ProblemDiagnosisSectionProps) {
    const watchProblemOccurred = watch('problemOccurred');
    const { fields: reasonFields, remove: removeReason } = useFieldArray({ control, name: "problemReasons" });
    
    return (
        <AccordionItem value="diagnosis">
            <AccordionTrigger className="font-semibold text-lg flex items-center gap-2 bg-muted px-5 rounded-sm bg-red-500/20 border-red-500/20 border"><AlertTriangle className="h-5 w-5 text-destructive " /> Problem Diagnosis</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                    <Controller name="problemOccurred" control={control} render={({ field }) => <Switch id="problemOccurred" checked={field.value} onCheckedChange={field.onChange} />} />
                    <Label htmlFor="problemOccurred">Did a problem occur during this visit?</Label>
                </div>
                {watchProblemOccurred && (
                    <div className="p-4 border-2 border-dashed rounded-lg mt-2 space-y-2">
                        <Button type="button" variant="outline" onClick={onOpenReasonSelector}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Problem Reason
                        </Button>
                        {reasonFields.map((field, index) => (
                            <div key={field.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                <span>{(field as any).reason}</span>
                                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeReason(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                )}
            </AccordionContent>
        </AccordionItem>
    );
}

