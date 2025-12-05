/** @format */

"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Wrench,
  Building2,
  DollarSign,
  AlertTriangle,
  Clock,
  Link as LinkIcon,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { useCompanyStore } from "@/store/use-company-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MaintenanceDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { maintenanceVisits, fetchInitialData: fetchMaintenanceData } =
    useMaintenanceStore();
  const { companies, baristas } = useCompanyStore();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        if (maintenanceVisits.length === 0) {
          await fetchMaintenanceData();
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading maintenance details:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [id, maintenanceVisits.length, fetchMaintenanceData]);

  const visit = React.useMemo(() => {
    return maintenanceVisits.find((v) => v.id === id);
  }, [maintenanceVisits, id]);

  const relatedData = React.useMemo(() => {
    if (!visit) return null;
    const branch = companies.find((c) => c.id === visit.branchId);
    const company = companies.find((c) => c.id === visit.companyId);
    const barista = visit.baristaId
      ? baristas.find((b) => b.id === visit.baristaId)
      : null;

    return {
      branch,
      company,
      barista,
      branchName: visit.branchName || branch?.name || "Unknown Branch",
      companyName: visit.companyName || company?.name || "Unknown Company",
      baristaName: visit.baristaName || barista?.name || "Unassigned",
    };
  }, [visit, companies, baristas]);

  const followUpChain = React.useMemo(() => {
    if (!visit) return [];
    return maintenanceVisits.filter(
      (v) =>
        (v.rootVisitId && v.rootVisitId === visit.rootVisitId) ||
        (visit.rootVisitId && v.id === visit.rootVisitId) ||
        v.rootVisitId === visit.id
    );
  }, [visit, maintenanceVisits]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Loading...
      </div>
    );
  }

  if (!visit || !relatedData) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Maintenance visit not found
      </div>
    );
  }

  const partsCost =
    visit.spareParts?.reduce(
      (sum, part) => sum + part.quantity * (part.price || 0),
      0
    ) || 0;

  const servicesCost =
    visit.services?.reduce(
      (sum, service) => sum + service.quantity * service.cost,
      0
    ) || 0;

  const daysSince = Math.floor(
    (new Date().getTime() - new Date(visit.date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => router.back()}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            Maintenance Visit
          </h1>
          <div className='flex items-center gap-2 text-muted-foreground'>
            <span>{formatDate(visit.date)}</span>
            <span>•</span>
            <span>{relatedData.branchName}</span>
          </div>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          {visit.isSignificantDelay && (
            <Badge variant='destructive' className='gap-1'>
              <AlertTriangle className='h-3 w-3' />
              Delayed
            </Badge>
          )}
          <Badge
            variant={visit.status === "Completed" ? "default" : "secondary"}
            className='text-base px-3 py-1'
          >
            {visit.status}
          </Badge>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Technician</CardTitle>
            <Wrench className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-lg font-bold'>
              {visit.technicianName || "Unassigned"}
            </div>
            <p className='text-xs text-muted-foreground'>
              Resolution: {visit.resolutionStatus || "Pending"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Cost</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(visit.totalCost || 0)}
            </div>
            <div className='flex justify-between text-xs text-muted-foreground mt-1'>
              <span>Labor: {formatCurrency(visit.laborCost || 0)}</span>
              <span>Parts: {formatCurrency(partsCost)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Location</CardTitle>
            <Building2 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-lg font-bold truncate'>
              {relatedData.branchName}
            </div>
            {visit.companyId && (
              <DrillTarget
                kind='company'
                payload={{ id: visit.companyId }}
                asChild
              >
                <Button
                  variant='link'
                  className='p-0 h-auto text-xs text-muted-foreground'
                >
                  {relatedData.companyName}
                </Button>
              </DrillTarget>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Timeline</CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{daysSince} days</div>
            <p className='text-xs text-muted-foreground'>Since visit date</p>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 md:grid-cols-3'>
        <div className='md:col-span-2 space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Problem & Resolution</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <h4 className='text-sm font-medium mb-1'>Reported Problem</h4>
                <div className='p-3 bg-muted/30 rounded-md text-sm'>
                  {visit.problemReason?.join(", ") ||
                    "No specific problem recorded."}
                </div>
              </div>

              <div>
                <h4 className='text-sm font-medium mb-1'>Overall Report</h4>
                <div className='p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap'>
                  {visit.overallReport || "No report available."}
                </div>
              </div>

              {visit.nonResolutionReason && (
                <div>
                  <h4 className='text-sm font-medium mb-1 text-destructive'>
                    Non-Resolution Reason
                  </h4>
                  <div className='p-3 bg-destructive/10 text-destructive rounded-md text-sm'>
                    {visit.nonResolutionReason}
                  </div>
                </div>
              )}

              {visit.maintenanceNotes && (
                <div>
                  <h4 className='text-sm font-medium mb-1'>Internal Notes</h4>
                  <div className='p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap'>
                    {visit.maintenanceNotes}
                  </div>
                </div>
              )}

              {visit.rootVisitId && (
                <div className='pt-2'>
                  <DrillTarget
                    kind='maintenance'
                    payload={{ id: visit.rootVisitId }}
                    asChild
                  >
                    <Button variant='outline' size='sm' className='gap-2'>
                      <LinkIcon className='h-3 w-3' />
                      View Related Visit
                    </Button>
                  </DrillTarget>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services Performed</CardTitle>
            </CardHeader>
            <CardContent>
              {!visit.services || visit.services.length === 0 ? (
                <div className='text-center text-muted-foreground py-4'>
                  No services recorded.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className='text-right'>Qty</TableHead>
                      <TableHead className='text-right'>Cost</TableHead>
                      <TableHead className='text-right'>Total</TableHead>
                      <TableHead className='text-right'>Paid By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visit.services.map((service, idx) => (
                      <TableRow key={idx}>
                        <TableCell className='font-medium'>
                          {service.name}
                        </TableCell>
                        <TableCell className='text-right'>
                          {service.quantity}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatCurrency(service.cost)}
                        </TableCell>
                        <TableCell className='text-right font-bold'>
                          {formatCurrency(service.cost * service.quantity)}
                        </TableCell>
                        <TableCell className='text-right'>
                          <Badge variant='outline'>{service.paidBy}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className='text-right font-bold'>
                        Total Services
                      </TableCell>
                      <TableCell className='text-right font-bold'>
                        {formatCurrency(servicesCost)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spare Parts Used</CardTitle>
            </CardHeader>
            <CardContent>
              {!visit.spareParts || visit.spareParts.length === 0 ? (
                <div className='text-center text-muted-foreground py-4'>
                  No spare parts used.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Name</TableHead>
                      <TableHead className='text-right'>Qty</TableHead>
                      <TableHead className='text-right'>Price</TableHead>
                      <TableHead className='text-right'>Total</TableHead>
                      <TableHead className='text-right'>Paid By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visit.spareParts.map((part, idx) => (
                      <TableRow key={idx}>
                        <TableCell className='font-medium'>
                          {part.name}
                        </TableCell>
                        <TableCell className='text-right'>
                          {part.quantity}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatCurrency(part.price || 0)}
                        </TableCell>
                        <TableCell className='text-right font-bold'>
                          {formatCurrency((part.price || 0) * part.quantity)}
                        </TableCell>
                        <TableCell className='text-right'>
                          <Badge variant='outline'>{part.paidBy}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className='text-right font-bold'>
                        Total Parts
                      </TableCell>
                      <TableCell className='text-right font-bold'>
                        {formatCurrency(partsCost)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className='space-y-6'>
          {visit.isSignificantDelay && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <AlertTriangle className='h-4 w-4 text-destructive' />
                  Delay Information
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm font-medium'>Delay Days:</span>
                  <span
                    className={`font-bold ${
                      (visit.delayDays || 0) > 3
                        ? "text-destructive"
                        : "text-orange-500"
                    }`}
                  >
                    {visit.delayDays || 0} days
                  </span>
                </div>
                {visit.delayReason && (
                  <div>
                    <span className='text-sm font-medium'>Reason:</span>
                    <p className='text-sm text-muted-foreground mt-1'>
                      {visit.delayReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {followUpChain.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <LinkIcon className='h-4 w-4' />
                  Follow-up Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {followUpChain.map((chainVisit) => (
                    <DrillTarget
                      key={chainVisit.id}
                      kind='maintenance'
                      payload={{ id: chainVisit.id }}
                      asChild
                    >
                      <div className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer'>
                        <div className='flex flex-col'>
                          <span className='text-sm font-medium'>
                            {formatDate(chainVisit.date)}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            {formatCurrency(chainVisit.totalCost || 0)}
                          </span>
                        </div>
                        <Badge
                          variant={
                            chainVisit.status === "Completed"
                              ? "default"
                              : "secondary"
                          }
                          className='text-xs'
                        >
                          {chainVisit.status}
                        </Badge>
                      </div>
                    </DrillTarget>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Related Entities</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between p-3 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  <div className='h-8 w-8 bg-muted rounded-full flex items-center justify-center'>
                    <Building2 className='h-4 w-4' />
                  </div>
                  <div>
                    <div className='text-sm font-medium'>Branch</div>
                    <div className='text-xs text-muted-foreground truncate max-w-[120px]'>
                      {relatedData.branchName}
                    </div>
                  </div>
                </div>
                {visit.branchId && (
                  <DrillTarget
                    kind='branch'
                    payload={{ id: visit.branchId }}
                    asChild
                  >
                    <Button variant='ghost' size='sm'>
                      View
                    </Button>
                  </DrillTarget>
                )}
              </div>

              <div className='flex items-center justify-between p-3 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  <div className='h-8 w-8 bg-muted rounded-full flex items-center justify-center'>
                    <Building2 className='h-4 w-4' />
                  </div>
                  <div>
                    <div className='text-sm font-medium'>Company</div>
                    <div className='text-xs text-muted-foreground truncate max-w-[120px]'>
                      {relatedData.companyName}
                    </div>
                  </div>
                </div>
                {visit.companyId && (
                  <DrillTarget
                    kind='company'
                    payload={{ id: visit.companyId }}
                    asChild
                  >
                    <Button variant='ghost' size='sm'>
                      View
                    </Button>
                  </DrillTarget>
                )}
              </div>

              {relatedData.barista && (
                <div className='flex items-center justify-between p-3 border rounded-lg'>
                  <div className='flex items-center gap-3'>
                    <div className='h-8 w-8 bg-muted rounded-full flex items-center justify-center'>
                      <User className='h-4 w-4' />
                    </div>
                    <div>
                      <div className='text-sm font-medium'>Barista</div>
                      <div className='text-xs text-muted-foreground truncate max-w-[120px]'>
                        {relatedData.baristaName}
                      </div>
                    </div>
                  </div>
                  <DrillTarget
                    kind='barista'
                    payload={{ id: relatedData.barista.id }}
                    asChild
                  >
                    <Button variant='ghost' size='sm'>
                      View
                    </Button>
                  </DrillTarget>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
