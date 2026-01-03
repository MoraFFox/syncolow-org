
"use client";

import { useState, useMemo } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useMaintenanceStore } from '@/store/use-maintenance-store';

interface SparePartSelectorProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSelect: (part: { name: string; price: number }) => void;
}

export function SparePartSelector({ isOpen, onOpenChange, onSelect }: SparePartSelectorProps) {
    const { partsCatalog } = useMaintenanceStore();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCatalog = useMemo(() => {
        if (!Array.isArray(partsCatalog)) return [];

        const groups: Record<string, { name: string, price: number }[]> = {};

        partsCatalog.forEach(part => {
            if (searchTerm && !part.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }

            if (!groups[part.category]) {
                groups[part.category] = [];
            }
            groups[part.category].push({
                name: part.name,
                price: part.defaultPrice || 0
            });
        });

        return Object.entries(groups).map(([category, parts]) => ({
            category,
            parts
        }));

    }, [searchTerm, partsCatalog]);

    return (
        <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent className="max-w-md max-h-[85vh] flex flex-col sm:max-h-[80vh]">
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Select Spare Part</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>Choose a part to add to the visit record.</ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="py-2">
                    <Input
                        placeholder="Search parts catalog..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto -mr-6 pr-6">
                    <Accordion type="multiple" defaultValue={filteredCatalog.map(x => x.category)} className="w-full">
                        {filteredCatalog.map(({ category, parts }) => (
                            <AccordionItem value={category} key={category}>
                                <AccordionTrigger>{category}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pl-2">
                                        {parts.map((part) => (
                                            <div key={part.name} className="flex justify-between items-center p-2 hover:bg-muted rounded-md">
                                                <div>
                                                    <p className="font-medium">{part.name}</p>
                                                    <p className="text-sm text-muted-foreground">${part.price.toFixed(2)}</p>
                                                </div>
                                                <Button size="sm" onClick={() => onSelect({ name: part.name, price: part.price })}>Add</Button>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                        {filteredCatalog.length === 0 && (
                            <div className="text-center text-muted-foreground py-10">
                                <p>No parts found.</p>
                            </div>
                        )}
                    </Accordion>
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
}
