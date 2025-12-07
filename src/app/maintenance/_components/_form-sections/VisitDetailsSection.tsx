
"use client";

import { useFormContext, Controller } from 'react-hook-form';
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import type { VisitOutcomeFormData } from '../maintenance-schemas';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { VisitOutcomeFormData } from '../../maintenance-schemas';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { Combobox } from '@/components/ui/combo-box';

interface VisitDetailsSectionProps {
    control: Control<VisitOutcomeFormData>;
    register: UseFormRegister<VisitOutcomeFormData>;
    errors: FieldErrors<VisitOutcomeFormData>;
}

export function VisitDetailsSection({ control, register, errors }: VisitDetailsSectionProps) {
    const { maintenanceEmployees } = useMaintenanceStore();
    
    return (
        <AccordionItem value="details">
            <AccordionTrigger className="font-semibold text-lg bg-muted px-5 rounded-sm bg-gray-500/20 border-gray-500/20 border">Visit Details</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="technicianName">Crew Member Name</Label>
                        <Controller
                            name="technicianName"
                            control={control}
                            render={({ field }) => (
                                <Combobox
                                    options={(maintenanceEmployees || []).map(b => ({ label: b.name, value: b.name }))}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select a crew member..."
                                    searchPlaceholder="Search crew..."
                                    emptyText="No crew members found."
                                />
                            )}
                        />
                        {errors.technicianName && <p className="text-sm text-destructive">{errors.technicianName.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="actualArrivalDate">Actual Arrival Date & Time</Label>
                        <Controller
                            name="actualArrivalDate"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="actualArrivalDate"
                                    type="datetime-local"
                                    value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                />
                            )}
                        />
                        {errors.actualArrivalDate && <p className="text-sm text-destructive">{errors.actualArrivalDate.message}</p>}
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label>Barista Recommendations</Label>
                    <Textarea {...register("baristaRecommendations")} placeholder="Enter maintenance recommendations from the barista..." />
                </div>
                <div className="grid gap-2">
                    <Label>Overall Technical Report</Label>
                    <Textarea {...register("overallReport")} placeholder="Any additional notes or a summary of the visit..." />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
