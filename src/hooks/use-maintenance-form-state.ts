import { useEffect, useCallback } from 'react';
import type { MaintenanceVisit } from '@/lib/types';
import type { UseFormReset, FieldValues } from 'react-hook-form';
import { parseDateSafely, formatDateForForm } from '@/lib/date-utils';

/**
 * Form values type for the maintenance visit form
 */
export interface MaintenanceFormValues {
  actualArrivalDate: Date | null;
  scheduledDate: string;
  delayDays: number;
  delayReason: string;
  isSignificantDelay: boolean;
  resolutionDate: Date | null;
  technicianName: string;
  baristaRecommendations: string;
  overallReport: string;
  problemOccurred: boolean;
  problemReasons: Array<{ reason: string }>;
  resolutionStatus: string | undefined;
  nonResolutionReason: string;
  partialResolutionNotes: string;
  partsChanged: boolean;
  spareParts: Array<{ name?: string; cost?: number; paidBy?: string }>;
  services: Array<{ name?: string; cost?: number; paidBy?: string }>;
  reportSignedBy: string;
  supervisorWitness: string;
}

/**
 * Hook to manage maintenance form state synchronization with visit data
 * Generic to accept any form values that extend FieldValues
 */
export function useMaintenanceFormState<T extends FieldValues>(
  visit: MaintenanceVisit | null,
  isOpen: boolean,
  reset: UseFormReset<T>
) {
  const resetForm = useCallback(() => {
    reset({
      actualArrivalDate: null,
      scheduledDate: '',
      delayDays: 0,
      delayReason: '',
      isSignificantDelay: false,
      resolutionDate: null,
      technicianName: '',
      baristaRecommendations: '',
      overallReport: '',
      problemOccurred: false,
      problemReasons: [],
      resolutionStatus: undefined,
      nonResolutionReason: '',
      partialResolutionNotes: '',
      partsChanged: false,
      spareParts: [],
      services: [],
      reportSignedBy: '',
      supervisorWitness: '',
    } as unknown as T);
  }, [reset]);

  useEffect(() => {
    if (isOpen && visit) {
      const actualArrivalDateValue = parseDateSafely(visit.actualArrivalDate);
      const resolutionDateValue = parseDateSafely(visit.resolutionDate);
      let scheduledDateValue = formatDateForForm(visit.scheduledDate);
      if (!scheduledDateValue) {
        scheduledDateValue = formatDateForForm(visit.date);
      }

      reset({
        actualArrivalDate: actualArrivalDateValue,
        scheduledDate: scheduledDateValue,
        delayDays: visit.delayDays || 0,
        delayReason: visit.delayReason || '',
        isSignificantDelay: visit.isSignificantDelay || false,
        resolutionDate: resolutionDateValue,
        technicianName: visit.technicianName,
        baristaRecommendations: visit.baristaRecommendations,
        overallReport: visit.overallReport,
        problemOccurred: visit.problemOccurred,
        problemReasons: visit.problemReason?.map((r) => ({ reason: r })) || [],
        resolutionStatus: visit.resolutionStatus,
        nonResolutionReason: visit.nonResolutionReason || '',
        partialResolutionNotes: '',
        partsChanged: !!visit.spareParts && visit.spareParts.length > 0,
        spareParts:
          visit.spareParts?.map((p) => ({ ...p, paidBy: p.paidBy || 'Client' })) || [],
        services:
          visit.services?.map((s) => ({ ...s, paidBy: s.paidBy || 'Company' })) || [],
        reportSignedBy: visit.reportSignedBy || '',
        supervisorWitness: '',
      } as unknown as T);
    } else if (!isOpen) {
      resetForm();
    }
  }, [visit, isOpen, reset, resetForm]);
}
