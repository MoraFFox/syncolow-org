
"use client";

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
        if (!searchTerm) {
            return Object.entries(partsCatalog);
        }

        const searchLower = searchTerm.toLowerCase();
        const filtered = Object.entries(partsCatalog).map(([category, parts]) => {
            const filteredParts = Object.entries(parts).filter(([name]) => 
                name.toLowerCase().includes(searchLower)
            );
            return { category, parts: Object.fromEntries(filteredParts) };
        }).filter(group => Object.keys(group.parts).length > 0);
        
        return filtered.map(group => [group.category, group.parts]);

    }, [searchTerm, partsCatalog]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Spare Part</DialogTitle>
                    <DialogDescription>Choose a part to add to the visit record.</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <Input 
                        placeholder="Search parts catalog..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto -mr-6 pr-6">
                    <Accordion type="multiple" defaultValue={Object.keys(partsCatalog)} className="w-full">
                        {filteredCatalog.map(([category, parts]) => (
                            <AccordionItem value={category as string} key={category as string}>
                                <AccordionTrigger>{category as string}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pl-2">
                                        {Object.entries(parts as {[key: string]: number}).map(([name, price]) => (
                                            <div key={name} className="flex justify-between items-center p-2 hover:bg-muted rounded-md">
                                                <div>
                                                    <p className="font-medium">{name}</p>
                                                    <p className="text-sm text-muted-foreground">${price.toFixed(2)}</p>
                                                </div>
                                                <Button size="sm" onClick={() => onSelect({ name, price })}>Add</Button>
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
            </DialogContent>
        </Dialog>
    );
}
