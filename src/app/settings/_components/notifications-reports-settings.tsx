"use client";

import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react"; // Wait, wrong Link import
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import NextLink from "next/link"; // Use explicit name to avoid confusion

const NotificationSettings = lazy(() => import("./notification-settings").then(m => ({ default: m.NotificationSettings })));

export function NotificationsReportsSettings() {
    return (
        <div className='flex flex-col gap-6'>
            <Suspense fallback={<Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>}>
                <ErrorBoundary>
                    <NotificationSettings />
                </ErrorBoundary>
            </Suspense>

            <Card>
                <CardHeader>
                    <CardTitle>Daily Reports</CardTitle>
                    <CardDescription>
                        Configure automated daily reports for delivery and warehouse teams.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <NextLink href='/settings/reports'>Manage Reports</NextLink>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
