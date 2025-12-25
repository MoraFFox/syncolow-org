
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

type SortConfig = {
  key: keyof Company | 'paymentStatus' | 'last12MonthsRevenue';
  direction: 'asc' | 'desc';
};

export default function CompaniesPage() {
  const { companies, loading, deleteCompany, updateCompanyAndBranches, addCompanyAndRelatedData, mergeCompanies, fetchRevenueStats } = useCompanyStore();
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'last12MonthsRevenue', direction: 'desc' });

  const [visibleCount, setVisibleCount] = useState(paginationLimit);

  useEffect(() => {
    // Chain fetches to ensure companies are loaded before fetching stats
    fetchInitialData().then(() => {
      fetchRevenueStats();
    });
  }, [fetchInitialData, fetchRevenueStats]);

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
    const searchLower = searchTerm.toLowerCase();

    const matchesFilter = (item: ListItem) => {
      if (!searchLower) return true;
      const nameMatch = item.name.toLowerCase().includes(searchLower);
      const industryMatch = !item.isBranch && item.industry?.toLowerCase().includes(searchLower);
      // For branches, we also check parent name if we have access to it, but here item is standalone or has parentId
      // In hierarchical view, we handle parent matching separately.
      return nameMatch || industryMatch;
    };

    const sortFunction = (a: ListItem, b: ListItem) => {
      const { key, direction } = sortConfig;
      let aValue: any = a[key as keyof ListItem];
      let bValue: any = b[key as keyof ListItem];

      if (key === 'currentPaymentScore') {
        aValue = a.currentPaymentScore ?? 0;
        bValue = b.currentPaymentScore ?? 0;
      } else if (key === 'last12MonthsRevenue') {
        aValue = a.last12MonthsRevenue ?? 0;
        bValue = b.last12MonthsRevenue ?? 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    };

    if (typeFilter === 'Branch') {
      return companies
        .filter(c => c.isBranch)
        .map(b => ({ ...b, depth: 0 } as ListItem))
        .filter(matchesFilter)
        .sort(sortFunction);
    }

    if (typeFilter === 'Company') {
      return companies
        .filter(c => !c.isBranch)
        .map(p => ({ ...p, depth: 0 } as ListItem))
        .filter(matchesFilter)
        .sort(sortFunction);
    }

    // Type Filter: All - Maintain Hierarchy
    let result: ListItem[] = [];

    // Sort parents first
    const sortedParents = [...hierarchicalList].sort(sortFunction);

    sortedParents.forEach(parent => {
      const parentMatches = matchesFilter(parent);

      // Filter and sort children
      const matchingChildren = parent.children
        ? parent.children.filter(matchesFilter).sort(sortFunction)
        : [];

      // If search term exists, we show parent if it matches OR if it has matching children
      // If no search term, we show everything
      if (!searchLower || parentMatches || matchingChildren.length > 0) {
        result.push(parent);
        result.push(...matchingChildren);
      }
    });

    return result;
  }, [hierarchicalList, companies, searchTerm, typeFilter, sortConfig]);

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

  const handleFormSubmit = async (companyData: Omit<Company, 'id' | 'isBranch' | 'parentCompanyId' | 'createdAt'>, branchesData?: (Omit<Partial<Branch>, 'baristas'> & { baristas?: Partial<Barista>[] })[]) => {
    if (selectedCompany) {
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

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = visibleItems.map(item => item.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    // TODO: Implement actual bulk delete API if available, or loop through deletes
    // For now, we'll loop through deletes or assume a bulk delete endpoint exists
    // Since we only have deleteCompany, we'll use that for now.
    // Ideally, we should add a bulk delete method to the store.

    // Optimistic UI update or sequential deletes
    for (const id of selectedIds) {
      await deleteCompany(id);
    }
    setSelectedIds(new Set());
    setIsBulkDeleteAlertOpen(false);
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key: key as any,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
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

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected companies and branches. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction>
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
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          sortConfig={sortConfig}
          onSort={handleSort}
          typeFilter={typeFilter}
        />

        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
            <span className="font-medium">{selectedIds.size} selected</span>
            <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}>
              Delete Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Cancel
            </Button>
          </div>
        )}

        {visibleCount < filteredAndSortedItems.length && (
          <div className="mt-4 flex justify-center">
            <Button onClick={handleLoadMore}>Load More</Button>
          </div>
        )}
      </div>
    </>
  );
}
