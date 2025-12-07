"use client";

import { CompanyWizardForm } from "@/app/clients/_components/company-wizard-form";
import OrderForm from "@/app/orders/_components/order-form";
import { ProductForm } from "@/app/products/_components/product-form";
import { ScheduleVisitForm } from "@/app/maintenance/_components/schedule-visit-form";
import type { Product, MaintenanceVisit } from "@/lib/types";

type AddProductData = Omit<Product, "id" | "imageUrl"> & { image?: File };

interface AppShellDialogsProps {
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
  isOrderFormOpen: boolean;
  setIsOrderFormOpen: (open: boolean) => void;
  isProductFormOpen: boolean;
  setIsProductFormOpen: (open: boolean) => void;
  isMaintenanceFormOpen: boolean;
  setIsMaintenanceFormOpen: (open: boolean) => void;
  handleAddProduct: (data: AddProductData) => Promise<void>;
  handleAddMaintenance: (data: Omit<MaintenanceVisit, "id">) => Promise<void>;
}

export function AppShellDialogs({
  isWizardOpen,
  setIsWizardOpen,
  isOrderFormOpen,
  setIsOrderFormOpen,
  isProductFormOpen,
  setIsProductFormOpen,
  isMaintenanceFormOpen,
  setIsMaintenanceFormOpen,
  handleAddProduct,
  handleAddMaintenance,
}: AppShellDialogsProps) {
  return (
    <>
      {isWizardOpen && (
        <CompanyWizardForm
          isOpen={isWizardOpen}
          onOpenChange={setIsWizardOpen}
        />
      )}
      {isOrderFormOpen && (
        <OrderForm isOpen={isOrderFormOpen} onOpenChange={setIsOrderFormOpen} />
      )}
      {isProductFormOpen && (
        <ProductForm
          isOpen={isProductFormOpen}
          onOpenChange={setIsProductFormOpen}
          onSubmit={handleAddProduct}
        />
      )}
      {isMaintenanceFormOpen && (
        <ScheduleVisitForm
          isOpen={isMaintenanceFormOpen}
          onOpenChange={setIsMaintenanceFormOpen}
          onFormSubmit={handleAddMaintenance}
        />
      )}
    </>
  );
}
