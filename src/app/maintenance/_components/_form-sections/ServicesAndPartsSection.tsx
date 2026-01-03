import { Control, useFieldArray, useWatch, Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Minus, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ServicesAndPartsSectionProps {
    control: Control<any>;
    onOpenPartSelector: (onSelect: (part: { name: string; price: number }) => void) => void;
}

interface ServiceField {
    id: string;
    name: string;
    cost: number;
    quantity: number;
    paidBy: 'Client' | 'Company';
}

interface PartField {
    id: string;
    name: string;
    price: number;
    quantity: number;
    paidBy: 'Client' | 'Company';
}

export function ServicesAndPartsSection({ control, onOpenPartSelector }: ServicesAndPartsSectionProps) {
    const { setValue } = useFormContext();
    const { servicesCatalog } = useMaintenanceStore();
    const [customServiceName, setCustomServiceName] = useState('');
    const [customServiceCost, setCustomServiceCost] = useState('');
    const [isServicePopoverOpen, setIsServicePopoverOpen] = useState(false);

    const { fields: partFieldsOriginal, append: appendPart, remove: removePart, update: updatePart } = useFieldArray({ control, name: "spareParts" });
    const { fields: serviceFieldsOriginal, append: appendService, remove: removeService, update: updateService } = useFieldArray({ control, name: "services" });

    const partFields = partFieldsOriginal as unknown as PartField[];
    const serviceFields = serviceFieldsOriginal as unknown as ServiceField[];

    const watchedServices = useWatch({ control, name: "services" });
    const totalServiceCost = watchedServices?.reduce((sum: number, service: { cost: number, quantity: number }) => sum + (service.cost * service.quantity), 0) || 0;

    useEffect(() => {
        setValue('laborCost', totalServiceCost, { shouldDirty: true });
    }, [totalServiceCost, setValue]);

    // Group services by category for the dropdown
    const groupedServices = useMemo(() => {
        const groups: Record<string, typeof servicesCatalog> = {};
        servicesCatalog.forEach(service => {
            if (!groups[service.category]) {
                groups[service.category] = [];
            }
            groups[service.category].push(service);
        });
        return groups;
    }, [servicesCatalog]);

    // Track selected service names for the multi-select
    const selectedServiceNames = useMemo(() => {
        return new Set(serviceFields.map(s => s.name));
    }, [serviceFields]);

    const handleSelectPart = (part: { name: string; price: number }) => {
        const existingPartIndex = partFields.findIndex(p => p.name === part.name);
        if (existingPartIndex > -1) {
            const existingPart = partFields[existingPartIndex];
            updatePart(existingPartIndex, { ...existingPart, quantity: existingPart.quantity + 1, paidBy: 'Client', price: part.price });
        } else {
            appendPart({ ...part, quantity: 1, paidBy: 'Client' });
        }
        toast({ title: "Part Added", description: `${part.name} has been added to the list.` });
    };

    const handleToggleService = (serviceName: string, cost: number) => {
        const existingIndex = serviceFields.findIndex(s => s.name === serviceName);
        if (existingIndex > -1) {
            // Remove if already selected
            removeService(existingIndex);
        } else {
            // Add if not selected
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
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Services Performed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Select Services</Label>
                        <Popover open={isServicePopoverOpen} onOpenChange={setIsServicePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isServicePopoverOpen}
                                    className="w-full justify-between h-auto min-h-10 py-2"
                                >
                                    <span className="text-left truncate">
                                        {selectedServiceNames.size > 0
                                            ? `${selectedServiceNames.size} service${selectedServiceNames.size > 1 ? 's' : ''} selected`
                                            : "Choose services..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search services..." />
                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                        <CommandEmpty>No services found.</CommandEmpty>
                                        {Object.entries(groupedServices).map(([category, services]) => (
                                            <CommandGroup key={category} heading={category}>
                                                {services.map((service) => {
                                                    const isSelected = selectedServiceNames.has(service.name);
                                                    return (
                                                        <CommandItem
                                                            key={service.id}
                                                            value={`${category}::${service.name}`}
                                                            onSelect={() => handleToggleService(service.name, service.defaultCost)}
                                                            className="cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2 w-full">
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    className="pointer-events-none"
                                                                />
                                                                <span className="flex-1">{service.name}</span>
                                                                <span className="text-muted-foreground text-sm">{service.defaultCost} EGP</span>
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
                                <div><p className="font-medium text-sm">{field.name}</p><p className="text-xs text-muted-foreground">{field.cost} EGP</p></div>
                                <div className="flex items-center gap-2">
                                    <Controller
                                        name={`services.${index}.paidBy`}
                                        control={control}
                                        render={({ field: controllerField }) => (<Select onValueChange={controllerField.onChange} defaultValue={controllerField.value}> <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Paid by" /></SelectTrigger> <SelectContent> <SelectItem value="Client">Client</SelectItem> <SelectItem value="Company">Company</SelectItem> </SelectContent> </Select>)}
                                    />
                                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateService(index, { ...field, quantity: Math.max(1, field.quantity - 1) })} disabled={field.quantity <= 1}><Minus className="h-4 w-4" /></Button>
                                    <span className="font-medium w-4 text-center">{field.quantity}</span>
                                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateService(index, { ...field, quantity: field.quantity + 1 })}><PlusCircle className="h-4 w-4" /></Button>
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
                        <>
                            <div className="p-2 border rounded-lg mt-2 space-y-2 divide-y divide-dashed">
                                {partFields.map((field, partIndex) => (
                                    <div key={field.id} className="flex items-center justify-between pt-2 gap-2 first:pt-0">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{field.name}</p>
                                            <p className="text-xs text-muted-foreground">{(field.price || 0).toFixed(2)} EGP each</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Controller name={`spareParts.${partIndex}.paidBy`} control={control} render={({ field: controllerField }) => (<Select onValueChange={controllerField.onChange} defaultValue={controllerField.value}> <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Paid by" /></SelectTrigger> <SelectContent> <SelectItem value="Client">Client</SelectItem> <SelectItem value="Company">Company</SelectItem> </SelectContent> </Select>)} />
                                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updatePart(partIndex, { ...field, quantity: Math.max(1, field.quantity - 1) })}><Minus className="h-4 w-4" /></Button>
                                            <Input type="number" className="w-16 h-8 text-center" value={field.quantity} onChange={(e) => updatePart(partIndex, { ...field, quantity: parseInt(e.target.value) || 1 })} />
                                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updatePart(partIndex, { ...field, quantity: field.quantity + 1 })}><PlusCircle className="h-4 w-4" /></Button>
                                        </div>
                                        <span className="font-medium text-sm w-20 text-right">{((field.price || 0) * field.quantity).toFixed(2)} EGP</span>
                                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removePart(partIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end items-center mt-4 font-bold">
                                <span>Total Parts Cost:</span>
                                <span className="ml-2">{partFields.reduce((sum, p) => sum + ((p.price || 0) * p.quantity), 0).toFixed(2)} EGP</span>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

