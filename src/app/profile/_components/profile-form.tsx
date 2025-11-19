
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUpload } from "@/components/ui/image-upload";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { user, updateProfile, updateProfilePicture } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.displayName || "",
      email: user?.email || "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      if (selectedFiles.length > 0) {
        await updateProfilePicture(selectedFiles[0]);
      }
      await updateProfile({ displayName: data.name });

      toast({
        title: "Profile Updated",
        description: "Your information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setSelectedFiles([]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
        <CardDescription>Update your photo, name, and email address.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
           <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
                 <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                    <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="w-full">
                    <ImageUpload onFilesChange={setSelectedFiles} maxFiles={1} />
                </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} disabled />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
