import { useEffect, useCallback } from 'react';
import type { MaintenanceVisit } from '@/lib/types';
import { parseDateSafely, formatDateForForm } from '@/lib/date-utils';

export function useMaintenanceFormState(
  visit: MaintenanceVisit | null,
  isOpen: boolean,
  reset: any
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
    });
  }, [reset]);

  useEffect(() => {
    if (isOpen && visit) {
      const actualArrivalDateValue = parseDateSafely(visit.actualArrivalDate);
      const resolutionDateValue = parseDateSafely(visit.resolutionDate);
      const scheduledDateValue = visit.scheduledDate
        ? formatDateForForm(visit.scheduledDate)
        : formatDateForForm(visit.date);

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
      });
    } else if (!isOpen) {
      resetForm();
    }
  }, [visit, isOpen, reset, resetForm]);
}
