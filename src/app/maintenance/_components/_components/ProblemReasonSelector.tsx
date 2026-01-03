
"use client";

import { useState, useMemo } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useMaintenanceStore } from '@/store/use-maintenance-store';

interface ProblemReasonSelectorProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    selectedReasons: string[];
    onSelect: (reason: string) => void;
}

export function ProblemReasonSelector({ isOpen, onOpenChange, selectedReasons, onSelect }: ProblemReasonSelectorProps) {
    const { problemsCatalog } = useMaintenanceStore();
    const [searchTerm, setSearchTerm] = useState('');

    // Safely handle the flat array structure from the store
    const filteredReasons = useMemo(() => {
        if (!Array.isArray(problemsCatalog)) return [];

        const groups: Record<string, string[]> = {};

        problemsCatalog.forEach(item => {
            // Filter by search term
            if (searchTerm && !item.problem.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }

            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item.problem);
        });

        return Object.entries(groups).map(([category, reasons]) => ({
            category,
            reasons
        }));
    }, [problemsCatalog, searchTerm]);

    return (
        <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent className="max-w-2xl max-h-[85vh] flex flex-col sm:max-h-[80vh]">
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Select Problem Reasons</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>Choose one or more reasons that describe the issue.</ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="py-2">
                    <Input
                        placeholder="Search reasons..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto pr-6 -mr-6">
                    <Accordion type="multiple" defaultValue={Object.keys(problemsCatalog)} className="w-full">
                        {filteredReasons.map(({ category, reasons }) => (
                            <AccordionItem value={category} key={category}>
                                <AccordionTrigger>{category}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pl-2">
                                        {reasons.map(reason => (
                                            <div key={reason} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={reason}
                                                    checked={selectedReasons.includes(reason)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            onSelect(reason);
                                                        } else {
                                                            // This would require a deselect function, for now we only add
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={reason} className="font-normal">{reason}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    )
}
