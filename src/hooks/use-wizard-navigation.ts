import { useState } from 'react';

export function useWizardNavigation(
  totalSteps: number,
  trigger: any,
  validationFields: Record<number, string[]>
) {
  const [step, setStep] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);

  const nextStep = async () => {
    setIsNavigating(true);
    let isValid = true;

    const fieldsToValidate = validationFields[step];
    if (fieldsToValidate) {
      isValid = await trigger(fieldsToValidate);
    }

    if (isValid) {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
    setIsNavigating(false);
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const progressValue = (step / totalSteps) * 100;

  return { step, nextStep, prevStep, progressValue, isNavigating };
}
