
"use client";

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { isTomorrow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Package, Calendar, UserX, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getAutoStatus } from '@/lib/auto-status';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';

const AlertItem = ({ alert }: { alert: any }) => {
    const AlertIcon = ({ type }: { type: 'Overdue Payment' | 'Low Stock' | 'Inactive Client' | 'Tomorrow Delivery' }) => {
        switch (type) {
            case 'Overdue Payment': return <AlertTriangle className="h-4 w-4" />;
            case 'Low Stock': return <Package className="h-4 w-4" />;
            case 'Inactive Client': return <UserX className="h-4 w-4" />;
            case 'Tomorrow Delivery': return <Calendar className="h-4 w-4" />;
            default: return null;
        }
    }

    return (
         <Alert className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full",
            alert.type === 'Overdue Payment' && 'border-destructive/50 text-destructive bg-destructive/10',
            alert.type === 'Low Stock' && 'border-yellow-500/50 text-yellow-600 bg-yellow-500/10'
        )}>
            <div className="flex items-start gap-3">
                 <AlertIcon type={alert.type} />
                <div className="min-w-0 flex-1">
                    <AlertTitle className="text-sm font-semibold">
                        {alert.type === 'Overdue Payment' && (
                            <span className="flex items-center gap-1 flex-wrap">
                                <span>Order</span>
                                <DrillTarget kind="order" payload={{ id: alert.data.id }} asChild>
                                    <span className="hover:underline cursor-pointer">#{alert.data.id.slice(0, 5)}</span>
                                </DrillTarget>
                                <span>Overdue</span>
                            </span>
                        )}
                        {alert.type === 'Low Stock' && (
                            <span className="flex items-center gap-1 flex-wrap">
                                <DrillTarget kind="product" payload={{ id: alert.data.id, name: alert.data.name, stock: alert.data.stock }} asChild>
                                    <span className="hover:underline cursor-pointer">{alert.data.name}</span>
                                </DrillTarget>
                                <span>is Low</span>
                            </span>
                        )}
                        {alert.type === 'Inactive Client' && (
                            <span className="flex items-center gap-1 flex-wrap">
                                <DrillTarget kind="company" payload={{ id: alert.data.id, name: alert.data.name }} asChild>
                                    <span className="hover:underline cursor-pointer">{alert.data.name}</span>
                                </DrillTarget>
                                <span>is Inactive</span>
                            </span>
                        )}
                        {alert.type === 'Tomorrow Delivery' && (
                            <span className="flex items-center gap-1 flex-wrap">
                                <span>Delivery for</span>
                                <DrillTarget kind="order" payload={{ id: alert.data.id }} asChild>
                                    <span className="hover:underline cursor-pointer">#{alert.data.id.slice(0, 5)}</span>
                                </DrillTarget>
                            </span>
                        )}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        {alert.type === 'Low Stock' && `Stock level is low (${alert.data.stock}).`}
                        {alert.type === 'Tomorrow Delivery' && `Scheduled for tomorrow.`}
                        {alert.type === 'Inactive Client' && `Has been inactive for a while.`}
                         {alert.type === 'Overdue Payment' && `Payment for ${alert.data.companyName} is overdue.`}
                    </AlertDescription>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 flex-shrink-0 self-end sm:self-center">
                <Link href={alert.link}>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                        View Details
                    </Button>
                </Link>
            </div>
        </Alert>
    );
};

export function Alerts() {
    const { products, orders } = useOrderStore();
    const { companies } = useCompanyStore();

    const lowStockProducts = useMemo(() => {
        return products.filter(p => p.stock < 10).sort((a, b) => a.stock - b.stock);
    }, [products]);

    const tomorrowDeliveries = useMemo(() => {
        return orders.filter(o => o.deliveryDate && o.status !== 'Delivered' && o.status !== 'Cancelled' && isTomorrow(new Date(o.deliveryDate)));
    }, [orders]);

    const overduePayments = useMemo(() => {
        return orders.filter(o => o.paymentStatus === 'Overdue');
    }, [orders]);

    const inactiveClients = useMemo(() => {
        if (!companies) return [];
        return companies.filter(c => {
            const status = getAutoStatus(c as any, orders);
            return status === 'Inactive';
        })
    }, [companies, orders]);

    const alertPriority: Record<'Overdue Payment' | 'Low Stock' | 'Inactive Client' | 'Tomorrow Delivery', number> = {
        'Overdue Payment': 1,
        'Low Stock': 2,
        'Inactive Client': 3,
        'Tomorrow Delivery': 4,
    };

    const alerts: Array<{
        type: 'Overdue Payment' | 'Low Stock' | 'Inactive Client' | 'Tomorrow Delivery';
        data: any;
        link: string;
    }> = [
        ...overduePayments.map(o => ({ type: 'Overdue Payment' as const, data: o, link: `/orders?filter=overdue` })),
        ...lowStockProducts.map(p => ({ type: 'Low Stock' as const, data: p, link: `/products/${p.id}` })),
        ...inactiveClients.map(c => ({ type: 'Inactive Client' as const, data: c, link: `/clients?filter=inactive` })),
        ...tomorrowDeliveries.map(o => ({ type: 'Tomorrow Delivery' as const, data: o, link: `/orders/${o.id}` })),
    ].sort((a, b) => alertPriority[a.type] - alertPriority[b.type]);

    return (
        <div>
            <CardHeader className="p-0 mb-4">
                <CardTitle>Alerts</CardTitle>
                <CardDescription>Urgent action items and notifications.</CardDescription>
            </CardHeader>
            <ScrollArea className="h-[400px] w-full">
                <div className="space-y-2">
                    {alerts.length > 0 ? alerts.map((alert, index) => (
                        <AlertItem key={index} alert={alert} />
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 rounded-lg border-2 border-dashed py-10">
                            <AlertTriangle className="h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="font-semibold">No alerts right now.</p>
                            <p className="text-sm">Everything is up-to-date.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
