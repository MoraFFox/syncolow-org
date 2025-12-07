import { useEffect } from 'react';

export function useFormDraftPersistence(
  storageKey: string,
  isOpen: boolean,
  methods: any
) {
  useEffect(() => {
    const savedData = sessionStorage.getItem(storageKey);
    if (savedData && isOpen) {
      try {
        const parsedData = JSON.parse(savedData);
        methods.reset(parsedData);
      } catch (e) {
        // Failed to restore draft
      }
    }
  }, [isOpen, methods, storageKey]);

  useEffect(() => {
    const subscription = methods.watch((data: any) => {
      if (isOpen) {
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
