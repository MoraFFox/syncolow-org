
"use client";
import { useMemo, useState, useEffect } from 'react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useOrderStore } from '@/store/use-order-store';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Eye } from 'lucide-react';
import type { CancellationReason } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function ReasonManager() {
    const { cancellationReasons, addCancellationReason } = useMaintenanceStore();
    const [newReason, setNewReason] = useState('');

    const handleAddReason = async () => {
        if (!newReason.trim()) {
            toast({ title: "Reason cannot be empty", variant: "destructive" });
            return;
        }
        if (cancellationReasons?.some(r => r.reason.toLowerCase() === newReason.trim().toLowerCase())) {
             toast({ title: "Reason already exists", variant: "destructive" });
             return;
        }
        await addCancellationReason(newReason.trim());
        setNewReason('');
        toast({ title: "Reason Added", description: `"${newReason.trim()}" has been added to the list.`});
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Cancellation Reasons</CardTitle>
                <CardDescription>Add or remove predefined reasons for order cancellations.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Input 
                        placeholder="Enter new reason..."
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                    />
                    <Button onClick={handleAddReason}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Add
                    </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cancellationReasons && cancellationReasons.map(reason => (
                        <div key={reason.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <span>{reason.reason}</span>
                            {/* Delete functionality can be added here if needed */}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function CancellationAnalysisPage() {
  const router = useRouter();
  const { deleteOrder } = useOrderStore();
  const { cancellationReasons } = useMaintenanceStore();
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadAllOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'Cancelled')
          .order('orderDate', { ascending: false });
        if (error) throw error;
        setAllOrders(data || []);
      } catch (e) {
        console.error('Error loading orders:', e);
      }
      setLoading(false);
    };
    loadAllOrders();
  }, []);

  const canceledOrders = useMemo(() => {
    return allOrders.filter(order => order.cancellationReason);
  }, [allOrders]);

  const analysis = useMemo(() => {
    if (canceledOrders.length === 0) {
      return { topReasons: [], totalCancelled: 0 };
    }

    const reasonCounts = canceledOrders.reduce((acc, order) => {
      const reason = order.cancellationReason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]: [string, number]) => ({
        reason,
        count,
        percentage: (count / canceledOrders.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      topReasons,
      totalCancelled: canceledOrders.length,
    };
  }, [canceledOrders]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cancellation Analysis</h1>
        <p className="text-muted-foreground">Understand why orders are being canceled.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Canceled Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{analysis.totalCancelled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analysis.topReasons[0]?.reason || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Cancellation Reasons Breakdown</CardTitle>
                <CardDescription>Visualizing the most common reasons for cancellation.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analysis.topReasons} layout="vertical" margin={{ left: 100 }}>
                             <XAxis type="number" hide />
                             <YAxis dataKey="reason" type="category" tickLine={false} axisLine={false} width={150} />
                             <Bar dataKey="count" fill="hsl(var(--primary))" radius={4}>
                                <LabelList 
                                    dataKey="percentage" 
                                    position="right" 
                                    offset={8}
                                    formatter={(value: number) => `${value.toFixed(1)}%`}
                                    className="fill-foreground text-sm"
                                />
                             </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
        <ReasonManager />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canceled Orders Log</CardTitle>
          <CardDescription>A detailed list of all orders that have been canceled.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading canceled orders...
                  </TableCell>
                </TableRow>
              ) : canceledOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell>#{order.id.slice(0, 7)}</TableCell>
                  <TableCell>{order.companyName}</TableCell>
                  <TableCell>{format(new Date(order.orderDate), 'PPP')}</TableCell>
                  <TableCell>{order.cancellationReason}</TableCell>
                  <TableCell className="truncate max-w-xs">{order.cancellationNotes || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOrderToDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
               {canceledOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No canceled orders to display.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (orderToDelete) {
                  await deleteOrder(orderToDelete);
                  toast({ title: 'Order deleted successfully' });
                  setOrderToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
