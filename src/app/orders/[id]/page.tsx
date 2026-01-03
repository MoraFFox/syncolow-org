"use client"

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store';
import { useCompanyStore } from '@/store/use-company-store';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Order, Company, Branch, Product } from '@/lib/types';
import { downloadInvoice } from '@/lib/pdf-invoice';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

import {
  ArrowLeft, Printer, Calendar, Truck,
  UserPlus, MapPin, Receipt, Box, CreditCard, Building2,
  Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown
} from 'lucide-react';

import { DrillTarget } from '@/components/drilldown/drill-target';
import { MarqueeText } from '@/components/ui/marquee-text';
import { CompanyForm } from '@/app/clients/_components/company-form';

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  // const isMobile = useIsMobile(); // Unused

  const { orders, loading, updateOrderStatus, updateOrderPaymentStatus, registerPotentialClient } = useOrderStore();
  const { products } = useProductsStore();
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

  const handleCompanyFormSubmit = async (companyData: Omit<Company, 'id' | 'isBranch' | 'parentCompanyId' | 'createdAt'>, _branchesData?: (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Product>[] })[]) => {
    if (order && order.isPotentialClient) {
      await registerPotentialClient(order.id, companyData);
      setIsCompanyFormOpen(false);
    }
  }

  const handlePrint = () => {
    if (order) downloadInvoice(order, company);
  };

  if (loading || orderLoading) return <Loading />;

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-20">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 rounded-full bg-zinc-900 border border-zinc-800"
        >
          <Box className="w-12 h-12 text-zinc-500" />
        </motion.div>
        <h2 className="text-2xl font-bold tracking-tight">Order Not Found</h2>
        <p className="text-muted-foreground">The requested order coordinates could not be resolved.</p>
        <Button onClick={() => router.push('/orders')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Command
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_10px_-4px_rgba(52,211,153,0.5)]';
      case 'Paid': return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_10px_-4px_rgba(52,211,153,0.5)]';
      case 'Processing': return 'text-blue-400 border-blue-400/20 bg-blue-400/10 shadow-[0_0_10px_-4px_rgba(96,165,250,0.5)]';
      case 'Shipped': return 'text-indigo-400 border-indigo-400/20 bg-indigo-400/10 shadow-[0_0_10px_-4px_rgba(129,140,248,0.5)]';
      case 'Pending': return 'text-amber-400 border-amber-400/20 bg-amber-400/10 shadow-[0_0_10px_-4px_rgba(251,191,36,0.5)]';
      case 'Cancelled': return 'text-red-400 border-red-400/20 bg-red-400/10 shadow-[0_0_10px_-4px_rgba(248,113,113,0.5)]';
      case 'Overdue': return 'text-red-400 border-red-400/20 bg-red-400/10 shadow-[0_0_10px_-4px_rgba(248,113,113,0.5)]';
      default: return 'text-zinc-400 border-zinc-400/20 bg-zinc-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered': case 'Paid': return <CheckCircle2 className="w-3 h-3 mr-1.5" />;
      case 'Cancelled': case 'Overdue': return <XCircle className="w-3 h-3 mr-1.5" />;
      case 'Pending': return <Clock className="w-3 h-3 mr-1.5" />;
      default: return <Box className="w-3 h-3 mr-1.5" />;
    }
  };

  return (
    <div className="min-h-screen  overflow-x-hidden pb-20">
      {order.isPotentialClient && (
        <CompanyForm
          isOpen={isCompanyFormOpen}
          onOpenChange={setIsCompanyFormOpen}
          onSubmit={handleCompanyFormSubmit}
          company={{ name: order.temporaryCompanyName || '' } as any}
        />
      )}

      {/* HEADER SECTION */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0  bg-black/80 backdrop-blur-md border-b border-white/5  px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-black/40"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Order ID</span>
              <span className="font-mono text-[10px] text-zinc-400">
                #{order.id.slice(0, 8)}...
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{clientName || "Unknown Client"}</span>
              {order.isPotentialClient && (
                <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                  <AlertCircle className="w-3 h-3 mr-1" /> Potential
                </Badge>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn("hidden md:flex items-center px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300", getStatusColor(order.status))}>
            {getStatusIcon(order.status)} {order.status}
          </div>

          <div className="h-8 w-px bg-zinc-800 mx-2 hidden md:block" />

          <Button variant="outline" size="sm" onClick={handlePrint} className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300">
            <Printer className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Export</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)] transition-all">
                Actions <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-zinc-300">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change Order Status</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                    {orderStatuses.map(status => (
                      <DropdownMenuItem key={status} onClick={() => updateOrderStatus(order.id, status)} disabled={order.status === status} className="focus:bg-zinc-900 focus:text-white">
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Payment Status</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                    {paymentStatuses.map(status => (
                      <DropdownMenuItem key={status} onClick={() => updateOrderPaymentStatus(order.id, status)} disabled={order.paymentStatus === status} className="focus:bg-zinc-900 focus:text-white">
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              {order.isPotentialClient && (
                <>
                  <Separator className="my-1 bg-zinc-800" />
                  <DropdownMenuItem onClick={handleRegisterCompany} className="focus:bg-zinc-900 focus:text-white">
                    <UserPlus className="mr-2 h-4 w-4" /> Register Client
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* STATS HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-x-[1px] border-white/5 bg-zinc-900/20">
        {[
          { label: 'Order Date', value: format(new Date(order.orderDate), 'dd MMM yyyy'), icon: Calendar },
          { label: 'Payment Due', value: order.expectedPaymentDate || order.paymentDueDate ? format(new Date(order.expectedPaymentDate || order.paymentDueDate || ''), 'dd MMM yyyy') : 'Net 30', icon: CreditCard },
          { label: 'Delivery', value: order.deliveryDate ? format(new Date(order.deliveryDate), 'dd MMM yyyy') : 'Pending', icon: Truck },
          { label: 'Territory', value: order.area || 'Unassigned', icon: MapPin },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 border-r border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors group cursor-default"
          >
            <div className="p-2 rounded-lg bg-zinc-900 border border-[.2rem] border-zinc-800 text-zinc-500 group-hover:text-white group-hover:border-zinc-700 transition-all">
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{stat.label}</div>
              <div className="text-sm font-semibold text-zinc-200">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-[1800px] mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: MANIFEST */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-lg font-light tracking-tight text-white flex items-center gap-2">
              <Box className="w-4 h-4 text-emerald-500" />
              Manifest <span className="text-zinc-500 text-sm ml-2 font-mono">({order.items.length} ITEMS)</span>
            </h2>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/40 overflow-hidden backdrop-blur-sm shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="p-4 pl-6 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">ID</th>
                    <th className="p-4 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Description</th>
                    <th className="p-4 font-mono text-[10px] text-zinc-500 uppercase tracking-widest text-right">Qty</th>
                    <th className="p-4 font-mono text-[10px] text-zinc-500 uppercase tracking-widest text-right">Rate</th>
                    <th className="p-4 pr-6 font-mono text-[10px] text-zinc-500 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {order.items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <tr key={item.productId} className="group hover:bg-white/5 transition-colors">
                        <td className="p-4 pl-6 font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors text-xs">
                          {item.productId.slice(0, 6)}
                        </td>
                        <td className="p-4">
                          <DrillTarget kind="product" payload={{ id: item.productId, name: item.productName || product?.name || 'Unknown' }} asChild>
                            <div className="font-medium text-zinc-200 group-hover:text-white cursor-pointer hover:underline transition-colors w-fit">
                              {item.productName || product?.name || 'Unknown Product'}
                            </div>
                          </DrillTarget>
                          {product?.description && (
                            <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1 max-w-[300px]">{product.description}</div>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono text-zinc-300">
                          {item.quantity}
                        </td>
                        <td className="p-4 text-right font-mono text-zinc-400">
                          ${(item.price || 0).toFixed(2)}
                        </td>
                        <td className="p-4 pr-6 text-right font-mono font-medium text-emerald-400/80 group-hover:text-emerald-400">
                          ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-zinc-950/50 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500 font-mono px-6">
              <span>VERIFIED QTY: {order.items.reduce((acc, i) => acc + i.quantity, 0).toFixed(2)}</span>
              <span>MANIFEST ID: {order.id.split('-')[0]}...</span>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: INTELLIGENCE & FINANCE */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* RECEIPT CARD */}
          <div className="rounded-xl border border-white/10 bg-zinc-950 relative overflow-hidden shadow-2xl shadow-black/40">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-70" />

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Receipt className="w-3 h-3" /> Financials</span>
                  <span className="text-zinc-600 font-mono">EGP</span>
                </h3>

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>

                  {(order.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-500">
                      <span>Discount {order.discountType === 'percentage' && `(${order.discountValue}%)`}</span>
                      <span>-${(order.discountAmount ?? 0).toFixed(2)}</span>
                    </div>
                  )}

                  {(order.totalTax || 0) > 0 && (
                    <div className="flex justify-between text-zinc-400">
                      <span>Tax</span>
                      <span>+${(order.totalTax || 0).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="h-px bg-dashed border-t border-dashed border-zinc-800 my-4" />

                  <div className="flex justify-between items-end overflow-hidden">
                    <span className="text-zinc-500 font-sans text-[10px] uppercase font-bold tracking-wider mb-1 shrink-0">Grand Total</span>
                    <MarqueeText
                      className="text-3xl font-bold text-white tracking-tight leading-none bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent w-full text-right ml-4"
                      delay={0.5}
                    >
                      ${(order.total || 0).toFixed(2)}
                    </MarqueeText>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Payment Status</span>
                  <Badge variant="outline" className={cn("text-[10px] h-5 border-0", getStatusColor(order.paymentStatus || 'Pending').replace('bg-', 'bg-transparent text-'))}>
                    {order.paymentStatus || 'Pending'}
                  </Badge>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full w-full opacity-80 shadow-[0_0_10px_rgba(0,0,0,0.5)]", order.paymentStatus === 'Paid' ? "bg-emerald-500" : "bg-amber-500")}
                    style={{ width: order.paymentStatus === 'Paid' ? '100%' : '30%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CLIENT CARD */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/30 backdrop-blur-sm p-6 shadow-xl">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Client Profile
            </h3>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-300 shadow-inner">
                {clientName?.charAt(0) || '?'}
              </div>
              <div className="space-y-1">
                <DrillTarget kind="company" payload={{ id: company?.id || '', name: clientName || 'Unknown' }} asChild>
                  <Link href={`/clients/${company?.id}`} className="font-semibold text-white hover:text-emerald-400 transition-colors">
                    {clientName || "Unknown Client"}
                  </Link>
                </DrillTarget>
                <p className="text-xs text-zinc-500 font-mono">
                  ID: {company?.id.slice(0, 8)}
                </p>
                {branchName && branchName !== clientName && (
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 mt-2 bg-zinc-800/80 border border-zinc-700/50 px-2 py-1 rounded w-fit">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    {branchName}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Manager</div>
                <div className="text-sm text-zinc-300 truncate font-medium">{company?.managerName || <span className="text-zinc-600 italic">Not specified</span>}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Contact</div>
                <div className="text-sm text-zinc-300 truncate font-medium">{(company as any)?.contacts?.[0]?.phoneNumbers?.[0]?.number || <span className="text-zinc-600 italic">Not specified</span>}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
