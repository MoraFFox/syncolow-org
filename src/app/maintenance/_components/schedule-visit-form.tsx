
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCompanyStore } from '@/store/use-company-store';
import type { MaintenanceVisit, Company } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const scheduleSchema = z.object({
  branchId: z.string().min(1, "A branch must be selected."),
  date: z.date({ required_error: "A date is required." }),
  visitType: z.enum(["periodic", "customer_request"], { required_error: "Please specify the visit type." }),
  maintenanceNotes: z.string().optional(),
  laborCost: z.number().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleVisitFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onFormSubmit: (visit: Omit<MaintenanceVisit, 'id'>) => Promise<void>;
}

const MAINTENANCE_LOCATION_COSTS = {
    'inside_cairo': 500,
    'outside_cairo': 1500,
    'sahel': 4000,
};

export function ScheduleVisitForm({ isOpen, onOpenChange, onFormSubmit }: ScheduleVisitFormProps) {
    const { companies } = useCompanyStore();
    const { toast } = useToast();
    const [popoverOpen, setPopoverOpen] = useState(false);
    
    const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            date: new Date(),
            visitType: 'periodic',
            laborCost: 0,
        }
    });

    const selectedBranchId = watch('branchId');

    useEffect(() => {
        if (selectedBranchId) {
            const client = companies.find(c => c.id === selectedBranchId);
            if (client) {
                let maintenanceLocation = client.maintenanceLocation;
                // If the selected client is a branch and doesn't have a maintenance location, find the parent's.
                if (client.isBranch && !maintenanceLocation) {
                    const parentCompany = companies.find(p => p.id === client.parentCompanyId);
                    maintenanceLocation = parentCompany?.maintenanceLocation;
                }
                
                const cost = maintenanceLocation ? (MAINTENANCE_LOCATION_COSTS as Record<string, number>)[maintenanceLocation] || 0 : 0;
                setValue('laborCost', cost, { shouldValidate: true });
            }
        } else {
            setValue('laborCost', 0);
        }
    }, [selectedBranchId, companies, setValue]);


    const onSubmit = async (data: ScheduleFormData) => {
        const company = companies.find(c => c.id === data.branchId);
        await onFormSubmit({
            ...data,
            date: data.date.toISOString(),
            companyId: company?.parentCompanyId || company?.id || '',
            branchName: company?.name || 'Unknown',
            companyName: companies.find(c => c.id === (company?.parentCompanyId || company?.id))?.name || 'Unknown',
        } as Omit<MaintenanceVisit, 'id'>);
        toast({
            title: "Visit Scheduled",
            description: "The new maintenance visit has been added to the schedule.",
        });
        onOpenChange(false);
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
        }
        onOpenChange(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent onInteractOutside={(e) => {
              if (e.target instanceof HTMLElement && e.target.closest('[cmdk-root]')) {
                e.preventDefault();
              }
            }}>
                <DialogHeader>
                    <DialogTitle>Schedule New Maintenance Case</DialogTitle>
                    <DialogDescription>Fill in the details to get a visit on the calendar.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-6 py-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="branchId">Client</Label>
                                <Controller
                                    name="branchId"
                                    control={control}
                                    render={({ field }) => (
                                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={popoverOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {field.value
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
                                                            {companies.map((client) => (
                                                                <CommandItem
                                                                    value={client.name}
                                                                    key={client.id}
                                                                    onSelect={() => {
                                                                        field.onChange(client.id);
                                                                        setPopoverOpen(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", field.value === client.id ? "opacity-100" : "opacity-0")} />
                                                                    {client.name}
                                                                    {client.isBranch && <span className="ml-2 text-xs text-muted-foreground">(Branch)</span>}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date">Scheduled Date</Label>
                                <Controller
                                    name="date"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            type="date"
                                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => field.onChange(new Date(e.target.value))}
                                        />
                                    )}
                                />
                                {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                            </div>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Visit Initiator</Label>
                                 <Controller
                                    name="visitType"
                                    control={control}
                                    render={({ field }) => (
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="periodic" id="proactive"/>
                                                <Label htmlFor="proactive">Proactive Check-up</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="customer_request" id="client"/>
                                                <Label htmlFor="client">Client Request</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                />
                                {errors.visitType && <p className="text-sm text-destructive">{errors.visitType.message}</p>}
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="laborCost">Initial Cost (EGP)</Label>
                                <Controller
                                    name="laborCost"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="laborCost"
                                            type="number"
                                            readOnly
                                            className="bg-muted"
                                            {...field}
                                            value={field.value || 0}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="maintenanceNotes">Visit Notes</Label>
                            <Textarea id="maintenanceNotes" {...register("maintenanceNotes")} placeholder="Initial notes about the visit..." />
                             {errors.maintenanceNotes && <p className="text-sm text-destructive">{errors.maintenanceNotes.message}</p>}
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Schedule Visit</Button>
                    </DialogFooter>
                 </form>
            </DialogContent>
        </Dialog>
    );
}
