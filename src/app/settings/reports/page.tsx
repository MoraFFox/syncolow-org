"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Mail, Clock, FileText, Save, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Recipient {
    email: string;
}

interface ReportSettings {
    deliveryEmails: Recipient[];
    warehouseEmails: Recipient[];
    scheduleTime: string;
    enabled: boolean;
    sendToAdmin: boolean;
}

export default function ReportSettingsPage() {
    const [settings, setSettings] = useState<ReportSettings>({
        deliveryEmails: [],
        warehouseEmails: [],
        scheduleTime: "00:00",
        enabled: true,
        sendToAdmin: true,
    });

    const [newDeliveryEmail, setNewDeliveryEmail] = useState("");
    const [newWarehouseEmail, setNewWarehouseEmail] = useState("");
    const [loading, setLoading] = useState(false);

    // Load settings from Supabase on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'daily_reports')
                    .single();

                if (error && error.code !== 'PGRST116') { // Ignore 0 rows error
                    console.error("Error fetching settings:", error);
                }

                if (data?.value) {
                    setSettings(data.value);
                }
            } catch (e) {
                console.error("Failed to load report settings", e);
            }
        }
        loadSettings();
    }, []);

    const saveSettings = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'daily_reports',
                    value: settings,
                    description: 'Configuration for Daily Delivery and Warehouse reports',
                    updated_by: user?.id,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            toast({
                title: "Settings Saved",
                description: "Daily report configuration has been updated.",
            });
        } catch (error: any) {
            toast({
                title: "Save Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const addEmail = (type: 'delivery' | 'warehouse') => {
        const email = type === 'delivery' ? newDeliveryEmail : newWarehouseEmail;
        const setter = type === 'delivery' ? setNewDeliveryEmail : setNewWarehouseEmail;

        if (!email || !email.includes('@')) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address.",
                variant: "destructive",
            });
            return;
        }

        const list = type === 'delivery' ? settings.deliveryEmails : settings.warehouseEmails;
        if (list.some(r => r.email === email)) {
            toast({
                title: "Duplicate Email",
                description: "This email is already in the recipient list.",
                variant: "destructive",
            });
            return;
        }

        setSettings(prev => ({
            ...prev,
            [type === 'delivery' ? 'deliveryEmails' : 'warehouseEmails']: [...list, { email }]
        }));
        setter("");
    };

    const removeEmail = (type: 'delivery' | 'warehouse', email: string) => {
        setSettings(prev => ({
            ...prev,
            [type === 'delivery' ? 'deliveryEmails' : 'warehouseEmails']:
                (type === 'delivery' ? prev.deliveryEmails : prev.warehouseEmails).filter(r => r.email !== email)
        }));
    };

    const sendTestReport = async () => {
        const adminEmail = settings.sendToAdmin ?
            process.env.NEXT_PUBLIC_ADMIN_EMAIL : undefined;

        const hasRecipients = settings.deliveryEmails.length > 0 || settings.warehouseEmails.length > 0;
        const hasAdmin = !!adminEmail;

        // Check if user typed email but forgot to add it
        if (!hasRecipients && (newDeliveryEmail || newWarehouseEmail)) {
            toast({
                title: "Unsaved Recipient",
                description: "You typed an email but didn't add it. Please click the + button next to the input.",
                variant: "destructive",
            });
            return;
        }

        if (!hasRecipients && !hasAdmin) {
            toast({
                title: "No Recipients",
                description: "Be sure to add a recipient (click +) or configure an Admin Email in environment variables.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const deliveryList = settings.deliveryEmails.map(r => r.email);
            const warehouseList = settings.warehouseEmails.map(r => r.email);

            const response = await fetch('/api/reports/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sendEmail: true,
                    recipients: {
                        deliveryEmails: deliveryList,
                        warehouseEmails: warehouseList,
                        adminEmail
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Test Sent",
                    description: "Daily reports have been generated and emailed.",
                });
            } else {
                const errorMessage = result.error ||
                    (result.email?.errors?.length > 0 ? result.email.errors.join(', ') : "Failed to send reports");
                throw new Error(errorMessage);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to send test reports",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daily Report Settings</h1>
                    <p className="text-muted-foreground mt-2">
                        Configure automated daily PDF reports for Delivery and Warehouse teams.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={sendTestReport} disabled={loading}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Test
                    </Button>
                    <Button onClick={saveSettings} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* General Configuration */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            <CardTitle>Schedule & Status</CardTitle>
                        </div>
                        <CardDescription>Control when the reports are generated and sent.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Daily Reports</Label>
                                <p className="text-sm text-muted-foreground">Automatically generate and send reports</p>
                            </div>
                            <Switch
                                checked={settings.enabled}
                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Schedule Time</Label>
                                <p className="text-sm text-muted-foreground">Time to send reports (UTC)</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={settings.scheduleTime}
                                    onChange={(e) => setSettings(prev => ({ ...prev, scheduleTime: e.target.value }))}
                                    className="w-32"
                                />
                                <Badge variant="outline">UTC +2</Badge>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Send Admin Copy</Label>
                                <p className="text-sm text-muted-foreground">Send a copy of all reports to admin</p>
                            </div>
                            <Switch
                                checked={settings.sendToAdmin}
                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sendToAdmin: checked }))}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Team Configuration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <CardTitle>Delivery Reports</CardTitle>
                        </div>
                        <CardDescription>Recipients for route and delivery manifests</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="email@example.com"
                                value={newDeliveryEmail}
                                onChange={(e) => setNewDeliveryEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addEmail('delivery')}
                            />
                            <Button size="icon" onClick={() => addEmail('delivery')} variant="outline">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {settings.deliveryEmails.map((recipient) => (
                                <div key={recipient.email} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{recipient.email}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => removeEmail('delivery', recipient.email)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {settings.deliveryEmails.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No recipients added</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Warehouse Team Configuration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-500" />
                            <CardTitle>Warehouse Reports</CardTitle>
                        </div>
                        <CardDescription>Recipients for consumption and status reports</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="email@example.com"
                                value={newWarehouseEmail}
                                onChange={(e) => setNewWarehouseEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addEmail('warehouse')}
                            />
                            <Button size="icon" onClick={() => addEmail('warehouse')} variant="outline">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {settings.warehouseEmails.map((recipient) => (
                                <div key={recipient.email} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{recipient.email}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => removeEmail('warehouse', recipient.email)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {settings.warehouseEmails.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No recipients added</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
