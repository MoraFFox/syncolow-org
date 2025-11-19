
"use client";
import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useCompanyStore } from "@/store/use-company-store";
import { Company, Branch, Barista, Product } from "@/lib/types";
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSettingsStore } from "@/store/use-settings-store";
import { CompanyImporterDialog } from "./_components/company-importer-dialog";
import { CompanyForm } from "./_components/company-form";
import { BranchForm } from "./_components/branch-form";
import { ClientActions } from "./_components/client-actions";
import { ClientList } from "./_components/client-list";
import { CompanyWizardForm } from "./_components/company-wizard-form";
import { useOrderStore } from "@/store/use-order-store";


type ListItem = Company & { depth: number; children?: ListItem[]; isBranch?: boolean };

export default function CompaniesPage() {
  const { companies, loading, deleteCompany, updateCompanyAndBranches, addCompanyAndRelatedData, mergeCompanies } = useCompanyStore();
  const { fetchInitialData } = useOrderStore();
  const { paginationLimit } = useSettingsStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState('All');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const [visibleCount, setVisibleCount] = useState(paginationLimit);
  
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setVisibleCount(paginationLimit);
  }, [paginationLimit]);

  const hierarchicalList = useMemo((): ListItem[] => {
    const parents = companies.filter(c => !c.isBranch);
    const branches = companies.filter(c => c.isBranch);

    const buildHierarchy = (parent: Company): ListItem => {
      const children = branches
        .filter(b => b.parentCompanyId === parent.id)
        .map(b => ({ ...b, depth: 1, children: [] }));
      return { ...parent, depth: 0, children };
    };

    return parents.map(buildHierarchy);
  }, [companies]);

  const filteredAndSortedItems = useMemo(() => {
    let flatList: ListItem[] = [];
    hierarchicalList.forEach(parent => {
        flatList.push(parent);
        if (parent.children) {
            flatList.push(...parent.children);
        }
    });

    return flatList.filter(item => {
      const isBranch = item.isBranch;
      const isParent = !item.isBranch;

      if (typeFilter === 'Company' && isBranch) return false;
      if (typeFilter === 'Branch' && isParent) return false;
      
      const searchLower = searchTerm.toLowerCase();
      if (!searchLower) return true;

      const nameMatch = item.name.toLowerCase().includes(searchLower);
      const industryMatch = isParent && item.industry?.toLowerCase().includes(searchLower);
      const parent = isBranch ? companies.find(c => c.id === item.parentCompanyId) : null;
      const parentNameMatch = isBranch && parent?.name.toLowerCase().includes(searchLower);

      return nameMatch || industryMatch || parentNameMatch;
    });
  }, [hierarchicalList, companies, searchTerm, typeFilter]);

  const visibleItems = useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + paginationLimit);
  };

  const openEditForm = (company: Company) => {
    console.log('Opening edit form for:', company.name, 'isBranch:', company.isBranch);
    if (company.isBranch === true) {
      console.log('Opening branch form');
      setSelectedBranch(company);
      setIsBranchFormOpen(true);
    } else {
      console.log('Opening company form');
      setSelectedCompany(company);
      setIsFormOpen(true);
    }
  }
  
  const handleFormSubmit = async (companyData: Omit<Company, 'id' | 'isBranch' | 'parentCompanyId' | 'createdAt'>, branchesData?: (Omit<Partial<Branch>, 'baristas' > & { baristas?: Partial<Barista>[] })[]) => {
     if(selectedCompany) {
        await updateCompanyAndBranches(selectedCompany.id, companyData as Partial<Company>, branchesData as Partial<Branch>[]);
     }
  }

  const handleBranchFormSubmit = async (branchData: Partial<Company>) => {
    if (selectedBranch && selectedBranch.parentCompanyId) {
      await updateCompanyAndBranches(selectedBranch.parentCompanyId, {}, [branchData as any]);
      setIsBranchFormOpen(false);
    }
  }

   const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (companyToDelete) {
      await deleteCompany(companyToDelete.id);
    }
    setIsAlertOpen(false);
    setCompanyToDelete(null);
  };

  return (
    <>
      <CompanyForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        company={selectedCompany}
      />
      <BranchForm
        isOpen={isBranchFormOpen}
        onOpenChange={setIsBranchFormOpen}
        onSubmit={handleBranchFormSubmit}
        branch={selectedBranch}
      />
      <CompanyWizardForm isOpen={isWizardOpen} onOpenChange={setIsWizardOpen} />
      <CompanyImporterDialog isOpen={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete "{companyToDelete?.name}"{companyToDelete && !companyToDelete.isBranch ? " and all of its branches" : ""}. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-8">
        <ClientActions 
            searchTerm={searchTerm}
            typeFilter={typeFilter}
            onSearchChange={setSearchTerm}
            onTypeFilterChange={setTypeFilter}
            onAddCompany={() => setIsWizardOpen(true)}
            onImport={() => setIsImportDialogOpen(true)}
        />
        
        <ClientList 
            items={visibleItems}
            allCompanies={companies}
            onEdit={openEditForm}
            onDelete={openDeleteDialog}
        />

        {visibleCount < filteredAndSortedItems.length && (
          <div className="mt-4 flex justify-center">
              <Button onClick={handleLoadMore}>Load More</Button>
          </div>
        )}
      </div>
    </>
  );
}
