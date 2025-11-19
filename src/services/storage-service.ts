
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

class StorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("File upload failed. Please try again.");
    }
  }
}

export const storageService = new StorageService();
