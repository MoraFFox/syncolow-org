
"use client";

import { useFormContext, Controller, useFieldArray, useWatch } from 'react-hook-form';
import type { Control, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, PlusCircle, Trash2, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface ServicesAndPartsSectionProps {
    control: Control<any>;
    register: UseFormRegister<any>;
    setValue: UseFormSetValue<any>;
    onOpenPartSelector: (onSelect: (part: { name: string; price: number }) => void) => void;
}

export function ServicesAndPartsSection({ control, register, setValue, onOpenPartSelector }: ServicesAndPartsSectionProps) {
    const { servicesCatalog } = useMaintenanceStore();
    const [customServiceName, setCustomServiceName] = useState('');
    const [customServiceCost, setCustomServiceCost] = useState('');

    const { fields: partFields, append: appendPart, remove: removePart, update: updatePart } = useFieldArray({ control, name: "spareParts" });
    const { fields: serviceFields, append: appendService, remove: removeService, update: updateService } = useFieldArray({ control, name: "services" });

    const watchedServices = useWatch({ control, name: "services" });
    const totalServiceCost = watchedServices?.reduce((sum: number, service: { cost: number, quantity: number }) => sum + (service.cost * service.quantity), 0) || 0;

    useEffect(() => {
        setValue('laborCost', totalServiceCost, { shouldDirty: true });
    }, [totalServiceCost, setValue]);
    
    const handleSelectPart = (part: { name: string; price: number }) => {
        const existingPartIndex = partFields.findIndex(p => (p as any).name === part.name);
        if (existingPartIndex > -1) {
             const existingPart = partFields[existingPartIndex] as any;
             updatePart(existingPartIndex, { ...existingPart, quantity: existingPart.quantity + 1, paidBy: 'Client', price: part.price });
        } else {
            appendPart({ ...part, quantity: 1, paidBy: 'Client' });
        }
        toast({ title: "Part Added", description: `${part.name} has been added to the list.`});
    };

    const handleSelectService = (serviceName: string, cost: number) => {
        const existingIndex = serviceFields.findIndex(s => (s as any).name === serviceName);
        if (existingIndex > -1) {
            const existingService = serviceFields[existingIndex] as any;
            updateService(existingIndex, { ...existingService, quantity: existingService.quantity + 1 });
        } else {
            appendService({ name: serviceName, cost, quantity: 1, paidBy: 'Company' });
        }
    };
    
    const handleAddCustomService = () => {
        const name = customServiceName.trim();
        const cost = parseFloat(customServiceCost);
        if (name && !isNaN(cost) && cost >= 0) {
            appendService({ name, cost, quantity: 1, paidBy: 'Company' });
            setCustomServiceName('');
            setCustomServiceCost('');
        } else {
            toast({ title: "Invalid Custom Service", description: "Please enter a valid name and non-negative cost.", variant: "destructive" });
        }
    };

    return (
        <AccordionItem value="servicesAndParts">
            <AccordionTrigger className="font-semibold text-lg flex items-center gap-2 bg-muted px-5 rounded-sm bg-sky-500/10 border-blue-500/20 border"><Wrench className="h-5 w-5 text-primary"/> Services & Parts</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Services Performed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Select a Service</Label>
                            <Select onValueChange={(value) => {
                                const [category, serviceName] = value.split('::');
                                const cost = servicesCatalog[category][serviceName];
                                handleSelectService(serviceName, cost);
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a service..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(servicesCatalog).map(([category, services]) => (
                                        <SelectGroup key={category}>
                                            <SelectLabel>{category}</SelectLabel>
                                            {Object.entries(services).map(([name, cost]) => (
                                                <SelectItem key={name} value={`${category}::${name}`}>{name} - {cost} EGP</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="grid gap-2 flex-1">
                                <Label>Custom Service Name</Label>
                                <Input value={customServiceName} onChange={(e) => setCustomServiceName(e.target.value)} placeholder="e.g., Special Adjustment" />
                            </div>
                            <div className="grid gap-2 w-28">
                                <Label>Cost (EGP)</Label>
                                <Input value={customServiceCost} onChange={(e) => setCustomServiceCost(e.target.value)} type="number" placeholder="e.g., 250" />
                            </div>
                            <Button type="button" onClick={handleAddCustomService}>Add</Button>
                        </div>
                        <div className="space-y-2">
                            {serviceFields.map((field, index) => (
                                <div key={field.id} className="flex items-center justify-between p-2 rounded-md border">
                                    <div><p className="font-medium text-sm">{(field as any).name}</p><p className="text-xs text-muted-foreground">{(field as any).cost} EGP</p></div>
                                    <div className="flex items-center gap-2">
                                        <Controller
                                            name={`services.${index}.paidBy`}
                                            control={control}
                                            render={({ field: controllerField }) => ( <Select onValueChange={controllerField.onChange} defaultValue={controllerField.value}> <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Paid by" /></SelectTrigger> <SelectContent> <SelectItem value="Client">Client</SelectItem> <SelectItem value="Company">Company</SelectItem> </SelectContent> </Select> )}
                                        />
                                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateService(index, {...(field as any), quantity: Math.max(1, (field as any).quantity - 1)})} disabled={(field as any).quantity <= 1}><Minus className="h-4 w-4" /></Button>
                                        <span className="font-medium w-4 text-center">{(field as any).quantity}</span>
                                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateService(index, {...(field as any), quantity: (field as any).quantity + 1})}><PlusCircle className="h-4 w-4" /></Button>
                                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeService(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end items-center mt-4 font-bold">
                            <span>Total Service Cost:</span>
                            <span className="ml-2">{totalServiceCost.toFixed(2)} EGP</span>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Spare Parts Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button type="button" variant="outline" onClick={() => onOpenPartSelector(handleSelectPart)}>
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Spare Part
                        </Button>
                        {partFields.length > 0 && (
                            <div className="p-2 border rounded-lg mt-2 space-y-2 divide-y divide-dashed">
                                {partFields.map((field, partIndex) => (
                                    <div key={field.id} className="flex items-center justify-between pt-2 gap-2 first:pt-0">
                                        <span className="font-medium flex-1 text-sm rtl text-right pr-2">{(field as any).name}</span>
                                        <div className="flex items-center gap-2">
                                            <Controller name={`spareParts.${partIndex}.paidBy`} control={control} render={({ field: controllerField }) => ( <Select onValueChange={controllerField.onChange} defaultValue={controllerField.value}> <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Paid by" /></SelectTrigger> <SelectContent> <SelectItem value="Client">Client</SelectItem> <SelectItem value="Company">Company</SelectItem> </SelectContent> </Select> )}/>
                                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updatePart(partIndex, {...(field as any), quantity: Math.max(1, (field as any).quantity - 1)})}><Minus className="h-4 w-4" /></Button>
                                            <Input type="number" className="w-16 h-8 text-center" value={(field as any).quantity} onChange={(e) => updatePart(partIndex, {...(field as any), quantity: parseInt(e.target.value) || 1})} />
                                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updatePart(partIndex, {...(field as any), quantity: (field as any).quantity + 1})}><PlusCircle className="h-4 w-4" /></Button>
                                        </div>
                                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removePart(partIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </AccordionContent>
        </AccordionItem>
    );
}

