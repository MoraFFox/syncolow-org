
"use client";

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import Loading from '@/app/loading';
import { MaintenanceEmployee } from '@/lib/types';
import Link from 'next/link';
import { CrewKpiCards } from './_components/crew-kpi-cards';
import { CrewPerformanceCharts } from './_components/crew-performance-charts';
import { CrewVisitHistory } from './_components/crew-visit-history';
import { CrewMemberForm } from '../../_components/crew-member-form';


export default function CrewMemberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const crewId = params.crewId as string;

  const { maintenanceEmployees, maintenanceVisits, loading, updateMaintenanceEmployee } = useMaintenanceStore();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const crewMember = useMemo(() => maintenanceEmployees.find(b => b.id === crewId), [crewId, maintenanceEmployees]);
  const memberVisits = useMemo(() => maintenanceVisits.filter(v => v.technicianName === crewMember?.name), [maintenanceVisits, crewMember]);

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
      <div className="text-center">
        <h2 className="text-xl font-semibold">Crew member not found</h2>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      <CrewMemberForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        crewMember={crewMember}
      />
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{crewMember.name}</h1>
                <p className="text-muted-foreground">Maintenance Crew Member Performance</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsFormOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Crew Member
          </Button>
        </div>

        <div className="space-y-6">
          <CrewKpiCards crewMember={crewMember} visits={memberVisits} />
          <CrewPerformanceCharts crewMember={crewMember} visits={memberVisits} />
          <CrewVisitHistory crewMember={crewMember} visits={memberVisits} />
        </div>

      </div>
    </>
  );
}
