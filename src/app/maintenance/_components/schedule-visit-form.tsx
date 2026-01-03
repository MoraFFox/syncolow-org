
"use client";

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCompanyStore } from '@/store/use-company-store';
import type { MaintenanceVisit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Calendar as CalendarIcon, User, Layers, FileText, Loader2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

// Custom Components
import { FormSection } from '@/components/maintenance/form-section';
import { FormDialogWrapper } from '@/components/maintenance/form-dialog-wrapper';
import { Badge } from '@/components/ui/badge';

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived state for the selected client's location label
    const [locationLabel, setLocationLabel] = useState<string | null>(null);

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

                // Set user-friendly label
                if (maintenanceLocation === 'inside_cairo') setLocationLabel('Inside Cairo');
                else if (maintenanceLocation === 'outside_cairo') setLocationLabel('Outside Cairo');
                else if (maintenanceLocation === 'sahel') setLocationLabel('Sahel');
                else setLocationLabel(null);
            }
        } else {
            setValue('laborCost', 0);
            setLocationLabel(null);
        }
    }, [selectedBranchId, companies, setValue]);


    const onSubmit = async (data: ScheduleFormData) => {
        setIsSubmitting(true);
        try {
            const company = companies.find(c => c.id === data.branchId);
            await onFormSubmit({
                ...data,
                date: data.date.toISOString(),
                companyId: company?.parentCompanyId || company?.id || '',
                branchName: company?.name || 'Unknown',
                companyName: companies.find(c => c.id === (company?.parentCompanyId || company?.id))?.name || 'Unknown',
                technicianName: 'Unassigned', // Required field - will be assigned later
                maintenanceNotes: data.maintenanceNotes || '', // Ensure string is provided
            } as Omit<MaintenanceVisit, 'id'>);

            toast({
                title: "Visit Scheduled",
                description: "The new maintenance visit has been added to the schedule.",
            });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to schedule visit. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
            setIsSubmitting(false);
        }
        onOpenChange(open);
    }

    // Submit Button
    const Footer = (
        <>
            <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                    </>
                ) : (
                    <>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Schedule Visit
                    </>
                )}
            </Button>
        </>
    );

    return (
        <FormDialogWrapper
            isOpen={isOpen}
            onOpenChange={handleOpenChange}
            title="Schedule Maintenance"
            description="Create a new maintenance visit for a client."
            footer={Footer}
            maxWidth="xl"
            className="sm:max-w-xl"
        >
            <div className="space-y-6">

                {/* Section 1: Client Selection */}
                <FormSection title="Client Details" icon={User} description="Select the client and verify location cost.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="branchId" className="text-xs font-medium uppercase text-muted-foreground">Select Client</Label>
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
                                                className={cn(
                                                    "w-full justify-between pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? companies.find((client) => client.id === field.value)?.name
                                                    : "Search client..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
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
                                                                <div className="flex flex-col">
                                                                    <span>{client.name}</span>
                                                                    {client.isBranch && <span className="text-[10px] text-muted-foreground">Branch</span>}
                                                                </div>
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
                            <Label htmlFor="laborCost" className="text-xs font-medium uppercase text-muted-foreground">
                                Labor Cost <span className="text-muted-foreground/70 font-normal">(Auto-calculated)</span>
                            </Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="laborCost"
                                    type="number"
                                    readOnly
                                    className="pl-8 bg-muted font-medium"
                                    {...register("laborCost")}
                                />
                                {locationLabel && (
                                    <div className="absolute right-2 top-2">
                                        <Badge variant="outline" className="text-[10px] h-5 bg-background">{locationLabel}</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </FormSection>

                {/* Section 2: Visit Logistics */}
                <FormSection title="Logistics" icon={Layers} description="Set the date and type of visit.">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Date</Label>
                            <Controller
                                name="date"
                                control={control}
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal pl-3",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs font-medium uppercase text-muted-foreground">Type</Label>
                            <Controller
                                name="visitType"
                                control={control}
                                render={({ field }) => (
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex flex-col gap-2 pt-1"
                                    >
                                        <div className="flex items-center space-x-2 rounded-md border p-2 hover:bg-accent cursor-pointer transition-colors">
                                            <RadioGroupItem value="periodic" id="periodic" />
                                            <Label htmlFor="periodic" className="cursor-pointer flex-1">Periodic Check-up</Label>
                                        </div>
                                        <div className="flex items-center space-x-2 rounded-md border p-2 hover:bg-accent cursor-pointer transition-colors">
                                            <RadioGroupItem value="customer_request" id="customer_request" />
                                            <Label htmlFor="customer_request" className="cursor-pointer flex-1">Customer Request</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            />
                            {errors.visitType && <p className="text-sm text-destructive">{errors.visitType.message}</p>}
                        </div>
                    </div>
                </FormSection>

                {/* Section 3: Notes */}
                <FormSection title="Additional Notes" icon={FileText}>
                    <div className="grid gap-2">
                        <Textarea
                            {...register("maintenanceNotes")}
                            placeholder="Enter any access instructions, specific issues reported, or tools needed..."
                            className="min-h-[80px]"
                        />
                        {errors.maintenanceNotes && <p className="text-sm text-destructive">{errors.maintenanceNotes.message}</p>}
                    </div>
                </FormSection>

            </div>
        </FormDialogWrapper>
    );
}
