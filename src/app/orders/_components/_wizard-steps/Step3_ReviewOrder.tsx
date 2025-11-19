

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useFormContext, Controller } from 'react-hook-form';
import type { OrderFormData } from '../order-form';
import type { Company } from '@/lib/types';
import { useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Percent } from 'lucide-react';
import { calculateExpectedPaymentDate } from '@/lib/payment-score';
import { calculateOrderTotals } from '@/lib/pricing-calculator';

interface Step3ReviewOrderProps {
    companies: Company[];
}

const StepDisplay: React.FC<{ title: string; content: string | React.ReactNode }> = ({ title, content }) => (
    <div className="flex justify-between">
        <span className="text-muted-foreground">{title}</span>
        <span className="font-medium text-right">{content}</span>
    </div>
);


export function Step3_ReviewOrder({ companies }: Step3ReviewOrderProps) {
    const { watch, control, setValue } = useFormContext<OrderFormData>();
    const orderData = watch();
    
    const { subtotal, totalTax, totalItemDiscount, finalSubtotal, overallDiscountAmount, grandTotal } = useMemo(() => {
        // Use new pricing calculation: Total = ((Quantity × Unit Price) - Discount) × 1.14
        const calculatedTotals = calculateOrderTotals(orderData.items.map(item => ({
            quantity: item.quantity,
            price: item.price,
            discountValue: item.discountValue || 0,
        })));

        // Apply overall order discount if specified
        let overallDiscount = 0;
        if (orderData.discountType && orderData.discountValue && orderData.discountValue > 0) {
            if (orderData.discountType === 'percentage') {
                overallDiscount = calculatedTotals.grandTotal * (orderData.discountValue / 100);
            } else {
                overallDiscount = orderData.discountValue;
            }
        }
        
        const finalTotal = calculatedTotals.grandTotal - overallDiscount;

        return { 
            subtotal: calculatedTotals.subtotal, 
            totalTax: calculatedTotals.taxAmount, 
            totalItemDiscount: calculatedTotals.totalDiscount,
            finalSubtotal: calculatedTotals.totalBeforeTax,
            overallDiscountAmount: overallDiscount, 
            grandTotal: finalTotal 
        };
    }, [orderData.items, orderData.discountType, orderData.discountValue]);

    useEffect(() => {
        setValue('subtotal', subtotal);
        setValue('totalTax', totalTax);
        setValue('discountAmount', totalItemDiscount + overallDiscountAmount);
        setValue('grandTotal', grandTotal);
    }, [subtotal, totalTax, totalItemDiscount, overallDiscountAmount, grandTotal, setValue]);

    const clientName = orderData.isPotentialClient
        ? orderData.temporaryCompanyName
        : companies.find(c => c.id === orderData.branchId)?.name || 'N/A';
    
    const clientDetails = companies.find((c: Company) => c.id === orderData.branchId);
    const parentCompany = clientDetails?.isBranch 
        ? companies.find((c: Company) => c.id === clientDetails.parentCompanyId) 
        : clientDetails;
    const hasPaymentConfig = parentCompany?.paymentDueType !== undefined;
    
    const autoCalculatedPaymentDate = useMemo(() => {
        if (!hasPaymentConfig || !parentCompany) return null;
        const orderDate = new Date().toISOString();
        return calculateExpectedPaymentDate(orderDate, parentCompany);
    }, [hasPaymentConfig, parentCompany]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(amount);
    }

    return (
        <div className="space-y-6 p-1">
             <Card>
                <CardHeader>
                    <CardTitle>Client & Delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <StepDisplay title="Client" content={clientName} />
                    {clientDetails?.location && <StepDisplay title="Location" content={clientDetails.location} />}
                    {!hasPaymentConfig && !orderData.isPotentialClient && (
                        <div className="grid gap-2 pt-2">
                            <Label htmlFor="paymentDueDate">Payment Due Date</Label>
                            <Controller
                                name="paymentDueDate"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="paymentDueDate"
                                        type="date"
                                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                    />
                                )}
                            />
                            <p className="text-xs text-muted-foreground">Client has no payment configuration</p>
                        </div>
                    )}
                    {hasPaymentConfig && autoCalculatedPaymentDate && (
                        <StepDisplay 
                            title="Payment Due" 
                            content={
                                <span>
                                    Auto-calculated: <span className="font-semibold">{format(new Date(autoCalculatedPaymentDate), 'PPP')}</span>
                                </span>
                            } 
                        />
                    )}
                    <StepDisplay title="Delivery Schedule" content={`Schedule ${orderData.region || 'A'}`} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Overall Order Discount</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                             <Label htmlFor="discountValue">Discount Value</Label>
                             <Controller
                                name="discountValue"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="discountValue"
                                        type="number"
                                        placeholder="e.g. 10 or 50"
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                    />
                                )}
                             />
                        </div>
                        <div className="grid gap-2">
                            <Label>Discount Type</Label>
                            <Controller
                                name="discountType"
                                control={control}
                                render={({ field }) => (
                                    <ToggleGroup
                                        type="single"
                                        variant="outline"
                                        value={field.value || undefined}
                                        onValueChange={(value: string) => field.onChange(value as 'percentage' | 'fixed' | null)}
                                        className="justify-start"
                                    >
                                        <ToggleGroupItem value="percentage" aria-label="Toggle percentage">
                                            <Percent className="h-4 w-4"/>
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="fixed" aria-label="Toggle fixed amount">
                                            <DollarSign className="h-4 w-4"/>
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                )}
                            />
                        </div>
                     </div>
                 </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="max-h-32 overflow-y-auto space-y-2 text-sm pr-2">
                        {orderData.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <div>
                                    <p>{item.productName} (x{item.quantity})</p>
                                    <div className="flex gap-2">
                                        {item.taxRate && <Badge variant="outline" className="text-xs">Tax {item.taxRate}%</Badge>}
                                        {item.discountValue && <Badge variant="outline" className="text-xs text-destructive">Discount -{item.discountValue}{item.discountType === 'percentage' ? '%' : '$'}</Badge>}
                                    </div>
                                </div>
                                <span>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                        <StepDisplay title="Subtotal" content={formatCurrency(subtotal)} />
                        {totalItemDiscount > 0 && <StepDisplay title="Item Discounts" content={<span className="text-destructive">- {formatCurrency(totalItemDiscount)}</span>} />}
                        <StepDisplay title="Tax" content={formatCurrency(totalTax)} />
                        {overallDiscountAmount > 0 && 
                            <StepDisplay 
                                title="Overall Discount" 
                                content={
                                    <span className="text-destructive">
                                        - {formatCurrency(overallDiscountAmount)}
                                    </span>
                                }
                            />
                        }
                    </div>
                    <Separator />
                     <div className="flex justify-between items-baseline">
                        <span className="text-lg font-bold">Grand Total</span>
                        <span className="text-2xl font-bold">{formatCurrency(grandTotal)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
