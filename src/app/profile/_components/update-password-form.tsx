
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function UpdatePasswordForm() {
    const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    setIsSaving(true);
    try {
        // Here you would call a function from your auth hook to update the password
        // e.g., await updatePassword(data.currentPassword, data.newPassword);
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
            title: "Password Updated",
            description: "Your password has been successfully changed.",
        });
        reset();
    } catch(error) {
         toast({
            title: "Update Failed",
            description: (error as Error).message || "Could not update your password.",
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          For security, please enter your current password to make changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
