
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AnalyticsTabs() {
    const router = useRouter();
    const pathname = usePathname();

    const onTabChange = (value: string) => {
        router.push(value);
    };

    return (
        <Tabs value={pathname} onValueChange={onTabChange}>
            <TabsList className="w-full justify-start">
                <TabsTrigger value="/analytics">Business KPIs</TabsTrigger>
                <TabsTrigger value="/analytics/cancellation">Cancellation Reasons</TabsTrigger>
                <TabsTrigger value="/analytics/notifications">Notifications</TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
