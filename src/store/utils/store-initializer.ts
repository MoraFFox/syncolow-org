/** @format */

import { supabase } from '@/lib/supabase';
import { universalCache } from '@/lib/cache/universal-cache';
import { CacheKeyFactory } from '@/lib/cache/key-factory';
import { useCompanyStore } from '../use-company-store';
import { useMaintenanceStore } from '../use-maintenance-store';
import { useManufacturerStore } from '../use-manufacturer-store';
import { useProductsStore } from '../use-products-store';
import type { Product } from '@/lib/types';

export async function initializeAllStores() {
  try {
    const [
      visits,
      companies,
      baristas,
      feedback,
      areas,
      maintenanceVisits,
      maintenanceEmployees,
      cancellationReasons,
      manufacturers,
      categories,
      taxes,
      returns,
    ] = await Promise.all([
      universalCache.get(CacheKeyFactory.list('visits'), async () => {
        const { data, error } = await supabase.from('visits').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('companies'), async () => {
        const { data, error } = await supabase.from('companies').select('*').not('name', 'like', '[DELETED]%');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('baristas'), async () => {
        const { data, error } = await supabase.from('baristas').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('feedback'), async () => {
        const { data, error } = await supabase.from('feedback').select('*');
        if (error) throw error;
        return data;
      }),
      // Bypass cache for areas to ensure delivery schedules are always up-to-date
      // This fixes the issue where stale areas or schedules persist in the dropdown
      (async () => {
        const { data, error } = await supabase.from('areas').select('*');
        if (error) throw error;
        return data;
      })(),
      universalCache.get(CacheKeyFactory.list('maintenance'), async () => {
        const { data, error } = await supabase.from('maintenance').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('maintenanceEmployees'), async () => {
        const { data, error } = await supabase.from('maintenanceEmployees').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('cancellationReasons'), async () => {
        const { data, error } = await supabase.from('cancellationReasons').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('manufacturers'), async () => {
        const { data, error } = await supabase.from('manufacturers').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('categories'), async () => {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('taxes'), async () => {
        const { data, error} = await supabase.from('taxes').select('*');
        if (error) throw error;
        return data;
      }),
      universalCache.get(CacheKeyFactory.list('returns'), async () => {
        const { data, error } = await supabase.from('returns').select('*');
        if (error) throw error;
        return data;
      }),
    ]);

    const products = await universalCache.get(
      CacheKeyFactory.list('products', { limit: 50, offset: 0 }),
      async () => {
        const { data, error } = await supabase.from('products').select('*').range(0, 49);
        if (error) throw error;
        return data;
      }
    );

    const productsByManufacturer = (products || []).reduce((acc: Record<string, Product[]>, product: Product) => {
      const key = product.manufacturerId || 'unassigned';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    useCompanyStore.setState({
      companies: companies || [],
      baristas: baristas || [],
      feedback: feedback || [],
      areas: areas || [],
      loading: false,
    });

    useMaintenanceStore.setState({
      maintenanceVisits: maintenanceVisits || [],
      maintenanceEmployees: maintenanceEmployees || [],
      cancellationReasons: cancellationReasons || [],
      loading: false,
    });

    useManufacturerStore.setState({
      manufacturers: manufacturers || [],
      productsByManufacturer,
      loading: false,
    });

    useProductsStore.setState({
      products: products || [],
      productsOffset: 50,
      productsHasMore: (products?.length || 0) === 50,
      loading: false,
    });

    return {
      visits: visits || [],
      categories: categories || [],
      taxes: taxes || [],
      returns: returns || [],
      products: products || [],
      productsOffset: 50,
      productsHasMore: (products?.length || 0) === 50,
    };
  } catch (error) {
    useCompanyStore.setState({ loading: false });
    useMaintenanceStore.setState({ loading: false });
    useManufacturerStore.setState({ loading: false, productsByManufacturer: {} });
    useProductsStore.setState({ loading: false });
    throw error;
  }
}
