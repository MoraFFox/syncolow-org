/** @format */

import { create } from 'zustand';
import { produce } from 'immer';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { handleStoreError, invalidateCacheAndRefresh } from './utils/store-helpers';
import type { Tax } from '@/lib/types';

interface TaxesState {
  taxes: Tax[];
  loading: boolean;

  addTax: (tax: Omit<Tax, 'id'>) => Promise<void>;
  updateTax: (taxId: string, taxData: Partial<Omit<Tax, 'id'>>) => Promise<void>;
  deleteTax: (taxId: string) => Promise<void>;
}

export const useTaxesStore = create<TaxesState>((set, get) => ({
  taxes: [],
  loading: false,

  addTax: async (tax) => {
    try {
      if (tax.rate < 0 || tax.rate > 100) {
        toast({
          title: 'Invalid Tax Rate',
          description: 'Tax rate must be between 0 and 100%',
          variant: 'destructive',
        });
        return;
      }

      const { data: taxResult, error } = await supabase.from('taxes').insert([tax]).select().single();
      if (error) throw error;
      set(
        produce((state: TaxesState) => {
          state.taxes.push(taxResult as Tax);
        })
      );
      await invalidateCacheAndRefresh(['app', 'list', 'taxes']);
      toast({ title: 'Tax Added' });
    } catch (error) {
      handleStoreError(error, { component: 'TaxesStore', action: 'addTax' });
      throw error;
    }
  },

  updateTax: async (taxId, taxData) => {
    try {
      if (taxData.rate !== undefined && (taxData.rate < 0 || taxData.rate > 100)) {
        toast({
          title: 'Invalid Tax Rate',
          description: 'Tax rate must be between 0 and 100%',
          variant: 'destructive',
        });
        return;
      }

      await supabase.from('taxes').update(taxData).eq('id', taxId);
      set(
        produce((state: TaxesState) => {
          const index = state.taxes.findIndex((t) => t.id === taxId);
          if (index !== -1) {
            state.taxes[index] = { ...state.taxes[index], ...taxData };
          }
        })
      );
      await invalidateCacheAndRefresh(['app', 'list', 'taxes']);
      toast({ title: 'Tax Updated' });
    } catch (error) {
      handleStoreError(error, { component: 'TaxesStore', action: 'updateTax' });
      throw error;
    }
  },

  deleteTax: async (taxId) => {
    try {
      await supabase.from('taxes').delete().eq('id', taxId);
      set(
        produce((state: TaxesState) => {
          state.taxes = state.taxes.filter((t) => t.id !== taxId);
        })
      );
      await invalidateCacheAndRefresh(['app', 'list', 'taxes']);
      toast({ title: 'Tax Deleted' });
    } catch (error) {
      handleStoreError(error, { component: 'TaxesStore', action: 'deleteTax' });
      throw error;
    }
  },
}));
