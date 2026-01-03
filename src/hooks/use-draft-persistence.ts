import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import { toast } from '@/hooks/use-toast';

interface UseDraftPersistenceOptions {
    key: string;
    form: UseFormReturn<any>;
    enabled?: boolean;
}

export function useDraftPersistence({ key, form, enabled = true }: UseDraftPersistenceOptions) {
    const [isLoaded, setIsLoaded] = useState(false);
    const formValues = form.watch();
    const [debouncedValues] = useDebounce(formValues, 1000);

    // Load draft on mount
    useEffect(() => {
        if (!enabled) return;

        const savedData = localStorage.getItem(key);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                const hasData = Object.keys(parsedData).length > 0;

                if (hasData) {
                    toast({
                        title: "Draft Found",
                        description: "We restored your previous unsaved changes.",
                    });

                    Object.keys(parsedData).forEach(field => {
                        form.setValue(field, parsedData[field], { shouldDirty: true, shouldValidate: true });
                    });
                }
            } catch (error) {
                console.error("Failed to parse draft data", error);
                localStorage.removeItem(key);
            }
        }
        setIsLoaded(true);
    }, [key, enabled, form]);

    // Save draft on change
    useEffect(() => {
        if (!enabled || !isLoaded) return;

        if (Object.keys(debouncedValues).length > 0) {
            localStorage.setItem(key, JSON.stringify(debouncedValues));
        }
    }, [debouncedValues, key, enabled, isLoaded]);

    const clearDraft = () => {
        localStorage.removeItem(key);
    };

    return { clearDraft, isLoaded };
}
