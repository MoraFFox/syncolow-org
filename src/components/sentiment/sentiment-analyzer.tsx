
"use client";

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { analyzeSentiment, AnalyzeSentimentOutput } from '@/ai/flows/sentiment-analyzer';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Frown, Loader2, Meh, Smile } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FormSchema = z.object({
  feedback: z.string().min(10, {
    message: 'Feedback must be at least 10 characters.',
  }),
});

export function SentimentAnalyzer() {
  const [result, setResult] = useState<AnalyzeSentimentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      feedback: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const analysisResult = await analyzeSentiment(data);
      setResult(analysisResult);
    } catch (error) {
      console.error(error);
      toast({
        title: "Analysis Failed",
        description: "An error occurred while analyzing the sentiment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const SentimentIcon = ({ sentiment }: { sentiment: string }) => {
    if (sentiment.toLowerCase() === 'positive') return <Smile className="h-10 w-10 text-[hsl(var(--chart-2))]" />;
    if (sentiment.toLowerCase() === 'negative') return <Frown className="h-10 w-10 text-destructive" />;
    return <Meh className="h-10 w-10 text-accent" />;
  };

  const getSentimentBadgeVariant = (sentiment: string) => {
    switch(sentiment.toLowerCase()) {
      case 'positive': return 'default';
      case 'negative': return 'destructive';
      default: return 'secondary';
    }
  };


  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter customer feedback here..."
                        className="resize-none min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The AI will analyze this text to determine the sentiment.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Sentiment
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Analysis Result</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[324px]">
          {isLoading && <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />}
          {!isLoading && !result && <div className="text-muted-foreground">Results will be displayed here.</div>}
          {result && (
            <div className="w-full space-y-6 text-center">
              <div className="flex justify-center">
                <SentimentIcon sentiment={result.sentiment} />
              </div>
              <div>
                <Badge variant={getSentimentBadgeVariant(result.sentiment)} className="text-xl px-4 py-1">
                  {result.sentiment}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Confidence Score</p>
                <Progress value={result.confidence * 100} className="w-full" />
                <p className="text-lg font-bold">{(result.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
