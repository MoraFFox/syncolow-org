
"use client";

import { useEffect, useState } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MaintenanceEmployee } from "@/lib/types";
import { FormDialogWrapper } from '@/components/maintenance/form-dialog-wrapper';
import { FormSection } from '@/components/maintenance/form-section';
import { User, Phone, Mail, Award, Clock, Loader2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const crewMemberSchema = z.object({
    name: z.string().min(1, "Name is required."),
    phone: z.string().min(1, "Phone number is required."),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    role: z.string().min(1, "Role is required.").default("Technician"),
    status: z.enum(["active", "inactive", "on_leave"]).default("active"),
    skills: z.string().optional(), // Comma separated for simplicity in this version
    availability: z.string().optional(),
});

type CrewMemberFormData = z.infer<typeof crewMemberSchema>;

interface CrewMemberFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (data: Omit<MaintenanceEmployee, 'id'>) => void;
    crewMember?: MaintenanceEmployee | null;
}

export function CrewMemberForm({ isOpen, onOpenChange, onSubmit, crewMember }: CrewMemberFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<CrewMemberFormData>({
        resolver: zodResolver(crewMemberSchema),
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            role: 'Technician',
            status: 'active',
            skills: '',
            availability: 'Full-time'
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (crewMember) {
                reset({
                    name: crewMember.name,
                    phone: crewMember.phone,
                    email: crewMember.email || '',
                    role: crewMember.role || 'Technician',
                    status: crewMember.status || 'active',
                    skills: crewMember.skills?.join(', ') || '',
                    availability: crewMember.availability || 'Full-time'
                });
            } else {
                reset({
                    name: '',
                    phone: '',
                    email: '',
                    role: 'Technician',
                    status: 'active',
                    skills: '',
                    availability: 'Full-time'
                });
            }
        }
    }, [crewMember, reset, isOpen]);

    const handleFormSubmit = async (data: CrewMemberFormData) => {
        setIsSubmitting(true);
        try {
            // Process skills from comma-separated string to array
            const skillsArray = data.skills
                ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            onSubmit({
                name: data.name,
                phone: data.phone,
                email: data.email || undefined,
                role: data.role,
                status: data.status as "active" | "inactive" | "on_leave",
                skills: skillsArray,
                availability: data.availability,
                currentLoad: 0 // Default for new members
            });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const Footer = (
        <>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button onClick={handleSubmit(handleFormSubmit)} disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="mr-2 h-4 w-4" />
                        {crewMember ? 'Save Changes' : 'Add Member'}
                    </>
                )}
            </Button>
        </>
    );

    return (
        <FormDialogWrapper
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title={crewMember ? 'Edit Profile' : 'Onboard Technician'}
            description={crewMember ? "Update the technician's personal and professional details." : "Add a new member to the maintenance crew roster."}
            footer={Footer}
            maxWidth="lg"
        >
            <div className="space-y-6">

                {/* Personal Information */}
                <FormSection title="Personal Information" icon={User} description="Basic contact details.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" {...register("name")} placeholder="e.g. Ahmed Hassan" />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role / Title</Label>
                            <Input id="role" {...register("role")} placeholder="e.g. Senior Technician" />
                            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="phone" className="pl-9" {...register("phone")} placeholder="+20 1xx xxx xxxx" />
                            </div>
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="email" className="pl-9" {...register("email")} placeholder="email@example.com" />
                            </div>
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>
                    </div>
                </FormSection>

                {/* Professional Details */}
                <FormSection title="Professional Details" icon={Award}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="skills">Skills & Specialties <span className="text-xs font-normal text-muted-foreground">(Comma separated)</span></Label>
                            <Input id="skills" {...register("skills")} placeholder="e.g. HVAC, Electrical, Plumbing, Painting" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                <div className="flex items-center"><Badge variant="outline" className="mr-2 bg-green-500/10 text-green-600 border-green-500/20">Active</Badge> Active</div>
                                            </SelectItem>
                                            <SelectItem value="inactive">
                                                <div className="flex items-center"><Badge variant="outline" className="mr-2 bg-muted text-muted-foreground">Inactive</Badge> Inactive</div>
                                            </SelectItem>
                                            <SelectItem value="on_leave">
                                                <div className="flex items-center"><Badge variant="outline" className="mr-2 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">On Leave</Badge> On Leave</div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="availability">Availability</Label>
                            <div className="relative">
                                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="availability" className="pl-9" {...register("availability")} placeholder="e.g. Full-time, Weekends" />
                            </div>
                        </div>
                    </div>
                </FormSection>
            </div>
        </FormDialogWrapper>
    );
}
