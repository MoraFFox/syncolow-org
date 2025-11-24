
"use client"
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Printer, Calendar, Truck, MoreVertical, UserPlus, MapPin } from 'lucide-react';
import Loading from '@/app/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Order, Company, Branch, Product } from '@/lib/types';
import { CompanyForm } from '@/app/clients/_components/company-form';
import Link from 'next/link';
import { downloadInvoice } from '@/lib/pdf-invoice';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/lib/supabase';


export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isMobile = useIsMobile();

  const { orders, products, loading, updateOrderStatus, updateOrderPaymentStatus, registerPotentialClient } = useOrderStore();
  const { companies } = useCompanyStore();
  
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState<Order | null>(null);

  // Fetch specific order if not in store
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      
      const existingOrder = orders.find(o => o.id === id);
      if (existingOrder) {
        setOrderData(existingOrder);
        return;
      }
      
      setOrderLoading(true);
      try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();
        
        if (data) {
          setOrderData(data as Order);
        } else {
          setOrderData(null);
        }
      } catch (e) {
        setOrderData(null);
      } finally {
        setOrderLoading(false);
      }
    };
    
    fetchOrder();
  }, [id, orders]);

  const order = orderData;

  const company = useMemo(() => {
    if (!order || order.isPotentialClient || !companies) return undefined;
    return companies.find(c => c.id === order.companyId);
  }, [order, companies]);

  const branch = useMemo(() => {
    if (!order || !companies) return null;
    return companies.find(c => c.id === order.branchId);
  }, [order, companies]);

  const clientName = useMemo(() => {
    if (!order) return null;
    return order.companyName || company?.name;
  }, [order, company]);
  
  const branchName = useMemo(() => {
    if (!order) return null;
    return order.branchName || branch?.name;
  }, [order, branch]);
  
  const orderStatuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const paymentStatuses: Order['paymentStatus'][] = ['Paid', 'Pending', 'Overdue'];

  const handleRegisterCompany = () => {
    setIsCompanyFormOpen(true);
  };
  
  const handleCompanyFormSubmit = async (companyData: Omit<Company, 'id' | 'isBranch' | 'parentCompanyId' | 'createdAt'>, branchesData?: (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Product>[] })[]) => {
      if (order && order.isPotentialClient) {
          await registerPotentialClient(order.id, companyData);
          setIsCompanyFormOpen(false);
      }
  }

  const handlePrint = () => {
    if (order) {
      downloadInvoice(order, company);
    }
  };


  if (loading || orderLoading) {
    return <Loading />;
  }
  
  if (!order) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested order could not be found.</p>
            <Button onClick={() => router.push('/orders')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Orders
            </Button>
        </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Delivered':
      case 'Paid':
        return 'default';
      case 'Processing':
      case 'Shipped':
      case 'Pending':
        return 'secondary';
      case 'Cancelled':
      case 'Overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  const renderOrderItems = () => {
      if (isMobile) {
          return (
              <div className="space-y-4">
                  {order.items.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                           <Card key={item.productId} className="bg-muted/30">
                              <CardContent className="p-4 flex flex-col gap-2">
                                  <p className="font-semibold">{item.productName || product?.name || 'Unknown Product'}</p>
                                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                                      <span>Quantity: {item.quantity}</span>
                                      <span>@ ${(item.price || 0).toFixed(2)} each</span>
                                  </div>
                                   <Separator />
                                   <div className="flex justify-end items-center">
                                       <p className="font-bold text-lg">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                                   </div>
                              </CardContent>
                           </Card>
                      )
                  })}
              </div>
          )
      }

      return (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {order.items.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                          <TableRow key={item.productId}>
                              <TableCell>
                                  <div className="font-medium">{item.productName || product?.name || 'Unknown Product'}</div>
                                  <div className="text-sm text-muted-foreground hidden md:block">{product?.description}</div>
                              </TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">${(item.price || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</TableCell>
                          </TableRow>
                      )
                  })}
              </TableBody>
          </Table>
      )
  }


  return (
    <>
      {order.isPotentialClient && (
        <CompanyForm 
            isOpen={isCompanyFormOpen}
            onOpenChange={setIsCompanyFormOpen}
            onSubmit={handleCompanyFormSubmit}
            company={{ name: order.temporaryCompanyName }}
        />
      )}
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Order #{order.id.slice(0, 7)}</h1>
                <p className="text-muted-foreground">
                    Order details for: {clientName || "Unknown"}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Update Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Update Order Status</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {orderStatuses.map(status => (
                          <DropdownMenuItem key={status} onClick={() => updateOrderStatus(order.id, status)} disabled={order.status === status}>
                            {status}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Update Payment Status</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {paymentStatuses.map(status => (
                          <DropdownMenuItem key={status} onClick={() => updateOrderPaymentStatus(order.id, status)} disabled={order.paymentStatus === status}>
                            {status}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
                  <CardHeader>
                      <CardTitle>Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ScrollArea className="w-full">
                          {renderOrderItems()}
                      </ScrollArea>
                  </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-2xl font-bold cursor-help">${(order.total || 0).toFixed(2)}</div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-2 text-sm">
                              <div className="font-semibold mb-2">Total Breakdown</div>
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                              </div>
                              {(order.discountAmount ?? 0) > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Discount ({order.discountType === 'percentage' ? `${order.discountValue}%` : 'Fixed'}):</span>
                                  <span>-${(order.discountAmount ?? 0).toFixed(2)}</span>
                                </div>
                              )}
                              {(order.discountAmount ?? 0) > 0 && (
                                <div className="flex justify-between">
                                  <span>Net Amount:</span>
                                  <span>${((order.subtotal || 0) - (order.discountAmount ?? 0)).toFixed(2)}</span>
                                </div>
                              )}
                              {(order.totalTax || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span>Tax ({order.items[0]?.taxRate || 0}%):</span>
                                  <span>+${(order.totalTax || 0).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="border-t pt-2 flex justify-between font-bold">
                                <span>Total:</span>
                                <span>${(order.total || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Order Status:</span>
                          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Payment Status:</span>
                          <Badge variant={getStatusVariant(order.paymentStatus || 'Pending')}>{order.paymentStatus || 'Pending'}</Badge>
                        </div>
                      <p className="text-xs text-muted-foreground pt-2">
                          Placed on {format(new Date(order.orderDate), 'PPP')}
                      </p>
                      <Separator />
                      <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                              Delivery Date: {order.deliveryDate ? format(new Date(order.deliveryDate), 'PPP') : 'Not specified'}
                          </span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                              Payment Due: {order.expectedPaymentDate ? format(new Date(order.expectedPaymentDate), 'PPP') : order.paymentDueDate ? format(new Date(order.paymentDueDate), 'PPP') : 'Not specified'}
                          </span>
                      </div>
                       {order.area && (
                          <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                  Area: {order.area}
                              </span>
                          </div>
                      )}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {order.isPotentialClient ? (
                        <div className="flex flex-col items-start gap-3">
                            <p className="font-semibold">{order.temporaryCompanyName}</p>
                            <Badge variant="outline">Potential Client</Badge>
                            <Button onClick={handleRegisterCompany} className="w-full">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Register Company
                            </Button>
                        </div>
                    ) : (
                      <>
                        <Link href={`/clients/${company?.id}`} className="font-medium hover:underline">{clientName}</Link>
                        <p className="text-muted-foreground">{branchName}</p>
                        <div>{company?.managerName}</div>
                        <div>{company?.email}</div>
                        <div className="text-muted-foreground">{company?.location}</div>
                      </>
                    )}
                  </CardContent>
              </Card>
          </div>
        </div>
      </div>
    </>
  );
}
