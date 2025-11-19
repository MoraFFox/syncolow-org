
"use client";

import { UpdatePasswordForm } from "./_components/update-password-form";
import { ProfileForm } from "./_components/profile-form";

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and personal information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ProfileForm />
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
