"use client";

import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ErrorBoundary } from "@/components/error-boundary";

const PaymentMigration = lazy(() => import("./payment-migration").then(m => ({ default: m.PaymentMigration })));
const UpdatePaymentScores = lazy(() => import("./update-payment-scores").then(m => ({ default: m.UpdatePaymentScores })));

export function AccountingSettings() {
    return (
        <div className='flex flex-col gap-6'>
            <Card>
                <CardHeader>
                    <CardTitle>Tax Settings</CardTitle>
                    <CardDescription>
                        Manage tax rates for your products and services.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href='/settings/taxes'>Manage Taxes</Link>
                    </Button>
                </CardContent>
            </Card>

            <Suspense fallback={<Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>}>
                <ErrorBoundary>
                    <PaymentMigration />
                </ErrorBoundary>
            </Suspense>

            <Suspense fallback={<Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>}>
                <ErrorBoundary>
                    <UpdatePaymentScores />
                </ErrorBoundary>
            </Suspense>
        </div>
    );
}
