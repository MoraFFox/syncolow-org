"use client"

import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  onSort,
  className 
}: SortableTableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  
  return (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </div>
    </TableHead>
  );
}
