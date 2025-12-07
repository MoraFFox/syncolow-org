
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Manufacturer, Product } from '@/lib/types';
import { storageService } from '@/services/storage-service';
import { logError, logSupabaseError } from '@/lib/error-logger';
import { drilldownCacheInvalidator } from '@/lib/cache/drilldown-cache-invalidator';
import { logger } from '@/lib/logger';

interface ManufacturerState {
  manufacturers: Manufacturer[];
  productsByManufacturer: Record<string, Product[]>;
  loading: boolean;
  error: string | null;
}

interface ManufacturerActions {
  fetchManufacturersAndProducts: () => Promise<void>;
  addManufacturer: (manufacturer: Omit<Manufacturer, 'id'> & { iconFile?: File }) => Promise<Manufacturer>;
  updateManufacturer: (id: string, updates: Partial<Manufacturer> & { iconFile?: File }) => Promise<void>;
  deleteManufacturer: (id: string) => Promise<void>;
  deleteManufacturerAndProducts: (id: string) => Promise<void>;
  updateProductManufacturer: (productId: string, manufacturerId: string) => Promise<void>;
  updateMultipleProductManufacturers: (productIds: string[], manufacturerId: string, onProgress?: (progress: { completed: number; total: number; failed: number }) => void) => Promise<void>;
}

export const useManufacturerStore = create<ManufacturerState & ManufacturerActions>((set, get) => ({
  manufacturers: [],
  productsByManufacturer: {},
  loading: false,
  error: null,

  fetchManufacturersAndProducts: async () => {
    set({ loading: true, error: null });
    try {
      const { data: manufacturers } = await supabase.from('manufacturers').select('*');
      const { data: products } = await supabase.from('products').select('*');

      const manufacturersList = (manufacturers || []) as Manufacturer[];
      const productsList = (products || []) as Product[];

      const productsByManufacturer: Record<string, Product[]> = {};
      productsList.forEach(product => {
        const manufacturerId = product.manufacturerId || 'unassigned';
        if (!productsByManufacturer[manufacturerId]) {
          productsByManufacturer[manufacturerId] = [];
        }
        productsByManufacturer[manufacturerId].push(product);
      });

      set({
        manufacturers: manufacturersList,
        productsByManufacturer,
        loading: false,
      });
    } catch (error: any) {
      logError(error, {
        component: 'useManufacturerStore',
        action: 'fetchManufacturersAndProducts'
      });
      set({ loading: false, error: 'Failed to fetch data.' });
    }
  },

  addManufacturer: async (manufacturerData) => {
    let iconUrl = manufacturerData.icon || '';
    if (manufacturerData.iconFile) {
      const fileExtension = manufacturerData.iconFile.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `manufacturers/${Date.now()}-icon.${fileExtension}`;
      iconUrl = await storageService.uploadFile(manufacturerData.iconFile, fileName);
    }

    const { iconFile, ...rest } = manufacturerData;
    const dataToSave = { ...rest, icon: iconUrl };
    
    const { data: newManufacturer, error } = await supabase
        .from('manufacturers')
        .insert(dataToSave)
        .select()
        .single();

    if (error) {
      logSupabaseError(error, {
        component: 'useManufacturerStore',
        action: 'addManufacturer',
        data: dataToSave
      });
      throw error;
    }

    set((state) => ({
      manufacturers: [...state.manufacturers, newManufacturer as Manufacturer]
    }));

    return newManufacturer as Manufacturer;
  },

  updateManufacturer: async (id, updates) => {
    let iconUrl = updates.icon;
    if (updates.iconFile) {
      const fileExtension = updates.iconFile.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `manufacturers/${id}-icon.${fileExtension}`;
      iconUrl = await storageService.uploadFile(updates.iconFile, fileName);
    }

    const { iconFile, ...rest } = updates;
    const updateData: Partial<Manufacturer> & { icon?: string } = { ...rest };
    if (iconUrl) {
      updateData.icon = iconUrl;
    }

    const { error } = await supabase.from('manufacturers').update(updateData).eq('id', id);
    if (error) {
      logSupabaseError(error, {
        component: 'useManufacturerStore',
        action: 'updateManufacturer',
        data: { id, updateData }
      });
      throw error;
    }

    set((state) => ({
      manufacturers: state.manufacturers.map(m =>
        m.id === id ? { ...m, ...updateData } as Manufacturer : m
      ),
    }));
    
    try {
      drilldownCacheInvalidator.invalidateAllPreviews('product');
    } catch (e) {
      logger.error(e, { component: 'useManufacturerStore', action: 'invalidateDrilldownCache', manufacturerId: id });
    }
  },

  deleteManufacturer: async (id: string) => {
    try {
      await supabase.from('manufacturers').delete().eq('id', id);

      set((state) => ({
        manufacturers: state.manufacturers.filter((m) => m.id !== id),
      }));
      
      try {
        drilldownCacheInvalidator.invalidateAllPreviews('product');
      } catch (e) {
        logger.error(e, { component: 'useManufacturerStore', action: 'invalidateDrilldownCache', manufacturerId: id });
      }
    } catch (error: any) {
      logError(error, {
        component: 'useManufacturerStore',
        action: 'deleteManufacturer',
        data: { id }
      });
      set({ error: 'Failed to delete manufacturer' });
      throw error;
    }
  },
  
  deleteManufacturerAndProducts: async (manufacturerId: string) => {
    // Delete manufacturer
    await supabase.from('manufacturers').delete().eq('id', manufacturerId);
    
    // Delete related products
    await supabase.from('products').delete().eq('manufacturerId', manufacturerId);

    // Refresh local state
    get().fetchManufacturersAndProducts();
  },

  updateProductManufacturer: async (productId, manufacturerId) => {
    try {
      await supabase.from('products').update({ manufacturerId }).eq('id', productId);
      
      set((state) => {
        const updatedProductsByManufacturer = { ...state.productsByManufacturer };
        for (const key in updatedProductsByManufacturer) {
          const productIndex = updatedProductsByManufacturer[key].findIndex(p => p.id === productId);
          if (productIndex !== -1) {
            const [product] = updatedProductsByManufacturer[key].splice(productIndex, 1);
            const updatedProduct = { ...product, manufacturerId };
            if (!updatedProductsByManufacturer[manufacturerId]) {
              updatedProductsByManufacturer[manufacturerId] = [];
            }
            updatedProductsByManufacturer[manufacturerId].push(updatedProduct);
            break;
          }
        }
        return { productsByManufacturer: updatedProductsByManufacturer };
      });
    } catch (error: any) {
      logError(error, {
        component: 'useManufacturerStore',
        action: 'updateProductManufacturer',
        data: { productId, manufacturerId }
      });
      set({ error: 'Failed to update product manufacturer' });
      throw error;
    }
  },

  updateMultipleProductManufacturers: async (productIds, manufacturerId, onProgress) => {
    if (!productIds || productIds.length === 0) return;
    try {
      const chunkSize = 500;
      const chunks = [];
      for (let i = 0; i < productIds.length; i += chunkSize) {
        chunks.push(productIds.slice(i, i + chunkSize));
      }
      let totalCompleted = 0;
      let totalFailed = 0;
      
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        const { error } = await supabase
            .from('products')
            .update({ manufacturerId })
            .in('id', chunk);
            
        if (error) {
            logSupabaseError(error, {
              component: 'useManufacturerStore',
              action: 'updateMultipleProductManufacturers',
              data: { chunkIndex, chunkSize: chunk.length, manufacturerId }
            });
            totalFailed += chunk.length;
        } else {
            totalCompleted += chunk.length;
        }

        if (onProgress) {
          onProgress({
            completed: totalCompleted,
            total: productIds.length,
            failed: totalFailed
          });
        }
      }
      
      set((state) => {
        const updatedProductsByManufacturer = { ...state.productsByManufacturer };
        productIds.forEach(productId => {
          for (const key in updatedProductsByManufacturer) {
            const productIndex = updatedProductsByManufacturer[key].findIndex(p => p.id === productId);
            if (productIndex !== -1) {
              const [product] = updatedProductsByManufacturer[key].splice(productIndex, 1);
              const updatedProduct = { ...product, manufacturerId };
              if (!updatedProductsByManufacturer[manufacturerId]) {
                updatedProductsByManufacturer[manufacturerId] = [];
              }
              updatedProductsByManufacturer[manufacturerId].push(updatedProduct);
              break;
            }
          }
        });
        return { productsByManufacturer: updatedProductsByManufacturer };
      });
    } catch (error: any) {
      logError(error, {
        component: 'useManufacturerStore',
        action: 'updateMultipleProductManufacturers',
        data: { productCount: productIds.length, manufacturerId }
      });
      set({ error: 'Failed to update multiple products' });
      throw error;
    }
  },
}));
