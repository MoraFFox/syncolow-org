
"use client";

import { Suspense } from 'react';
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from 'react';
import { useCompanyStore } from "@/store/use-company-store";
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { analyzeSentiment } from "@/ai/flows/sentiment-analyzer";
import type { Feedback } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const feedbackSchema = z.object({
  message: z.string().min(10, "Feedback must be at least 10 characters long."),
  rating: z.number().min(1, "Please provide a rating.").max(5),
});

function FeedbackForm() {
    const searchParams = useSearchParams();
    const { addFeedback } = useCompanyStore();
    const { toast } = useToast();
    
    const clientId = searchParams.get('client_id');
    const clientName = searchParams.get('client_name');

    const [currentRating, setCurrentRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof feedbackSchema>>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: { rating: 0 }
    });

    const onSubmit = async (data: z.infer<typeof feedbackSchema>) => {
        if (!clientId) return;
        setIsSubmitting(true);
        try {
            const { sentiment } = await analyzeSentiment({ feedback: data.message });

            const newFeedback: Omit<Feedback, 'id'> = {
                ...data,
                clientId,
                feedbackDate: new Date().toISOString(),
                sentiment: sentiment.toLowerCase() as 'positive' | 'negative' | 'neutral',
            };
            await addFeedback(newFeedback);
            setIsSubmitted(true);
        } catch (error) {
            toast({
                title: "Submission Failed",
                description: "There was an error submitting your feedback. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!clientId || !clientName) {
        return (
            <Card className="w-full max-w-lg mx-auto my-auto">
                <CardHeader>
                    <CardTitle className="text-2xl text-destructive">Invalid Link</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This feedback link is invalid or has expired. Please contact support for assistance.</p>
                </CardContent>
            </Card>
        )
    }

    if (isSubmitted) {
        return (
             <Card className="w-full max-w-lg mx-auto my-auto text-center">
                <CardHeader>
                     <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                     </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <CardTitle className="text-2xl">Thank You, {clientName}!</CardTitle>
                    <CardDescription className="text-base">
                        Your feedback has been successfully submitted. We appreciate you taking the time to help us improve.
                    </CardDescription>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-lg mx-auto my-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Share Your Feedback</CardTitle>
                <CardDescription>
                    Hi {clientName}, we'd love to hear your thoughts on our service.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <Label className="text-base">How would you rate your experience?</Label>
                        <div className="flex items-center justify-center gap-2 mt-2">
                             {[...Array(5)].map((_, i) => (
                                <button type="button" key={i} onClick={() => {
                                    setCurrentRating(i + 1);
                                    setValue('rating', i + 1, { shouldValidate: true });
                                }}>
                                    <Star
                                        className={`h-10 w-10 cursor-pointer transition-colors ${i < currentRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
                                    />
                                </button>
                            ))}
                        </div>
                        {errors.rating && <p className="text-sm text-destructive text-center mt-2">{errors.rating.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="message" className="text-base">Please share any comments or suggestions.</Label>
                        <Textarea
                            id="message"
                            className="mt-2 min-h-32"
                            placeholder="Tell us about your experience..."
                            {...register("message")}
                        />
                         {errors.message && <p className="text-sm text-destructive mt-2">{errors.message.message}</p>}
                    </div>
                    <Button type="submit" className="w-full !mt-8" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Feedback
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function FormSkeleton() {
    return (
        <Card className="w-full max-w-lg mx-auto my-auto">
            <CardHeader className="text-center space-y-2">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-full mx-auto" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-1/2 mx-auto" />
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-12 w-full !mt-8" />
            </CardContent>
        </Card>
    )
}

export default function SubmitFeedbackPage() {
    return (
        <Suspense fallback={<FormSkeleton />}>
            <FeedbackForm />
        </Suspense>
    )
}
