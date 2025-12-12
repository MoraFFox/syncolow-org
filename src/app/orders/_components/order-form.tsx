
"use client";

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store/use-products-store';
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
import { Progress } from '@/components/ui/progress';
import { useWizardNavigation } from '@/hooks/use-wizard-navigation';
import { useFormDraftPersistence } from '@/hooks/use-form-draft-persistence';

import { Step1_ClientDetails } from './_wizard-steps/Step1_ClientDetails';
import { Step2_OrderItems } from './_wizard-steps/Step2_OrderItems';
import { Step3_ReviewOrder } from './_wizard-steps/Step3_ReviewOrder';


import { orderSchema, OrderFormData } from './order-schemas';

interface OrderFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function OrderForm({ isOpen, onOpenChange }: OrderFormProps) {
    const { submitOrder } = useOrderStore();
    const { products } = useProductsStore();
    const { companies } = useCompanyStore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const methods = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema),
        defaultValues: {
            isPotentialClient: false,
            items: [],
            paymentDueDate: null,
        },
    });

    const { handleSubmit, trigger, watch, reset } = methods;
    const watchItems = watch("items");

    const { step, nextStep, prevStep, progressValue, isNavigating } = useWizardNavigation(
        3,
        trigger,
        {
            1: ["branchId", "temporaryCompanyName", "isPotentialClient"],
            2: ["items"],
        }
    );

    const { clearDraft } = useFormDraftPersistence('orderFormDraft', isOpen, methods);

    const handleClose = () => {
        if (isSubmitting) return;
        onOpenChange(false);
    };

    const onSubmit = async (data: OrderFormData) => {
        if (isNavigating) return;
        setIsSubmitting(true);
        try {
            await submitOrder(data);
            clearDraft();
            reset();
            handleClose();
        } catch (error) {
            toast({
                title: "Order submission Failed",
                description: (error as Error).message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSubmitDisabled = isSubmitting || watchItems.length === 0;

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
    };

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
