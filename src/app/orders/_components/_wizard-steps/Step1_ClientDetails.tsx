
"use client";

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Building, Check, ChevronsUpDown, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import type { Company } from '@/lib/types';
import { useFormContext, Controller } from 'react-hook-form';
import { OrderFormData } from '../order-form';
import { useCompanyStore } from '@/store/use-company-store';
import { ClientPaymentStatusBar } from '@/components/client-payment-status-bar';
import { PaymentWarningDialog } from '@/components/payment-warning-dialog';


interface Step1ClientDetailsProps {
    companies: Company[];
}

export function Step1_ClientDetails({ companies }: Step1ClientDetailsProps) {
    const { control, watch, setValue } = useFormContext<OrderFormData>();
    const { areas } = useCompanyStore();
    const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
    const [warningDialogOpen, setWarningDialogOpen] = useState(false);
    const [pendingClientId, setPendingClientId] = useState<string | null>(null);
    
    const isPotentialClient = watch('isPotentialClient');
    const selectedBranchId = watch('branchId');
    const selectedAreaName = watch('area');
    
    const clientOptions = useMemo(() => {
        return companies;
    }, [companies]);

    useEffect(() => {
        if (!isPotentialClient && selectedBranchId) {
            const client = companies.find(c => c.id === selectedBranchId);
            if (client) {
                if (client.area) setValue("area", client.area, { shouldValidate: true });
                if (client.region) setValue("region", client.region, { shouldValidate: true });
            }
        }
    }, [isPotentialClient, selectedBranchId, companies, setValue]);

    useEffect(() => {
        const selectedArea = areas.find(a => a.name === selectedAreaName);
        if (selectedArea) {
            setValue("region", selectedArea.deliverySchedule, { shouldValidate: true });
        }
    }, [selectedAreaName, areas, setValue]);

    const handleClientSelect = (branchId: string) => {
        const client = companies.find(c => c.id === branchId);
        if (!client) return;
        
        const parentCompany = client.isBranch 
            ? companies.find(c => c.id === client.parentCompanyId)
            : client;
        
        // Check if warning needed
        const status = parentCompany?.paymentStatus;
        const shouldWarn = status && ['fair', 'poor', 'critical'].includes(status);
        
        if (shouldWarn && parentCompany) {
            setPendingClientId(branchId);
            setWarningDialogOpen(true);
            setClientPopoverOpen(false);
        } else {
            setValue("branchId", branchId, { shouldValidate: true });
            setClientPopoverOpen(false);
        }
    };
    
    const handleWarningProceed = () => {
        if (pendingClientId) {
            setValue("branchId", pendingClientId, { shouldValidate: true });
            setPendingClientId(null);
        }
    };
    
    const handleWarningCancel = () => {
        setPendingClientId(null);
    };

    const pendingClient = pendingClientId ? companies.find(c => c.id === pendingClientId) : null;
    const pendingParentCompany = pendingClient?.isBranch 
        ? companies.find(c => c.id === pendingClient.parentCompanyId)
        : pendingClient;

    return (
        <div className="space-y-4 p-1">
            {pendingParentCompany && (
                <PaymentWarningDialog
                    isOpen={warningDialogOpen}
                    onOpenChange={setWarningDialogOpen}
                    client={pendingParentCompany}
                    onProceed={handleWarningProceed}
                    onCancel={handleWarningCancel}
                />
            )}
            <Controller
              name="isPotentialClient"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="potential-client"
                        checked={field.value}
                        onCheckedChange={(checked) => {
                            field.onChange(Boolean(checked));
                            if(checked) {
                                setValue("branchId", undefined);
                            } else {
                                setValue("temporaryCompanyName", undefined);
                            }
                        }}
                    />
                    <Label htmlFor="potential-client">New / Potential Client</Label>
                </div>
              )}
            />

            {isPotentialClient ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="temp-company-name">Client Name</Label>
                        <Controller
                            name="temporaryCompanyName"
                            control={control}
                            render={({ field }) => (
                                <Input id="temp-company-name" placeholder="Enter client name" {...field} value={field.value || ''} />
                            )}
                        />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid gap-2">
                        <Label>Client</Label>
                        <div className="space-y-0">
                            <Controller
                                name="branchId"
                                control={control}
                                render={({ field }) => {
                                    const selectedClient = field.value ? companies.find(c => c.id === field.value) : null;
                                    const parentCompany = selectedClient?.isBranch 
                                        ? companies.find(c => c.id === selectedClient.parentCompanyId)
                                        : selectedClient;
                                    
                                    return (
                                        <>
                                            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" role="combobox" className="w-full justify-between rounded-b-none">
                                                        {field.value ? companies.find(c => c.id === field.value)?.name : "Select client"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search..." />
                                                        <ScrollArea className="h-48">
                                                            <CommandList>
                                                                <CommandEmpty>No client found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {clientOptions.map(c => (
                                                                        <CommandItem key={c.id} value={c.name} onSelect={() => handleClientSelect(c.id)}>
                                                                            <Check className={cn("mr-2 h-4 w-4", field.value === c.id ? "opacity-100" : "opacity-0")} />
                                                                            <span className="flex items-center gap-2">{c.name} {c.isBranch ? <GitBranch className="h-3 w-3 text-muted-foreground"/> : <Building className="h-3 w-3 text-muted-foreground"/>}</span>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </ScrollArea>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {parentCompany && <ClientPaymentStatusBar client={parentCompany} />}
                                        </>
                                    );
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="area">Area</Label>
                    <Controller
                        name="area"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {areas.map(area => (
                                        <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Delivery Schedule</Label>
                    <Controller
                        name="region"
                        control={control}
                        render={({ field }) => (
                            <Select value={field.value || 'A'} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Schedule" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A">Schedule A</SelectItem>
                                    <SelectItem value="B">Schedule B</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
            

        </div>
    );
}
    