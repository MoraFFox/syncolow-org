"use client";

import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { useToast } from '@/hooks/use-toast';

interface BookmarkButtonProps {
  label: string;
  kind: DrillKind;
  payload: DrillPayload;
}

export function BookmarkButton({ label, kind, payload }: BookmarkButtonProps) {
  const { addBookmark, bookmarks } = useDrillDownStore();
  const { toast } = useToast();

  const isBookmarked = bookmarks.some(
    b => b.kind === kind && JSON.stringify(b.payload) === JSON.stringify(payload)
  );

  const handleBookmark = () => {
    if (isBookmarked) {
      toast({ title: 'Already bookmarked', description: 'This item is already in your bookmarks' });
      return;
    }
    
    addBookmark(label, kind, payload);
    toast({ title: 'Bookmarked', description: `${label} added to bookmarks` });
  };

  return (
    <Button
      size="sm"
      variant={isBookmarked ? "default" : "outline"}
      onClick={handleBookmark}
      disabled={isBookmarked}
    >
      <Bookmark className="h-3 w-3 mr-1" />
      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
    </Button>
  );
}
