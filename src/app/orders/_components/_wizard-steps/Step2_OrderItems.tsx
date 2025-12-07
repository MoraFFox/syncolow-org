
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Minus, Plus, Trash2, Tag, Percent, DollarSign, Wrench } from 'lucide-react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import type { OrderFormData } from '../order-schemas';
import { ProductPicker } from '@/components/ui/product-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrderStore } from '@/store/use-order-store';
import { useTaxesStore } from '@/store';
import { Tax } from '@/lib/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useMemo } from 'react';
import { format, subMonths, isAfter, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Step2OrderItemsProps {
    products?: unknown[]; // Deprecated: Not used, kept for backward compatibility
}

function ClientInsights() {
    const { watch } = useFormContext<OrderFormData>();
    const { maintenanceVisits } = useMaintenanceStore();

    const selectedBranchId = watch('branchId');

    const lastMaintenanceDate = useMemo(() => {
        if (!selectedBranchId) return null;

        const clientVisits = maintenanceVisits
            .filter(v => v.branchId === selectedBranchId)
            .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

        if (clientVisits.length > 0) {
            const date = clientVisits[0].date;
            const parsedDate = typeof date === 'string' ? parseISO(date) : date;
            return isValid(parsedDate) ? format(parsedDate, 'PPP') : "Invalid date";
        }

        return "No maintenance records found.";
    }, [selectedBranchId, maintenanceVisits]);
    
    if(!selectedBranchId) return null;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Client Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-sm">
                    <span className="font-medium">Last Maintenance: </span>
                    <span className="text-muted-foreground">{lastMaintenanceDate}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function Step2_OrderItems({ products }: Step2OrderItemsProps) {
    const { control, setValue, watch } = useFormContext<OrderFormData>();
    const { orders } = useOrderStore();
    const { taxes } = useTaxesStore();
    
    const selectedBranchId = watch('branchId');

    const { fields, remove, update, replace } = useFieldArray({
        control,
        name: "items",
        keyName: "fieldId"
    });

    const handleUpdateQuantity = (index: number, newQuantity: number) => {
        if (newQuantity > 0) {
            const currentItem = fields[index];
            update(index, { ...currentItem, quantity: newQuantity });
        }
    }
    
    const handleTaxChange = (index: number, taxId: string) => {
        const selectedTax = taxes.find(t => t.id === taxId);
        const currentItem = fields[index];
        update(index, {
            ...currentItem,
            taxId: selectedTax ? selectedTax.id : null,
            taxRate: selectedTax ? selectedTax.rate : 0,
        });
    };
    
    const handleItemDiscountChange = (index: number, type: 'percentage' | 'fixed' | null, value: number | null) => {
        const currentItem = fields[index];
        const newDiscountType = value ? type : null;
        update(index, {
            ...currentItem,
            discountType: newDiscountType,
            discountValue: value,
        });
    }

    const calculateAvgConsumption = (productId: string): number => {
        if (!selectedBranchId) return 0;

        const sixMonthsAgo = subMonths(new Date(), 6);
        let totalQuantity = 0;

        orders.forEach(order => {
            if (
                order.branchId === selectedBranchId &&
                isAfter(new Date(order.orderDate), sixMonthsAgo)
            ) {
                order.items.forEach(item => {
                    if (item.productId === productId) {
                        totalQuantity += item.quantity;
                    }
                });
            }
        });

        return totalQuantity / 6;
    };


    return (
        <div className="space-y-4 p-1">
            <ClientInsights />
            <div className="grid gap-2">
                <Label>Add Product</Label>
                <Controller
                    control={control}
                    name="items"
                    render={({ field }) => (
                        <ProductPicker
                            selectedProducts={field.value}
                            onSelectionChange={(newItems) => {
                                replace(newItems);
                            }}
                        />
                    )}
                />
            </div>
            <div>
               <Label>Order Items</Label>
               <div className="border rounded-lg max-h-[26rem] overflow-y-auto">
                   <Table>
                       <TableHeader>
                           <TableRow>
                               <TableHead>Product</TableHead>
                               <TableHead className="w-[120px]">Quantity</TableHead>
                               <TableHead>Avg. Consumption</TableHead>
                               <TableHead>Tax</TableHead>
                               <TableHead>Discount</TableHead>
                               <TableHead className="text-right">Price</TableHead>
                               <TableHead className="text-right">Actions</TableHead>
                           </TableRow>
                       </TableHeader>
                       <TableBody>
                           {fields.length === 0 ? (
                               <TableRow>
                                   <TableCell colSpan={7} className="text-center">No items added yet.</TableCell>
                               </TableRow>
                           ) : (
                               fields.map((item, index) => (
                                   <TableRow key={item.fieldId}>
                                       <TableCell className="font-medium">{item.productName}</TableCell>
                                       <TableCell>
                                           <div className="flex items-center gap-2">
                                               <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => handleUpdateQuantity(index, item.quantity - 1)} disabled={item.quantity <= 1}>
                                                   <Minus className="h-4 w-4"/>
                                               </Button>
                                               <Input
                                                    type="number"
                                                    className="w-14 h-8 text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                                />
                                               <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => handleUpdateQuantity(index, item.quantity + 1)}>
                                                   <Plus className="h-4 w-4" />
                                               </Button>
                                           </div>
                                       </TableCell>
                                       <TableCell className="text-sm text-muted-foreground">{calculateAvgConsumption(item.productId).toFixed(1)}/mo</TableCell>
                                       <TableCell>
                                            <Select
                                                value={item.taxId || 'no-tax'}
                                                onValueChange={(value) => handleTaxChange(index, value)}
                                            >
                                                <SelectTrigger className="w-[120px]">
                                                    <SelectValue placeholder="Select Tax" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="no-tax">No Tax</SelectItem>
                                                    {taxes.map((tax: Tax) => (
                                                        <SelectItem key={tax.id} value={tax.id}>
                                                            {tax.name} ({tax.rate}%)
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                       </TableCell>
                                       <TableCell>
                                           <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    placeholder="-"
                                                    className="w-20 h-8"
                                                    value={item.discountValue ?? ''}
                                                    onChange={(e) => handleItemDiscountChange(index, item.discountType || 'percentage', parseFloat(e.target.value) || null)}
                                                />
                                                <ToggleGroup
                                                    type="single"
                                                    variant="outline"
                                                    size="sm"
                                                    value={item.discountType || undefined}
                                                    onValueChange={(value: 'percentage' | 'fixed') => {
                                                        if (value) {
                                                            handleItemDiscountChange(index, value, item.discountValue || null);
                                                        }
                                                    }}
                                                >
                                                    <ToggleGroupItem value="percentage" aria-label="Percentage discount" className="w-8 h-8 p-0">
                                                        <Percent className="h-4 w-4" />
                                                    </ToggleGroupItem>
                                                    <ToggleGroupItem value="fixed" aria-label="Fixed discount" className="w-8 h-8 p-0">
                                                        <DollarSign className="h-4 w-4" />
                                                    </ToggleGroupItem>
                                                </ToggleGroup>
                                           </div>
                                       </TableCell>
                                       <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                                       <TableCell className="text-right">
                                           <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(index)}>
                                               <Trash2 className="h-4 w-4 text-destructive"/>
                                           </Button>
                                       </TableCell>
                                   </TableRow>
                               ))
                           )}
                       </TableBody>
                   </Table>
               </div>
           </div>
        </div>
    );
}

