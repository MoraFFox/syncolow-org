
"use client";

import { useState, useEffect } from 'react';
import { generateReply } from '@/ai/flows/generate-reply';
import { useCompanyStore } from '@/store/use-company-store';
import { useToast } from '@/hooks/use-toast';
import { Feedback } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Bot, Clipboard } from 'lucide-react';


interface ReplyDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    feedback: Feedback | null;
}

export function ReplyDialog({ isOpen, onOpenChange, feedback }: ReplyDialogProps) {
    const { companies } = useCompanyStore();
    const { toast } = useToast();
    const [suggestedReply, setSuggestedReply] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const generate = async () => {
            if (isOpen && feedback) {
                setIsGenerating(true);
                setSuggestedReply("");
                try {
                    const clientName = companies.find(c => c.id === feedback.clientId)?.name || 'Valued Customer';
                    const result = await generateReply({
                        clientName,
                        feedback: feedback.message,
                        sentiment: feedback.sentiment || 'neutral'
                    });
                    setSuggestedReply(result.reply || '');
                } catch (error) {
                    toast({
                        title: "Error Generating Reply",
                        description: "There was an issue contacting the AI. Please try again.",
                        variant: "destructive"
                    });
                    setSuggestedReply("Sorry, we couldn't generate a reply at this time.");
                } finally {
                    setIsGenerating(false);
                }
            }
        };
        generate();
    }, [isOpen, feedback, companies, toast]);

    const copyReplyToClipboard = () => {
        navigator.clipboard.writeText(suggestedReply);
        toast({
            title: "Reply Copied!",
            description: "The suggested reply has been copied to your clipboard.",
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>AI-Generated Reply</DialogTitle>
                    <DialogDescription>A suggested response based on the client's feedback and sentiment.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-4">
                    <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground"><strong>Original Feedback:</strong></p>
                        <p className="italic">"{feedback?.message}"</p>
                    </CardContent>
                    </Card>
                    
                    <Alert>
                    <Bot className="h-4 w-4" />
                    <AlertTitle>Suggested Reply</AlertTitle>
                    <AlertDescription className="min-h-[100px] whitespace-pre-wrap">
                        {isGenerating ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Generating...</span>
                        </div>
                        ) : suggestedReply}
                    </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={copyReplyToClipboard} disabled={isGenerating || !suggestedReply}>
                    <Clipboard className="h-4 w-4 mr-2" />
                    Copy Reply
                    </Button>
                </DialogFooter>
            </DialogContent>
      </Dialog>
    )
}
