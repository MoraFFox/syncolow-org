
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store/use-products-store';
import { useCompanyStore } from '@/store/use-company-store';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/lib/types';
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, GitMerge, Building } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Branch, Company, Barista } from '@/lib/types';
import { CompanyForm } from '../../_components/company-form';
import { MergeCompaniesDialog } from '../../_components/merge-companies-dialog';
import { CompanyOverview } from './company-overview';
import { BaristaManagement } from '../../_components/barista-management';
import { CompanyMaintenanceHistory } from './company-maintenance-history';
import { MaintenanceCostReport } from '@/app/maintenance/_components/maintenance-cost-report';
import { AllOrders } from './all-orders';
import { TopProducts } from './top-products';
import { CompanyAlerts } from './company-alerts';
import { LocationMap } from './location-map';
import { ClientConsumptionAnalytics } from './client-consumption-analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function CompanyDetails({ companyId }: { companyId: string }) {
  const router = useRouter();

  const { loading: orderLoading } = useOrderStore();
  const { products } = useProductsStore();
  const { companies, loading: companyLoading, updateCompanyAndBranches, mergeCompanies } = useCompanyStore();

  const [companyOrders, setCompanyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const company = useMemo(() => {
    if (!companyId) return null;
    return companies.find(c => c.id === companyId && !c.isBranch);
  }, [companyId, companies]);

  const companyBranches = useMemo(() => {
    return companies.filter(c => c.isBranch && c.parentCompanyId === companyId) as (Company & { isBranch: true })[];
  }, [companies, companyId]);

  const _companyAndBranches = useMemo(() => {
    if (!company) return [];
    return [company, ...companyBranches];
  }, [company, companyBranches]);

  // Fetch all orders for this company from the database
  useEffect(() => {
    if (!company) return;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('companyId', company.id)
          .order('orderDate', { ascending: false });

        setCompanyOrders((data as Order[]) || []);
      } catch (error) {
        console.error('Error fetching company orders:', error);
        setCompanyOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [company]);

  const handleCompanyFormSubmit = async (companyData: Omit<Company, 'id' | 'isBranch' | 'parentCompanyId'>, branchesData?: (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Barista>[] })[]) => {
    if (company) {
      await updateCompanyAndBranches(company.id, companyData, branchesData as Partial<Branch>[]);
      setIsCompanyFormOpen(false);
    }
  };

  if (orderLoading || companyLoading || ordersLoading || !company) return <Loading />;

  return (
    <>
      <CompanyForm
        isOpen={isCompanyFormOpen}
        onOpenChange={setIsCompanyFormOpen}
        onSubmit={handleCompanyFormSubmit}
        company={company}
      />
      <MergeCompaniesDialog
        isOpen={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        sourceCompany={company}
        allCompanies={companies}
        onMerge={mergeCompanies}
      />
      <div className="flex flex-col gap-8">

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" type="button" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold flex items-center gap-2 truncate">
                <Building className="h-7 w-7 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{company.name}</span>
              </h1>
              <p className="text-muted-foreground">Parent Company Overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsMergeDialogOpen(true)}>
              <GitMerge className="mr-2 h-4 w-4" />
              Merge
            </Button>
            <Button onClick={() => setIsCompanyFormOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Company
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="baristas">Baristas</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6 space-y-6">
            <CompanyOverview company={company} branches={companyBranches} orders={companyOrders} />
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2">
                <LocationMap company={company} branches={companyBranches} />
              </div>
              <div className="space-y-6">
                <CompanyAlerts orders={companyOrders} products={products} branches={companyBranches} />
                <TopProducts orders={companyOrders} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="orders" className="mt-6">
            <AllOrders orders={companyOrders} />
          </TabsContent>
          <TabsContent value="analytics" className="mt-6">
            <ClientConsumptionAnalytics orders={companyOrders} />
          </TabsContent>
          <TabsContent value="maintenance" className="mt-6 space-y-6">
            <div className="overflow-x-auto">
              <MaintenanceCostReport companyId={companyId} />
            </div>
            <CompanyMaintenanceHistory companyId={companyId} />
          </TabsContent>
          <TabsContent value="baristas" className="mt-6">
            <BaristaManagement companyId={companyId} branchId={null} showAllForCompany={true} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
