/** @format */

"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCompanyStore } from "@/store/use-company-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Loading from "@/app/loading";
import { Barista } from "@/lib/types";
import Link from "next/link";
import { DrillTarget } from "@/components/drilldown/drill-target";

// Placeholder components - these will be created in the next step
// TODO: When implementing, wrap visit items with DrillTarget kind="maintenance"
// TODO: Wrap branch references with DrillTarget kind="branch"
const BaristaKpiCards = ({ barista }: { barista: Barista }) => (
  <div>KPI Cards for {barista.name}</div>
);
const BaristaPerformanceCharts = ({ barista }: { barista: Barista }) => (
  <div>Charts for {barista.name}</div>
);
const BaristaVisitHistory = ({ barista }: { barista: Barista }) => (
  <div>Visit history for {barista.name}</div>
);

export default function BaristaDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const baristaId = params.baristaId as string;

  const { baristas, companies, loading: companyLoading } = useCompanyStore();
  const { loading: maintenanceLoading } = useMaintenanceStore();

  const barista = useMemo(
    () => baristas.find((b) => b.id === baristaId),
    [baristaId, baristas]
  );
  const branch = useMemo(
    () => (barista ? companies.find((c) => c.id === barista.branchId) : null),
    [barista, companies]
  );

  if (companyLoading || maintenanceLoading) {
    return <Loading />;
  }

  if (!barista) {
    return (
      <div className='text-center'>
        <h2 className='text-xl font-semibold'>Barista not found</h2>
        <Button onClick={() => router.back()} className='mt-4'>
          <ArrowLeft className='mr-2 h-4 w-4' /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <div className='flex justify-between items-start'>
        <div>
          <div className='flex items-center gap-4'>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => router.back()}
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <div>
              <h1 className='text-3xl font-bold'>{barista.name}</h1>
              {branch && (
                <p className='text-muted-foreground'>
                  From{" "}
                  <DrillTarget
                    kind='branch'
                    payload={{
                      id: branch.id,
                      name: branch.name,
                      companyId: branch.parentCompanyId ?? undefined,
                      performanceScore: branch.performanceScore,
                      machineOwned: branch.machineOwned,
                    }}
                    asChild
                  >
                    <Link
                      href={`/clients/${branch.parentCompanyId}/${branch.id}`}
                      className='hover:underline'
                    >
                      {branch.name}
                    </Link>
                  </DrillTarget>
                </p>
              )}
            </div>
          </div>
        </div>
        {/* We can add an edit button here later */}
      </div>

      <div className='space-y-6'>
        <BaristaKpiCards barista={barista} />
        <BaristaPerformanceCharts barista={barista} />
        <BaristaVisitHistory barista={barista} />
      </div>
    </div>
  );
}
