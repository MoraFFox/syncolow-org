
"use client"

import { useState, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OrderItem, Product, Company } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

import { Step1_ClientDetails } from './_wizard-steps/Step1_ClientDetails';
import { Step2_OrderItems } from './_wizard-steps/Step2_OrderItems';
import { Step3_ReviewOrder } from './_wizard-steps/Step3_ReviewOrder';


const orderItemSchema = z.object({
    id: z.string(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
    taxId: z.string().nullable().optional(),
    taxRate: z.number().optional(),
    discountType: z.enum(['percentage', 'fixed']).nullable().optional(),
    discountValue: z.number().nullable().optional(),
});

const orderSchema = z.object({
    isPotentialClient: z.boolean(),
    temporaryCompanyName: z.string().optional(),
    branchId: z.string().optional(),
    region: z.enum(['A', 'B', 'Custom']).optional(),
    area: z.string().optional(),
    paymentDueDate: z.date().optional().nullable(),
    items: z.array(orderItemSchema).min(1, "Order must have at least one item."),
    discountType: z.enum(['percentage', 'fixed']).nullable().optional(),
    discountValue: z.number().optional(),
    // Calculated fields, for review step display
    subtotal: z.number().optional(),
    totalTax: z.number().optional(),
    discountAmount: z.number().optional(),
    grandTotal: z.number().optional(),
}).refine(data => {
    if (data.isPotentialClient) {
        return !!data.temporaryCompanyName && data.temporaryCompanyName.length > 0;
    }
    return !!data.branchId;
}, {
    message: "Client selection is required.",
    path: ["branchId"], // Assign error to a relevant field
});


export type OrderFormData = z.infer<typeof orderSchema>;


export default function OrderForm({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) {
    const { products, submitOrder } = useOrderStore();
    const { companies } = useCompanyStore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);
    const [isNavigating, setIsNavigating] = useState(false);

    const methods = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema),
        defaultValues: {
            isPotentialClient: false,
            items: [],
            paymentDueDate: null,
        },
    });

    // Restore from sessionStorage on mount
    useState(() => {
        const savedData = sessionStorage.getItem('orderFormDraft');
        if (savedData && isOpen) {
            try {
                const parsedData = JSON.parse(savedData);
                methods.reset(parsedData);
            } catch (e) {
                console.error('Failed to restore order draft:', e);
            }
        }
    });

    // Auto-save to sessionStorage
    useState(() => {
        const subscription = methods.watch((data) => {
            if (isOpen) {
                sessionStorage.setItem('orderFormDraft', JSON.stringify(data));
            }
        });
        return () => subscription.unsubscribe();
    });
    
    const { handleSubmit, trigger, watch, reset } = methods;
    const watchItems = watch("items");

    const handleClose = () => {
        if (isSubmitting) return;
        // Don't clear draft on close, only on successful submit
        onOpenChange(false);
        setStep(1);
    }
    
    const onSubmit = async (data: OrderFormData) => {
        // If we're in the middle of navigation, prevent submission
        if (isNavigating) {
            return;
        }
        setIsSubmitting(true);
        try {
            await submitOrder(data);
            // Clear draft on successful submission
            sessionStorage.removeItem('orderFormDraft');
            reset();
            handleClose();
        } catch (error) {
            console.error("Order submission failed:", error);
            toast({
                title: "Order submission Failed",
                description: (error as Error).message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const nextStep = async () => {
        setIsNavigating(true);
        let isValid = true;
        if(step === 1) {
             isValid = await trigger(["branchId", "temporaryCompanyName", "isPotentialClient"]);
        }
        if(step === 2) {
             isValid = await trigger(["items"]);
        }

        if(isValid) {
            setStep(s => Math.min(s + 1, 3));
        }
        setIsNavigating(false);
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));
    
    const isSubmitDisabled = isSubmitting || watchItems.length === 0;
    const progressValue = (step / 3) * 100;
    
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return <Step1_ClientDetails companies={companies} />;
            case 2:
                return <Step2_OrderItems products={products} />;
            case 3:
                 return <Step3_ReviewOrder companies={companies} />;
            default:
                return null;
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Create New Order</DialogTitle>
                    <DialogDescription>
                        Step {step} of {3}: {step === 1 ? 'Client Details' : step === 2 ? 'Order Items' : 'Review & Submit'}
                    </DialogDescription>
                </DialogHeader>
                
                <Progress value={progressValue} className="mx-6 w-auto" />
                
                <FormProvider {...methods}>
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                        <form id="order-wizard-form" onSubmit={handleSubmit(onSubmit)}>
                            {renderStepContent()}
                        </form>
                    </div>
                </FormProvider>

                <DialogFooter className="px-6 pb-6 pt-3 border-t">
                    <div className="w-full flex justify-between">
                        <div>
                            {step > 1 && (
                                <Button variant="outline" onClick={prevStep} disabled={isSubmitting} type="button">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                            )}
                        </div>
                        <div>
                            {step < 3 ? (
                                <Button onClick={nextStep} type="button">
                                    Next <ArrowRight className="ml-2 h-4" />
                                </Button>
                            ) : (
                                <Button type="submit" form="order-wizard-form" disabled={isSubmitDisabled}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Submit Order
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
