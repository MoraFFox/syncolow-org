/** @format */

"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Star,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCompanyStore } from "@/store/use-company-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { DrillTarget } from "@/components/drilldown/drill-target";

export default function BaristaDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { baristas, companies } = useCompanyStore();
  const { maintenanceVisits, fetchInitialData } = useMaintenanceStore();

  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      if (maintenanceVisits.length === 0) {
        await fetchInitialData();
      }
      setLoading(false);
    };

    loadData();
  }, [maintenanceVisits.length, fetchInitialData]);

  const activeBarista = React.useMemo(() => {
    return baristas.find((b) => b.id === id);
  }, [baristas, id]);

  const activeBranch = React.useMemo(() => {
    return companies.find((c) => c.id === activeBarista?.branchId);
  }, [companies, activeBarista]);

  const parentCompany = React.useMemo(() => {
    return activeBranch?.parentCompanyId
      ? companies.find((c) => c.id === activeBranch.parentCompanyId)
      : undefined;
  }, [companies, activeBranch]);

  const branchName = activeBranch?.name || "Unknown";

  const metrics = React.useMemo(() => {
    const visits = maintenanceVisits
      .filter((v) => v.baristaId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalVisits = visits.length;
    const completedVisits = visits.filter(
      (v) => v.status === "Completed"
    ).length;
    const completionRate =
      totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

    // Average Rating
    const ratingMap: Record<string, number> = {
      Excellent: 5,
      Good: 4,
      Fair: 3,
      Poor: 2,
      Critical: 1,
    };
    const totalScore = visits.reduce((sum, v) => {
      return sum + (ratingMap[v.overallReport || ""] || 0);
    }, 0);

    // Count visits that actually have a rating (non-empty overallReport in map)
    const ratedVisits = visits.filter(
      (v) => ratingMap[v.overallReport || ""]
    ).length;

    const averageRating =
      ratedVisits > 0 ? (totalScore / ratedVisits).toFixed(1) : "N/A";

    return {
      totalVisits,
      completionRate,
      averageRating,
      recentVisits: visits,
    };
  }, [maintenanceVisits, id]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Loading...
      </div>
    );
  }

  if (!activeBarista) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Barista not found
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => router.back()}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {activeBarista.name}
          </h1>
          <p className='text-muted-foreground'>
            {branchName}
            {parentCompany && (
              <>
                {" • "}
                <DrillTarget
                  kind='company'
                  payload={{ id: parentCompany.id }}
                  asChild
                >
                  <span className='hover:underline cursor-pointer'>
                    {parentCompany.name}
                  </span>
                </DrillTarget>
              </>
            )}
          </p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Visit Rating</CardTitle>
            <Star className='h-4 w-4 text-yellow-400 fill-yellow-400' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics.averageRating}</div>
            <p className='text-xs text-muted-foreground'>Average from visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Branch</CardTitle>
            <Building2 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-lg font-bold truncate'>{branchName}</div>
            {activeBarista.branchId && (
              <DrillTarget
                kind='branch'
                payload={{ id: activeBarista.branchId }}
                asChild
              >
                <Button
                  variant='link'
                  className='p-0 h-auto text-xs text-muted-foreground'
                >
                  View Branch Details
                </Button>
              </DrillTarget>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Visits Attended
            </CardTitle>
            <ClipboardList className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics.totalVisits}</div>
            <p className='text-xs text-muted-foreground'>
              Recorded maintenance visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Completion Rate
            </CardTitle>
            <CheckCircle2 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics.completionRate}%</div>
            <p className='text-xs text-muted-foreground'>Of visits completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Maintenance Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {metrics.recentVisits.length === 0 ? (
              <div className='text-center text-muted-foreground py-4'>
                No maintenance visits recorded.
              </div>
            ) : (
              metrics.recentVisits.map((visit) => (
                <DrillTarget
                  key={visit.id}
                  kind='maintenance'
                  payload={{ id: visit.id }}
                  asChild
                >
                  <div className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer'>
                    <div className='flex flex-col'>
                      <span className='font-medium'>
                        Visit on {new Date(visit.date).toLocaleDateString()}
                      </span>
                      <span className='text-sm text-muted-foreground truncate max-w-[300px]'>
                        {visit.overallReport || "No report"}
                      </span>
                    </div>
                    <Badge
                      variant={
                        visit.status === "Completed" ? "default" : "secondary"
                      }
                    >
                      {visit.status}
                    </Badge>
                  </div>
                </DrillTarget>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
