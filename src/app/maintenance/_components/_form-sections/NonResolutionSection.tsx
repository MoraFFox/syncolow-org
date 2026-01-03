"use client";

import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { VisitOutcomeFormData } from '../maintenance-schemas';

interface NonResolutionSectionProps {
  control: Control<VisitOutcomeFormData>;
  watch: UseFormWatch<VisitOutcomeFormData>;
  setValue: UseFormSetValue<VisitOutcomeFormData>;
}

const NON_RESOLUTION_REASONS = [
  'Parts not available',
  'Needs specialist technician',
  'Complex issue requires more time',
  'Client approval needed',
  'Equipment needs replacement',
  'Waiting for manufacturer support',
  'Safety concerns',
  'Other'
];

export function NonResolutionSection({ control, watch, setValue }: NonResolutionSectionProps) {
  const resolutionStatus = watch('resolutionStatus');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="resolutionStatus">Resolution Status</Label>
        <Select onValueChange={(value) => setValue('resolutionStatus', value as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Select resolution status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solved">✅ Problem Fully Resolved</SelectItem>
            <SelectItem value="partial">🔄 Partial Resolution</SelectItem>
            <SelectItem value="not_solved">❌ Could Not Resolve</SelectItem>
            <SelectItem value="waiting_parts">📦 Waiting for Parts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(resolutionStatus === 'not_solved' || resolutionStatus === 'partial' || resolutionStatus === 'waiting_parts') && (
        <div className="space-y-2">
          <Label htmlFor="nonResolutionReason">Reason for Non-Resolution</Label>
          <Select onValueChange={(value) => setValue('nonResolutionReason', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {NON_RESOLUTION_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {resolutionStatus === 'partial' && (
        <div className="space-y-2">
          <Label htmlFor="partialResolutionNotes">What was completed?</Label>
          <Textarea
            id="partialResolutionNotes"
            placeholder="Describe what was resolved and what remains..."
            {...control.register('partialResolutionNotes')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="reportSignedBy">Supervisor Signature</Label>
          <Input
            id="reportSignedBy"
            placeholder="Type your signature..."
            className="text-xl text-blue-900 bg-transparent border-0 border-b-2 border-gray-300 rounded-none px-1 py-2 focus:border-blue-500 focus:ring-0"
            style={{
              fontFamily: '"Dancing Script", cursive',
              fontWeight: '500'
            }}
            {...control.register('reportSignedBy')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supervisorWitness">Supervisor Witness</Label>
          <Input
            id="supervisorWitness"
            placeholder="Supervisor name who witnessed"
            {...control.register('supervisorWitness')}
          />
        </div>
      </div>
    </div>
  );
}
