
"use client";

import { Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ContactsSubForm } from './contacts-sub-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BranchSubFormProps } from '@/types/forms';

export function BranchSubForm({
    index,
    control,
    register,
    errors,
    watch,
    setValue,
    removeBranch,
    openMapPicker
}: BranchSubFormProps) {
    const watchMachineOwned = watch(`branches.${index}.machineOwned`);

    return (
        <Card className="animate-in fade-in-0 slide-in-from-top-5">
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle>Branch #{index + 1}</CardTitle>
                    <CardDescription>Enter the details for this specific branch location.</CardDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={removeBranch} className="h-7 w-7 -mt-2 -mr-2">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Branch Name</Label>
                        <Input {...register(`branches.${index}.name`)} />
                        {(errors.branches as Record<string, { name?: { message?: string } }>)?.[index]?.name && (
                            <p className="text-sm text-destructive">
                                {(errors.branches as Record<string, { name?: { message?: string } }>)[index]?.name?.message}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input type="email" {...register(`branches.${index}.email`)} />
                        {(errors.branches as Record<string, { email?: { message?: string } }>)?.[index]?.email && (
                            <p className="text-sm text-destructive">
                                {(errors.branches as Record<string, { email?: { message?: string } }>)[index]?.email?.message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label>Tax Number (Optional)</Label>
                        <Input {...register(`branches.${index}.taxNumber`)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Delivery Schedule</Label>
                        <Controller
                            name={`branches.${index}.region`}
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select schedule" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A">Schedule A</SelectItem>
                                        <SelectItem value="B">Schedule B</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Area</Label>
                        <Controller
                            name={`branches.${index}.area`}
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select area" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Stores">Stores</SelectItem>
                                        <SelectItem value="Maadi">Maadi</SelectItem>
                                        <SelectItem value="6th October">6th October</SelectItem>
                                        <SelectItem value="Misr Elgadida">Misr Elgadida</SelectItem>
                                        <SelectItem value="Tagamoa">Tagamoa</SelectItem>
                                        <SelectItem value="Down Town">Down Town</SelectItem>
                                        <SelectItem value="Rehab">Rehab</SelectItem>
                                        <SelectItem value="Heliopolis">Heliopolis</SelectItem>
                                        <SelectItem value="Nasr City">Nasr City</SelectItem>
                                        <SelectItem value="Zamalek">Zamalek</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label>Maintenance Location</Label>
                    <Controller
                        name={`branches.${index}.maintenanceLocation`}
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={(field.value as string) || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select maintenance location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inside_cairo">Inside Cairo (500 EGP)</SelectItem>
                                    <SelectItem value="outside_cairo">Outside Cairo (1500 EGP)</SelectItem>
                                    <SelectItem value="sahel">Sahel (4000 EGP)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Branch Location</Label>
                    <div className="relative">
                        <Input {...register(`branches.${index}.location`)} placeholder="Type address or click icon" className="pr-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => openMapPicker('branch', index)}>
                            <MapPin className="h-4 w-4" />
                        </Button>
                    </div>
                    {(errors.branches as Record<string, { location?: { message?: string } }>)?.[index]?.location && (
                        <p className="text-sm text-destructive">
                            {(errors.branches as Record<string, { location?: { message?: string } }>)?.[index]?.location?.message}
                        </p>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Machine Ownership</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2 mb-4">
                            <Controller
                                name={`branches.${index}.machineOwned`}
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id={`machineOwned-${index}`}
                                        checked={field.value as boolean}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor={`machineOwned-${index}`}>Client Owns the Machine</Label>
                        </div>
                        {!watchMachineOwned && (
                            <>
                                <div className="grid gap-2">
                                    <Label>Machine Status (Owned by SynergyFlow)</Label>
                                    <Controller
                                        name={`branches.${index}.machineLeased`}
                                        control={control}
                                        render={({ field }) => (
                                            <RadioGroup
                                                onValueChange={(v) => field.onChange(v === 'true')}
                                                value={String(field.value)}
                                                className="flex gap-4"
                                            >
                                                <Label htmlFor={`machineLeased-${index}`} className="p-2 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                    <RadioGroupItem value="true" id={`machineLeased-${index}`} /> Leased
                                                </Label>
                                                <Label htmlFor={`machineBought-${index}`} className="p-2 border rounded-md flex items-center gap-2 [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                    <RadioGroupItem value="false" id={`machineBought-${index}`} /> Bought
                                                </Label>
                                            </RadioGroup>
                                        )}
                                    />
                                </div>
                                {watch(`branches.${index}.machineLeased`) && (
                                    <div className="grid gap-2">
                                        <Label htmlFor={`leaseMonthlyCost-${index}`}>Monthly Lease Cost (EGP)</Label>
                                        <Input
                                            id={`leaseMonthlyCost-${index}`}
                                            type="number"
                                            min="0"
                                            {...register(`branches.${index}.leaseMonthlyCost`, { valueAsNumber: true })}
                                            placeholder="e.g. 1000"
                                        />
                                        {(errors.branches as Record<string, { leaseMonthlyCost?: { message?: string } }>)?.[index]?.leaseMonthlyCost && (
                                            <p className="text-sm text-destructive">
                                                {(errors.branches as Record<string, { leaseMonthlyCost?: { message?: string } }>)[index]?.leaseMonthlyCost?.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                <Separator />

                <ContactsSubForm
                    control={control}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    fieldNamePrefix={`branches.${index}.contacts`}
                    title="Branch Contacts"
                    description="Key personnel for this branch."
                />

                <Separator />

                <Card>
                    <CardHeader>
                        <CardTitle>Warehouse</CardTitle>
                        <CardDescription>Warehouse details for this branch.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Warehouse Location</Label>
                            <div className="relative">
                                <Input {...register(`branches.${index}.warehouseLocation`)} placeholder="Type address or click icon" className="pr-10" />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => openMapPicker('warehouse', index)}>
                                    <MapPin className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <ContactsSubForm
                            control={control}
                            register={register}
                            errors={errors}
                            setValue={setValue}
                            fieldNamePrefix={`branches.${index}.warehouseContacts`}
                            title="Warehouse Contacts"
                            description="Warehouse or logistics contacts for this branch."
                        />
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
}
