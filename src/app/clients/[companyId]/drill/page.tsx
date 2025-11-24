'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function ClientDrillDownPage() {
  const params = useParams();
  const router = useRouter();
  const { analyticsOrders } = useOrderStore();
  const { companies } = useCompanyStore();
  const { maintenanceVisits } = useMaintenanceStore();

  const companyId = params.companyId as string;
  const company = companies.find(c => c.id === companyId);

  const { clientOrders, clientVisits, totalSpent, lastOrderDate } = useMemo(() => {
    if (!companyId) return { clientOrders: [], clientVisits: [], totalSpent: 0, lastOrderDate: null };

    const orders = analyticsOrders
        .filter(o => o.companyId === companyId && o.status !== 'Cancelled')
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    const visits = maintenanceVisits
        .filter(v => v.companyId === companyId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const spent = orders.reduce((sum, o) => sum + o.total, 0);
    const lastOrder = orders.length > 0 ? new Date(orders[0].orderDate) : null;

    return { clientOrders: orders, clientVisits: visits, totalSpent: spent, lastOrderDate: lastOrder };

  }, [analyticsOrders, maintenanceVisits, companyId]);

  if (!company) {
      return <div className="p-8 text-center">Client not found or loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-muted-foreground">Client Overview & History</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader>
                <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {company.location && (
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{company.location}</span>
                    </div>
                )}
                 {/* Assuming company has email/phone fields, if not we skip */}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Order</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {lastOrderDate ? format(lastOrderDate, 'MMM d, yyyy') : 'N/A'}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clientOrders.slice(0, 10).map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                                        {order.id.slice(0, 8)}...
                                    </Link>
                                </TableCell>
                                <TableCell>{format(new Date(order.orderDate), 'MMM d, yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{order.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Maintenance Visits</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clientVisits.slice(0, 10).map(visit => (
                            <TableRow key={visit.id}>
                                <TableCell>{format(new Date(visit.date), 'MMM d, yyyy')}</TableCell>
                                <TableCell>{visit.visitType}</TableCell>
                                <TableCell>
                                    <Badge variant={visit.status === 'Completed' ? 'default' : 'secondary'}>
                                        {visit.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
