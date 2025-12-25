/** @format */

import { create } from 'zustand';
import { produce } from 'immer';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { handleStoreError, invalidateCacheAndRefresh } from './utils/store-helpers';
import type { Category } from '@/lib/types';

interface CategoriesState {
  categories: Category[];
  loading: boolean;

  fetchCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (categoryId: string, categoryData: Partial<Category>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      set({ categories: data as Category[], loading: false });
    } catch (error) {
      set({ loading: false });
      handleStoreError(error, { component: 'CategoriesStore', action: 'fetchCategories' });
    }
  },

  addCategory: async (category) => {
    try {
      const { data: categoryResult, error } = await supabase.from('categories').insert([category]).select().single();
      if (error) throw error;
      const newCategory = categoryResult as Category;
      set(
        produce((state: CategoriesState) => {
          state.categories.push(newCategory);
        })
      );
      await invalidateCacheAndRefresh(['app', 'list', 'categories']);
      toast({ title: 'Category Added' });
      return newCategory;
    } catch (error) {
      handleStoreError(error, { component: 'CategoriesStore', action: 'addCategory' });
      throw error;
    }
  },

  updateCategory: async (categoryId, categoryData) => {
    try {
      await supabase.from('categories').update(categoryData).eq('id', categoryId);
      set(
        produce((state: CategoriesState) => {
          const index = state.categories.findIndex((c: Category) => c.id === categoryId);
          if (index !== -1) {
            state.categories[index] = {
              ...state.categories[index],
              ...categoryData,
            };
          }
        })
      );
      await invalidateCacheAndRefresh(['app', 'list', 'categories']);
      toast({ title: 'Category Updated' });
    } catch (error) {
      handleStoreError(error, { component: 'CategoriesStore', action: 'updateCategory' });
      throw error;
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      const { data: products } = await supabase.from('products').select('id').eq('category', categoryId).limit(1);
      if (products && products.length > 0) {
        toast({
          title: 'Cannot Delete Category',
          description: 'This category is being used by products. Please reassign or delete those products first.',
          variant: 'destructive',
        });
        return;
      }

      await supabase.from('categories').delete().eq('id', categoryId);
      set(
        produce((state: CategoriesState) => {
          state.categories = state.categories.filter((c: Category) => c.id !== categoryId);
        })
      );
      await invalidateCacheAndRefresh(['app', 'list', 'categories']);
      toast({ title: 'Category Deleted' });
    } catch (error) {
      handleStoreError(error, { component: 'CategoriesStore', action: 'deleteCategory' });
      throw error;
    }
  },
}));
