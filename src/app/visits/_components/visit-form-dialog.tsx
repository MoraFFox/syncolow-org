
"use client";
import  { useState, useEffect } from 'react';
import { useCompanyStore } from '@/store/use-company-store';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Trash2, MapPin, Check, ChevronsUpDown, CalendarIcon } from 'lucide-react';
import type { VisitCall } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

import dynamic from 'next/dynamic';
import { toast } from '@/hooks/use-toast';

const LocationPickerDialog = dynamic(() => import('@/app/clients/[companyId]/_components/location-picker-dialog').then(mod => mod.LocationPickerDialog), { ssr: false });

const visitSchema = z.object({
    clientId: z.string().min(1, "Client is required"),
    customClientName: z.string().optional(),
    date: z.date({ required_error: "A date is required." }),
    type: z.enum(['Visit', 'Call'], { required_error: "Type is required" }),
    outcome: z.string().optional(),
    address: z.string().optional(),
}).refine(data => {
    if (data.type === 'Visit' && !data.address) {
      return false;
    }
    return true;
}, {
    message: "An address is required for visits.",
    path: ["address"],
});

type VisitFormData = z.infer<typeof visitSchema>;

interface VisitFormDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    visit: VisitCall | null;
    onSubmit: (data: Omit<VisitCall, 'id'>) => void;
    onDelete: (visitId: string) => void;
}

const CUSTOM_CLIENT_ID = "custom-client";

export function VisitFormDialog({ isOpen, onOpenChange, visit, onSubmit, onDelete }: VisitFormDialogProps) {
    const { companies } = useCompanyStore();
    
    const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isDirty } } = useForm<VisitFormData>({
        resolver: zodResolver(visitSchema),
    });
    
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [availableAddresses, setAvailableAddresses] = useState<{label: string, value: string}[]>([]);

    const visitType = watch("type");
    const selectedClientId = watch("clientId");
    const watchedAddress = watch("address");

    useEffect(() => {
        if (isOpen) {
            if (visit) {
                const clientExists = companies.some(c => c.id === visit.clientId);
                reset({
                    clientId: visit.clientId,
                    date: parseISO(visit.date),
                    type: visit.type,
                    outcome: visit.outcome,
                    address: visit.address,
                    customClientName: visit.clientName && !clientExists ? visit.clientName : '',
                });
            } else {
                reset({
                    type: "Visit",
                    date: new Date(),
                    clientId: "",
                    outcome: "",
                    address: undefined,
                    customClientName: '',
                });
            }
        }
    }, [visit, isOpen, reset, companies]);
    
    useEffect(() => {
        if (selectedClientId && selectedClientId !== CUSTOM_CLIENT_ID) {
            const client = companies.find(c => c.id === selectedClientId);
            if(client) {
                const addresses: {label: string, value: string}[] = [];
                if(client.location) addresses.push({ label: client.isBranch ? 'Branch Location' : 'Main Office', value: client.location });
                
                // You could add warehouse location here if it existed on the Company type
                // if(client.warehouseLocation) addresses.push({ label: 'Warehouse', value: client.warehouseLocation });
                
                addresses.push({ label: 'Custom Location', value: 'custom' });
                
                setAvailableAddresses(addresses);

                // Auto-select the first address if available and not editing
                if (!visit && addresses.length > 1) { // >1 because custom is always there
                    setValue('address', addresses[0].value, { shouldDirty: true });
                } else if (visit?.address) {
                    setValue('address', visit.address);
                } else {
                    setValue('address', undefined, { shouldDirty: true });
                }
            }
        } else {
            setAvailableAddresses([]);
            if(selectedClientId === CUSTOM_CLIENT_ID) {
                setValue('address', undefined, { shouldDirty: true });
            }
        }
    }, [selectedClientId, companies, setValue, visit]);

    const handleConfirmLocation = (newAddress: string) => {
        setValue('address', newAddress, { shouldDirty: true });
    };

    const onFormSubmit = async (data: VisitFormData) => {
        try {
            const { customClientName, ...visitData } = data;
            const submissionData = {
                ...visitData,
                date: data.date.toISOString(),
                clientName: data.clientId === CUSTOM_CLIENT_ID ? customClientName || 'Custom Client' : companies.find(c => c.id === data.clientId)?.name,
            };

            await onSubmit(submissionData as Omit<VisitCall, 'id'>);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to submit visit:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save interaction",
                variant: "destructive",
            });
        }
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
        }
        onOpenChange(open);
    }
    
    const handleAddressSelect = (value: string) => {
        if (value === 'custom') {
            setValue('address', undefined, { shouldDirty: true });
            setIsMapOpen(true);
        } else {
            setValue('address', value, { shouldDirty: true });
        }
    };

    return (
        <>
            {isMapOpen && <LocationPickerDialog
                isOpen={isMapOpen}
                onOpenChange={setIsMapOpen}
                initialAddress={watchedAddress}
                onConfirm={handleConfirmLocation}
            />}
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{visit ? 'Edit Interaction' : 'Log New Interaction'}</DialogTitle>
                        <DialogDescription>
                            {visit ? 'Update the details of the interaction.' : 'Fill in the details of the client visit or call.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onFormSubmit)}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="clientId">Client</Label>
                                <Controller
                                    name="clientId"
                                    control={control}
                                    render={({ field }) => (
                                        <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={clientPopoverOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {field.value === CUSTOM_CLIENT_ID
                                                      ? "Custom (One-time visit)"
                                                      : field.value
                                                      ? companies.find((client) => client.id === field.value)?.name
                                                      : "Select a client..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search client..." />
                                                    <CommandList>
                                                        <CommandEmpty>No client found.</CommandEmpty>
                                                         <CommandGroup>
                                                             {companies.map((company) => (
                                                                 <CommandItem
                                                                    value={company.name}
                                                                    key={company.id}
                                                                    onSelect={() => {
                                                                        field.onChange(company.id);
                                                                        setClientPopoverOpen(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", field.value === company.id ? "opacity-100" : "opacity-0")} />
                                                                    {company.name}
                                                                    {company.isBranch && <span className="ml-2 text-xs text-muted-foreground">(Branch)</span>}
                                                                </CommandItem>
                                                            ))}
                                                             <CommandItem
                                                                key={CUSTOM_CLIENT_ID}
                                                                onSelect={() => {
                                                                    field.onChange(CUSTOM_CLIENT_ID);
                                                                    setClientPopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", field.value === CUSTOM_CLIENT_ID ? "opacity-100" : "opacity-0")} />
                                                                Custom (One-time visit)
                                                            </CommandItem>
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
                            </div>

                            {selectedClientId === CUSTOM_CLIENT_ID && (
                                <div className="grid gap-2">
                                    <Label htmlFor="customClientName">Client Name (Optional)</Label>
                                    <Input id="customClientName" {...register("customClientName")} placeholder="Enter a name for this visit"/>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Type</Label>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={(value: 'Visit' | 'Call') => {
                                                field.onChange(value);
                                                if(value === 'Call') {
                                                    setValue('address', undefined, { shouldDirty: true });
                                                }
                                            }} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Visit">Visit</SelectItem>
                                                    <SelectItem value="Call">Call</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Controller
                                        name="date"
                                        control={control}
                                        render={({ field }) => (
                                            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={(date) => {
                                                            field.onChange(date);
                                                            setDatePopoverOpen(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    />
                                    {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                                </div>
                            </div>
                            {visitType === 'Visit' && (
                                <>
                                    {availableAddresses.length > 1 && selectedClientId !== CUSTOM_CLIENT_ID && (
                                        <div className="grid gap-2">
                                            <Label>Select Saved Address</Label>
                                            <Select onValueChange={handleAddressSelect}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose a client address or custom" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableAddresses.map(addr => (
                                                        <SelectItem key={addr.value} value={addr.value}>{addr.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label>Visit Location</Label>
                                        <Button type="button" variant="outline" onClick={() => setIsMapOpen(true)}>
                                            <MapPin className="mr-2 h-4 w-4" />
                                            {watchedAddress ? 'Change Location' : 'Set Location on Map'}
                                        </Button>
                                        {watchedAddress && <p className="text-sm text-muted-foreground truncate">{watchedAddress}</p>}
                                        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
                                    </div>
                                </>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="outcome">Outcome / Notes</Label>
                                <Textarea id="outcome" {...register("outcome")} placeholder="Summarize the interaction..."/>
                                {errors.outcome && <p className="text-sm text-destructive">{errors.outcome.message}</p>}
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-between">
                            <div>
                              {visit && (
                                <Button type="button" variant="destructive" onClick={() => onDelete(visit.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
