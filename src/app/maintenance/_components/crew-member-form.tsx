
"use client";

import { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import type { MaintenanceEmployee } from "@/lib/types";

const crewMemberSchema = z.object({
  name: z.string().min(1, "Name is required."),
  phone: z.string().min(1, "Phone number is required."),
});

type CrewMemberFormData = z.infer<typeof crewMemberSchema>;

interface CrewMemberFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (data: Omit<MaintenanceEmployee, 'id'>) => void;
    crewMember?: MaintenanceEmployee | null;
}

export function CrewMemberForm({ isOpen, onOpenChange, onSubmit, crewMember }: CrewMemberFormProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<CrewMemberFormData>({
        resolver: zodResolver(crewMemberSchema),
    });

    useEffect(() => {
        if (isOpen) {
            if (crewMember) {
                reset({name: crewMember.name, phone: crewMember.phone});
            } else {
                reset({ name: '', phone: '' });
            }
        }
    }, [crewMember, reset, isOpen]);

    const handleFormSubmit = (data: CrewMemberFormData) => {
        onSubmit(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{crewMember ? 'Edit Crew Member' : 'Add New Crew Member'}</DialogTitle>
                    <DialogDescription>
                        {crewMember ? "Update the crew member's details." : "Enter the details for the new crew member."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" {...register("name")} />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" {...register("phone")} />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">{crewMember ? 'Save Changes' : 'Add Member'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
