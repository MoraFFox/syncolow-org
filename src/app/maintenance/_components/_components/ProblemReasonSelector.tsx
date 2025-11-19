
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

    const filteredReasons = Object.entries(problemsCatalog).map(([category, reasons]) => {
        const filtered = reasons.filter(reason => reason.toLowerCase().includes(searchTerm.toLowerCase()));
        return { category, reasons: filtered };
    }).filter(group => group.reasons.length > 0);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Problem Reasons</DialogTitle>
                    <DialogDescription>Choose one or more reasons that describe the issue.</DialogDescription>
                </DialogHeader>
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
            </DialogContent>
        </Dialog>
    )
}
