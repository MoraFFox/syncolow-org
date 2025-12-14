
"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, Search, Upload, Printer, Trash2, LayoutGrid, List, FileSpreadsheet, Filter, FileText } from 'lucide-react';
import type { Order } from '@/lib/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface OrderActionsProps {
  onSearch: (term: string) => void;
  onFilter: (status: string) => void;
  onOpenOrderForm: () => void;
  onOpenImportDialog: (type: 'csv' | 'excel') => void;
  onPrintTodaysOrders: () => void;
  onRemoveAll: () => void;
  onBulkUpdateStatus: (status: Order['status']) => void;
  onBulkDelete: () => void;
  selectedRowCount: number;
  searchTerm: string;
  statusFilter: string;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  onOpenAdvancedSearch: () => void;
  onGenerateReport: () => void;
  isSearching?: boolean;
}

export function OrderActions({
  onSearch,
  onFilter,
  onOpenOrderForm,
  onOpenImportDialog,
  onPrintTodaysOrders,
  onRemoveAll,
  onBulkUpdateStatus,
  onBulkDelete,
  selectedRowCount,
  searchTerm,
  statusFilter,
  viewMode,
  onViewModeChange,
  onOpenAdvancedSearch,
  onGenerateReport,
  isSearching = false,
}: OrderActionsProps) {
  const orderStatuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">View and manage all customer orders.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={onOpenOrderForm} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Order
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpenImportDialog('csv')}>
                <Upload className="h-4 w-4 mr-2" />
                Import from CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onOpenImportDialog('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import from Excel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onPrintTodaysOrders}>
                <Printer className="h-4 w-4 mr-2" />
                Print Today's Orders
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onGenerateReport}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Daily Reports
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onRemoveAll} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove All Orders
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by client name or order ID (min 2 chars)..."
            className="pl-8 pr-10"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
          />
          {isSearching && (
            <div className='absolute right-2.5 top-2.5'>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
            </div>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={onOpenAdvancedSearch}>
          <Filter className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">Filter Status: {statusFilter}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Order Status</DropdownMenuLabel>
            {['All', ...orderStatuses].map((status) => (
              <DropdownMenuItem key={status} onSelect={() => onFilter(status)}>
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'list' | 'kanban') => value && onViewModeChange(value)}>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        {selectedRowCount > 0 && viewMode === 'list' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Bulk Actions ({selectedRowCount})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Update Order Status</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {orderStatuses.map(status => (
                      <DropdownMenuItem key={status} onSelect={() => onBulkUpdateStatus(status as Order['status'])}>
                        Set to {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem onSelect={onBulkDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  );
}
