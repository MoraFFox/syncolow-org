import { useState, useCallback, useEffect } from 'react';
import { UseFormTrigger, UseFormWatch } from 'react-hook-form';
import { VisitOutcomeFormData } from '../app/maintenance/_components/maintenance-schemas';

export type OutcomeStep = 'details' | 'diagnosis' | 'work' | 'resolution';

export const OUTCOME_STEPS: { id: OutcomeStep; title: string; description: string }[] = [
    { id: 'details', title: 'Visit Details', description: 'Technician & Timing' },
    { id: 'diagnosis', title: 'Diagnosis', description: 'Problem Assessment' },
    { id: 'work', title: 'Work Performed', description: 'Services & Parts' },
    { id: 'resolution', title: 'Resolution', description: 'Status & Sign-off' },
];

interface UseOutcomeStepManagerProps {
    trigger: UseFormTrigger<VisitOutcomeFormData>;
    watch: UseFormWatch<VisitOutcomeFormData>;
}

export function useOutcomeStepManager({ trigger, watch }: UseOutcomeStepManagerProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const problemOccurred = watch('problemOccurred');

    // Dynamic steps based on whether a problem occurred
    // If no problem occurred, we might skip the "Work Performed" step or disable it?
    // Current logic: If problemOccurred is false, we can probably skip 'work' or show it as optional/empty.
    // Actually, per existing logic, Services & Parts section is ONLY shown if watchProblemOccurred is true.
    // So we should dynamically adjust the steps or auto-skip.

    const steps = OUTCOME_STEPS.filter(step => {
        if (step.id === 'work' && !problemOccurred) return false;
        return true;
    });

    const currentStep = steps[currentStepIndex] || steps[steps.length - 1];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    // Clamp step index when steps array shrinks
    useEffect(() => {
        if (currentStepIndex >= steps.length && steps.length > 0) {
            setCurrentStepIndex(steps.length - 1);
        }
    }, [steps.length, currentStepIndex]);

    const validateCurrentStep = useCallback(async () => {
        const step = steps[currentStepIndex];
        if (!step) return false; // Guard against undefined
        const stepId = step.id;
        let fieldsToValidate: (keyof VisitOutcomeFormData)[] = [];

        switch (stepId) {
            case 'details':
                fieldsToValidate = ['technicianName', 'actualArrivalDate', 'scheduledDate', 'delayDays'];
                break;
            case 'diagnosis':
                fieldsToValidate = ['problemOccurred'];
                if (problemOccurred) {
                    fieldsToValidate.push('problemReasons');
                }
                break;
            case 'work':
                fieldsToValidate = ['services', 'spareParts'];
                break;
            case 'resolution':
                fieldsToValidate = ['resolutionStatus', 'reportSignedBy', 'supervisorWitness'];
                break;
        }

        const isValid = await trigger(fieldsToValidate);
        return isValid;
    }, [currentStepIndex, steps, trigger, problemOccurred]);

    const goToNext = async () => {
        const isValid = await validateCurrentStep();
        if (isValid) {
            setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
        }
    };

    const goToPrevious = () => {
        setCurrentStepIndex(prev => Math.max(prev - 1, 0));
    };

    const goToStep = async (index: number) => {
        // Only allow jumping to previous steps or the next immediate step if current is valid
        if (index < currentStepIndex) {
            setCurrentStepIndex(index);
        } else if (index === currentStepIndex + 1) {
            await goToNext();
        }
    };

    return {
        currentStep,
        currentStepIndex,
        steps,
        isFirstStep,
        isLastStep,
        goToNext,
        goToPrevious,
        goToStep,
        progress: ((currentStepIndex + 1) / steps.length) * 100
    };
}
