import { useEffect } from 'react';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

/**
 * Hook to handle form draft persistence to session storage
 * Provides auto-save on change and restoration on mount
 */
export function useFormDraftPersistence<T extends FieldValues>(
  storageKey: string,
  isOpen: boolean,
  methods: UseFormReturn<T>
) {
  useEffect(() => {
    const savedData = sessionStorage.getItem(storageKey);
    if (savedData && isOpen) {
      try {
        const parsedData = JSON.parse(savedData) as T;
        methods.reset(parsedData);
      } catch {
        // Failed to restore draft - invalid JSON or schema mismatch
      }
    }
  }, [isOpen, methods, storageKey]);

  useEffect(() => {
    const subscription = methods.watch((data) => {
      if (isOpen && data) {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      }
    });
    return () => subscription.unsubscribe();
  }, [isOpen, methods, storageKey]);

  const clearDraft = () => {
    sessionStorage.removeItem(storageKey);
  };

  return { clearDraft };
}
