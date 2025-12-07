
"use client"
import { useState, useMemo, useEffect } from "react";
import { Star, PlusCircle, Share2, MoreHorizontal, ArrowUpDown, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Feedback } from "@/lib/types";
import { format } from "date-fns";
import { useCompanyStore } from "@/store/use-company-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SubmitFeedbackDialog } from "./_components/submit-feedback-dialog";
import { ReplyDialog } from "./_components/reply-dialog";
import Loading from "../loading";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/store/use-settings-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { ErrorBoundary } from "@/components/error-boundary";


type SortableKey = 'client' | 'date' | 'rating';

export default function FeedbackPage() {
  const { companies, feedback, loading } = useCompanyStore();
  const { paginationLimit } = useSettingsStore();
  const { toast } = useToast();

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);


  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'descending' });
  const [visibleCount, setVisibleCount] = useState(paginationLimit);

  useEffect(() => {
    setVisibleCount(paginationLimit);
  }, [paginationLimit]);

  const getClientName = (clientId: string) => {
    return companies.find(c => c.id === clientId)?.name || 'Unknown Client';
  };

  const filteredAndSortedFeedback = useMemo(() => {
    let sortableFeedback = [...feedback]
      .map(fb => ({
        ...fb,
        clientName: getClientName(fb.clientId),
      }))
      .filter(fb => {
        // Sentiment Filter
        if (sentimentFilter !== 'All' && fb.sentiment !== sentimentFilter.toLowerCase()) {
          return false;
        }
        // Rating Filter
        if (ratingFilter !== 'All' && fb.rating !== parseInt(ratingFilter)) {
          return false;
        }
        // Date Range Filter
        if (date?.from && new Date(fb.feedbackDate) < date.from) {
          return false;
        }
        if (date?.to && new Date(fb.feedbackDate) > date.to) {
          return false;
        }
        // Search Term Filter
        const searchLower = searchTerm.toLowerCase();
        return fb.clientName.toLowerCase().includes(searchLower) || fb.message.toLowerCase().includes(searchLower);
      });

    if (sortConfig !== null) {
      sortableFeedback.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'client':
            aValue = a.clientName;
            bValue = b.clientName;
            break;
          case 'rating':
            aValue = a.rating;
            bValue = b.rating;
            break;
          case 'date':
          default:
            aValue = new Date(a.feedbackDate).getTime();
            bValue = new Date(b.feedbackDate).getTime();
            break;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableFeedback;
  }, [feedback, companies, searchTerm, sentimentFilter, ratingFilter, date, sortConfig]);

  const visibleFeedback = useMemo(() => {
    return filteredAndSortedFeedback.slice(0, visibleCount);
  }, [filteredAndSortedFeedback, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + paginationLimit);
  };

  const copyShareLink = (clientId: string) => {
    const client = companies.find(c => c.id === clientId);
    if (!client) return;

    const url = new URL(`${window.location.origin}/feedback/submit`);
    url.searchParams.set('client_id', client.id);
    url.searchParams.set('client_name', client.name);

    navigator.clipboard.writeText(url.toString());
    toast({
      title: "Link Copied!",
      description: `Feedback link for ${client.name} has been copied.`
    });
  }

  const requestSort = (key: SortableKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSentimentVariant = (sentiment: 'positive' | 'negative' | 'neutral' | undefined) => {
    switch (sentiment) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      case 'neutral':
      default:
        return 'secondary';
    }
  }

  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
      </div>
    )
  }

  if (loading && feedback.length === 0) {
    return <Loading />
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customer Feedback</h1>
          <p className="text-muted-foreground">
            Review and analyze feedback from your clients.
          </p>
        </div>
        <Button onClick={() => setIsSubmitOpen(true)} className="w-full sm:w-auto flex-shrink-0">
          <PlusCircle className="h-4 w-4 mr-2" />
          Submit Feedback
        </Button>
      </div>

      <SubmitFeedbackDialog isOpen={isSubmitOpen} onOpenChange={setIsSubmitOpen} />
      <ReplyDialog
        isOpen={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        feedback={selectedFeedback}
      />

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search by client or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sentiments</SelectItem>
                <SelectItem value="Positive">Positive</SelectItem>
                <SelectItem value="Neutral">Neutral</SelectItem>
                <SelectItem value="Negative">Negative</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {/* Unified View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {visibleFeedback.map((item) => (
              <DrillTarget
                key={item.id}
                kind="feedback"
                payload={{
                  id: item.id,
                  clientId: item.clientId,
                  clientName: item.clientName,
                  rating: item.rating,
                  sentiment: item.sentiment,
                  message: item.message,
                  feedbackDate: item.feedbackDate
                }}
              >
                <Card>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <DrillTarget kind="company" payload={{ id: item.clientId, name: item.clientName }} asChild>
                          <p className="font-semibold cursor-pointer hover:underline" onClick={(e) => e.stopPropagation()}>{item.clientName}</p>
                        </DrillTarget>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.feedbackDate), 'PPP')}</p>
                      </div>
                      <Badge variant={getSentimentVariant(item.sentiment)}>{item.sentiment}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderRating(item.rating)}
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{item.message}"</p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeedback(item);
                          setReplyDialogOpen(true);
                        }}
                        className="w-full"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); copyShareLink(item.clientId); }} className="w-full">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </DrillTarget>
            ))}
          </div>

          <div className="hidden md:block">
            <ScrollArea className="w-full whitespace-nowrap">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">
                      <Button variant="ghost" onClick={() => requestSort('client')}>
                        Client
                        <ArrowUpDown className={cn("ml-2 h-4 w-4", { 'text-muted-foreground': sortConfig?.key !== 'client' })} />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[15%]">
                      <Button variant="ghost" onClick={() => requestSort('date')}>
                        Date
                        <ArrowUpDown className={cn("ml-2 h-4 w-4", { 'text-muted-foreground': sortConfig?.key !== 'date' })} />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[30%]">Message</TableHead>
                    <TableHead className="w-[15%]">
                      <Button variant="ghost" onClick={() => requestSort('rating')}>
                        Rating
                        <ArrowUpDown className={cn("ml-2 h-4 w-4", { 'text-muted-foreground': sortConfig?.key !== 'rating' })} />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[10%]">Sentiment</TableHead>
                    <TableHead className="w-[10%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleFeedback.map((item) => (
                    <DrillTarget
                      key={item.id}
                      kind="feedback"
                      payload={{
                        id: item.id,
                        clientId: item.clientId,
                        clientName: item.clientName,
                        rating: item.rating,
                        sentiment: item.sentiment,
                        message: item.message,
                        feedbackDate: item.feedbackDate
                      }}
                      asChild
                    >
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium truncate">
                          <DrillTarget kind="company" payload={{ id: item.clientId, name: item.clientName }} asChild>
                            <span className="cursor-pointer hover:underline" onClick={(e) => e.stopPropagation()}>{item.clientName}</span>
                          </DrillTarget>
                        </TableCell>
                        <TableCell>{format(new Date(item.feedbackDate), 'PPP')}</TableCell>
                        <TableCell className="truncate">{item.message}</TableCell>
                        <TableCell>{renderRating(item.rating)}</TableCell>
                        <TableCell>
                          {item.sentiment && <Badge variant={getSentimentVariant(item.sentiment)}>{item.sentiment}</Badge>}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFeedback(item);
                                setReplyDialogOpen(true);
                              }}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Reply
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyShareLink(item.clientId); }}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    </DrillTarget>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {(visibleFeedback.length === 0) && (
            <p className="text-center text-sm text-muted-foreground py-10">No feedback found.</p>
          )}

          {visibleCount < filteredAndSortedFeedback.length && (
            <div className="mt-4 flex justify-center">
              <Button onClick={handleLoadMore}>Load More</Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
