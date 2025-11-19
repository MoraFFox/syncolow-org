"use client"

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, CheckCircle2, Download } from 'lucide-react';
import type { Company } from '@/lib/types';

interface PaymentFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: 'all' | 'pending' | 'overdue';
  onStatusFilterChange: (status: 'all' | 'pending' | 'overdue') => void;
  companyFilter: string;
  onCompanyFilterChange: (companyId: string) => void;
  companies: Company[];
  selectedCount: number;
  onBulkMarkAsPaid: () => void;
  onExport: () => void;
}

export function PaymentFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  companyFilter,
  onCompanyFilterChange,
  companies,
  selectedCount,
  onBulkMarkAsPaid,
  onExport,
}: PaymentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company or invoice ID..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Invoices</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>

      <Select value={companyFilter} onValueChange={onCompanyFilterChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="All Companies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Companies</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onExport} className="gap-2">
        <Download className="h-4 w-4" />
        Export
      </Button>
      
      {selectedCount > 0 && (
        <Button onClick={onBulkMarkAsPaid} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Mark {selectedCount} as Paid
        </Button>
      )}
    </div>
  );
}
