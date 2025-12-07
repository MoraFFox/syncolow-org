"use client";
/** @format */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDrillDownStore } from "@/store/use-drilldown-store";
import { Building2, Mail, Phone, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CustomerDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailDialog({
  isOpen,
  onOpenChange,
}: CustomerDetailDialogProps) {
  const { payload } = useDrillDownStore();
  const [customerData, setCustomerData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch real customer/company data from Supabase
  React.useEffect(() => {
    if (!isOpen || !payload) return;
    if (!("id" in payload)) return;

    const fetchCustomerData = async () => {
      setIsLoading(true);
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch company data and orders
        const [companyResult, ordersResult] = await Promise.all([
          supabase
            .from("companies")
            .select("id, name, email, phone, status, createdAt, region")
            .eq("id", (payload as any).id)
            .single(),
          supabase
            .from("orders")
            .select("grandTotal", { count: "exact" })
            .eq("companyId", (payload as any).id),
        ]);

        if (companyResult.error || !companyResult.data) {
          console.error("Failed to fetch customer data:", companyResult.error);
          setCustomerData({
            id: (payload as any).id,
            name: (payload as any).name || "Customer",
            email: "N/A",
            phone: "N/A",
            status: "Unknown",
            totalOrders: 0,
            totalSpent: 0,
            averageOrderValue: 0,
            joinedDate: new Date().toISOString().split("T")[0],
            region: "N/A",
          });
        } else {
          const totalSpent =
            ordersResult.data?.reduce(
              (sum, order) => sum + (order.grandTotal || 0),
              0
            ) || 0;
          const orderCount = ordersResult.count || 0;

          setCustomerData({
            id: companyResult.data.id,
            name: companyResult.data.name,
            email: companyResult.data.email || "N/A",
            phone: companyResult.data.phone || "N/A",
            status: companyResult.data.status || "Active",
            totalOrders: orderCount,
            totalSpent,
            averageOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
            joinedDate: companyResult.data.createdAt?.split("T")[0] || "N/A",
            region: companyResult.data.region || "N/A",
          });
        }
      } catch (err) {
        console.error("Error fetching customer data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, [isOpen, payload]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Inactive":
        return "secondary";
      case "New":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Building2 className='h-5 w-5' />
            {customerData?.name ||
              (payload && "name" in payload
                ? (payload as any).name
                : "Customer Details")}
          </DialogTitle>
          <DialogDescription>
            Customer profile and transaction history
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full' />
          </div>
        ) : !customerData ? (
          <div className='text-center py-8 text-muted-foreground'>
            No customer data found
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-3'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Spent
                  </CardTitle>
                  <DollarSign className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatCurrency(customerData.totalSpent)}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Lifetime value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Orders
                  </CardTitle>
                  <TrendingUp className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {customerData.totalOrders}
                  </div>
                  <p className='text-xs text-muted-foreground'>All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Avg Order Value
                  </CardTitle>
                  <TrendingUp className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatCurrency(customerData.averageOrderValue)}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Per transaction
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-center gap-3'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>{customerData.email}</span>
                </div>
                <div className='flex items-center gap-3'>
                  <Phone className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>{customerData.phone}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>
                    Customer ID
                  </span>
                  <span className='text-sm font-medium'>{customerData.id}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>Status</span>
                  <Badge variant={getStatusColor(customerData.status)}>
                    {customerData.status}
                  </Badge>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>
                    Member Since
                  </span>
                  <span className='text-sm font-medium'>
                    {customerData.joinedDate}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>Region</span>
                  <Badge variant='outline'>{customerData.region}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className='text-xs text-muted-foreground text-center pt-2 border-t'>
              Live data from Supabase - Customer metrics update in real-time
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
