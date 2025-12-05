
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { MaintenanceVisit, MaintenanceEmployee, CancellationReason } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { parseISO, isValid, differenceInDays } from 'date-fns';
import { produce } from 'immer';
import { universalCache } from '@/lib/cache/universal-cache';
import { CacheKeyFactory } from '@/lib/cache/key-factory';
import { drilldownCacheInvalidator } from '@/lib/cache/drilldown-cache-invalidator';

const INITIAL_SERVICES_CATALOG: { [category: string]: { [service: string]: number } } = {
  "دورات تنظيف (Cleaning Cycles)": {
    "دورة غسيل الجروبات": 500,
    "دورة غسيل خزان": 1500,
    "دورة غسيل سوفتنر بالملح": 500,
    "دورة غسيل سوفتنر بالمادة": 1500,
    "تنظيف شاورات": 400,
  },
  "معايرة وضبط (Calibration & Adjustment)": {
    "ضبط الطحنة": 200,
    "تظبيط measure": 200,
  },
  "قطع غيار (Part Replacements)": {
    "تغيير جوانات": 400,
    "تغيير طرمبة": 500,
    "تغيير heater": 1500,
    "تغيير شاورات": 400,
    "تغيير ماسورة": 1000,
    "تغيير حنفية مياة": 500,
    "تغيير حساس": 500,
    "تغيير زرار ماكينة": 300,
    "تغيير زرار مطحنة": 200,
    "تغيير عداد": 400,
    "تغيير محبس": 450,
    "تغيير هاند ستيم": 350,
  },
};

const SPARE_PARTS_CATALOG = {
    "Grinders": {
        "Grinder Burrs": 150,
        "Hopper": 75,
        "Adjustment Knob": 30,
    },
    "Espresso Machine": {
        "Grouphead Gasket": 25,
        "Portafilter Basket": 35,
        "Steam Wand Tip": 45,
        "Pump": 250,
        "Heating Element": 180,
        "Solenoid Valve": 90,
    },
    "Water System": {
        "Water Filter Cartridge": 60,
        "Pressure Regulator": 120,
        "Flow Meter": 80,
    },
    "Electronics": {
        "Main Control Board": 400,
        "Display Screen": 150,
        "Pressure Stat": 70,
    }
};

const PROBLEMS_CATALOG: { [category: string]: string[] } = {
    "Machine Performance": [
        "Machine not turning on",
        "Slow brewing",
        "Inconsistent temperature",
        "Low pressure",
        "Excessive noise"
    ],
    "Water System": [
        "Water leakage",
        "No water flow",
        "Poor water quality",
        "Filter clogged"
    ],
    "Coffee Quality": [
        "Bitter taste",
        "Weak coffee",
        "Inconsistent grind",
        "Over-extraction",
        "Under-extraction"
    ],
    "Electrical Issues": [
        "Display not working",
        "Buttons not responding",
        "Power fluctuations",
        "Circuit breaker tripping"
    ]
};

interface MaintenanceState {
  maintenanceVisits: MaintenanceVisit[];
  maintenanceEmployees: MaintenanceEmployee[];
  cancellationReasons: CancellationReason[];
  servicesCatalog: { [category: string]: { [service: string]: number } };
  partsCatalog: { [category: string]: { [part: string]: number } };
  problemsCatalog: { [category: string]: string[] };
  loading: boolean;
  fetchInitialData: () => Promise<void>;
  addMaintenanceVisit: (visit: Omit<MaintenanceVisit, 'id'>) => Promise<void>;
  updateMaintenanceVisit: (visitId: string, visitData: Partial<MaintenanceVisit>) => Promise<MaintenanceVisit | undefined>;
  updateMaintenanceVisitStatus: (visitId: string, status: MaintenanceVisit['status']) => Promise<void>;
  deleteMaintenanceVisit: (visitId: string) => Promise<void>;
  addMaintenanceEmployee: (employee: Omit<MaintenanceEmployee, 'id'>) => Promise<void>;
  updateMaintenanceEmployee: (employeeId: string, employeeData: Partial<Omit<MaintenanceEmployee, 'id'>>) => Promise<void>;
  addCancellationReason: (reason: string) => Promise<void>;
  searchMaintenanceVisits: (searchTerm: string) => Promise<void>;
  addProblem: (category: string, problem: string) => void;
  updateProblem: (oldCategory: string, oldProblem: string, newCategory: string, newProblem: string) => void;
  deleteProblem: (category: string, problem: string) => void;
  addService: (category: string, name: string, cost: number) => void;
  updateService: (oldCategory: string, oldName: string, newCategory: string, newName: string, cost: number) => void;
  deleteService: (category: string, name: string) => void;
  addPart: (category: string, name: string, price: number) => void;
  updatePart: (oldCategory: string, oldName: string, newCategory: string, newName: string, price: number) => void;
  deletePart: (category: string, name: string) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  maintenanceVisits: [],
  maintenanceEmployees: [],
  cancellationReasons: [],
  servicesCatalog: INITIAL_SERVICES_CATALOG,
  partsCatalog: SPARE_PARTS_CATALOG as { [category: string]: { [part: string]: number } },
  problemsCatalog: PROBLEMS_CATALOG,
  loading: true,

  fetchInitialData: async () => {
    if (!get().loading) set({ loading: true });
    try {
        const maintenanceVisits = await universalCache.get(
            CacheKeyFactory.list('maintenance'),
            async () => {
                const { data } = await supabase.from('maintenance').select('*');
                return data || [];
            }
        );
        const maintenanceEmployees = await universalCache.get(
            CacheKeyFactory.list('maintenanceEmployees'),
            async () => {
                const { data } = await supabase.from('maintenanceEmployees').select('*');
                return data || [];
            }
        );
        const cancellationReasons = await universalCache.get(
            CacheKeyFactory.list('cancellationReasons'),
            async () => {
                const { data } = await supabase.from('cancellationReasons').select('*');
                return data || [];
            }
        );

        set({ 
            maintenanceVisits: maintenanceVisits as MaintenanceVisit[], 
            maintenanceEmployees: maintenanceEmployees as MaintenanceEmployee[], 
            cancellationReasons: cancellationReasons as CancellationReason[], 
            loading: false 
        });
    } catch (e) {
        console.error("Error fetching maintenance data:", e);
        set({ loading: false });
    }
  },

  addMaintenanceVisit: async (visit) => {
    const visitWithStatus = { ...visit, status: 'Scheduled' as const };
    await supabase.from('maintenance').insert(visitWithStatus);
    await universalCache.invalidate(CacheKeyFactory.list('maintenance'));
    get().fetchInitialData();
    toast({ title: "Visit Scheduled"});
  },
  
  updateMaintenanceVisit: async (visitId, visitData) => {
    console.log('useMaintenanceStore - updateMaintenanceVisit called with visitId:', visitId);
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

    const cleanData: Partial<MaintenanceVisit> = {
      ...visitData,
      status: finalStatus,
      laborCost: laborCost,
      actualArrivalDate: visitData.actualArrivalDate || null,
      resolutionDate: visitData.resolutionDate || null,
    };
    
    // Remove undefined values
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key as keyof MaintenanceVisit] === undefined) {
        delete cleanData[key as keyof MaintenanceVisit];
      }
    });
    
    if(visitData.problemOccurred === false) {
        cleanData.problemReason = [];
        cleanData.spareParts = [];
        cleanData.services = [];
    }

    await supabase.from('maintenance').update(cleanData).eq('id', visitId);
    await universalCache.invalidate(CacheKeyFactory.list('maintenance'));

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

    await get().fetchInitialData();
    console.log('useMaintenanceStore - updateMaintenanceVisit completed');
    
    // Invalidate drilldown preview
    try {
      drilldownCacheInvalidator.invalidateRelatedPreviews('maintenance', visitId, {
        companyId: visitToUpdate.companyId,
        branchId: visitToUpdate.branchId,
        baristaId: visitToUpdate.baristaId
      });
    } catch (e) {
      console.error('Failed to invalidate drilldown cache:', e);
    }

    toast({ title: "Visit Outcome Logged" });
    return get().maintenanceVisits.find(v => v.id === visitId);
  },

  updateMaintenanceVisitStatus: async (visitId, status) => {
    await supabase.from('maintenance').update({ status }).eq('id', visitId);
    await universalCache.invalidate(CacheKeyFactory.list('maintenance'));
    await get().fetchInitialData();
    toast({ title: "Visit Updated", description: `Visit status changed to ${status}.` });
  },

  deleteMaintenanceVisit: async (visitId: string) => {
    const visitToDelete = get().maintenanceVisits.find(v => v.id === visitId);

    if (!visitToDelete) return;
    
    await supabase.from('maintenance').delete().eq('id', visitId);

    if (!visitToDelete.rootVisitId) {
        // Delete children
        await supabase.from('maintenance').delete().eq('rootVisitId', visitId);
    }
    await universalCache.invalidate(CacheKeyFactory.list('maintenance'));
    
    // Invalidate drilldown preview
    try {
      drilldownCacheInvalidator.invalidateRelatedPreviews('maintenance', visitId, {
        companyId: visitToDelete.companyId,
        branchId: visitToDelete.branchId,
        baristaId: visitToDelete.baristaId
      });
    } catch (e) {
      console.error('Failed to invalidate drilldown cache:', e);
    }

    await get().fetchInitialData();
  },

  addMaintenanceEmployee: async (employee) => {
    await supabase.from('maintenanceEmployees').insert(employee);
    await universalCache.invalidate(CacheKeyFactory.list('maintenanceEmployees'));
    await get().fetchInitialData();
    toast({ title: 'Crew Member Added'});
  },
  
  updateMaintenanceEmployee: async (employeeId, employeeData) => {
    await supabase.from('maintenanceEmployees').update(employeeData).eq('id', employeeId);
    await universalCache.invalidate(CacheKeyFactory.list('maintenanceEmployees'));
    await get().fetchInitialData();
    toast({ title: 'Crew Member Updated' });
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

      // Supabase doesn't support OR across multiple columns easily with ilike in one go without RPC or complex syntax.
      // But we can fetch all and filter client side as the original code did, OR use the `or` filter string.
      // The original code fetched ALL and filtered client side.
      // Let's stick to fetching all and filtering client side for now to match behavior and avoid complex query construction,
      // unless the dataset is huge.
      
      // Actually, let's try to use Supabase `or` filter if possible.
      // .or(`branchName.ilike.%${searchTerm}%,maintenanceNotes.ilike.%${searchTerm}%...`)
      
      const { data: allVisits } = await supabase
        .from('maintenance')
        .select('*')
        .or(`branchName.ilike.%${searchTerm}%,maintenanceNotes.ilike.%${searchTerm}%,technicianName.ilike.%${searchTerm}%,companyName.ilike.%${searchTerm}%`);

      set({ maintenanceVisits: (allVisits || []) as MaintenanceVisit[] });
    } catch (e) {
      console.error("Error searching maintenance visits:", e);
    }
  },

  addProblem: (category, problem) => {
    set(produce((state: MaintenanceState) => {
      if (!state.problemsCatalog[category]) {
        state.problemsCatalog[category] = [];
      }
      if (!state.problemsCatalog[category].includes(problem)) {
        state.problemsCatalog[category].push(problem);
      }
    }));
    // Force re-render by updating the state reference
    const currentState = get();
    set({ problemsCatalog: { ...currentState.problemsCatalog } });
  },

  updateProblem: (oldCategory, oldProblem, newCategory, newProblem) => {
    set(produce((state: MaintenanceState) => {
      // Remove from old location
      if (state.problemsCatalog[oldCategory]) {
        state.problemsCatalog[oldCategory] = state.problemsCatalog[oldCategory].filter(p => p !== oldProblem);
        if (state.problemsCatalog[oldCategory].length === 0) {
          delete state.problemsCatalog[oldCategory];
        }
      }
      // Add to new location
      if (!state.problemsCatalog[newCategory]) {
        state.problemsCatalog[newCategory] = [];
      }
      if (!state.problemsCatalog[newCategory].includes(newProblem)) {
        state.problemsCatalog[newCategory].push(newProblem);
      }
    }));
    // Force re-render
    const currentState = get();
    set({ problemsCatalog: { ...currentState.problemsCatalog } });
  },

  deleteProblem: (category, problem) => {
    set(produce((state: MaintenanceState) => {
      if (state.problemsCatalog[category]) {
        state.problemsCatalog[category] = state.problemsCatalog[category].filter(p => p !== problem);
        if (state.problemsCatalog[category].length === 0) {
          delete state.problemsCatalog[category];
        }
      }
    }));
    // Force re-render
    const currentState = get();
    set({ problemsCatalog: { ...currentState.problemsCatalog } });
  },

  addService: (category, name, cost) => {
    set(produce((state: MaintenanceState) => {
      if (!state.servicesCatalog[category]) {
        state.servicesCatalog[category] = {};
      }
      state.servicesCatalog[category][name] = cost;
    }));
    const currentState = get();
    set({ servicesCatalog: { ...currentState.servicesCatalog } });
  },

  updateService: (oldCategory, oldName, newCategory, newName, cost) => {
    set(produce((state: MaintenanceState) => {
      // Remove from old location
      if (state.servicesCatalog[oldCategory]) {
        delete state.servicesCatalog[oldCategory][oldName];
        if (Object.keys(state.servicesCatalog[oldCategory]).length === 0) {
          delete state.servicesCatalog[oldCategory];
        }
      }
      // Add to new location
      if (!state.servicesCatalog[newCategory]) {
        state.servicesCatalog[newCategory] = {};
      }
      state.servicesCatalog[newCategory][newName] = cost;
    }));
    const currentState = get();
    set({ servicesCatalog: { ...currentState.servicesCatalog } });
  },

  deleteService: (category, name) => {
    set(produce((state: MaintenanceState) => {
      if (state.servicesCatalog[category]) {
        delete state.servicesCatalog[category][name];
        if (Object.keys(state.servicesCatalog[category]).length === 0) {
          delete state.servicesCatalog[category];
        }
      }
    }));
    const currentState = get();
    set({ servicesCatalog: { ...currentState.servicesCatalog } });
  },

  addPart: (category, name, price) => {
    set(produce((state: MaintenanceState) => {
      if (!state.partsCatalog[category]) {
        state.partsCatalog[category] = {};
      }
      state.partsCatalog[category][name] = price;
    }));
    const currentState = get();
    set({ partsCatalog: { ...currentState.partsCatalog } });
  },

  updatePart: (oldCategory, oldName, newCategory, newName, price) => {
    set(produce((state: MaintenanceState) => {
      // Remove from old location
      if (state.partsCatalog[oldCategory]) {
        delete state.partsCatalog[oldCategory][oldName];
        if (Object.keys(state.partsCatalog[oldCategory]).length === 0) {
          delete state.partsCatalog[oldCategory];
        }
      }
      // Add to new location
      if (!state.partsCatalog[newCategory]) {
        state.partsCatalog[newCategory] = {};
      }
      state.partsCatalog[newCategory][newName] = price;
    }));
    const currentState = get();
    set({ partsCatalog: { ...currentState.partsCatalog } });
  },

  deletePart: (category, name) => {
    set(produce((state: MaintenanceState) => {
      if (state.partsCatalog[category]) {
        delete state.partsCatalog[category][name];
        if (Object.keys(state.partsCatalog[category]).length === 0) {
          delete state.partsCatalog[category];
        }
      }
    }));
    const currentState = get();
    set({ partsCatalog: { ...currentState.partsCatalog } });
  },
}));
