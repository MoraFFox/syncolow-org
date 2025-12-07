
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

class StorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      // Supabase Storage requires a bucket name. 
      // Assuming 'public' bucket or specific buckets like 'manufacturers', 'products'.
      // For now, let's assume a general 'uploads' bucket or try to infer from path.
      // However, the previous code passed a full path like "manufacturers/..."
      // We'll split the path to get bucket and file path if possible, or just use a default bucket.
      
      // Better approach: The path passed in usually includes the folder structure.
      // Let's assume we have a bucket named 'storage' or similar, or we use the first part of path as bucket.
      // In use-manufacturer-store, path is `manufacturers/${Date.now()}-icon.${fileExtension}`.
      // So we can use 'manufacturers' as bucket if it exists, or 'public' and put it in folder.
      
      // Let's use a standard bucket 'app-storage' for migration simplicity, or 'public'.
      // Or better, let's try to use the first segment as bucket name if we create them in Supabase.
      // For this migration, I will use a single bucket named 'files' for simplicity, 
      // and keep the path structure inside it.
      
      const bucketName = 'files'; 
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      logger.error(error, { component: 'StorageService', action: 'uploadFile' });
      throw new Error("File upload failed. Please try again.");
    }
  }
}

export const storageService = new StorageService();
