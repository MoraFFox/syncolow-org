
import { create } from 'zustand';
import { produce } from 'immer';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, writeBatch, query, where, getDoc, deleteDoc } from 'firebase/firestore';
import type { Company, Branch, Barista, MaintenanceVisit, Order, Feedback, DeliveryArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useOrderStore } from './use-order-store';

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
  deleteCompany: (companyId: string) => Promise<void>;
  mergeCompanies: (parentCompanyIdOrName: string, childCompanyIds: string[]) => Promise<void>;
  fetchBranchesForCompany: (companyId: string) => Promise<Company[]>;
  addBarista: (companyId: string, branchId: string, baristaData: Omit<Barista, 'id' | 'branchId'>) => Promise<void>;
  updateBarista: (baristaId: string, baristaData: Partial<Omit<Barista, 'id' | 'branchId'>>) => Promise<void>;
  addFeedback: (feedbackData: Omit<Feedback, 'id'>) => Promise<void>;
  // Area management
  addArea: (area: Omit<DeliveryArea, 'id'>) => Promise<void>;
  updateArea: (areaId: string, areaData: Partial<Omit<DeliveryArea, 'id'>>) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  baristas: [],
  feedback: [],
  areas: [],
  loading: true,

  addCompanyAndRelatedData: async (companyData, branchesData) => {
    const batch = writeBatch(db);
    const companyRef = doc(collection(db, 'companies'));

    const newCompanyData: any = {
        name: companyData.name || 'Unnamed Company',
        industry: companyData.industry || 'Unknown',
        isBranch: false,
        parentCompanyId: null,
        location: companyData.location ?? null,
        region: companyData.region || 'A',
        createdAt: new Date().toISOString(),
        contacts: companyData.contacts || [],
        machineOwned: companyData.machineOwned || false,
        paymentMethod: companyData.paymentMethod || 'transfer',
        paymentDueType: companyData.paymentDueType || 'days_after_order',
        paymentDueDays: companyData.paymentDueDays || 30,
    };
    
    if (companyData.email) newCompanyData.email = companyData.email;
    if (companyData.taxNumber) newCompanyData.taxNumber = companyData.taxNumber;
    if (companyData.area) newCompanyData.area = companyData.area;
    if (companyData.paymentDueDate !== undefined && companyData.paymentDueDate !== null && !isNaN(companyData.paymentDueDate)) {
        newCompanyData.paymentDueDate = companyData.paymentDueDate;
    }
    if (companyData.bulkPaymentSchedule) newCompanyData.bulkPaymentSchedule = companyData.bulkPaymentSchedule;
    batch.set(companyRef, newCompanyData);

    const fullCompany: Company = { id: companyRef.id, ...newCompanyData };

    if (branchesData) {
        for (const branch of branchesData) {
            const { baristas, maintenanceHistory, ...branchDetails } = branch;
            const branchRef = doc(collection(db, 'companies'));
            const newBranchData: any = { 
                name: branchDetails.name ?? 'Unnamed Branch',
                isBranch: true, 
                parentCompanyId: companyRef.id, 
                industry: newCompanyData.industry,
                location: branchDetails.location || null,
                region: branchDetails.region || 'A',
                createdAt: new Date().toISOString(),
                machineOwned: branchDetails.machineOwned || false,
                contacts: branchDetails.contacts || [],
            };
            
            if (branchDetails.email) newBranchData.email = branchDetails.email;
            if (branchDetails.area) newBranchData.area = branchDetails.area;
            batch.set(branchRef, newBranchData);

            if (baristas) {
                for (const barista of baristas) {
                    const baristaRef = doc(collection(db, 'baristas'));
                    batch.set(baristaRef, { ...barista, branchId: branchRef.id });
                }
            }
             if (maintenanceHistory) {
                for (const visit of maintenanceHistory) {
                    const visitRef = doc(collection(db, 'maintenance'));
                    batch.set(visitRef, { ...visit, branchId: branchRef.id, companyId: companyRef.id });
                }
            }
        }
    }
    await batch.commit();
    toast({ title: "Company Created", description: "Successfully created company and all related data in Firestore." });
    
    // Update local state instead of full refetch
    set(produce((state: CompanyState) => {
      state.companies.push(fullCompany);
    }));
    
    // Refresh to get actual IDs
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Company[];
    set({ companies });
    
    return fullCompany;
  },

  updateCompanyAndBranches: async (companyId, companyData, branchesData) => {
    const batch = writeBatch(db);
    const companyRef = doc(db, "companies", companyId);
    
    const cleanCompanyData = { ...companyData };
    if (cleanCompanyData.email === '') {
        (cleanCompanyData as any).email = null;
    }

    batch.update(companyRef, cleanCompanyData as { [x: string]: any; });

    // Get existing branches
    const existingBranches = get().companies.filter(c => c.parentCompanyId === companyId);
    const submittedBranchIds = branchesData?.filter(b => b.id).map(b => b.id) || [];
    
    // Delete branches that were removed
    const branchesToDelete = existingBranches.filter(b => !submittedBranchIds.includes(b.id));
    for (const branch of branchesToDelete) {
        const branchRef = doc(db, 'companies', branch.id);
        batch.delete(branchRef);
    }

    if (branchesData) {
        for (const branch of branchesData) {
            const cleanBranchData = { ...branch };
            if (cleanBranchData.email === '') {
                (cleanBranchData as any).email = null;
            }

            if (branch.id) {
                const branchRef = doc(db, 'companies', branch.id);
                batch.update(branchRef, cleanBranchData as { [x: string]: any; });
            } else {
                const branchRef = doc(collection(db, 'companies'));
                const newBranchData = { ...cleanBranchData, isBranch: true, parentCompanyId: companyId, createdAt: new Date().toISOString() };
                batch.set(branchRef, newBranchData);
            }
        }
    }

    await batch.commit();
    
    // Update local state
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Company[];
    set({ companies });
    
    toast({ title: 'Company Updated', description: 'Company details have been updated in Firestore.' });
  },

  deleteCompany: async (companyId: string) => {
    const batch = writeBatch(db);
    const companyRef = doc(db, 'companies', companyId);
    batch.delete(companyRef);
    
    const branches = get().companies.filter(c => c.parentCompanyId === companyId);
    branches.forEach(branch => {
        const branchRef = doc(db, 'companies', branch.id);
        batch.delete(branchRef);
    });

    await batch.commit();
    
    // Update local state
    set(produce((state: CompanyState) => {
      state.companies = state.companies.filter((c: Company) => c.id !== companyId && c.parentCompanyId !== companyId);
    }));
    
    toast({ title: "Company Deleted", description: `Company and its branches have been removed.`});
  },

  mergeCompanies: async (parentCompanyIdOrName, childCompanyIds) => {
    let parentId = parentCompanyIdOrName;
    
    if (parentCompanyIdOrName.startsWith('new:')) {
        const newParentName = parentCompanyIdOrName.split(':')[1];
        const newParentCompany = await get().addCompanyAndRelatedData({
            name: newParentName,
            industry: 'Holding',
            region: 'A',
            createdAt: new Date().toISOString(),
            machineOwned: false
        });
        parentId = newParentCompany.id;
    }

    const batch = writeBatch(db);
    for (const childId of childCompanyIds) {
      const childRef = doc(db, 'companies', childId);
      batch.update(childRef, { isBranch: true, parentCompanyId: parentId });
    }
    
    await batch.commit();
    
    // Update local state
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Company[];
    set({ companies });
    
    toast({ title: "Merge Complete", description: "Companies have been successfully merged." });
  },

  fetchBranchesForCompany: async (companyId: string) => {
    return get().companies.filter(c => c.isBranch && c.parentCompanyId === companyId);
  },

  addBarista: async (companyId, branchId, baristaData) => {
    const newBarista = { ...baristaData, branchId };
    const docRef = await addDoc(collection(db, 'baristas'), newBarista);
    set(produce((state: CompanyState) => {
      state.baristas.push({ id: docRef.id, ...newBarista });
    }));
    toast({ title: 'Barista Added'});
  },
  
  updateBarista: async (baristaId, baristaData) => {
    await updateDoc(doc(db, 'baristas', baristaId), baristaData);
    set(produce((state: CompanyState) => {
      const index = state.baristas.findIndex((b: Barista) => b.id === baristaId);
      if (index !== -1) {
        state.baristas[index] = { ...state.baristas[index], ...baristaData };
      }
    }));
    toast({ title: 'Barista Updated' });
  },

  addFeedback: async (feedbackData) => {
      const docRef = await addDoc(collection(db, 'feedback'), feedbackData);
      set(produce((state: CompanyState) => {
        state.feedback.push({ id: docRef.id, ...feedbackData });
      }));
  },

  // Area Management
  addArea: async (area) => {
    const docRef = await addDoc(collection(db, 'areas'), area);
    set(produce((state: CompanyState) => {
      state.areas.push({ id: docRef.id, ...area });
    }));
    toast({ title: 'Area Added' });
  },
  updateArea: async (areaId, areaData) => {
    await updateDoc(doc(db, 'areas', areaId), areaData);
    set(produce((state: CompanyState) => {
      const index = state.areas.findIndex((a: DeliveryArea) => a.id === areaId);
      if (index !== -1) {
        state.areas[index] = { ...state.areas[index], ...areaData };
      }
    }));
    toast({ title: 'Area Updated' });
  },
  deleteArea: async (areaId: string) => {
    await deleteDoc(doc(db, 'areas', areaId));
    set(produce((state: CompanyState) => {
      state.areas = state.areas.filter((a: DeliveryArea) => a.id !== areaId);
    }));
    toast({ title: 'Area Deleted', variant: 'destructive' });
  },
}));

