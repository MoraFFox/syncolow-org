import Fuse from 'fuse.js';
import type { Order } from './types';

export interface OrderSearchFilters {
  searchTerm?: string;
  status?: string[];
  paymentStatus?: string[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  companyIds?: string[];
  paymentScore?: { min: number; max: number };
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: OrderSearchFilters;
  createdAt: string;
}

export function searchOrders(orders: Order[], filters: OrderSearchFilters): Order[] {
  let results = [...orders];

  if (filters.searchTerm) {
    const fuse = new Fuse(results, {
      keys: ['companyName', 'branchName', 'temporaryCompanyName', 'id'],
      threshold: 0.3,
    });
    results = fuse.search(filters.searchTerm).map(r => r.item);
  }

  if (filters.status && filters.status.length > 0) {
    results = results.filter(o => filters.status!.includes(o.status));
  }

  if (filters.paymentStatus && filters.paymentStatus.length > 0) {
    results = results.filter(o => filters.paymentStatus!.includes(o.paymentStatus || 'Pending'));
  }

  if (filters.dateFrom || filters.dateTo) {
    results = results.filter(o => {
      const orderDateStr = o.orderDate.split('T')[0];
      return (
        (!filters.dateFrom || orderDateStr >= filters.dateFrom) &&
        (!filters.dateTo || orderDateStr <= filters.dateTo)
      );
    });
  }

  if (filters.minAmount !== undefined) {
    results = results.filter(o => o.total >= filters.minAmount!);
  }

  if (filters.maxAmount !== undefined) {
    results = results.filter(o => o.total <= filters.maxAmount!);
  }

  if (filters.companyIds && filters.companyIds.length > 0) {
    results = results.filter(o => filters.companyIds!.includes(o.companyId));
  }

  if (filters.paymentScore) {
    results = results.filter(o => {
      const score = o.paymentScore || 100;
      return score >= filters.paymentScore!.min && score <= filters.paymentScore!.max;
    });
  }

  return results;
}

const STORAGE_KEY = 'order_saved_filters';

export function getSavedFilters(): SavedFilter[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveFilter(name: string, filters: OrderSearchFilters): SavedFilter {
  const savedFilters = getSavedFilters();
  const newFilter: SavedFilter = {
    id: Date.now().toString(),
    name,
    filters,
    createdAt: new Date().toISOString(),
  };
  savedFilters.push(newFilter);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters));
  return newFilter;
}

export function deleteFilter(id: string): void {
  const savedFilters = getSavedFilters().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters));
}

