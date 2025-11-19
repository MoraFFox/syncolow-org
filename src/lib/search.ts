
import { useOrderStore } from '@/store/use-order-store';
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

const fuseOptions: IFuseOptions<any> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.3,
  keys: ['name', 'title', 'id', 'message', 'companyName', 'branchName', 'technicianName']
};

export function useGlobalSearch(query: string) {
  const { products, orders } = useOrderStore();
  const { companies, feedback } = useCompanyStore();
  const { maintenanceVisits } = useMaintenanceStore();

  const searchResults = useMemo(() => {
    if (!query) return [];

    const fuseInstances = {
        client: new Fuse(companies.filter(Boolean), { ...fuseOptions, keys: ['name'] }),
        product: new Fuse(products.filter(Boolean), { ...fuseOptions, keys: ['name'] }),
        order: new Fuse(orders.filter(Boolean), { ...fuseOptions, keys: ['id', 'companyName', 'branchName'] }),
        maintenance: new Fuse(maintenanceVisits.filter(Boolean), { ...fuseOptions, keys: ['branchName', 'maintenanceNotes', 'technicianName'] }),
        feedback: new Fuse(feedback.filter(Boolean), { ...fuseOptions, keys: ['message'] }),
    };

    const results: SearchResult[] = [];

    fuseInstances.client.search(query).forEach((result: FuseResult<any>) => {
        results.push({ type: 'client', id: result.item.id, title: result.item.name, matches: result.matches, score: result.score });
    });

    fuseInstances.product.search(query).forEach((result: FuseResult<any>) => {
        results.push({ type: 'product', id: result.item.id, title: result.item.name, matches: result.matches, score: result.score });
    });

    fuseInstances.order.search(query).forEach((result: FuseResult<any>) => {
        results.push({ type: 'order', id: result.item.id, title: `Order #${result.item.id.substring(0,7)} for ${result.item.companyName}`, matches: result.matches, score: result.score });
    });

    fuseInstances.maintenance.search(query).forEach((result: FuseResult<any>) => {
        results.push({ type: 'maintenance', id: result.item.id, title: `Visit for ${result.item.branchName}`, matches: result.matches, score: result.score });
    });
    
    fuseInstances.feedback.search(query).forEach((result: FuseResult<any>) => {
        const clientName = companies.find(c => c.id === result.item.clientId)?.name || 'Unknown';
        results.push({ type: 'feedback', id: result.item.id, title: `Feedback from ${clientName}`, matches: result.matches, score: result.score });
    });

    return results.sort((a, b) => (a.score || 1) - (b.score || 1));

  }, [query, companies, products, orders, maintenanceVisits, feedback]);

  return searchResults;
}

