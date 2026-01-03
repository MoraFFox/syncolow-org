
"use client";

import { Controller, useFieldArray } from 'react-hook-form';
import type { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';

interface ProblemDiagnosisSectionProps {
    control: Control<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    onOpenReasonSelector: () => void;
}

import { ScaleIn } from '@/components/ui/motion-primitives';
import { AnimatePresence } from 'framer-motion';

// ... (keep interface)

export function ProblemDiagnosisSection({ control, watch, onOpenReasonSelector }: ProblemDiagnosisSectionProps) {
    const watchProblemOccurred = watch('problemOccurred');
    const { fields: reasonFields, remove: removeReason } = useFieldArray({ control, name: "problemReasons" });

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Controller name="problemOccurred" control={control} render={({ field }) => <Switch id="problemOccurred" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="problemOccurred">Did a problem occur during this visit?</Label>
            </div>
            <AnimatePresence>
                {watchProblemOccurred && (
                    <ScaleIn key="problem-reasons" className="origin-top">
                        <div className="p-4 border border-dashed border-border/60 rounded-lg mt-2 space-y-2 bg-muted/10">
                            <Button type="button" variant="outline" size="sm" onClick={onOpenReasonSelector} className="w-full sm:w-auto">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Problem Reason
                            </Button>
                            <div className="space-y-2 pt-2">
                                {reasonFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center justify-between bg-muted/50 p-2.5 rounded-md border border-border/40 text-sm">
                                        <span className="font-mono">{(field as any).reason}</span>
                                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeReason(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScaleIn>
                )}
            </AnimatePresence>
        </div>
    );
}

