"use client";

import { useState } from 'react';
import { useSalesAccounts } from '@/hooks/use-sales-accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Edit, Plus, Star, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalesAccount } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const DEFAULT_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#64748b', // Slate
];

export function SalesAccountSettings() {
    const { accounts, addAccount, updateAccount, deleteAccount, defaultAccountId, setDefaultAccount, isLoading } = useSalesAccounts();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<SalesAccount | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        codes: '', // Comma usage
        name: '',
        color: DEFAULT_COLORS[5],
        description: ''
    });

    const resetForm = () => {
        setFormData({ codes: '', name: '', color: DEFAULT_COLORS[5], description: '' });
        setEditingAccount(null);
    };

    const handleOpenDialog = (account?: SalesAccount) => {
        if (account) {
            setEditingAccount(account);
            setFormData({
                codes: account.codes.join(', '),
                name: account.name,
                color: account.color,
                description: account.description || ''
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        // Validate
        if (!formData.name || !formData.codes) {
            toast({ title: "Validation Error", description: "Dept Codes and Name are required.", variant: "destructive" });
            return;
        }

        const codesArray = formData.codes.split(',').map(c => c.trim()).filter(c => c.length > 0);
        if (codesArray.length === 0) {
            toast({ title: "Validation Error", description: "At least one code is required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (editingAccount) {
                // Update
                // Check if any code exists in other accounts
                const existingWithCode = accounts.find(a =>
                    a.id !== editingAccount.id &&
                    a.codes.some(c => codesArray.includes(c))
                );

                if (existingWithCode) {
                    toast({ title: "Code Conflict", description: `One of these codes is already in use by ${existingWithCode.name}.`, variant: "destructive" });
                    return;
                }

                await updateAccount(editingAccount.id, {
                    ...formData,
                    codes: codesArray
                });
            } else {
                // Create
                const existingWithCode = accounts.find(a =>
                    a.codes.some(c => codesArray.includes(c))
                );

                if (existingWithCode) {
                    toast({ title: "Code Conflict", description: `One of these codes is already in use by ${existingWithCode.name}.`, variant: "destructive" });
                    return;
                }

                await addAccount({
                    name: formData.name,
                    codes: codesArray,
                    color: formData.color,
                    description: formData.description
                });
            }
            setIsDialogOpen(false);
            resetForm();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Sales Department Accounts</CardTitle>
                        <CardDescription>Manage mapping between Customer Account IDs and Sales Sections.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading accounts...
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        No sales accounts configured yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {accounts.map((account) => (
                            <div
                                key={account.id}
                                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                                style={{ borderLeft: `4px solid ${account.color}` }}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-lg">{account.name}</span>
                                        {account.codes.map(code => (
                                            <Badge key={code} variant="outline" className="font-mono text-xs">
                                                {code}
                                            </Badge>
                                        ))}
                                        {defaultAccountId === account.id && (
                                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                Default
                                            </Badge>
                                        )}
                                    </div>
                                    {account.description && (
                                        <span className="text-sm text-muted-foreground">{account.description}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant={defaultAccountId === account.id ? "ghost" : "outline"}
                                        className={cn(defaultAccountId === account.id && "text-primary")}
                                        disabled={defaultAccountId === account.id}
                                        onClick={() => {
                                            setDefaultAccount(account.id);
                                            toast({ title: "Default Updated", description: `${account.name} is now the default account.` });
                                        }}
                                    >
                                        {defaultAccountId === account.id ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Default
                                            </>
                                        ) : "Set Default"}
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(account)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this account?')) {
                                                deleteAccount(account.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAccount ? 'Edit Account' : 'New Sales Account'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="codes" className="text-right">Dept Codes</Label>
                            <div className="col-span-3">
                                <Input
                                    id="codes"
                                    value={formData.codes}
                                    onChange={(e) => setFormData({ ...formData, codes: e.target.value })}
                                    placeholder="e.g. 1016, 1017"
                                    className="font-mono"
                                />
                                <p className="text-[0.8rem] text-muted-foreground mt-1">
                                    Comma-separated 4-digit codes this account handles.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Retail"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="color" className="text-right">Color</Label>
                            <div className="col-span-3 flex flex-wrap gap-2">
                                {DEFAULT_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-all",
                                            formData.color === c ? "border-foreground scale-110" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setFormData({ ...formData, color: c })}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desc" className="text-right">Description</Label>
                            <Input
                                id="desc"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
