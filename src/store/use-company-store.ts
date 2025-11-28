
import { create } from 'zustand';
import { produce } from 'immer';
import { supabase } from '@/lib/supabase';
import type { Company, Branch, Barista, MaintenanceVisit, Feedback, DeliveryArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { logError, logSupabaseError, logDebug } from '@/lib/error-logger';

interface CompanyState {
  companies: Company[];
  baristas: Barista[];
  feedback: Feedback[];
  areas: DeliveryArea[];
  loading: boolean;
  addCompanyAndRelatedData: (
    companyData: Partial<Omit<Company, 'id' | 'isBranch' | 'parentCompanyId'>>,
    branchesData?: (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Barista>[], maintenanceHistory?: Omit<MaintenanceVisit, 'id' | 'branchId'>[] })[]
  ) => Promise<Company>;
  updateCompanyAndBranches: (companyId: string, companyData: Partial<Company>, branchesData: (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Barista>[] })[]) => Promise<void>;
  deleteCompany: (companyId: string, forceCascade?: boolean, reassignToCompanyId?: string) => Promise<void>;
  mergeCompanies: (parentCompanyIdOrName: string, childCompanyIds: string[]) => Promise<void>;
  fetchBranchesForCompany: (companyId: string) => Promise<Company[]>;
  addBarista: (companyId: string, branchId: string, baristaData: Omit<Barista, 'id' | 'branchId'>) => Promise<void>;
  updateBarista: (baristaId: string, baristaData: Partial<Omit<Barista, 'id' | 'branchId'>>) => Promise<void>;
  addFeedback: (feedbackData: Omit<Feedback, 'id'>) => Promise<void>;
  // Area management
  addArea: (area: Omit<DeliveryArea, 'id'>) => Promise<void>;
  updateArea: (areaId: string, areaData: Partial<Omit<DeliveryArea, 'id'>>) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
  fetchRevenueStats: () => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  baristas: [],
  feedback: [],
  areas: [],
  loading: true,

  addCompanyAndRelatedData: async (companyData, branchesData) => {
    const newCompanyData: any = {
        name: companyData.name || 'Unnamed Company',
        parentCompanyId: null,
        location: companyData.location ?? null,
        region: companyData.region || 'A',
        createdAt: new Date().toISOString(),
        contacts: companyData.contacts || [],
        machineOwned: companyData.machineOwned || false,
        paymentMethod: companyData.paymentMethod || 'transfer',
        paymentDueType: companyData.paymentDueType || 'days_after_order',
        paymentDueDays: companyData.paymentDueDays || 30,
        currentPaymentScore: 100,
        totalOutstandingAmount: 0,
        totalUnpaidOrders: 0,
    };
    
    if (companyData.email) newCompanyData.email = companyData.email;
    if (companyData.taxNumber) newCompanyData.taxNumber = companyData.taxNumber;
    if (companyData.area) newCompanyData.area = companyData.area;
    if (companyData.paymentDueDate !== undefined && companyData.paymentDueDate !== null && !isNaN(companyData.paymentDueDate)) {
        newCompanyData.paymentDueDate = companyData.paymentDueDate;
    }
    if (companyData.bulkPaymentSchedule) newCompanyData.bulkPaymentSchedule = companyData.bulkPaymentSchedule;

    const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert(newCompanyData)
        .select()
        .single();

    if (companyError) {
      logSupabaseError(companyError, {
        component: 'useCompanyStore',
        action: 'addCompanyAndRelatedData - insert company',
        data: newCompanyData
      });
      throw companyError;
    }

    const fullCompany = company as Company;

    if (branchesData) {
        for (const branch of branchesData) {
            const { baristas, maintenanceHistory, ...branchDetails } = branch;
            const newBranchData: any = { 
                name: branchDetails.name ?? 'Unnamed Branch',
                parentCompanyId: fullCompany.id, 
                location: branchDetails.location || null,
                region: branchDetails.region || 'A',
                createdAt: new Date().toISOString(),
                machineOwned: branchDetails.machineOwned || false,
                contacts: branchDetails.contacts || [],
            };
            
            if (branchDetails.email) newBranchData.email = branchDetails.email;
            if (branchDetails.area) newBranchData.area = branchDetails.area;

            const { data: newBranch, error: branchError } = await supabase
                .from('companies')
                .insert(newBranchData)
                .select()
                .single();

            if (branchError) {
                console.error("Error creating branch:", branchError);
                continue;
            }

            if (baristas) {
                const baristasToInsert = baristas.map(b => ({ ...b, branchId: newBranch.id }));
                if (baristasToInsert.length > 0) {
                    await supabase.from('baristas').insert(baristasToInsert);
                }
            }
             if (maintenanceHistory) {
                const visitsToInsert = maintenanceHistory.map(v => ({ ...v, branchId: newBranch.id, companyId: fullCompany.id }));
                if (visitsToInsert.length > 0) {
                    await supabase.from('maintenance').insert(visitsToInsert);
                }
            }
        }
    }

    toast({ title: "Company Created", description: "Successfully created company and all related data." });
    
    // Update local state
    set(produce((state: CompanyState) => {
      state.companies.push(fullCompany);
    }));
    
    // Refresh to get all data including branches (exclude deleted placeholders)
    const { data: allCompanies } = await supabase.from('companies').select('*').not('name', 'like', '[DELETED]%');
    if (allCompanies) {
        set({ companies: allCompanies.map(c => ({ ...c, isBranch: !!c.parentCompanyId })) as Company[] });
    }
    
    return fullCompany;
  },

  updateCompanyAndBranches: async (companyId, companyData, branchesData) => {
    const dataToUpdate = (companyData as any).formState || companyData;
    const { id, createdAt, parentCompanyId, industry, currentPaymentScore, totalOutstandingAmount, totalUnpaidOrders, pendingBulkPaymentAmount, paymentStatus, deliveryDays, managerName, ...cleanCompanyData } = dataToUpdate as any;
    if (cleanCompanyData.email === '') {
        cleanCompanyData.email = null;
    }

    const { error: companyError } = await supabase.from('companies').update(cleanCompanyData).eq('id', companyId);
    if (companyError) {
      console.error('Company update error:', companyError);
      throw companyError;
    }

    // Get existing branches
    const existingBranches = get().companies.filter(c => c.parentCompanyId === companyId);
    const submittedBranchIds = branchesData?.filter(b => b.id).map(b => b.id) || [];
    
    // Delete branches that were removed
    const branchesToDelete = existingBranches.filter(b => !submittedBranchIds.includes(b.id));
    if (branchesToDelete.length > 0) {
        await supabase.from('companies').delete().in('id', branchesToDelete.map(b => b.id));
    }

    if (branchesData) {
        for (const branch of branchesData) {
            const { id, createdAt, parentCompanyId, industry, currentPaymentScore, totalOutstandingAmount, totalUnpaidOrders, pendingBulkPaymentAmount, paymentStatus, deliveryDays, managerName, baristas, performanceScore, ...cleanBranchData } = branch as any;
            if (cleanBranchData.email === '') {
                cleanBranchData.email = null;
            }

            if (id) {
                const { error: branchError } = await supabase.from('companies').update(cleanBranchData).eq('id', id);
                if (branchError) {
                  console.error('Branch update error:', branchError, 'Data:', cleanBranchData);
                  throw branchError;
                }
            } else {
                const newBranchData = { ...cleanBranchData, parentCompanyId: companyId, createdAt: new Date().toISOString() };
                await supabase.from('companies').insert(newBranchData);
            }
        }
    }

    // Update local state (exclude deleted placeholders)
    const { data: allCompanies } = await supabase.from('companies').select('*').not('name', 'like', '[DELETED]%');
    if (allCompanies) {
        set({ companies: allCompanies.map(c => ({ ...c, isBranch: !!c.parentCompanyId })) as Company[] });
    }
    
    toast({ title: 'Company Updated', description: 'Company details have been updated.' });
  },

  deleteCompany: async (companyId: string, forceCascade: boolean = false, reassignToCompanyId?: string) => {
    try {
      const companyToDelete = get().companies.find(c => c.id === companyId);
      if (!companyToDelete) throw new Error('Company not found');
      
      const branches = get().companies.filter(c => c.parentCompanyId === companyId);
      const idsToDelete = [companyId, ...branches.map(b => b.id)];
      
      if (forceCascade) {
        // Delete all related data
        await supabase.from('orders').delete().in('companyId', idsToDelete);
        await supabase.from('orders').delete().in('branchId', idsToDelete);
        await supabase.from('baristas').delete().in('branchId', idsToDelete);
        await supabase.from('maintenance').delete().in('companyId', idsToDelete);
        await supabase.from('maintenance').delete().in('branchId', idsToDelete);
        await supabase.from('feedback').delete().in('clientId', idsToDelete);
        await supabase.from('visits').delete().in('clientId', idsToDelete);
      } else if (reassignToCompanyId) {
        // Reassign related data to another company
        await supabase.from('orders').update({ companyId: reassignToCompanyId, branchId: null }).in('companyId', idsToDelete);
        await supabase.from('orders').update({ branchId: null }).in('branchId', idsToDelete);
        await supabase.from('baristas').update({ branchId: null }).in('branchId', idsToDelete);
        await supabase.from('maintenance').update({ companyId: reassignToCompanyId, branchId: null }).in('companyId', idsToDelete);
        await supabase.from('maintenance').update({ branchId: null }).in('branchId', idsToDelete);
        await supabase.from('feedback').update({ clientId: reassignToCompanyId }).in('clientId', idsToDelete);
        await supabase.from('visits').update({ clientId: reassignToCompanyId }).in('clientId', idsToDelete);
      } else {
        // Create placeholder company for orphaned data
        const placeholderName = `[DELETED] ${companyToDelete.name}`;
        const { data: placeholder } = await supabase.from('companies').insert({
          name: placeholderName,
          parentCompanyId: null,
          region: companyToDelete.region || 'A',
          email: null,
          location: null,
          createdAt: new Date().toISOString(),
          machineOwned: false,
          currentPaymentScore: 0,
          totalOutstandingAmount: 0,
          totalUnpaidOrders: 0,
        }).select().single();
        
        if (placeholder) {
          // Reassign all related data to placeholder
          await supabase.from('orders').update({ companyId: placeholder.id, branchId: null }).in('companyId', idsToDelete);
          await supabase.from('orders').update({ branchId: null }).in('branchId', idsToDelete);
          await supabase.from('baristas').update({ branchId: null }).in('branchId', idsToDelete);
          await supabase.from('maintenance').update({ companyId: placeholder.id, branchId: null }).in('companyId', idsToDelete);
          await supabase.from('maintenance').update({ branchId: null }).in('branchId', idsToDelete);
          await supabase.from('feedback').update({ clientId: placeholder.id }).in('clientId', idsToDelete);
          await supabase.from('visits').update({ clientId: placeholder.id }).in('clientId', idsToDelete);
        }
      }
      
      const { error } = await supabase.from('companies').delete().in('id', idsToDelete);
      
      if (error) {
        if (error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('violates')) {
          toast({ 
            title: "Cannot Delete", 
            description: "Failed to reassign data. Please try again.",
            variant: 'destructive'
          });
          return;
        }
        throw error;
      }
      
      set(produce((state: CompanyState) => {
        state.companies = state.companies.filter((c: Company) => c.id !== companyId && c.parentCompanyId !== companyId);
      }));
      
      // Refresh companies list (exclude deleted placeholders)
      const { data: allCompanies } = await supabase.from('companies').select('*').not('name', 'like', '[DELETED]%');
      if (allCompanies) {
        set({ companies: allCompanies.map(c => ({ ...c, isBranch: !!c.parentCompanyId })) as Company[] });
      }
      
      const msg = forceCascade ? "Company and all related data removed." : reassignToCompanyId ? "Company deleted and data reassigned." : `Company deleted. Related data preserved under "[DELETED] ${companyToDelete.name}".`;
      toast({ title: "Company Deleted", description: msg });
    } catch (error: any) {
      toast({ 
        title: "Delete Failed", 
        description: error.message || 'Failed to delete company',
        variant: 'destructive'
      });
    }
  },

  mergeCompanies: async (parentCompanyIdOrName, childCompanyIds) => {
    let parentId = parentCompanyIdOrName;
    
    if (parentCompanyIdOrName.startsWith('new:')) {
        const newParentName = parentCompanyIdOrName.split(':')[1];
        const newParentCompany = await get().addCompanyAndRelatedData({
            name: newParentName,
            region: 'A',
            createdAt: new Date().toISOString(),
            machineOwned: false
        });
        parentId = newParentCompany.id;
    }

    await supabase.from('companies').update({ parentCompanyId: parentId }).in('id', childCompanyIds);
    
    // Update local state (exclude deleted placeholders)
    const { data: allCompanies } = await supabase.from('companies').select('*').not('name', 'like', '[DELETED]%');
    if (allCompanies) {
        set({ companies: allCompanies.map(c => ({ ...c, isBranch: !!c.parentCompanyId })) as Company[] });
    }
    
    toast({ title: "Merge Complete", description: "Companies have been successfully merged." });
  },

  fetchBranchesForCompany: async (companyId: string) => {
    return get().companies.filter(c => c.isBranch && c.parentCompanyId === companyId);
  },

  addBarista: async (companyId, branchId, baristaData) => {
    const newBarista = { ...baristaData, branchId };
    const { data: insertedBarista, error } = await supabase
        .from('baristas')
        .insert(newBarista)
        .select()
        .single();
        
    if (error) throw error;

    set(produce((state: CompanyState) => {
      state.baristas.push(insertedBarista as Barista);
    }));
    toast({ title: 'Barista Added'});
  },
  
  updateBarista: async (baristaId, baristaData) => {
    await supabase.from('baristas').update(baristaData).eq('id', baristaId);
    set(produce((state: CompanyState) => {
      const index = state.baristas.findIndex((b: Barista) => b.id === baristaId);
      if (index !== -1) {
        state.baristas[index] = { ...state.baristas[index], ...baristaData };
      }
    }));
    toast({ title: 'Barista Updated' });
  },

  addFeedback: async (feedbackData) => {
      const { data: insertedFeedback, error } = await supabase
        .from('feedback')
        .insert(feedbackData)
        .select()
        .single();
        
      if (error) throw error;

      set(produce((state: CompanyState) => {
        state.feedback.push(insertedFeedback as Feedback);
      }));
  },

  // Area Management
  // Area Management
  addArea: async (area: Omit<DeliveryArea, 'id'>) => {
    const { data: insertedArea, error } = await supabase
        .from('areas')
        .insert(area)
        .select()
        .single();
        
    if (error) throw error;

    set(produce((state: CompanyState) => {
      state.areas.push(insertedArea as DeliveryArea);
    }));
    toast({ title: 'Area Added' });
  },
  updateArea: async (areaId: string, areaData: Partial<Omit<DeliveryArea, 'id'>>) => {
    await supabase.from('areas').update(areaData).eq('id', areaId);
    set(produce((state: CompanyState) => {
      const index = state.areas.findIndex((a: DeliveryArea) => a.id === areaId);
      if (index !== -1) {
        state.areas[index] = { ...state.areas[index], ...areaData };
      }
    }));
    toast({ title: 'Area Updated' });
  },
  deleteArea: async (areaId: string) => {
    await supabase.from('areas').delete().eq('id', areaId);
    set(produce((state: CompanyState) => {
      state.areas = state.areas.filter((a: DeliveryArea) => a.id !== areaId);
    }));
    toast({ title: 'Area Deleted', variant: 'destructive' });
  },

  fetchRevenueStats: async () => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const fromDate = twelveMonthsAgo.toISOString();

    try {
        const revenueByCompany: Record<string, number> = {};
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;
        let totalOrders = 0;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: orders, error } = await supabase
                .from('orders')
                .select('companyId, grandTotal')
                .gte('orderDate', fromDate)
                .neq('status', 'Cancelled')
                .range(from, to);

            if (error) throw error;

            if (!orders || orders.length === 0) {
                hasMore = false;
                break;
            }

            orders.forEach(order => {
                if (order.companyId) {
                    revenueByCompany[order.companyId] = (revenueByCompany[order.companyId] || 0) + (order.grandTotal || 0);
                }
            });

            totalOrders += orders.length;
            
            // If we got fewer than pageSize, we've reached the end
            if (orders.length < pageSize) {
                hasMore = false;
            } else {
                page++;
            }
        }

        console.log('[DEBUG] Revenue Stats - Total fetched orders:', totalOrders);
        console.log('[DEBUG] Revenue Stats - Aggregated companies:', Object.keys(revenueByCompany).length);

        set(produce((state: CompanyState) => {
            state.companies.forEach(company => {
                company.last12MonthsRevenue = revenueByCompany[company.id] || 0;
            });
        }));
    } catch (error) {
        console.error('Error fetching revenue stats:', error);
    }
  },
}));
