'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Star, MessageSquare, ThumbsUp, ThumbsDown, Calendar, User, Share2, Building2 } from 'lucide-react';
import { useCompanyStore } from '@/store/use-company-store';
import { formatDate } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { useToast } from '@/hooks/use-toast';
import { ReplyDialog } from '@/app/feedback/_components/reply-dialog';

export default function FeedbackDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const { feedback: allFeedback, companies, loading: storeLoading } = useCompanyStore();
  const [loading, setLoading] = useState(true);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const { feedback, client, otherFeedback, metrics } = useMemo(() => {
    const feedback = allFeedback.find(f => f.id === id);
    
    if (!feedback) return { feedback: null, client: null, otherFeedback: [], metrics: null };

    const client = companies.find(c => c.id === feedback.clientId);
    const clientFeedback = allFeedback.filter(f => f.clientId === feedback.clientId);
    const otherFeedback = clientFeedback
      .filter(f => f.id !== id)
      .sort((a, b) => new Date(b.feedbackDate).getTime() - new Date(a.feedbackDate).getTime())
      .slice(0, 5);

    const totalCount = clientFeedback.length;
    const avgRating = totalCount > 0 ? clientFeedback.reduce((sum, f) => sum + f.rating, 0) / totalCount : 0;
    
    const sentimentCounts = clientFeedback.reduce((acc, f) => {
      if (f.sentiment) {
        acc[f.sentiment] = (acc[f.sentiment] || 0) + 1;
      }
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 } as Record<'positive' | 'negative' | 'neutral', number>);

    return {
      feedback,
      client,
      otherFeedback,
      metrics: {
        totalCount,
        avgRating,
        sentimentCounts
      }
    };
  }, [id, allFeedback, companies]);

  const handleShare = () => {
    // In a real app, this would copy the current URL
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Feedback link copied to clipboard",
    });
  };

  if (loading || storeLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-xl font-semibold">Feedback not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Customer Feedback
            </h1>
            <p className="text-muted-foreground">Submitted on {formatDate(feedback.feedbackDate)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setReplyDialogOpen(true)} 
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Reply
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feedback Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                   {client ? (
                     <DrillTarget kind="company" payload={{ id: client.id, name: client.name }}>
                       <h2 className="text-xl font-bold hover:underline cursor-pointer flex items-center gap-2">
                         <Building2 className="h-5 w-5 text-muted-foreground" />
                         {client.name}
                       </h2>
                     </DrillTarget>
                   ) : (
                     <h2 className="text-xl font-bold">Unknown Client</h2>
                   )}
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                     <User className="h-4 w-4" />
                     <span>Verified Client</span>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className="flex items-center gap-1">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <Star 
                         key={star} 
                         className={`h-6 w-6 ${star <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
                       />
                     ))}
                     <span className="ml-2 text-xl font-bold">{feedback.rating}/5</span>
                   </div>
                   <Badge 
                     variant={feedback.sentiment === 'positive' ? 'default' : feedback.sentiment === 'negative' ? 'destructive' : 'secondary'}
                     className="flex items-center gap-1 px-3 py-1 text-sm"
                   >
                     {feedback.sentiment === 'positive' ? <ThumbsUp className="h-4 w-4" /> : feedback.sentiment === 'negative' ? <ThumbsDown className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                     <span className="capitalize">{feedback.sentiment} Sentiment</span>
                   </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative pl-6 border-l-4 border-muted">
                <p className="text-lg italic text-muted-foreground">
                  "{feedback.message}"
                </p>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(feedback.feedbackDate ?? 'N/A')}</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="font-mono text-xs">ID: {feedback.id}</div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setReplyDialogOpen(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Generate AI Reply
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Feedback Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Reviews</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    {metrics?.totalCount}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    {metrics?.avgRating.toFixed(1)}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="text-sm font-medium mb-2">Sentiment Distribution</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><ThumbsUp className="h-3 w-3 text-green-600" /> Positive</span>
                  <span className="font-bold">{metrics.sentimentCounts.positive}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><MessageSquare className="h-3 w-3 text-muted-foreground" /> Neutral</span>
                  <span className="font-bold">{metrics.sentimentCounts.neutral}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                   <span className="flex items-center gap-2"><ThumbsDown className="h-3 w-3 text-red-600" /> Negative</span>
                   <span className="font-bold">{metrics.sentimentCounts.negative}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Feedback */}
          {otherFeedback.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Feedback from Client</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {otherFeedback.map((item) => (
                    <DrillTarget key={item.id} kind="feedback" payload={{ 
                      id: item.id, 
                      clientId: item.clientId,
                      clientName: client?.name,
                      rating: item.rating,
                      sentiment: item.sentiment,
                      message: item.message,
                      feedbackDate: item.feedbackDate ?? 'N/A'
                    }}>
                      <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold text-sm">{item.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(item.feedbackDate)}</span>
                        </div>
                        <p className="text-sm line-clamp-2 text-muted-foreground italic">"{item.message}"</p>
                      </div>
                    </DrillTarget>
                  ))}
                </div>
                <div className="p-4 border-t">
                  <Button variant="outline" className="w-full" size="sm" onClick={() => window.location.href = `/feedback?client=${feedback.clientId}`}>
                    View All History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <ReplyDialog 
        isOpen={replyDialogOpen} 
        onOpenChange={setReplyDialogOpen} 
        feedback={feedback} 
      />
    </div>
  );
}
