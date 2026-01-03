/** @format */

import { create } from 'zustand';
import { produce } from 'immer';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { generateImage } from '@/ai/flows/generate-image';
import { universalCache } from '@/lib/cache/universal-cache';
import { CacheKeyFactory } from '@/lib/cache/key-factory';
import { handleStoreError, invalidateCacheAndRefresh } from './utils/store-helpers';
import type { Product } from '@/lib/types';

interface ProductsState {
  products: Product[];
  productsOffset: number;
  productsHasMore: boolean;
  loading: boolean;

  loadAllProducts: () => Promise<void>;
  loadRemainingProducts: () => Promise<void>;
  searchProducts: (searchTerm: string) => Promise<void>;
  filterProductsByCategory: (category: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'imageUrl'> & { image?: File }) => Promise<Product>;
  updateProduct: (productId: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteAllProducts: () => Promise<void>;
  getProduct: (productId: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  productsOffset: 0,
  productsHasMore: true,
  loading: false,

  getProduct: async (productId: string) => {
    // check if already exists
    if (get().products.find(p => p.id === productId)) return;

    set({ loading: true });
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
      if (error) throw error;
      if (data) {
        set(produce((state: ProductsState) => {
          state.products.push(data);
        }));
      }
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      // Don't toast error here, just log, let UI handle missing
      console.error("Failed to fetch product", error);
    }
  },

  loadAllProducts: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.from('products').select('*');
      console.log('useProductsStore: loadAllProducts result:', {
        count: data?.length,
        error: error?.message,
        firstProduct: data?.[0]?.name
      });
      if (error) throw error;
      set({
        products: data || [],
        productsOffset: data?.length || 0,
        productsHasMore: false,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      handleStoreError(error, { component: 'ProductsStore', action: 'loadAllProducts' });
    }
  },

  loadRemainingProducts: async () => {
    try {
      const { productsOffset, productsHasMore } = get();
      if (!productsHasMore) return;

      const { data: newProducts } = await supabase
        .from('products')
        .select('*')
        .range(productsOffset, productsOffset + 49);

      set(
        produce((state: ProductsState) => {
          state.products.push(...(newProducts || []));
          state.productsOffset = productsOffset + 50;
          state.productsHasMore = (newProducts?.length || 0) === 50;
        })
      );
    } catch (error) {
      handleStoreError(error, { component: 'ProductsStore', action: 'loadRemainingProducts' });
    }
  },

  searchProducts: async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      // When search is cleared, load all products instead of just 50
      await get().loadAllProducts();
      return;
    }

    try {
      const { data: allProducts } = await supabase.from('products').select('*');
      const searchLower = searchTerm.toLowerCase();
      const filtered = (allProducts || []).filter(
        (product: Product) =>
          (product.name && product.name.toLowerCase().includes(searchLower)) ||
          (product.variantName && product.variantName.toLowerCase().includes(searchLower)) ||
          (product.description && product.description.toLowerCase().includes(searchLower)) ||
          (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
          (product.category && product.category.toLowerCase().includes(searchLower))
      );
      set({ products: filtered });
    } catch (error) {
      handleStoreError(error, { component: 'ProductsStore', action: 'searchProducts' });
    }
  },

  filterProductsByCategory: async (category: string) => {
    if (category === 'All') {
      set({ loading: true });
      try {
        const products = await universalCache.get(
          CacheKeyFactory.list('products', { limit: 50, offset: 0 }),
          async () => {
            const { data, error } = await supabase.from('products').select('*').range(0, 49);
            if (error) throw error;
            return data;
          }
        );
        set({ products: products || [], productsOffset: 50, productsHasMore: (products?.length || 0) === 50, loading: false });
      } catch (error) {
        set({ loading: false });
        handleStoreError(error, { component: 'ProductsStore', action: 'filterProductsByCategory' });
      }
      return;
    }

    set({ loading: true });
    try {
      const { data: products } = await supabase.from('products').select('*').eq('category', category).limit(100);
      set({ products: products || [], loading: false });
    } catch (error) {
      set({ loading: false });
      handleStoreError(error, { component: 'ProductsStore', action: 'filterProductsByCategory' });
    }
  },

  addProduct: async (product) => {
    const { image, ...productData } = product;
    let imageUrl = '';

    try {
      if (product.hint && !image) {
        const result = await generateImage({ prompt: product.hint });
        imageUrl = result.imageUrl;
      } else if (image) {
        imageUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(image);
        });
      }

      const dataToSave = { ...productData, imageUrl };
      if (!dataToSave.isVariant) {
        dataToSave.parentProductId = null;
        dataToSave.variantName = null;
      }

      const { data: productResult, error } = await supabase.from('products').insert([dataToSave]).select().single();
      if (error) throw error;
      const newProduct = { ...productResult, imageUrl } as Product;

      set(
        produce((state: ProductsState) => {
          state.products.push(newProduct);
        })
      );

      await invalidateCacheAndRefresh(['app', 'list', 'products'], 'product', newProduct.id);

      toast({
        title: 'Product Added',
        description: `${newProduct.name} has been added to the inventory.`,
      });
      return newProduct;
    } catch (error) {
      handleStoreError(error, { component: 'ProductsStore', action: 'addProduct' });
      throw error;
    }
  },

  updateProduct: async (productId, productData) => {
    try {
      const dataToUpdate = { ...productData };
      if (Object.prototype.hasOwnProperty.call(dataToUpdate, 'variantName') && !dataToUpdate.variantName) {
        dataToUpdate.variantName = null;
      }
      if (Object.prototype.hasOwnProperty.call(dataToUpdate, 'sku') && !dataToUpdate.sku) {
        dataToUpdate.sku = null;
      }

      await supabase.from('products').update(dataToUpdate).eq('id', productId);
      set(
        produce((state: ProductsState) => {
          const index = state.products.findIndex((p) => p.id === productId);
          if (index !== -1) {
            state.products[index] = { ...state.products[index], ...dataToUpdate };
          }
        })
      );

      await invalidateCacheAndRefresh(['app', 'list', 'products'], 'product', productId);
    } catch (error) {
      handleStoreError(error, { component: 'ProductsStore', action: 'updateProduct' });
      throw error;
    }
  },

  deleteProduct: async (productId: string) => {
    try {
      await supabase.from('products').delete().eq('id', productId);
      set(
        produce((state: ProductsState) => {
          state.products = state.products.filter((p) => p.id !== productId);
        })
      );

      await invalidateCacheAndRefresh(['app', 'list', 'products'], 'product', productId);
    } catch (error) {
      handleStoreError(error, { component: 'ProductsStore', action: 'deleteProduct' });
      throw error;
    }
  },

  deleteAllProducts: async () => {
    try {
      const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      set({ products: [] });
      await universalCache.invalidate(['app', 'list', 'products'] as any);
      toast({
        title: 'All Products Deleted',
        description: 'All products have been removed from the database.',
      });
    } catch (error) {
      handleStoreError(error, { component: 'ProductsStore', action: 'deleteAllProducts' });
      throw error;
    }
  },
}));
