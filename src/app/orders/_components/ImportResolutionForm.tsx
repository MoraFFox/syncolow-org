
"use client";

import { Suspense } from "react";
import { CompanyForm } from "@/app/clients/_components/company-form";
import { ProductForm } from "@/app/products/_components/product-form";
import { ImportRowError, Company, Product } from "@/lib/types";
import { useCompanyStore } from "@/store/use-company-store";
import { useOrderStore } from "@/store/use-order-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

interface ImportResolutionFormProps {
  errorToFix: ImportRowError;
  onResolved: (error: ImportRowError, createdEntity: Company | Product) => void;
  onCancel: () => void;
}

export function ImportResolutionForm({
  errorToFix,
  onResolved,
  onCancel
}: ImportResolutionFormProps) {
  const { addCompanyAndRelatedData } = useCompanyStore();
  const { addProduct } = useOrderStore();

  if (!errorToFix.resolution) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No resolution available for this error.
        <div className="mt-4">
            <Button variant="outline" onClick={onCancel}>Back to Error List</Button>
        </div>
      </div>
    );
  }

  const handleCompanySubmit = async (companyData: any, branchesData?: any) => {
    try {
      const newCompany = await addCompanyAndRelatedData(companyData, branchesData);
      if (newCompany) {
        toast({
          title: "Company Added",
          description: `"${companyData.name}" has been saved.`,
        });
        onResolved(errorToFix, newCompany as Company);
      } else {
        throw new Error("Company creation returned undefined.");
      }
    } catch(e) {
       toast({
        title: "Error adding company",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleProductSubmit = async (productData: any) => {
    try {
      const newProduct = await addProduct(productData);
      if (newProduct) {
        toast({
          title: "Product Added",
          description: `"${productData.name}" has been saved.`,
        });
        onResolved(errorToFix, newProduct);
      } else {
         throw new Error("Product creation returned undefined.");
      }
    } catch(e) {
      toast({
        title: "Error adding product",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const header = (
     <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className="text-lg font-semibold">
                Create New {errorToFix.resolution.entity === 'company' ? 'Company/Branch' : 'Product'}
            </h3>
            <p className="text-sm text-muted-foreground">
                The {errorToFix.resolution.entity} "{errorToFix.resolution.suggestedData.name}" was not found. Please confirm the details below to create it.
            </p>
        </div>
         <Button variant="ghost" onClick={onCancel} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back
        </Button>
    </div>
  )

  switch (errorToFix.resolution.entity) {
    case "company":
      return (
        <div className="p-1">
          {header}
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <CompanyForm
              company={errorToFix.resolution.suggestedData}
              onSubmit={handleCompanySubmit}
              isOpen={true} 
              onOpenChange={() => {}}
            />
          </Suspense>
        </div>
      );
    case "product":
      return (
        <div className="p-1">
          {header}
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <ProductForm
              product={errorToFix.resolution.suggestedData}
              onSubmit={handleProductSubmit}
              isOpen={true} 
              onOpenChange={() => {}}
            />
          </Suspense>
        </div>
      );
    default:
      return (
        <div className="p-4 text-center">
          Could not determine the correct form for "{errorToFix.resolution.entity}".
           <div className="mt-4">
            <Button variant="outline" onClick={onCancel}>Back to Error List</Button>
        </div>
        </div>
      );
  }
}
