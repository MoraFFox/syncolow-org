"use client";

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Loading from '@/app/loading';
import { CrewMemberForm } from '../../_components/crew-member-form';

import { CrewProfileHeader } from './_components/crew-profile-header';
import { CrewSkillsWidget } from './_components/crew-skills-widget';
import { CrewKpiCards } from './_components/crew-kpi-cards';
import { CrewPerformanceCharts } from './_components/crew-performance-charts';
import { CrewVisitHistory } from './_components/crew-visit-history';

export default function CrewMemberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const crewId = params.crewId as string;

  const { maintenanceEmployees, maintenanceVisits, loading, updateMaintenanceEmployee } = useMaintenanceStore();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const crewMember = useMemo(() => maintenanceEmployees.find(b => b.id === crewId), [crewId, maintenanceEmployees]);

  const memberVisits = useMemo(() => maintenanceVisits.filter(v => v.technicianName === crewMember?.name), [maintenanceVisits, crewMember]);

  const activeVisits = useMemo(() => memberVisits.filter(v => v.status === 'Scheduled' || v.status === 'In Progress'), [memberVisits]);

  const handleFormSubmit = async (data: any) => {
    if (crewMember) {
      await updateMaintenanceEmployee(crewMember.id, data);
      setIsFormOpen(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!crewMember) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-2xl font-semibold">Crew member not found</h2>
        <p className="text-muted-foreground">The technician you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Roster
        </Button>
      </div>

      {/* Header Section */}
      <CrewProfileHeader
        employee={crewMember}
        activeVisits={activeVisits}
        onEdit={() => setIsFormOpen(true)}
      />

      {/* KPI Grid */}
      <CrewKpiCards crewMember={crewMember} visits={memberVisits} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Skills & Charts (Sticky-ish usually, but simple grid here) */}
        <div className="space-y-6">
          <CrewSkillsWidget />
          <CrewPerformanceCharts crewMember={crewMember} visits={memberVisits} />
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2 space-y-6">
          <CrewVisitHistory crewMember={crewMember} visits={memberVisits} />
        </div>
      </div>

      {/* Edit Form */}
      <CrewMemberForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        crewMember={crewMember}
      />
    </div>
  );
}
