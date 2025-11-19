
"use client";

import { useMemo, useState } from 'react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useCompanyStore } from '@/store/use-company-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Wrench } from 'lucide-react';

interface MaintenanceCostReportProps {
  companyId: string;
}

export function MaintenanceCostReport({ companyId }: MaintenanceCostReportProps) {
  const { maintenanceVisits } = useMaintenanceStore();
  const { companies } = useCompanyStore();
  const company = companies.find(c => c.id === companyId);
  const branches = companies.filter(c => c.parentCompanyId === companyId);
  
  const reportData = useMemo(() => {
    const relevantVisits = maintenanceVisits.filter(visit => visit.companyId === companyId);

    const breakdown = relevantVisits.flatMap(visit => {
      const items: any[] = [];
      let visitDateFormatted = 'Invalid Date';
      try {
        const visitDate = new Date(visit.date as string);
        if (!isNaN(visitDate.getTime())) {
          visitDateFormatted = format(visitDate, 'PPP');
        }
      } catch {
        visitDateFormatted = 'Invalid Date';
      }

      // Add spare parts to breakdown (only company-paid)
      if (visit.spareParts && visit.spareParts.length > 0) {
        visit.spareParts.forEach(part => {
            if (part.paidBy === 'Company') {
              items.push({
                  date: visitDateFormatted,
                  operation: visit.maintenanceNotes || 'Parts Replacement',
                  item: part.name,
                  quantity: part.quantity,
                  unitCost: part.price || 0,
                  total: (part.price || 0) * part.quantity,
                  paidBy: 'Company'
              });
            }
        });
      }

      // Add services to breakdown (only company-paid)
      if (visit.services && visit.services.length > 0) {
          visit.services.forEach(service => {
              if (service.paidBy === 'Company') {
                items.push({
                    date: visitDateFormatted,
                    operation: visit.maintenanceNotes || 'Service Performed',
                    item: service.name,
                    quantity: service.quantity,
                    unitCost: service.cost || 0,
                    total: (service.cost || 0) * service.quantity,
                    paidBy: 'Company'
                });
              }
          });
      }

      // Always add labor cost if present
      if ((visit.laborCost || 0) > 0) {
          items.push({
              date: visitDateFormatted,
              operation: visit.maintenanceNotes || 'Maintenance Visit',
              item: 'Initial Visit Fee / Labor',
              quantity: 1,
              unitCost: visit.laborCost || 0,
              total: visit.laborCost || 0,
              paidBy: 'Company'
          });
      }
      
      // If no cost items at all, show a "No Cost" line
      if(items.length === 0) {
          items.push({
               date: visitDateFormatted,
               operation: visit.maintenanceNotes || 'Check-up',
               item: 'No Cost Items',
               quantity: 1,
               unitCost: 0,
               total: 0,
               paidBy: 'N/A'
          });
      }

      return items;
    });

    const totalMaintenanceCost = breakdown.reduce((sum, item) => {
        if (item.paidBy === 'Company') {
            return sum + item.total;
        }
        return sum;
    }, 0);
    
    // Calculate monthly lease costs
    const leaseCosts: any[] = [];
    if (company && !company.machineOwned && company.machineLeased && company.leaseMonthlyCost) {
      leaseCosts.push({
        entity: company.name,
        monthlyCost: company.leaseMonthlyCost,
      });
    }
    branches.forEach(branch => {
      if (!branch.machineOwned && branch.machineLeased && branch.leaseMonthlyCost) {
        leaseCosts.push({
          entity: branch.name,
          monthlyCost: branch.leaseMonthlyCost,
        });
      }
    });
    
    const totalLeaseCost = leaseCosts.reduce((sum, item) => sum + item.monthlyCost, 0);
    
    return { breakdown, totalMaintenanceCost, leaseCosts, totalLeaseCost };

  }, [companyId, maintenanceVisits]);
  
  const costExplanation = `The Total Maintenance Cost is the sum of spare parts and services paid by the company. Items paid by the client are listed but excluded from the total.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wrench /> Maintenance Cost Report</CardTitle>
        <CardDescription>
            {company ? `Showing report for ${company.name}` : 'Select a client'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Item/Part/Service</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.breakdown.length > 0 ? reportData.breakdown.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{index === 0 || reportData.breakdown[index-1].date !== row.date ? row.date : ''}</TableCell>
                  <TableCell className="truncate max-w-xs">{row.operation}</TableCell>
                  <TableCell>{row.item}</TableCell>
                  <TableCell className="text-center">{row.quantity}</TableCell>
                  <TableCell className="text-right">${row.unitCost.toFixed(2)}</TableCell>
                  <TableCell>{row.paidBy}</TableCell>
                  <TableCell className="text-right">${row.total.toFixed(2)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">No maintenance records for this period.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Maintenance Cost</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">${reportData.totalMaintenanceCost.toFixed(2)}</p>
                </CardContent>
            </Card>
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Monthly Lease Cost</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">${reportData.totalLeaseCost.toFixed(2)}</p>
                    {reportData.leaseCosts.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {reportData.leaseCosts.map((item: any, idx: number) => (
                          <div key={idx}>{item.entity}: ${item.monthlyCost}</div>
                        ))}
                      </div>
                    )}
                </CardContent>
            </Card>
            <Card className="bg-primary/10">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">${(reportData.totalMaintenanceCost + reportData.totalLeaseCost).toFixed(2)}</p>
                </CardContent>
            </Card>
        </div>
        
        <div>
            <h4 className="font-semibold mb-2">Cost Explanation</h4>
            <p className="text-sm text-muted-foreground">{costExplanation}</p>
        </div>

      </CardContent>
    </Card>
  );
}
