"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyStore } from '@/store/use-company-store';
import { Save, Trash2 } from 'lucide-react';
import type { OrderSearchFilters, SavedFilter } from '@/lib/advanced-search';
import { getSavedFilters, saveFilter, deleteFilter } from '@/lib/advanced-search';
import { toast } from '@/hooks/use-toast';

interface AdvancedSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: OrderSearchFilters) => void;
  currentFilters: OrderSearchFilters;
}

export function AdvancedSearchDialog({ isOpen, onOpenChange, onApplyFilters, currentFilters }: AdvancedSearchDialogProps) {
  const { companies } = useCompanyStore();
  const [filters, setFilters] = useState<OrderSearchFilters>(currentFilters);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    setSavedFilters(getSavedFilters());
    setFilters(currentFilters);
  }, [isOpen, currentFilters]);

  const statusOptions = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  const paymentStatusOptions = ['Pending', 'Paid', 'Overdue'];

  const handleApply = () => {
    onApplyFilters(filters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setFilters({});
    onApplyFilters({});
  };

  const handleSave = () => {
    if (!filterName.trim()) {
      toast({ title: 'Name Required', description: 'Please enter a name for this filter', variant: 'destructive' });
      return;
    }
    saveFilter(filterName, filters);
    setSavedFilters(getSavedFilters());
    setFilterName('');
    toast({ title: 'Filter Saved', description: `"${filterName}" has been saved` });
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setFilters(filter.filters);
  };

  const handleDeleteFilter = (id: string) => {
    deleteFilter(id);
    setSavedFilters(getSavedFilters());
    toast({ title: 'Filter Deleted' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Search Term */}
          <div className="grid gap-2">
            <Label>Search Term</Label>
            <Input
              placeholder="Client name, order ID..."
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </div>

          {/* Status Filters */}
          <div className="grid gap-2">
            <Label>Order Status</Label>
            <div className="flex flex-wrap gap-4">
              {statusOptions.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.status?.includes(status)}
                    onCheckedChange={(checked) => {
                      const current = filters.status || [];
                      setFilters({
                        ...filters,
                        status: checked
                          ? [...current, status]
                          : current.filter(s => s !== status)
                      });
                    }}
                  />
                  <label htmlFor={`status-${status}`} className="text-sm">{status}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          <div className="grid gap-2">
            <Label>Payment Status</Label>
            <div className="flex flex-wrap gap-4">
              {paymentStatusOptions.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`payment-${status}`}
                    checked={filters.paymentStatus?.includes(status)}
                    onCheckedChange={(checked) => {
                      const current = filters.paymentStatus || [];
                      setFilters({
                        ...filters,
                        paymentStatus: checked
                          ? [...current, status]
                          : current.filter(s => s !== status)
                      });
                    }}
                  />
                  <label htmlFor={`payment-${status}`} className="text-sm">{status}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, dateFrom: e.target.value || undefined };
                  if (!e.target.value) delete newFilters.dateFrom;
                  setFilters(newFilters);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, dateTo: e.target.value || undefined };
                  if (!e.target.value) delete newFilters.dateTo;
                  setFilters(newFilters);
                }}
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Min Amount ($)</Label>
              <Input
                type="number"
                value={filters.minAmount || ''}
                onChange={(e) => setFilters({ ...filters, minAmount: parseFloat(e.target.value) || undefined })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Amount ($)</Label>
              <Input
                type="number"
                value={filters.maxAmount || ''}
                onChange={(e) => setFilters({ ...filters, maxAmount: parseFloat(e.target.value) || undefined })}
              />
            </div>
          </div>

          {/* Payment Score Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Min Payment Score</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filters.paymentScore?.min || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  paymentScore: { min: parseFloat(e.target.value) || 0, max: filters.paymentScore?.max || 100 }
                })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Payment Score</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filters.paymentScore?.max || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  paymentScore: { min: filters.paymentScore?.min || 0, max: parseFloat(e.target.value) || 100 }
                })}
              />
            </div>
          </div>

          {/* Save Filter */}
          <div className="border-t pt-4">
            <Label>Save This Filter</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Filter name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="border-t pt-4">
              <Label>Saved Filters</Label>
              <div className="mt-2 space-y-2">
                {savedFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-medium">{filter.name}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleLoadFilter(filter)}>
                        Load
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteFilter(filter.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>Reset</Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
