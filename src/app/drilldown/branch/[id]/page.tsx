/** @format */

"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Gauge,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { useCompanyStore } from "@/store/use-company-store";
import { useOrderStore } from "@/store/use-order-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { calculatePerformanceScore } from "@/lib/performance-score";

export default function BranchDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { companies, baristas } = useCompanyStore();
  const { orders, fetchOrdersWithFilters } = useOrderStore();
  const { maintenanceVisits, fetchInitialData: fetchMaintenanceData } =
    useMaintenanceStore();

  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        // Fetch orders for this branch
        await fetchOrdersWithFilters(5, { branchId: id });

        // Ensure maintenance data is loaded
        if (maintenanceVisits.length === 0) {
          await fetchMaintenanceData();
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading branch data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [
    id,
    fetchOrdersWithFilters,
    fetchMaintenanceData,
    maintenanceVisits.length,
  ]);

  const branch = companies.find((c) => c.id === id);

  const kpis = React.useMemo(() => {
    if (!branch) return null;

    const branchOrders = orders.filter((o) => o.branchId === id);
    const branchBaristas = baristas.filter((b) => b.branchId === id);

    // Calculate performance score
    // Passing empty feedback for now as feedback filtering might vary
    const rawScore = calculatePerformanceScore(
      id,
      branchOrders,
      [],
      branchBaristas
    );
    const performanceScore = Math.round(rawScore * 10); // Scale 0-10 to 0-100%

    const totalRevenue = branchOrders.reduce(
      (sum, o) => sum + (o.grandTotal || 0),
      0
    );
    const recentOrdersCount = branchOrders.length;
    const pendingMaintenance = maintenanceVisits.filter(
      (v) => v.branchId === id && v.status !== "Completed"
    ).length;

    return {
      performanceScore,
      totalRevenue,
      recentOrdersCount,
      pendingMaintenance,
      branchOrders,
      branchBaristas,
    };
  }, [branch, orders, baristas, maintenanceVisits, id]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Loading...
      </div>
    );
  }

  if (!branch || !kpis) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Branch not found
      </div>
    );
  }

  const parentCompany = branch.parentCompanyId
    ? companies.find((c) => c.id === branch.parentCompanyId)
    : null;

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => router.back()}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{branch.name}</h1>
          <p className='text-muted-foreground'>Branch Overview</p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Performance</CardTitle>
            <Gauge className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{kpis.performanceScore}%</div>
            <div className='h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden'>
              <div
                className={`h-full rounded-full ${
                  kpis.performanceScore >= 80
                    ? "bg-green-500"
                    : kpis.performanceScore >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${kpis.performanceScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(kpis.totalRevenue)}
            </div>
            <p className='text-xs text-muted-foreground'>
              From {kpis.recentOrdersCount} recent orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Maint.
            </CardTitle>
            <AlertCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{kpis.pendingMaintenance}</div>
            <p className='text-xs text-muted-foreground'>
              Visits pending completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Parent Company
            </CardTitle>
            <Building2 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-lg font-bold truncate'>
              {parentCompany?.name || "Unknown"}
            </div>
            {branch.parentCompanyId && (
              <DrillTarget
                kind='company'
                payload={{ id: branch.parentCompanyId }}
                asChild
              >
                <Button
                  variant='link'
                  className='p-0 h-auto text-xs text-muted-foreground'
                >
                  View Company
                </Button>
              </DrillTarget>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Recent Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {maintenanceVisits
                .filter((v) => v.branchId === id)
                .slice(0, 5)
                .map((visit) => (
                  <DrillTarget
                    key={visit.id}
                    kind='maintenance'
                    payload={{ id: visit.id }}
                    asChild
                  >
                    <div className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer'>
                      <div className='flex flex-col'>
                        <span className='font-medium'>
                          {new Date(visit.date).toLocaleDateString()}
                        </span>
                        <span className='text-sm text-muted-foreground'>
                          {visit.technicianName || "Unassigned"}
                        </span>
                      </div>
                      <Badge
                        variant={
                          visit.status === "Completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {visit.status}
                      </Badge>
                    </div>
                  </DrillTarget>
                ))}
              {maintenanceVisits.filter((v) => v.branchId === id).length ===
                0 && (
                <div className='text-center text-muted-foreground py-4'>
                  No maintenance visits.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Baristas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {kpis.branchBaristas.length === 0 ? (
                <div className='text-center text-muted-foreground py-4'>
                  No baristas assigned.
                </div>
              ) : (
                kpis.branchBaristas.map((barista) => (
                  <DrillTarget
                    key={barista.id}
                    kind='barista'
                    payload={{ id: barista.id }}
                    asChild
                  >
                    <div className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer'>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{barista.name}</span>
                      </div>
                      <Badge variant='outline'>Rating: {barista.rating}</Badge>
                    </div>
                  </DrillTarget>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {kpis.branchOrders.length === 0 ? (
                <div className='text-center text-muted-foreground py-4'>
                  No recent orders.
                </div>
              ) : (
                kpis.branchOrders.map((order) => (
                  <DrillTarget
                    key={order.id}
                    kind='order'
                    payload={{ id: order.id }}
                    asChild
                  >
                    <div className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer'>
                      <div className='flex flex-col'>
                        <span className='font-medium'>
                          Order #{order.id.slice(0, 8)}...
                        </span>
                        <span className='text-sm text-muted-foreground'>
                          {new Date(order.orderDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold'>
                          {formatCurrency(order.grandTotal)}
                        </div>
                        <Badge
                          variant={
                            order.status === "Delivered"
                              ? "default"
                              : "secondary"
                          }
                          className='text-[10px]'
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </DrillTarget>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
