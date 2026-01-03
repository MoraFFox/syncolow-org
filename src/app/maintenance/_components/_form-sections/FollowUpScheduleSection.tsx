"use client";

import { useState, useEffect } from 'react';
import { UseFormWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combo-box';
import { Plus, X, Check } from 'lucide-react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import type { MaintenanceVisit } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export interface FollowUpData {
  date: string;
  technicianName: string;
  notes: string;
  visitType: 'customer_request' | 'periodic';
}

interface FollowUpScheduleSectionProps {
  watch: UseFormWatch<any>;
  visit: MaintenanceVisit | null;
  onFollowUpChange: (data: FollowUpData | null) => void;
  pendingFollowUp: FollowUpData | null;
}

export function FollowUpScheduleSection({ watch, visit, onFollowUpChange, pendingFollowUp }: FollowUpScheduleSectionProps) {
  const { maintenanceEmployees, fetchInitialData } = useMaintenanceStore();
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  useEffect(() => {
    if (!maintenanceEmployees || maintenanceEmployees.length === 0) {
      fetchInitialData();
    }
  }, [maintenanceEmployees, fetchInitialData]);

  const [followUpData, setFollowUpData] = useState<FollowUpData>({
    date: '',
    technicianName: '',
    notes: '',
    visitType: 'customer_request'
  });

  const resolutionStatus = watch('resolutionStatus');

  // Only show if problem is not fully resolved
  if (resolutionStatus === 'solved') {
    return null;
  }

  const handleConfirmFollowUp = () => {
    if (!followUpData.date || !followUpData.technicianName) return;
    onFollowUpChange(followUpData);
    setShowFollowUpForm(false);
  };

  const handleCancelFollowUp = () => {
    setShowFollowUpForm(false);
    setFollowUpData({ date: '', technicianName: '', notes: '', visitType: 'customer_request' });
  };

  const handleRemovePendingFollowUp = () => {
    onFollowUpChange(null);
  };

  // If there's a pending follow-up, show it as a confirmation badge
  if (pendingFollowUp && !showFollowUpForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-medium">Follow-up Visit Scheduled</p>
              <p className="text-sm text-muted-foreground">
                {pendingFollowUp.date} • {pendingFollowUp.technicianName}
              </p>
              {pendingFollowUp.notes && (
                <p className="text-xs text-muted-foreground mt-1">{pendingFollowUp.notes}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-amber-600 border-amber-500">
              Pending Save
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePendingFollowUp}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          This follow-up will be created when you click "Save Record"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!showFollowUpForm ? (
        <Button
          type="button"
          onClick={() => setShowFollowUpForm(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Follow-up Visit
        </Button>
      ) : (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">New Follow-up Visit</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelFollowUp}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visit Date</Label>
              <Input
                type="date"
                value={followUpData.date}
                onChange={(e) => setFollowUpData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Technician</Label>
              <Combobox
                options={Array.from(new Set((maintenanceEmployees || []).map(e => e.name))).map(name => ({ label: name, value: name }))}
                value={followUpData.technicianName}
                onChange={(value) => setFollowUpData(prev => ({ ...prev, technicianName: value }))}
                placeholder="Select a technician..."
                searchPlaceholder="Search technicians..."
                emptyText="No technicians found."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Follow-up Notes</Label>
            <Textarea
              placeholder="Specific instructions for the follow-up visit..."
              value={followUpData.notes}
              onChange={(e) => setFollowUpData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleConfirmFollowUp}
              disabled={!followUpData.date || !followUpData.technicianName}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirm Follow-up
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelFollowUp}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
