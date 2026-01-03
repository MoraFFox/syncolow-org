"use client";

import { SlideIn, StaggerContainer, StaggerItem, HoverScale, TapScale } from '@/components/ui/motion-primitives';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MaintenanceVisit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ChevronRight, ChevronLeft } from 'lucide-react';
import { useCompanyStore } from '@/store/use-company-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useState, useRef, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { useMaintenanceFormState } from '@/hooks/use-maintenance-form-state';
import { useSelectorDialogs } from '@/hooks/use-selector-dialogs';
import { parseDateSafely } from '@/lib/date-utils';

import { VisitDetailsSection } from './_form-sections/VisitDetailsSection';
import { useDraftPersistence } from '@/hooks/use-draft-persistence';
import { ProblemDiagnosisSection } from './_form-sections/ProblemDiagnosisSection';
import { ServicesAndPartsSection } from './_form-sections/ServicesAndPartsSection';
import { TechnicianDelaySection } from './_form-sections/TechnicianDelaySection';
import { NonResolutionSection } from './_form-sections/NonResolutionSection';
import { FollowUpScheduleSection, FollowUpData } from './_form-sections/FollowUpScheduleSection';
import { ProblemReasonSelector } from './_components/ProblemReasonSelector';
import { SparePartSelector } from './_components/SparePartSelector';
import { OutcomeFormStepper } from './OutcomeFormStepper';

import { visitOutcomeSchema, VisitOutcomeFormData } from './maintenance-schemas';
import { FormDialogWrapper } from '@/components/maintenance/form-dialog-wrapper';
import { useOutcomeStepManager } from '@/hooks/useOutcomeStepManager';
import { FormSection } from '@/components/maintenance/form-section'; // Keeping distinct imports
import { ClipboardCheck, Activity, Wrench, AlertCircle, Clock } from 'lucide-react';

interface MaintenanceVisitOutcomeFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    visit: MaintenanceVisit | null;
    onFormSubmit: (visitId: string, data: Partial<MaintenanceVisit>) => void;
}

export function MaintenanceVisitOutcomeForm({ isOpen, onOpenChange, visit, onFormSubmit }: MaintenanceVisitOutcomeFormProps) {
    const { companies } = useCompanyStore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [pendingFollowUp, setPendingFollowUp] = useState<FollowUpData | null>(null);
    const { addMaintenanceVisit } = useMaintenanceStore();

    const methods = useForm<VisitOutcomeFormData>({
        resolver: zodResolver(visitOutcomeSchema),
        defaultValues: {
            problemOccurred: false,
            partsChanged: false,
            resolutionStatus: undefined,
            delayDays: 0,
            scheduledDate: '',
            problemReasons: [],
            spareParts: [],
            services: [],
        }
    });

    const { register, handleSubmit, control, watch, reset, setValue, trigger, formState: { errors } } = methods;

    const {
        isReasonSelectorOpen,
        openReasonSelector,
        closeReasonSelector,
        isPartSelectorOpen,
        openPartSelector,
        closePartSelector,
        partSelectorCallback,
    } = useSelectorDialogs();

    // Hook to sync form with visit data when opening
    useMaintenanceFormState(visit, isOpen, reset);

    // Draft Persistence
    const { clearDraft } = useDraftPersistence({
        key: `maintenance-draft-${visit?.id || 'new'}`,
        form: methods,
        enabled: isOpen && !isSaving && !!visit
    });

    // Stepper Logic
    const {
        currentStep,
        currentStepIndex,
        steps,
        isFirstStep,
        isLastStep,
        goToNext,
        goToPrevious,
        goToStep
    } = useOutcomeStepManager({ trigger, watch });

    const onSubmit = async (data: VisitOutcomeFormData) => {
        if (!visit) return;
        setIsSaving(true);
        try {
            const submissionData: Partial<MaintenanceVisit> = {
                ...data,
                problemReason: data.problemReasons?.map((r) => r.reason),
            };

            // Submit the parent form update
            await onFormSubmit(visit.id, submissionData);

            // If there's a pending follow-up, create it now
            if (pendingFollowUp) {
                const newFollowUp: Omit<MaintenanceVisit, 'id'> = {
                    branchId: visit.branchId,
                    companyId: visit.companyId,
                    branchName: visit.branchName,
                    companyName: visit.companyName,
                    date: pendingFollowUp.date,
                    technicianName: pendingFollowUp.technicianName,
                    visitType: pendingFollowUp.visitType,
                    maintenanceNotes: pendingFollowUp.notes || `Follow-up for visit ${visit.id}`,
                    rootVisitId: visit.rootVisitId || visit.id,
                    status: 'Scheduled'
                };
                await addMaintenanceVisit(newFollowUp);
                setPendingFollowUp(null);
                toast({
                    title: "Follow-up Scheduled",
                    description: `Follow-up visit scheduled for ${pendingFollowUp.date}`,
                });
            }

            clearDraft();
            setIsSaving(false);
            // Wait a moment for the store to update before closing
            // This ensures fetchInitialData completes
            setTimeout(() => {
                onOpenChange(false);
            }, 100);
        } catch (error) {
            console.error(error);
            toast({
                title: "Submission Error",
                description: "Failed to save data. Please try again.",
                variant: "destructive",
            });
            setIsSaving(false);
        }
    };

    const clientName = visit ? (companies.find((c) => c.id === visit.branchId)?.name || 'N/A') : 'N/A';
    const visitDate = parseDateSafely(visit?.date);
    const dateString = visitDate && isValid(visitDate) ? format(visitDate, 'PPP') : 'N/A';

    // Footer Actions
    const Footer = (
        <div className="flex w-full justify-between gap-2 items-center">
            <Button
                variant="ghost"
                onClick={isFirstStep ? () => onOpenChange(false) : goToPrevious}
                disabled={isSaving}
                className="text-muted-foreground hover:text-foreground h-12 sm:h-10"
            >
                {isFirstStep ? 'Cancel' : (
                    <>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </>
                )}
            </Button>

            <div className="flex gap-2">
                {!isLastStep ? (
                    <TapScale>
                        <Button onClick={goToNext} type="button" className="h-12 sm:h-10">
                            Next Step <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </TapScale>
                ) : (
                    <TapScale>
                        <Button onClick={handleSubmit(onSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            const errorMessages = Object.entries(errors)
                                .map(([field, error]) => `${field}: ${error?.message || 'Invalid'}`)
                                .join(', ');
                            toast({
                                title: "Validation Error",
                                description: errorMessages || "Please fill in all required fields.",
                                variant: "destructive",
                            });
                        })} disabled={isSaving} className="min-w-[140px] h-12 sm:h-10">
                            {isSaving ? (
                                <span role="status" aria-live="polite" className="flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Record
                                </>
                            )}
                        </Button>
                    </TapScale>
                )}
            </div>
        </div>
    );

    // Scroll Reset Logic
    const formRef = useRef<HTMLFormElement>(null);
    useEffect(() => {
        if (formRef.current) {
            formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentStepIndex]);

    return (
        <>
            <ProblemReasonSelector
                isOpen={isReasonSelectorOpen}
                onOpenChange={closeReasonSelector}
                selectedReasons={watch("problemReasons")?.map((r) => r.reason) || []}
                onSelect={(reason) => {
                    const currentReasons = watch("problemReasons")?.map((r) => r.reason) || [];
                    if (!currentReasons.includes(reason)) {
                        setValue('problemReasons', [...(watch("problemReasons") || []), { reason }]);
                    }
                }}
            />

            <SparePartSelector
                isOpen={isPartSelectorOpen}
                onOpenChange={closePartSelector}
                onSelect={partSelectorCallback}
            />

            <FormDialogWrapper
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                title={`Log Outcome: ${clientName}`}
                description={`Scheduled for ${dateString}`}
                footer={Footer}
                maxWidth="3xl"
            >
                <div className="flex flex-col h-full">
                    {/* Stepper Header */}
                    <OutcomeFormStepper
                        steps={steps}
                        currentStepIndex={currentStepIndex}
                        onStepClick={goToStep}
                    />

                    <FormProvider {...methods}>
                        <form ref={formRef} id="visit-outcome-form" onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {/* Step 1: Visit Details */}
                                {currentStep.id === 'details' && (
                                    <SlideIn key="step-details" direction="right" className="space-y-6">
                                        <StaggerContainer>
                                            <StaggerItem>
                                                <FormSection title="Visit Details" icon={ClipboardCheck} description="Basic information about the visit execution.">
                                                    <VisitDetailsSection control={control} register={register} errors={errors} />
                                                </FormSection>
                                            </StaggerItem>

                                            <StaggerItem className="mt-6">
                                                <FormSection title="Delays & Duration" icon={Clock} description="Record any delays or timing issues.">
                                                    <TechnicianDelaySection
                                                        control={control}
                                                        watch={watch}
                                                        setValue={setValue}
                                                    />
                                                </FormSection>
                                            </StaggerItem>
                                        </StaggerContainer>
                                    </SlideIn>
                                )}

                                {/* Step 2: Problem Diagnosis */}
                                {currentStep.id === 'diagnosis' && (
                                    <SlideIn key="step-diagnosis" direction="right" className="space-y-6">
                                        <FormSection title="Problem Diagnosis" icon={Activity} description="What was the reported issue and cause?">
                                            <ProblemDiagnosisSection
                                                control={control}
                                                watch={watch}
                                                setValue={setValue}
                                                onOpenReasonSelector={openReasonSelector}
                                            />
                                        </FormSection>
                                    </SlideIn>
                                )}

                                {/* Step 3: Work Performed (only shown if problem occurred) */}
                                {currentStep.id === 'work' && (
                                    <SlideIn key="step-work" direction="right" className="space-y-6">
                                        <FormSection title="Services & Parts" icon={Wrench} description="Materials used and services performed.">
                                            <ServicesAndPartsSection
                                                control={control}
                                                onOpenPartSelector={openPartSelector}
                                            />
                                        </FormSection>
                                    </SlideIn>
                                )}

                                {/* Step 4: Resolution & Sign-off */}
                                {currentStep.id === 'resolution' && (
                                    <SlideIn key="step-resolution" direction="right" className="space-y-6">
                                        <StaggerContainer>
                                            <StaggerItem>
                                                <FormSection title="Resolution Status" icon={AlertCircle} description="Was the issue resolved?">
                                                    <NonResolutionSection
                                                        control={control}
                                                        watch={watch}
                                                        setValue={setValue}
                                                    />
                                                </FormSection>
                                            </StaggerItem>

                                            {/* Follow-up is now integrated here */}
                                            <AnimatePresence>
                                                {watch('resolutionStatus') !== 'solved' && watch('resolutionStatus') && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="mt-6 overflow-hidden"
                                                    >
                                                        <FormSection title="Follow Up" icon={Clock} description="Schedule next steps if necessary.">
                                                            <FollowUpScheduleSection
                                                                watch={watch}
                                                                visit={visit}
                                                                onFollowUpChange={setPendingFollowUp}
                                                                pendingFollowUp={pendingFollowUp}
                                                            />
                                                        </FormSection>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </StaggerContainer>
                                    </SlideIn>
                                )}
                            </AnimatePresence>
                        </form>
                    </FormProvider>
                </div>
            </FormDialogWrapper>
        </>
    );
}
