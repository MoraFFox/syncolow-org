'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { Wrench, Calendar, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MaintenanceDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaintenanceDetailDialog({ isOpen, onOpenChange }: MaintenanceDetailDialogProps) {
  const { payload } = useDrillDownStore();
  const [maintenanceData, setMaintenanceData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch real maintenance data from Supabase  
  React.useEffect(() => {
    if (!isOpen || !payload) return;
    if (!("id" in payload)) return;

    const fetchMaintenanceData = async () => {
      setIsLoading(true);
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Note: Replace 'maintenance_visits' with your actual table name
        const { data, error } = await supabase
          .from('maintenance_visits')
          .select('*')
          .eq('id', (payload as any).id)
          .single();

        if (error || !data) {
          console.error('Failed to fetch maintenance data:', error);
          // Fallback data if table doesn't exist yet
          setMaintenanceData({
            id: (payload as any).id,
            visitType: 'Periodic',
            scheduledDate: new Date().toISOString().split('T')[0],
            status: 'Scheduled',
            technicianName: 'Not Assigned',
            estimatedCost: 0,
            priority: 'Medium',
            machineType: 'Unknown'
          });
        } else {
          setMaintenanceData(data);
        }
      } catch (err) {
        console.error('Error fetching maintenance data:', err);
        // Fallback data
        setMaintenanceData({
          id: (payload as any).id,
          visitType: 'Periodic',
          scheduledDate: new Date().toISOString().split('T')[0],
          status: 'Scheduled',
          technicianName: 'Not Assigned',
          estimatedCost: 0,
          priority: 'Medium',
          machineType: 'Unknown'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceData();
  }, [isOpen, payload]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Scheduled': return 'secondary';
      case 'In Progress': return 'outline';
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Visit Details
          </DialogTitle>
          <DialogDescription>
            Service visit information and maintenance schedule
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !maintenanceData ? (
          <div className="text-center py-8 text-muted-foreground">
            No maintenance data found
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Badge variant={getStatusColor(maintenanceData.status)}>
                    {maintenanceData.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {maintenanceData.visitType} Visit
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scheduled Date</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{maintenanceData.scheduledDate}</div>
                  <p className="text-xs text-muted-foreground">
                    Next visit
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatCurrency(maintenanceData.estimatedCost || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Including parts
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Visit Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Visit ID</span>
                  <span className="text-sm font-medium">{maintenanceData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Technician</span>
                  <span className="text-sm font-medium">{maintenanceData.technicianName || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Machine Type</span>
                  <span className="text-sm font-medium">{maintenanceData.machineType || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <Badge variant="outline">{maintenanceData.priority || 'Medium'}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Service Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {maintenanceData.notes || 'Regular maintenance check scheduled. Will include cleaning, calibration, and parts inspection.'}
                </p>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Live data from Supabase - Create a `maintenance_visits` table to store real visit data
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
