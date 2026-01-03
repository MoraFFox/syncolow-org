
"use client";

import { Controller } from 'react-hook-form';
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import type { VisitOutcomeFormData } from '../maintenance-schemas';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
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
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="technicianName">Crew Member Name</Label>
                    <Controller
                        name="technicianName"
                        control={control}
                        render={({ field }) => (
                            <Combobox
                                options={Array.from(new Set((maintenanceEmployees || []).map(b => b.name)))
                                    .filter(Boolean)
                                    .map(name => ({ label: name, value: name }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a crew member..."
                                searchPlaceholder="Search crew..."
                                emptyText="No crew members found."
                                aria-invalid={!!errors.technicianName}
                                aria-describedby={errors.technicianName ? "technicianName-error" : undefined}
                            />
                        )}
                    />
                    {errors.technicianName && (
                        <p id="technicianName-error" role="alert" className="text-sm text-destructive">
                            {errors.technicianName.message}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="actualArrivalDate">Actual Arrival Date</Label>
                    <Controller
                        name="actualArrivalDate"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="actualArrivalDate"
                                type="date"
                                value={field.value ? format(field.value, "yyyy-MM-dd") : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                                aria-invalid={!!errors.actualArrivalDate}
                                aria-describedby={errors.actualArrivalDate ? "actualArrivalDate-error" : undefined}
                            />
                        )}
                    />
                    {errors.actualArrivalDate && (
                        <p id="actualArrivalDate-error" role="alert" className="text-sm text-destructive">
                            {errors.actualArrivalDate.message}
                        </p>
                    )}
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
        </div>
    );
}
