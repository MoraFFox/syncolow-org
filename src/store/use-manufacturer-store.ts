
import { create } from 'zustand';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Manufacturer, Product } from '@/lib/types';
import { storageService } from '@/services/storage-service';

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
      const manufacturersCollection = collection(db, 'manufacturers');
      const productsCollection = collection(db, 'products');

      const [manufacturersSnapshot, productsSnapshot] = await Promise.all([
        getDocs(manufacturersCollection),
        getDocs(productsCollection),
      ]);

      const manufacturers = manufacturersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as Manufacturer));

      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));

      const productsByManufacturer: Record<string, Product[]> = {};
      products.forEach(product => {
        const manufacturerId = product.manufacturerId || 'unassigned';
        if (!productsByManufacturer[manufacturerId]) {
          productsByManufacturer[manufacturerId] = [];
        }
        productsByManufacturer[manufacturerId].push(product);
      });

      set({
        manufacturers,
        productsByManufacturer,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching manufacturers and products:", error);
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
    const docRef = await addDoc(collection(db, 'manufacturers'), { ...rest, icon: iconUrl });
    const newManufacturer: Manufacturer = {
      id: docRef.id,
      ...rest,
      icon: iconUrl,
    };

    set((state) => ({
      manufacturers: [...state.manufacturers, newManufacturer]
    }));

    return newManufacturer;
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

    const manufacturerRef = doc(db, 'manufacturers', id);
    await updateDoc(manufacturerRef, updateData);

    set((state) => ({
      manufacturers: state.manufacturers.map(m =>
        m.id === id ? { ...m, ...updateData } as Manufacturer : m
      ),
    }));
  },

  deleteManufacturer: async (id: string) => {
    console.log(`Attempting to delete manufacturer with id: ${id}`);
    try {
      const manufacturerRef = doc(db, 'manufacturers', id);
      await deleteDoc(manufacturerRef);
      console.log(`Successfully deleted manufacturer with id: ${id} from Firestore.`);

      set((state) => ({
        manufacturers: state.manufacturers.filter((m) => m.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting manufacturer from Firestore:', error);
      set({ error: 'Failed to delete manufacturer' });
      // Re-throw the error to be caught by the calling component
      throw error;
    }
  },
  
  deleteManufacturerAndProducts: async (manufacturerId: string) => {
    const batch = writeBatch(db);

    // Delete the manufacturer document
    const manufacturerRef = doc(db, 'manufacturers', manufacturerId);
    batch.delete(manufacturerRef);

    // Query for all products with the given manufacturerId
    const productsQuery = query(collection(db, 'products'), where('manufacturerId', '==', manufacturerId));
    const productsSnapshot = await getDocs(productsQuery);
    productsSnapshot.forEach((productDoc) => {
      batch.delete(productDoc.ref);
    });

    await batch.commit();

    // Refresh local state
    get().fetchManufacturersAndProducts();
  },

  updateProductManufacturer: async (productId, manufacturerId) => {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { manufacturerId });
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
    } catch (error) {
      console.error('Error updating product manufacturer:', error);
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
        const batch = writeBatch(db);
        chunk.forEach(productId => {
          const productRef = doc(db, 'products', productId);
          batch.update(productRef, { manufacturerId });
        });
        try {
          await batch.commit();
          totalCompleted += chunk.length;
        } catch (batchError) {
          console.error(`Error in batch commit (${chunkIndex}):`, batchError);
          totalFailed += chunk.length;
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
    } catch (error) {
      console.error('Error updating multiple products:', error);
      set({ error: 'Failed to update multiple products' });
      throw error;
    }
  },
}));

