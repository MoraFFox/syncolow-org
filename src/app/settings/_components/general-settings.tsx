"use client";

import { useSettingsStore, ViewMode } from "@/store/use-settings-store";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const viewModes: { name: ViewMode }[] = [
    { name: "Comfortable" },
    { name: "Compact" },
    { name: "Geospatial" },
];

export function GeneralSettings() {
    const { paginationLimit, viewMode, setPaginationLimit, setViewMode } =
        useSettingsStore();
    const { settings, isLoading: settingsLoading } = useUserSettings();

    // Sync DB settings to local store on mount
    useEffect(() => {
        if (settings) {
            if (settings.view_mode && settings.view_mode !== viewMode) {
                setViewMode(settings.view_mode as ViewMode);
            }
            if (settings.pagination_limit && settings.pagination_limit !== paginationLimit) {
                setPaginationLimit(settings.pagination_limit);
            }
        }
    }, [settings]); // Intentionally not including store setters to avoid loops

    return (
        <div className='flex flex-col gap-6'>
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                        Adjust the look and feel of the application.
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                    <div className='space-y-2'>
                        <Label>View Mode</Label>
                        <Select
                            onValueChange={(value: ViewMode) => setViewMode(value)}
                            value={viewMode}
                            disabled={settingsLoading}
                        >
                            <SelectTrigger className='w-full md:w-1/2'>
                                <SelectValue placeholder='Select a view mode' />
                            </SelectTrigger>
                            <SelectContent>
                                {viewModes.map((mode) => (
                                    <SelectItem key={mode.name} value={mode.name}>
                                        {mode.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className='text-sm text-muted-foreground'>
                            Change the layout and density of the application.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>List Preference</CardTitle>
                    <CardDescription>
                        Control default list behaviors.
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                        <Label htmlFor='pagination-limit'>Items Per Page</Label>
                        <Select
                            value={String(paginationLimit)}
                            onValueChange={(value) => setPaginationLimit(Number(value))}
                            disabled={settingsLoading}
                        >
                            <SelectTrigger className='w-full md:w-[180px]'>
                                <SelectValue placeholder='Select a limit' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='10'>10</SelectItem>
                                <SelectItem value='20'>20</SelectItem>
                                <SelectItem value='50'>50</SelectItem>
                                <SelectItem value='100'>100</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className='text-sm text-muted-foreground'>
                            Set the default number of items to show on paginated lists.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
