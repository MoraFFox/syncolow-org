
"use client";

import { useState } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCompanyStore } from '@/store/use-company-store';
import type { Feedback } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';


const feedbackSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  message: z.string().min(10, "Feedback message must be at least 10 characters"),
  rating: z.number().min(1, "A rating of at least 1 star is required").max(5),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface SubmitFeedbackDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function SubmitFeedbackDialog({ isOpen, onOpenChange }: SubmitFeedbackDialogProps) {
    const { addFeedback, companies } = useCompanyStore();
    const { toast } = useToast();
    const [currentRating, setCurrentRating] = useState(0);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FeedbackFormData>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: { rating: 0, message: "", clientId: "" }
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
            setCurrentRating(0);
        }
        onOpenChange(open);
    }

    const onSubmit = async (data: FeedbackFormData) => {
        try {
            const newFeedback: Omit<Feedback, 'id' | 'sentiment'> = {
                ...data,
                feedbackDate: new Date().toISOString(),
            };

            await addFeedback(newFeedback as Omit<Feedback, 'id'>);
            handleOpenChange(false);
            toast({
                title: "Feedback Submitted",
                description: "The new feedback has been logged.",
            });
        } catch (error) {
            toast({
                title: "Submission Failed",
                description: "There was an error submitting the feedback.",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Submit New Feedback</DialogTitle>
                    <DialogDescription>
                    Log feedback received from a client.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="clientId">Client</Label>
                            <Controller
                                name="clientId"
                                control={control}
                                render={({ field }) => (
                                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={popoverOpen}
                                                className="w-full justify-between"
                                            >
                                                {field.value
                                                    ? companies.find((company) => company.id === field.value)?.name
                                                    : "Select a client..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search client..." />
                                                <ScrollArea className="h-48">
                                                  <CommandList>
                                                    <CommandEmpty>No client found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {companies.map((company) => (
                                                            <CommandItem
                                                                value={company.name}
                                                                key={company.id}
                                                                onSelect={() => {
                                                                    field.onChange(company.id);
                                                                    setPopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", field.value === company.id ? "opacity-100" : "opacity-0")} />
                                                                {company.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                  </CommandList>
                                                </ScrollArea>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                             {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="message">Feedback Message</Label>
                            <Controller
                                name="message"
                                control={control}
                                render={({ field }) => (
                                    <Textarea id="message" placeholder="Enter feedback here..." {...field} />
                                )}
                            />
                             {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>Rating</Label>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => {
                                            const newRating = i + 1;
                                            setCurrentRating(newRating);
                                            setValue('rating', newRating, { shouldValidate: true });
                                        }}
                                    >
                                        <Star
                                            className={`h-6 w-6 cursor-pointer transition-colors ${i < currentRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                            {errors.rating && <p className="text-sm text-destructive">{errors.rating.message}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Submit Feedback</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
