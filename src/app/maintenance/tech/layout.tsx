"use client";

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

export default function TechLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background px-4 text-center">
                <p className="text-muted-foreground">Please log in to access Technician Mode.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground safe-area-inset-bottom">
            <main className="max-w-md mx-auto min-h-screen relative pb-20">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
