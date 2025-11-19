
"use client"

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface PaginatedTableProps<T> {
  data: T[];
  pageSize?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderHeader: () => React.ReactNode;
  loadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function PaginatedTable<T>({ 
  data, 
  pageSize = 10, 
  renderRow, 
  renderHeader,
  loadMore,
  hasMore,
  isLoadingMore,
}: PaginatedTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = useMemo(() => {
    if (loadMore) {
        return data; // If loadMore is provided, we assume data is already paginated externally
    }
    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, currentPage, pageSize, loadMore]);

  const totalPages = Math.ceil(data.length / pageSize);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            {renderHeader()}
          </thead>
          <tbody>
            {paginatedData.map((item, index) => renderRow(item, index))}
          </tbody>
        </table>
      </div>
      
      {loadMore ? (
        hasMore && (
            <div className="flex items-center justify-center">
                <Button onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load More
                </Button>
            </div>
        )
      ) : (
        totalPages > 1 && (
            <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} results
            </p>
            <div className="flex items-center gap-2">
                <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                >
                <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                Page {currentPage} of {totalPages}
                </span>
                <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                >
                <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            </div>
        )
      )}
    </div>
  );
}
