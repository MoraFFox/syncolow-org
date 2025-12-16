"use client";

import { lazy, Suspense } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";

const SyncSearchCollection = lazy(() => import("./sync-search-collection").then(m => ({ default: m.SyncSearchCollection })));
const ClearData = lazy(() => import("./clear-data").then(m => ({ default: m.ClearData })));

export function SystemSettings() {
    return (
        <div className='flex flex-col gap-6'>
            <Suspense fallback={<Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>}>
                <ErrorBoundary>
                    <SyncSearchCollection />
                </ErrorBoundary>
            </Suspense>

            <Suspense fallback={<Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>}>
                <ErrorBoundary>
                    <ClearData />
                </ErrorBoundary>
            </Suspense>
        </div>
    );
}
