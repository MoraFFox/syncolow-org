
import { renderHook, act } from '@testing-library/react';
import { useOutcomeStepManager } from './useOutcomeStepManager';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useOutcomeStepManager', () => {
    const mockTrigger = vi.fn();
    const mockWatch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Default watch behavior: problemOccurred is false by default
        mockWatch.mockImplementation((name) => {
            if (name === 'problemOccurred') return false;
            return undefined;
        });
        // Default trigger behavior: always valid
        mockTrigger.mockResolvedValue(true);
    });

    it('should initialize at the first step', () => {
        const { result } = renderHook(() => useOutcomeStepManager({ trigger: mockTrigger, watch: mockWatch }));

        expect(result.current.currentStepIndex).toBe(0);
        expect(result.current.currentStep.id).toBe('details');
        expect(result.current.isFirstStep).toBe(true);
        expect(result.current.isLastStep).toBe(false);
    });

    it('should advance to the next step if validation passes', async () => {
        const { result } = renderHook(() => useOutcomeStepManager({ trigger: mockTrigger, watch: mockWatch }));

        await act(async () => {
            await result.current.goToNext();
        });

        expect(mockTrigger).toHaveBeenCalled();
        expect(result.current.currentStepIndex).toBe(1);
        expect(result.current.currentStep.id).toBe('diagnosis');
    });

    it('should NOT advance to the next step if validation fails', async () => {
        mockTrigger.mockResolvedValue(false);
        const { result } = renderHook(() => useOutcomeStepManager({ trigger: mockTrigger, watch: mockWatch }));

        await act(async () => {
            await result.current.goToNext();
        });

        expect(mockTrigger).toHaveBeenCalled();
        expect(result.current.currentStepIndex).toBe(0); // Should stay on first step
    });

    it('should go to previous step without validation', async () => {
        const { result } = renderHook(() => useOutcomeStepManager({ trigger: mockTrigger, watch: mockWatch }));

        // Advance first
        await act(async () => {
            await result.current.goToNext();
        });
        expect(result.current.currentStepIndex).toBe(1);

        // Go back
        act(() => {
            result.current.goToPrevious();
        });

        expect(result.current.currentStepIndex).toBe(0);
    });

    it('should filter out "work" step if problemOccurred is false', () => {
        mockWatch.mockReturnValue(false); // No problem
        const { result } = renderHook(() => useOutcomeStepManager({ trigger: mockTrigger, watch: mockWatch }));

        // Steps should be: details, diagnosis, resolution
        const stepIds = result.current.steps.map(s => s.id);
        expect(stepIds).toEqual(['details', 'diagnosis', 'resolution']);
        expect(stepIds).not.toContain('work');
    });

    it('should include "work" step if problemOccurred is true', () => {
        mockWatch.mockReturnValue(true); // Problem occurred
        const { result } = renderHook(() => useOutcomeStepManager({ trigger: mockTrigger, watch: mockWatch }));

        const stepIds = result.current.steps.map(s => s.id);
        expect(stepIds).toEqual(['details', 'diagnosis', 'work', 'resolution']);
    });

    it('should validate specific fields for "details" step', async () => {
        const { result } = renderHook(() => useOutcomeStepManager({ trigger: mockTrigger, watch: mockWatch }));

        await act(async () => {
            await result.current.goToNext();
        });

        expect(mockTrigger).toHaveBeenCalledWith(['technicianName', 'actualArrivalDate', 'scheduledDate', 'delayDays']);
    });
});
