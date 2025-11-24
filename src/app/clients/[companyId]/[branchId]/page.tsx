
"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Building, Gauge, HardHat, Cog, MapPin, Phone, Edit, User, Briefcase } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { BaristaManagement } from '@/app/clients/_components/barista-management';
import { MaintenanceHistoryList } from './_components/maintenance-history-list';
import type { Company } from '@/lib/types';
import { calculatePerformanceScore } from '@/lib/performance-score';
import { BranchForm } from '@/app/clients/_components/branch-form';

export default function BranchDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const branchId = params.branchId as string;
  
  const { orders } = useOrderStore();
  const { companies, baristas, feedback, loading } = useCompanyStore();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const company = useMemo(() => companies.find(c => c.id === companyId && !c.isBranch), [companyId, companies]);
  const branch = useMemo(() => companies.find(c => c.id === branchId && c.isBranch), [branchId, companies]);

  const performanceScore = useMemo(() => {
    if (!branch) return 0;
    return calculatePerformanceScore(branch.id, orders, feedback, baristas);
  }, [branch, orders, feedback, baristas]);


  const handleFormSubmit = async (branchData: Partial<Company>) => {
    if (!branch) return;
    
    try {
      console.log('Updating branch with data:', branchData);
      const { id, createdAt, isBranch, parentCompanyId, industry, currentPaymentScore, 
        totalOutstandingAmount, totalUnpaidOrders, pendingBulkPaymentAmount, 
        paymentStatus, deliveryDays, managerName, baristas, performanceScore, contacts, warehouseContacts, ...cleanData } = branchData as any;
      
      // Add back contacts if they exist
      if (contacts) cleanData.contacts = contacts;
      if (warehouseContacts) cleanData.warehouseContacts = warehouseContacts;
      
      console.log('Clean data to update:', cleanData);
      const { error } = await supabase.from('companies').update(cleanData).eq('id', branch.id);
      if (error) throw error;
      
      console.log('Update successful, refreshing companies');
      // Refresh companies
      const { data: allCompanies } = await supabase.from('companies').select('*');
      if (allCompanies) {
        useCompanyStore.setState({ companies: allCompanies as Company[] });
      }
      
      toast({ title: 'Branch Updated', description: 'Branch details have been updated.' });
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Update error:', error);
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  if (loading || !company || !branch) return <Loading />;

  return (
    <>
      <BranchForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        branch={branch}
      />
      <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" type="button" onClick={() => router.back()}>
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Back</span>
                  </Button>
                  <div>
                      <h1 className="text-3xl font-bold">{branch.name}</h1>
                      <p className="text-muted-foreground">Branch of <Link href={`/clients/${companyId}`} className="hover:underline">{company.name}</Link></p>
                  </div>
              </div>
               <Button variant="outline" onClick={() => setIsFormOpen(true)} className="self-start">
                  <Edit className="mr-2 h-4 w-4"/>
                  Edit Branch
              </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-3xl font-bold">{performanceScore.toFixed(1)}/10</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Cog className="h-5 w-5" /> Machine</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-xl font-bold">{branch.machineOwned ? 'Owned' : 'Leased'}</p>
                  </CardContent>
              </Card>
              <div className="md:col-span-2 lg:col-span-1">
                  <MaintenanceHistoryList companyId={companyId} branchId={branchId} />
              </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Branch Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {branch.contacts && branch.contacts.length > 0 ? (
                        branch.contacts.map((contact, index) => (
                           <div key={index} className="space-y-1">
                                <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> {contact.name}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-2 ml-6"><Briefcase className="h-4 w-4"/> {contact.position}</p>
                                {contact.phoneNumbers.map((phone, pIndex) => (
                                    <p key={pIndex} className="text-sm flex items-center gap-2 ml-6"><Phone className="h-4 w-4"/> {phone.number}</p>
                                ))}
                           </div>
                        ))
                      ) : (
                          <p className="text-sm text-muted-foreground">No contacts listed.</p>
                      )}
                      <div>
                          <h4 className="font-semibold mt-4">Location</h4>
                          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/> {branch.location ?? 'N/A'}</p>
                      </div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Warehouse Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div>
                          <h4 className="font-semibold">Warehouse Manager</h4>
                          <p>{(branch as any).warehouseManager ?? 'N/A'}</p>
                      </div>
                      <div>
                          <h4 className="font-semibold">Warehouse Phone</h4>
                          <p>{(branch as any).warehousePhone ?? 'N/A'}</p>
                      </div>
                      <div>
                          <h4 className="font-semibold">Warehouse Location</h4>
                          <p>{(branch as any).warehouseLocation ?? 'N/A'}</p>
                      </div>
                  </CardContent>
              </Card>
          </div>

          <Separator />

          <BaristaManagement companyId={companyId} branchId={branchId} showAllForCompany={false} />
      </div>
    </>
  );
}
