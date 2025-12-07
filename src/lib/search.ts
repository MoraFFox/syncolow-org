
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store/use-products-store';
import { useCompanyStore } from '@/store/use-company-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useMemo } from 'react';
import Fuse, { type IFuseOptions, type FuseResult, type FuseResultMatch } from 'fuse.js';
import type { Company, Order, MaintenanceVisit, Feedback, Product } from './types';

export type SearchResult = {
  type: 'client' | 'product' | 'order' | 'maintenance' | 'feedback';
  id: string;
  title: string;
  matches?: readonly FuseResultMatch[];
  score?: number;
};

/**
 * Fuse.js options for Company search
 */
const companyFuseOptions: IFuseOptions<Company> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.3,
  keys: ['name']
};

/**
 * Fuse.js options for Product search
 */
const productFuseOptions: IFuseOptions<Product> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.3,
  keys: ['name']
};

/**
 * Fuse.js options for Order search
 */
const orderFuseOptions: IFuseOptions<Order> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.3,
  keys: ['id', 'companyName', 'branchName']
};

/**
 * Fuse.js options for MaintenanceVisit search
 */
const maintenanceFuseOptions: IFuseOptions<MaintenanceVisit> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.3,
  keys: ['branchName', 'maintenanceNotes', 'technicianName']
};

/**
 * Fuse.js options for Feedback search
 */
const feedbackFuseOptions: IFuseOptions<Feedback> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.3,
  keys: ['message']
};

export function useGlobalSearch(query: string) {
  const { orders } = useOrderStore();
  const { products } = useProductsStore();
  const { companies, feedback } = useCompanyStore();
  const { maintenanceVisits } = useMaintenanceStore();

  const searchResults = useMemo(() => {
    if (!query) return [];

    // Create typed Fuse instances
    const clientFuse = new Fuse<Company>(companies.filter(Boolean), companyFuseOptions);
    const productFuse = new Fuse<Product>(products.filter(Boolean), productFuseOptions);
    const orderFuse = new Fuse<Order>(orders.filter(Boolean), orderFuseOptions);
    const maintenanceFuse = new Fuse<MaintenanceVisit>(maintenanceVisits.filter(Boolean), maintenanceFuseOptions);
    const feedbackFuse = new Fuse<Feedback>(feedback.filter(Boolean), feedbackFuseOptions);

    const results: SearchResult[] = [];

    // Search clients (companies)
    clientFuse.search(query).forEach((result: FuseResult<Company>) => {
      results.push({ 
        type: 'client', 
        id: result.item.id, 
        title: result.item.name || 'Unknown Company', 
        matches: result.matches, 
        score: result.score 
      });
    });

    // Search products
    productFuse.search(query).forEach((result: FuseResult<Product>) => {
      results.push({ 
        type: 'product', 
        id: result.item.id, 
        title: result.item.name || 'Unknown Product', 
        matches: result.matches, 
        score: result.score 
      });
    });

    // Search orders
    orderFuse.search(query).forEach((result: FuseResult<Order>) => {
      const orderId = result.item.id || '';
      const companyName = result.item.companyName || 'Unknown';
      results.push({ 
        type: 'order', 
        id: result.item.id, 
        title: `Order #${orderId.substring(0, 7)} for ${companyName}`, 
        matches: result.matches, 
        score: result.score 
      });
    });

    // Search maintenance visits
    maintenanceFuse.search(query).forEach((result: FuseResult<MaintenanceVisit>) => {
      const branchName = result.item.branchName || 'Unknown Branch';
      results.push({ 
        type: 'maintenance', 
        id: result.item.id, 
        title: `Visit for ${branchName}`, 
        matches: result.matches, 
        score: result.score 
      });
    });
    
    // Search feedback
    feedbackFuse.search(query).forEach((result: FuseResult<Feedback>) => {
      const clientName = companies.find(c => c.id === result.item.clientId)?.name || 'Unknown';
      results.push({ 
        type: 'feedback', 
        id: result.item.id, 
        title: `Feedback from ${clientName}`, 
        matches: result.matches, 
        score: result.score 
      });
    });

    return results.sort((a, b) => (a.score || 1) - (b.score || 1));

  }, [query, companies, products, orders, maintenanceVisits, feedback]);

  return searchResults;
}

