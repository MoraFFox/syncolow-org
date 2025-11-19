"use client";

import { useState, useEffect } from 'react';
import { Control, UseFormWatch } from 'react-hook-form';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combo-box';
import { Calendar, Plus, X } from 'lucide-react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import type { MaintenanceVisit } from '@/lib/types';

interface FollowUpScheduleSectionProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  visit: MaintenanceVisit | null;
}

export function FollowUpScheduleSection({ control, watch, visit }: FollowUpScheduleSectionProps) {
  const { maintenanceEmployees, addMaintenanceVisit, fetchInitialData } = useMaintenanceStore();
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  useEffect(() => {
    if (!maintenanceEmployees || maintenanceEmployees.length === 0) {
      fetchInitialData();
    }
  }, [maintenanceEmployees, fetchInitialData]);
  const [followUpData, setFollowUpData] = useState({
    date: '',
    technicianName: '',
    notes: '',
    visitType: 'customer_request' as const
  });

  const resolutionStatus = watch('resolutionStatus');

  // Only show if problem is not fully resolved
  if (resolutionStatus === 'solved') {
    return null;
  }

  const handleScheduleFollowUp = async () => {
    if (!visit || !followUpData.date || !followUpData.technicianName) return;

    const newVisit: Omit<MaintenanceVisit, 'id'> = {
      branchId: visit.branchId,
      companyId: visit.companyId,
      branchName: visit.branchName,
      companyName: visit.companyName,
      date: followUpData.date,
      technicianName: followUpData.technicianName,
      visitType: followUpData.visitType,
      maintenanceNotes: followUpData.notes || `Follow-up for visit ${visit.id}`,
      rootVisitId: visit.rootVisitId || visit.id,
      status: 'Scheduled'
    };

    await addMaintenanceVisit(newVisit);
    setShowFollowUpForm(false);
    setFollowUpData({ date: '', technicianName: '', notes: '', visitType: 'customer_request' });
  };

  return (
    <AccordionItem value="follow-up">
      <AccordionTrigger className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Schedule Follow-up Visit
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
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
                onClick={() => setShowFollowUpForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visit Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={followUpData.date}
                  onChange={(e) => setFollowUpData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Technician</Label>
                <Combobox
                  options={(maintenanceEmployees || []).map(employee => ({ label: employee.name, value: employee.name }))}
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
                onClick={handleScheduleFollowUp}
                disabled={!followUpData.date || !followUpData.technicianName}
              >
                Schedule Visit
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFollowUpForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}