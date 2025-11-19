
"use client";

import { useSettingsStore, ViewMode } from "@/store/use-settings-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClearData } from "./_components/clear-data";
import { NotificationSettings } from "./_components/notification-settings";
import { PaymentMigration } from "./_components/payment-migration";
import { UpdatePaymentScores } from "./_components/update-payment-scores";
import { SyncSearchCollection } from "./_components/sync-search-collection";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const viewModes: { name: ViewMode }[] = [
    { name: 'Comfortable' },
    { name: 'Compact' },
    { name: 'Geospatial' },
]

export default function SettingsPage() {
  const {
    paginationLimit,
    viewMode,
    setPaginationLimit,
    setViewMode,
  } = useSettingsStore();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize application appearance and behavior.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Adjust the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>View Mode</Label>
                <Select onValueChange={(value: ViewMode) => setViewMode(value)} value={viewMode}>
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select a view mode" />
                    </SelectTrigger>
                    <SelectContent>
                        {viewModes.map(mode => (
                            <SelectItem key={mode.name} value={mode.name}>{mode.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Change the layout and density of the application.</p>
            </div>
        </CardContent>
      </Card>
      
      <NotificationSettings />

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Control general application behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pagination-limit">Items Per Page</Label>
            <Select
              value={String(paginationLimit)}
              onValueChange={(value) => setPaginationLimit(Number(value))}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Select a limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Set the default number of items to show on paginated lists.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
            <CardDescription>Manage tax rates for your products and services.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href="/settings/taxes">Manage Taxes</Link>
            </Button>
        </CardContent>
      </Card>

      <PaymentMigration />

      <UpdatePaymentScores />

      <SyncSearchCollection />

      <ClearData />

    </div>
  );
}
