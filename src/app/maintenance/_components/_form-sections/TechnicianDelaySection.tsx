"use client";

import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';
import { differenceInDays, parseISO, isValid } from 'date-fns';

interface TechnicianDelaySectionProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

const DELAY_REASONS = [
  'Parts/Equipment not available',
  'Client rescheduled multiple times',
  'Technician unavailable',
  'Weather conditions',
  'Emergency priority calls',
  'Equipment breakdown',
  'Scheduling conflict',
  'Client location issues',
  'Other'
];

export function TechnicianDelaySection({ control, watch, setValue }: TechnicianDelaySectionProps) {
  const scheduledDate = watch('scheduledDate');
  const actualArrivalDate = watch('actualArrivalDate');
  const delayDays = watch('delayDays');

  // Auto-calculate delay when dates are set
  useEffect(() => {
    if (scheduledDate && actualArrivalDate) {
      let scheduled: Date;
      let actual: Date;

      // Handle scheduledDate (string from date input)
      if (typeof scheduledDate === 'string') {
        scheduled = parseISO(scheduledDate);
      } else {
        scheduled = scheduledDate;
      }

      // Handle actualArrivalDate (Date object from datetime input)
      if (typeof actualArrivalDate === 'string') {
        actual = parseISO(actualArrivalDate);
      } else {
        actual = actualArrivalDate;
      }

      if (isValid(scheduled) && isValid(actual)) {
        const delay = differenceInDays(actual, scheduled);
        setValue('delayDays', Math.max(0, delay));
        setValue('isSignificantDelay', delay > 3);
      }
    }
  }, [scheduledDate, actualArrivalDate, setValue]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduledDate">Scheduled Date</Label>
          <Input
            id="scheduledDate"
            type="date"
            {...control.register('scheduledDate')}
          />
        </div>

        <div className="space-y-2">
          <Label>Delay (days)</Label>
          <Input
            type="number"
            value={delayDays || 0}
            readOnly
            className={delayDays > 3 ? 'border-red-500' : delayDays > 1 ? 'border-orange-500' : ''}
          />
        </div>
      </div>

      {delayDays > 0 && (
        <div className="space-y-2">
          <Label htmlFor="delayReason">Delay Reason</Label>
          <Select onValueChange={(value) => setValue('delayReason', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select delay reason" />
            </SelectTrigger>
            <SelectContent>
              {DELAY_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
