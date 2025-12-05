"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrderStore } from "@/store/use-order-store";
import { useCompanyStore } from "@/store/use-company-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle,
  Building2,
} from "lucide-react";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentDrilldownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { orders } = useOrderStore();
  const { companies } = useCompanyStore();

  const order = orders.find((o) => o.id === id);
  const company = order ? companies.find((c) => c.id === order.companyId) : null;

  if (!order) {
     return (
        <div className="container mx-auto py-6 space-y-6">
             <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
             </Button>
             <div className="text-center py-10 text-muted-foreground">
                Order/Payment not found
             </div>
        </div>
     );
  }

  const metrics = useMemo(() => {
    const paidDate = order.paidDate ? new Date(order.paidDate) : new Date();
    const orderDate = new Date(order.orderDate);
    const daysToPayment = Math.floor((paidDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const paymentDueDate = order.paymentDueDate ? new Date(order.paymentDueDate) : null;
    const isLate = paymentDueDate && paidDate > paymentDueDate;
    const efficiency = isLate ? "Late" : "On Time";
    
    const relatedUnpaidOrders = orders.filter(o => o.companyId === order.companyId && o.paymentStatus === 'Pending').length;
    const companyTotalPaid = orders
        .filter(o => o.companyId === order.companyId && o.paymentStatus === 'Paid')
        .reduce((sum, o) => sum + o.grandTotal, 0);
        
    return {
        daysToPayment,
        efficiency,
        relatedUnpaidOrders,
        companyTotalPaid
    };
  }, [order, orders]);

  const paymentMethod = company?.paymentMethod || "Unknown";

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Payment Details
            </h1>
            <div className="text-sm text-muted-foreground">
               Ref: {order.paymentReference || "N/A"}
            </div>
          </div>
        </div>
        <div className="text-3xl font-bold text-green-600">
            {formatCurrency(order.grandTotal)}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(order.grandTotal)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Date</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{order.paidDate ? formatDate(order.paidDate) : "Pending"}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold capitalize">{paymentMethod}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Days to Payment</CardTitle>
                <CheckCircle className={`h-4 w-4 ${metrics.efficiency === 'Late' ? 'text-red-500' : 'text-green-500'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{metrics.daysToPayment}</div>
                <p className="text-xs text-muted-foreground">{metrics.efficiency}</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Order Details */}
        <Card>
            <CardHeader>
                <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Order ID</span>
                    <DrillTarget kind="order" payload={{ id: order.id }}>
                        <Button variant="link" className="h-auto p-0 font-mono">#{order.id.slice(0, 8)}</Button>
                    </DrillTarget>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Order Date</span>
                    <span>{formatDate(order.orderDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline">{order.status}</Badge>
                </div>
                <div className="pt-4 border-t space-y-2">
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(order.totalTax)}</span>
                     </div>
                     <div className="flex justify-between font-bold text-lg pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(order.grandTotal)}</span>
                     </div>
                </div>
            </CardContent>
        </Card>

        {/* Company Details */}
        <Card>
            <CardHeader>
                <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                         <DrillTarget kind="company" payload={{ id: order.companyId, name: company?.name }}>
                            <div className="font-bold text-lg hover:underline cursor-pointer">{company?.name || order.companyName || "Unknown Company"}</div>
                         </DrillTarget>
                         <div className="text-sm text-muted-foreground">{company?.industry || "Client"}</div>
                    </div>
                </div>
                <div className="space-y-3">
                     <div className="flex justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm text-muted-foreground">Total Paid (All Time)</span>
                        <span className="font-medium">{formatCurrency(metrics.companyTotalPaid)}</span>
                     </div>
                     <div className="flex justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm text-muted-foreground">Unpaid Orders</span>
                        <Badge variant={metrics.relatedUnpaidOrders > 0 ? "destructive" : "secondary"}>{metrics.relatedUnpaidOrders}</Badge>
                     </div>
                     {company?.paymentStatus && (
                         <div className="flex justify-between p-2 bg-muted/30 rounded">
                            <span className="text-sm text-muted-foreground">Payment Status</span>
                            <Badge className="capitalize">{company.paymentStatus}</Badge>
                         </div>
                     )}
                </div>
            </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
             <CardHeader>
                <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <span className="text-sm text-muted-foreground block mb-1">Reference Number</span>
                    <div className="font-mono p-2 bg-muted rounded select-all">
                        {order.paymentReference || "None"}
                    </div>
                </div>
                <div>
                    <span className="text-sm text-muted-foreground block mb-1">Notes</span>
                    <div className="text-sm p-2 border rounded min-h-[60px]">
                        {order.paymentNotes || "No notes provided."}
                    </div>
                </div>
                {order.bulkPaymentCycleId && (
                    <div>
                        <span className="text-sm text-muted-foreground block mb-1">Bulk Cycle</span>
                        <Badge variant="outline">{order.bulkPaymentCycleId}</Badge>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      {/* Related Orders */}
      <Card>
        <CardHeader>
            <CardTitle>Recent Orders from {company?.name || "Same Company"}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {orders
                    .filter(o => o.companyId === order.companyId && o.id !== order.id)
                    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
                    .slice(0, 5)
                    .map(relatedOrder => (
                        <DrillTarget key={relatedOrder.id} kind="order" payload={{ id: relatedOrder.id }} asChild>
                            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="flex flex-col">
                                    <span className="font-medium">Order #{relatedOrder.id.slice(0, 8)}</span>
                                    <span className="text-sm text-muted-foreground">{formatDate(relatedOrder.orderDate)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={relatedOrder.paymentStatus === 'Paid' ? 'default' : relatedOrder.paymentStatus === 'Overdue' ? 'destructive' : 'secondary'}>
                                        {relatedOrder.paymentStatus}
                                    </Badge>
                                    <div className="font-bold w-24 text-right">
                                        {formatCurrency(relatedOrder.grandTotal)}
                                    </div>
                                </div>
                            </div>
                        </DrillTarget>
                    ))}
                 {orders.filter(o => o.companyId === order.companyId && o.id !== order.id).length === 0 && (
                    <div className="text-center text-muted-foreground py-4">No other orders found.</div>
                 )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
