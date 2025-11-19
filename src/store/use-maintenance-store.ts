
import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, writeBatch, query, where, getDoc, deleteDoc } from 'firebase/firestore';
import type { MaintenanceVisit, MaintenanceEmployee, CancellationReason } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { parseISO, isValid, differenceInDays } from 'date-fns';
import { produce } from 'immer';

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
        const [maintenanceSnapshot, employeesSnapshot, cancellationReasonsSnapshot] = await Promise.all([
            getDocs(collection(db, 'maintenance')),
            getDocs(collection(db, 'maintenanceEmployees')),
            getDocs(collection(db, 'cancellationReasons')),
        ]);
        const maintenanceVisits = maintenanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MaintenanceVisit[];
        const maintenanceEmployees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MaintenanceEmployee[];
        const cancellationReasons = cancellationReasonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CancellationReason[];

        set({ maintenanceVisits, maintenanceEmployees, cancellationReasons, loading: false });
    } catch (e) {
        console.error("Error fetching maintenance data:", e);
        set({ loading: false });
    }
  },

  addMaintenanceVisit: async (visit) => {
    const visitWithStatus = { ...visit, status: 'Scheduled' as const };
    await addDoc(collection(db, 'maintenance'), visitWithStatus);
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

    const batch = writeBatch(db);
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
    
    // Remove undefined values to prevent Firestore errors
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

    const visitRef = doc(db, 'maintenance', visitId);
    batch.update(visitRef, cleanData as { [x: string]: any; });

    const rootVisitId = visitToUpdate.rootVisitId || visitToUpdate.id;
    
    await batch.commit();

    // Show notification for significant delays
    if (visitData.isSignificantDelay) {
        toast({ 
            title: "Significant Delay Logged", 
            description: `Visit delayed by ${visitData.delayDays} days. Reason: ${visitData.delayReason || 'Not specified'}`,
            variant: 'destructive'
        });
    }

    if (finalStatus === 'Completed' && rootVisitId) {
        const rootVisitSnapshot = await getDoc(doc(db, 'maintenance', rootVisitId));
        const rootVisit = {id: rootVisitSnapshot.id, ...rootVisitSnapshot.data()} as MaintenanceVisit;
        const caseQuery = query(collection(db, "maintenance"), where("rootVisitId", "==", rootVisitId));
        const caseSnapshot = await getDocs(caseQuery);
        const childVisits = caseSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceVisit));
        const allCaseVisits = [rootVisit, ...childVisits];
        
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
        
        await updateDoc(doc(db, 'maintenance', rootVisitId), { status: 'Completed', totalVisits, totalCost, resolutionTimeDays });
    }

    await get().fetchInitialData();
    console.log('useMaintenanceStore - updateMaintenanceVisit completed');

    toast({ title: "Visit Outcome Logged" });
    return get().maintenanceVisits.find(v => v.id === visitId);
  },

  updateMaintenanceVisitStatus: async (visitId, status) => {
    await updateDoc(doc(db, 'maintenance', visitId), { status });
    await get().fetchInitialData();
    toast({ title: "Visit Updated", description: `Visit status changed to ${status}.` });
  },

  deleteMaintenanceVisit: async (visitId: string) => {
    const batch = writeBatch(db);
    const visitToDelete = get().maintenanceVisits.find(v => v.id === visitId);

    if (!visitToDelete) return;
    
    batch.delete(doc(db, 'maintenance', visitId));

    if (!visitToDelete.rootVisitId) {
        const childVisits = get().maintenanceVisits.filter(v => v.rootVisitId === visitId);
        childVisits.forEach(child => batch.delete(doc(db, 'maintenance', child.id)));
    }

    await batch.commit();
    await get().fetchInitialData();
  },

  addMaintenanceEmployee: async (employee) => {
    await addDoc(collection(db, 'maintenanceEmployees'), employee);
    await get().fetchInitialData();
    toast({ title: 'Crew Member Added'});
  },
  
  updateMaintenanceEmployee: async (employeeId, employeeData) => {
    await updateDoc(doc(db, 'maintenanceEmployees', employeeId), employeeData);
    await get().fetchInitialData();
    toast({ title: 'Crew Member Updated' });
  },

  addCancellationReason: async (reason) => {
    const newReason = { reason, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'cancellationReasons'), newReason);
    set(produce((state: MaintenanceState) => {
        state.cancellationReasons.push({ id: docRef.id, ...newReason });
    }));
  },

  searchMaintenanceVisits: async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      await get().fetchInitialData();
      return;
    }
    
    try {
      const allSnapshot = await getDocs(collection(db, "maintenance"));
      const allVisits = allSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MaintenanceVisit[];
      
      const searchLower = searchTerm.toLowerCase();
      const filtered = allVisits.filter(visit =>
        (visit.branchName && visit.branchName.toLowerCase().includes(searchLower)) ||
        (visit.maintenanceNotes && visit.maintenanceNotes.toLowerCase().includes(searchLower)) ||
        (visit.technicianName && visit.technicianName.toLowerCase().includes(searchLower)) ||
        (visit.companyName && visit.companyName.toLowerCase().includes(searchLower))
      );
      
      set({ maintenanceVisits: filtered });
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

