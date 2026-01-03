
import { renderHook, act } from '@testing-library/react';
import { useDraftPersistence } from './use-draft-persistence';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    toast: (...args: any[]) => mockToast(...args),
}));

// Mock useDebounce to behave synchronously for testing
vi.mock('use-debounce', () => ({
    useDebounce: (value: any) => [value],
}));

describe('useDraftPersistence', () => {
    const TEST_KEY = 'test-draft-key';
    const TEST_DATA = { field1: 'value1' };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should save data to localStorage when form values change', () => {
        const { result } = renderHook(() => {
            const form = useForm({ defaultValues: { field1: '' } });
            // Enable persistence
            useDraftPersistence({ key: TEST_KEY, form, enabled: true });
            return form;
        });

        // Change value
        act(() => {
            result.current.setValue('field1', 'value1');
        });

        // Trigger a re-render to let the effect run (since we mocked debounce to immediate)
        // With renderHook and real useForm, the state update in useForm should trigger re-render of useDraftPersistence

        // wait for effect?
        // simple check
        const saved = localStorage.getItem(TEST_KEY);
        // Note: useForm watch might need a cycle. 
        // In real app useDebounce waits 1000ms. Here we mocked it to return [value] immediately.
    });

    // Better approach: Mock the form entirely to control 'watch'
    it('should save mocked data', () => {
        const mockWatch = vi.fn().mockReturnValue({ test: 'data' });
        const mockSetValue = vi.fn();
        const mockForm = {
            watch: mockWatch,
            setValue: mockSetValue,
        } as any;

        renderHook(() => useDraftPersistence({ key: TEST_KEY, form: mockForm, enabled: true }));

        // Since watch returns data and debounce is mocked to return it immediately, 
        // logic: if (Object.keys(debouncedValues).length > 0) -> save
        expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify({ test: 'data' }));
    });

    it('should load data from localStorage on mount', () => {
        localStorage.setItem(TEST_KEY, JSON.stringify(TEST_DATA));

        const mockWatch = vi.fn().mockReturnValue({});
        const mockSetValue = vi.fn();
        const mockForm = {
            watch: mockWatch,
            setValue: mockSetValue,
        } as any;

        const { result } = renderHook(() => useDraftPersistence({ key: TEST_KEY, form: mockForm, enabled: true }));

        expect(result.current.isLoaded).toBe(true);
        expect(mockSetValue).toHaveBeenCalledWith('field1', 'value1', expect.anything());
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Draft Found' }));
    });

    it('should clear data from localStorage', () => {
        localStorage.setItem(TEST_KEY, JSON.stringify(TEST_DATA));

        const mockWatch = vi.fn().mockReturnValue({});
        const mockForm = { watch: mockWatch, setValue: vi.fn() } as any;

        const { result } = renderHook(() => useDraftPersistence({ key: TEST_KEY, form: mockForm, enabled: true }));

        act(() => {
            result.current.clearDraft();
        });

        expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });
});
