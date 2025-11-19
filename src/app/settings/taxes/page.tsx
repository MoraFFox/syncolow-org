
"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { TaxSettings } from "../_components/tax-settings";

export default function TaxesPage() {
    const router = useRouter();

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Tax Settings</h1>
                    <p className="text-muted-foreground">Create and manage tax rates for your products.</p>
                </div>
            </div>
            <TaxSettings />
        </div>
    )
}
