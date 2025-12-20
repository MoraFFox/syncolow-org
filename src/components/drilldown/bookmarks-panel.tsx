"use client";

import { useDrillUserData } from '@/store/use-drill-user-data';
import { DrillTarget } from './drill-target';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bookmark, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function BookmarksPanel() {
  const { bookmarks, removeBookmark } = useDrillUserData();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bookmark className="h-4 w-4" />
          {bookmarks.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground">
              {bookmarks.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Bookmarks</h4>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No bookmarks yet</p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <DrillTarget key={bookmark.id} kind={bookmark.kind} payload={bookmark.payload}>
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs shrink-0">{bookmark.kind}</Badge>
                        <span className="text-sm truncate">{bookmark.label}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmark(bookmark.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </DrillTarget>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
