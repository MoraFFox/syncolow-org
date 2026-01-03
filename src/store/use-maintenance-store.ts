
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { MaintenanceVisit, MaintenanceEmployee, CancellationReason } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { parseISO, isValid, differenceInDays } from 'date-fns';
import { produce } from 'immer';
import { universalCache } from '@/lib/cache/universal-cache';
import { CacheKeyFactory } from '@/lib/cache/key-factory';
import { drilldownCacheInvalidator } from '@/lib/cache/drilldown-cache-invalidator';
import { logger } from '@/lib/logger';
import {
  getServicesCatalog,
  getPartsCatalog,
  getProblemsCatalog,
  addServiceToCatalog,
  updateServiceInCatalog,
  removeServiceFromCatalog,
  addPartToCatalog,
  updatePartInCatalog,
  removePartFromCatalog,
  addProblemToCatalog,
  updateProblemInCatalog,
  removeProblemFromCatalog,
  type ServiceCatalogItem,
  type PartsCatalogItem,
  type ProblemsCatalogItem
} from '@/app/actions/maintenance';

interface MaintenanceState {
  maintenanceVisits: MaintenanceVisit[];
  maintenanceEmployees: MaintenanceEmployee[];
  cancellationReasons: CancellationReason[];
  // Catalog State (Array-based for DB sync)
  servicesCatalog: ServiceCatalogItem[];
  partsCatalog: PartsCatalogItem[];
  problemsCatalog: ProblemsCatalogItem[];

  loading: boolean;

  fetchInitialData: () => Promise<void>;
  /** @deprecated Use fetchInitialData instead - kept for backward compatibility/caching safety */
  fetchMaintenanceVisits: () => Promise<void>;

  // Visit CRUD
  addMaintenanceVisit: (visit: Omit<MaintenanceVisit, 'id'>) => Promise<void>;
  updateMaintenanceVisit: (visitId: string, visitData: Partial<MaintenanceVisit>) => Promise<MaintenanceVisit | undefined>;
  updateMaintenanceVisitStatus: (visitId: string, status: MaintenanceVisit['status']) => Promise<void>;
  deleteMaintenanceVisit: (visitId: string) => Promise<void>;
  searchMaintenanceVisits: (searchTerm: string) => Promise<void>;

  // Employee CRUD
  addMaintenanceEmployee: (employee: Omit<MaintenanceEmployee, 'id'>) => Promise<void>;
  updateMaintenanceEmployee: (employeeId: string, employeeData: Partial<Omit<MaintenanceEmployee, 'id'>>) => Promise<void>;
  deleteMaintenanceEmployee: (employeeId: string) => Promise<void>;

  // Cancellation Reasons
  addCancellationReason: (reason: string) => Promise<void>;

  // Catalog CRUD Actions
  addService: (category: string, name: string, cost: number) => Promise<void>;
  updateService: (id: string, data: Partial<ServiceCatalogItem>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  addPart: (category: string, name: string, price: number) => Promise<void>;
  updatePart: (id: string, data: Partial<PartsCatalogItem>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;

  addProblem: (category: string, problem: string) => Promise<void>;
  updateProblem: (id: string, data: Partial<ProblemsCatalogItem>) => Promise<void>;
  deleteProblem: (id: string) => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  maintenanceVisits: [],
  maintenanceEmployees: [],
  cancellationReasons: [],
  servicesCatalog: [],
  partsCatalog: [],
  problemsCatalog: [],
  loading: true,

  fetchInitialData: async () => {
    // Determine if we need to set loading state
    // We only set it if it's currently false to avoid flickering if already loading
    if (!get().loading) set({ loading: true });

    try {
      logger.debug('fetchInitialData starting', { component: 'useMaintenanceStore', action: 'fetchInitialData' });

      // Parallel fetch for catalogs and main data
      // Invalidate maintenance cache before fetching to ensure fresh data
      await universalCache.invalidate(CacheKeyFactory.list('maintenance'));

      const [
        visitsRes,
        employeesRes,
        cancelRes,
        servicesRes,
        partsRes,
        problemsRes
      ] = await Promise.all([
        universalCache.get(
          CacheKeyFactory.list('maintenance'),
          async () => {
            logger.debug('Fetching maintenance visits from Supabase', { component: 'useMaintenanceStore' });
            const { data, error } = await supabase.from('maintenance').select('*');
            if (error) {
              logger.error(error, { component: 'useMaintenanceStore', action: 'fetchVisits' });
            }
            logger.debug('Fetched visits', { component: 'useMaintenanceStore', data: { count: data?.length || 0 } });
            return data || [];
          },
          { forceRefresh: true } // Force fresh fetch, bypass cache
        ),
        universalCache.get(
          CacheKeyFactory.list('maintenanceEmployees'),
          async () => {
            const { data } = await supabase.from('maintenanceEmployees').select('*');
            return data || [];
          }
        ),
        universalCache.get(
          CacheKeyFactory.list('cancellationReasons'),
          async () => {
            const { data } = await supabase.from('cancellationReasons').select('*');
            return data || [];
          }
        ),
        // Fetch catalogs using server actions (uncached here as actions handle their own caching/revalidation or we rely on Next.js cache)
        // Actually, for client store, we should just call the action.
        getServicesCatalog(),
        getPartsCatalog(),
        getProblemsCatalog()
      ]);

      logger.debug('fetchInitialData complete', {
        component: 'useMaintenanceStore',
        data: {
          visitsCount: (visitsRes as MaintenanceVisit[])?.length || 0,
          employeesCount: (employeesRes as MaintenanceEmployee[])?.length || 0
        }
      });

      set({
        maintenanceVisits: visitsRes as MaintenanceVisit[],
        maintenanceEmployees: employeesRes as MaintenanceEmployee[],
        cancellationReasons: cancelRes as CancellationReason[],
        servicesCatalog: servicesRes.success ? (servicesRes.data || []) : [],
        partsCatalog: partsRes.success ? (partsRes.data || []) : [],
        problemsCatalog: problemsRes.success ? (problemsRes.data || []) : [],
        loading: false
      });

    } catch (e) {
      logger.error(e, { component: 'useMaintenanceStore', action: 'fetchInitialData' });
      set({ loading: false });
    }
  },

  fetchMaintenanceVisits: async () => {
    return get().fetchInitialData();
  },

  addMaintenanceVisit: async (visit) => {
    try {
      const visitWithStatus = { ...visit, status: 'Scheduled' as const };
      logger.debug('Adding maintenance visit', { component: 'useMaintenanceStore', action: 'addMaintenanceVisit', data: visitWithStatus });

      const { error } = await supabase.from('maintenance').insert(visitWithStatus);

      if (error) {
        logger.error(error, { component: 'useMaintenanceStore', action: 'addMaintenanceVisit' });
        toast({ title: 'Error', description: `Failed to schedule visit: ${error.message}`, variant: 'destructive' });
        return;
      }

      await universalCache.invalidate(CacheKeyFactory.list('maintenance'));
      await get().fetchInitialData();
      toast({ title: "Visit Scheduled" });
    } catch (e) {
      logger.error(e, { component: 'useMaintenanceStore', action: 'addMaintenanceVisit' });
      toast({ title: 'Error', description: 'Failed to schedule visit. Please try again.', variant: 'destructive' });
    }
  },

  updateMaintenanceVisit: async (visitId, visitData) => {
    logger.debug('updateMaintenanceVisit called', { component: 'useMaintenanceStore', action: 'updateMaintenanceVisit', data: { visitId } });
    const visitToUpdate = get().maintenanceVisits.find(v => v.id === visitId);
    if (!visitToUpdate) {
      toast({ title: 'Error', description: 'Visit not found.', variant: 'destructive' });
      return;
    }

    let finalStatus: MaintenanceVisit['status'];

    // Auto-derive problemSolved from resolutionStatus
    const problemSolved = visitData.resolutionStatus === 'solved';

    // Enhanced status logic based on resolution status
    if (visitData.problemOccurred === false || problemSolved) {
      finalStatus = 'Completed';
    } else if (visitData.resolutionStatus === 'waiting_parts') {
      finalStatus = 'Waiting for Parts';
    } else if (visitData.resolutionStatus === 'partial' || visitData.resolutionStatus === 'not_solved') {
      finalStatus = 'Follow-up Required';
    } else {
      finalStatus = 'In Progress';
    }

    const servicesCost = visitData.services?.reduce((acc, service) => acc + (service.cost * service.quantity), 0) || 0;
    const laborCost = visitData.laborCost || servicesCost;

    // Whitelist of actual database columns - matches Supabase maintenance table schema exactly
    const dbColumns = [
      'branchId',
      'companyId',
      'branchName',
      'companyName',
      'date',
      'resolutionDate',
      'scheduledDate',
      'actualArrivalDate',
      'delayDays',
      'delayReason',
      'isSignificantDelay',
      'technicianName',
      'visitType',
      'maintenanceNotes',
      'baristaId',
      'baristaName',
      'baristaRecommendations',
      'problemOccurred',
      'problemReason',
      'resolutionStatus',
      'nonResolutionReason',
      'refusalReason',
      'spareParts',
      'services',
      'overallReport',
      'reportSignedBy',
      'supervisorWitness',
      'status',
      'rootVisitId',
      'totalVisits',
      'totalCost',
      'resolutionTimeDays',
      'averageDelayDays',
      'laborCost',
    ];

    const cleanData: Partial<MaintenanceVisit> = {};

    // Only include fields that exist in the database
    dbColumns.forEach(col => {
      const key = col as keyof MaintenanceVisit;
      if (key in visitData && visitData[key] !== undefined) {
        (cleanData as any)[key] = visitData[key];
      }
    });

    // Override with computed values
    cleanData.status = finalStatus;
    cleanData.laborCost = laborCost;

    // Convert Date objects to ISO strings for Supabase
    if (visitData.actualArrivalDate instanceof Date) {
      cleanData.actualArrivalDate = visitData.actualArrivalDate.toISOString();
    } else if (visitData.actualArrivalDate) {
      cleanData.actualArrivalDate = visitData.actualArrivalDate;
    }

    if (visitData.resolutionDate instanceof Date) {
      cleanData.resolutionDate = visitData.resolutionDate.toISOString();
    } else if (visitData.resolutionDate) {
      cleanData.resolutionDate = visitData.resolutionDate;
    }

    if (visitData.problemOccurred === false) {
      cleanData.problemReason = [];
      cleanData.spareParts = [];
      cleanData.services = [];
    }

    // Optimistic update - update local state immediately for fast UI response
    const previousVisits = get().maintenanceVisits;
    const updatedVisit = { ...visitToUpdate, ...cleanData };
    set({
      maintenanceVisits: previousVisits.map(v =>
        v.id === visitId ? updatedVisit : v
      )
    });

    try {
      logger.debug('Sending update to Supabase', { component: 'useMaintenanceStore', action: 'updateMaintenanceVisit', data: cleanData });
      const { error } = await supabase.from('maintenance').update(cleanData).eq('id', visitId);
      if (error) {
        logger.error(error.message || JSON.stringify(error), { component: 'useMaintenanceStore', action: 'updateMaintenanceVisit', data: { code: error.code, details: error.details, hint: error.hint } });
        throw error;
      }

      // Invalidate cache independently - don't let it revert the UI
      try {
        await universalCache.invalidate(CacheKeyFactory.list('maintenance'));

        drilldownCacheInvalidator.invalidateRelatedPreviews('maintenance', visitId, {
          companyId: visitToUpdate.companyId,
          branchId: visitToUpdate.branchId,
          baristaId: visitToUpdate.baristaId
        });
      } catch (cacheError) {
        logger.error(cacheError, { component: 'useMaintenanceStore', action: 'updateMaintenanceVisit - cache invalidation' });
      }

      const rootVisitId = visitToUpdate.rootVisitId || visitToUpdate.id;

      // Show notification for significant delays
      if (visitData.isSignificantDelay) {
        toast({
          title: "Significant Delay Logged",
          description: `Visit delayed by ${visitData.delayDays} days. Reason: ${visitData.delayReason || 'Not specified'}`,
          variant: 'destructive'
        });
      }

      if (finalStatus === 'Completed' && rootVisitId) {
        const { data: rootVisitSnapshot } = await supabase.from('maintenance').select('*').eq('id', rootVisitId).single();

        if (rootVisitSnapshot) {
          const rootVisit = rootVisitSnapshot as MaintenanceVisit;
          const { data: childVisits } = await supabase.from('maintenance').select('*').eq('rootVisitId', rootVisitId);

          const allCaseVisits = [rootVisit, ...(childVisits || []) as MaintenanceVisit[]];

          const totalVisits = allCaseVisits.length;
          const totalCost = allCaseVisits.reduce((sum, v) => sum + (v.laborCost || 0) + (v.spareParts?.reduce((pSum, p) => pSum + (p.price || 0) * p.quantity, 0) || 0), 0);

          const getValidDate = (d: string | Date | null | undefined): Date | null => {
            if (!d) return null;
            const parsed = typeof d === 'string' ? parseISO(d) : d;
            return isValid(parsed) ? parsed : null;
          }

          const rootDate = getValidDate(rootVisit.date);
          const finalResolutionVisit = allCaseVisits.find(v => v.status === 'Completed' && v.resolutionDate);
          const resolutionDate = finalResolutionVisit ? getValidDate(finalResolutionVisit.resolutionDate) : getValidDate(rootVisit.resolutionDate);
          const resolutionTimeDays = (rootDate && resolutionDate) ? differenceInDays(resolutionDate, rootDate) : 0;

          await supabase.from('maintenance').update({ status: 'Completed', totalVisits, totalCost, resolutionTimeDays }).eq('id', rootVisitId);
        }
      }

      logger.debug('updateMaintenanceVisit completed', { component: 'useMaintenanceStore', action: 'updateMaintenanceVisit', data: { visitId } });

      toast({ title: "Visit Outcome Logged" });
      return get().maintenanceVisits.find(v => v.id === visitId);
    } catch (e) {
      // Rollback on error
      set({ maintenanceVisits: previousVisits });
      logger.error(e, { component: 'useMaintenanceStore', action: 'updateMaintenanceVisit' });
      toast({ title: 'Error', description: 'Failed to update visit. Please try again.', variant: 'destructive' });
    }
  },

  updateMaintenanceVisitStatus: async (visitId, status) => {
    // Optimistic update - update local state immediately
    const previousVisits = get().maintenanceVisits;
    set({
      maintenanceVisits: previousVisits.map(v =>
        v.id === visitId ? { ...v, status } : v
      )
    });

    try {
      // 1. Perform DB update
      const { error } = await supabase.from('maintenance').update({ status }).eq('id', visitId);
      if (error) throw error;

      toast({ title: "Visit Updated", description: `Visit status changed to ${status}.` });

      // 2. Invalidate cache (independently)
      try {
        await universalCache.invalidate(CacheKeyFactory.list('maintenance'));
      } catch (cacheError) {
        logger.error(cacheError, { component: 'useMaintenanceStore', action: 'updateMaintenanceVisitStatus - cache invalidation' });
      }
    } catch (e) {
      // Rollback ONLY if DB update fails
      set({ maintenanceVisits: previousVisits });
      logger.error(e, { component: 'useMaintenanceStore', action: 'updateMaintenanceVisitStatus' });
      toast({ title: 'Error', description: 'Failed to update status. Please try again.', variant: 'destructive' });
    }
  },

  deleteMaintenanceVisit: async (visitId: string) => {
    const visitToDelete = get().maintenanceVisits.find(v => v.id === visitId);
    if (!visitToDelete) return;

    await supabase.from('maintenance').delete().eq('id', visitId);
    if (!visitToDelete.rootVisitId) {
      await supabase.from('maintenance').delete().eq('rootVisitId', visitId);
    }
    await universalCache.invalidate(CacheKeyFactory.list('maintenance'));

    try {
      drilldownCacheInvalidator.invalidateRelatedPreviews('maintenance', visitId, {
        companyId: visitToDelete.companyId,
        branchId: visitToDelete.branchId,
        baristaId: visitToDelete.baristaId
      });
    } catch (e) {
      logger.error(e, { component: 'useMaintenanceStore', action: 'deleteMaintenanceVisit - invalidate cache' });
    }

    await get().fetchInitialData();
  },

  addMaintenanceEmployee: async (employee) => {
    await supabase.from('maintenanceEmployees').insert(employee);
    await universalCache.invalidate(CacheKeyFactory.list('maintenanceEmployees'));
    await get().fetchInitialData();
    toast({ title: 'Crew Member Added' });
  },

  updateMaintenanceEmployee: async (employeeId, employeeData) => {
    await supabase.from('maintenanceEmployees').update(employeeData).eq('id', employeeId);
    await universalCache.invalidate(CacheKeyFactory.list('maintenanceEmployees'));
    await get().fetchInitialData();
    toast({ title: 'Crew Member Updated' });
  },

  deleteMaintenanceEmployee: async (employeeId) => {
    await supabase.from('maintenanceEmployees').delete().eq('id', employeeId);
    await universalCache.invalidate(CacheKeyFactory.list('maintenanceEmployees'));
    await get().fetchInitialData();
    toast({ title: 'Crew Member Removed', variant: 'destructive' });
  },

  addCancellationReason: async (reason) => {
    const newReason = { reason, createdAt: new Date().toISOString() };
    const { data: insertedReason, error } = await supabase
      .from('cancellationReasons')
      .insert(newReason)
      .select()
      .single();

    if (error) throw error;

    set(produce((state: MaintenanceState) => {
      state.cancellationReasons.push(insertedReason as CancellationReason);
    }));
    await universalCache.invalidate(CacheKeyFactory.list('cancellationReasons'));
  },

  searchMaintenanceVisits: async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      await get().fetchInitialData();
      return;
    }
    try {
      const { data: allVisits } = await supabase
        .from('maintenance')
        .select('*')
        .or(`branchName.ilike.%${searchTerm}%,maintenanceNotes.ilike.%${searchTerm}%,technicianName.ilike.%${searchTerm}%,companyName.ilike.%${searchTerm}%`);

      set({ maintenanceVisits: (allVisits || []) as MaintenanceVisit[] });
    } catch (e) {
      logger.error(e, { component: 'useMaintenanceStore', action: 'searchMaintenanceVisits' });
    }
  },

  // ===================================
  // Catalog Actions (Server Integrated)
  // ===================================

  addService: async (category, name, cost) => {
    const result = await addServiceToCatalog({ category, name, defaultCost: cost });
    if (result.success && result.data) {
      set(produce((state: MaintenanceState) => {
        state.servicesCatalog.push(result.data!);
      }));
    } else {
      toast({ title: "Error", description: "Failed to add service", variant: "destructive" });
    }
  },

  updateService: async (id, data) => {
    const result = await updateServiceInCatalog(id, data);
    if (result.success && result.data) {
      set(produce((state: MaintenanceState) => {
        const index = state.servicesCatalog.findIndex(s => s.id === id);
        if (index !== -1) {
          state.servicesCatalog[index] = result.data!;
        }
      }));
    } else {
      toast({ title: "Error", description: "Failed to update service", variant: "destructive" });
    }
  },

  deleteService: async (id) => {
    const result = await removeServiceFromCatalog(id);
    if (result.success) {
      set(produce((state: MaintenanceState) => {
        state.servicesCatalog = state.servicesCatalog.filter(s => s.id !== id);
      }));
    } else {
      toast({ title: "Error", description: "Failed to delete service", variant: "destructive" });
    }
  },

  addPart: async (category, name, price) => {
    const result = await addPartToCatalog({ category, name, defaultPrice: price });
    if (result.success && result.data) {
      set(produce((state: MaintenanceState) => {
        state.partsCatalog.push(result.data!);
      }));
    } else {
      toast({ title: "Error", description: "Failed to add part", variant: "destructive" });
    }
  },

  updatePart: async (id, data) => {
    const result = await updatePartInCatalog(id, data);
    if (result.success && result.data) {
      set(produce((state: MaintenanceState) => {
        const index = state.partsCatalog.findIndex(p => p.id === id);
        if (index !== -1) {
          state.partsCatalog[index] = result.data!;
        }
      }));
    } else {
      toast({ title: "Error", description: "Failed to update part", variant: "destructive" });
    }
  },

  deletePart: async (id) => {
    const result = await removePartFromCatalog(id);
    if (result.success) {
      set(produce((state: MaintenanceState) => {
        state.partsCatalog = state.partsCatalog.filter(p => p.id !== id);
      }));
    } else {
      toast({ title: "Error", description: "Failed to delete part", variant: "destructive" });
    }
  },

  addProblem: async (category, problem) => {
    const result = await addProblemToCatalog({ category, problem, severity: "medium" });
    if (result.success && result.data) {
      set(produce((state: MaintenanceState) => {
        state.problemsCatalog.push(result.data!);
      }));
    } else {
      toast({ title: "Error", description: "Failed to add problem", variant: "destructive" });
    }
  },

  updateProblem: async (id, data) => {
    const result = await updateProblemInCatalog(id, data);
    if (result.success && result.data) {
      set(produce((state: MaintenanceState) => {
        const index = state.problemsCatalog.findIndex(p => p.id === id);
        if (index !== -1) {
          state.problemsCatalog[index] = result.data!;
        }
      }));
    } else {
      toast({ title: "Error", description: "Failed to update problem", variant: "destructive" });
    }
  },

  deleteProblem: async (id) => {
    const result = await removeProblemFromCatalog(id);
    if (result.success) {
      set(produce((state: MaintenanceState) => {
        state.problemsCatalog = state.problemsCatalog.filter(p => p.id !== id);
      }));
    } else {
      toast({ title: "Error", description: "Failed to delete problem", variant: "destructive" });
    }
  },
}));
