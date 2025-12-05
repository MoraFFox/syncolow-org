/** @format */

"use client";
import {
  useState,
  useMemo,
  useEffect,
  Suspense,
  useRef,
} from "react";

import { useDebouncedCallback } from "use-debounce";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  Trash2,
  Upload,
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrderStore } from "@/store/use-order-store";
import { Product, Category, Manufacturer } from "@/lib/types";

import { ProductForm } from "./_components/product-form";
import Loading from "../loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ProductImporterDialog } from "./_components/product-importer-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useManufacturerStore } from "@/store/use-manufacturer-store";
import { ProductsOverview } from "./_components/products-overview";
import { CategoryCard } from "./_components/category-card";
import { ManufacturerCard } from "./_components/manufacturer-card";
import { ProductGrid } from "./_components/product-grid";
import { ArrowLeft } from "lucide-react";
import { DrillTarget } from '@/components/drilldown/drill-target';

type AddProductData = Omit<Product, "id" | "imageUrl"> & { image?: File };



function ProductsPageContent() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    loading: productsLoading,
    loadRemainingProducts,
    categories,
  } = useOrderStore();
  const { manufacturers, loading: manufacturersLoading } =
    useManufacturerStore();


  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);



  // Infinite scroll for loading remaining products
  const handleLoadMore = async () => {
    if (isLoadingMore || hasLoadedAll || isSearching) return;

    setIsLoadingMore(true);
    const initialCount = products.length;
    await loadRemainingProducts();
    const newCount = useOrderStore.getState().products.length;

    if (newCount === initialCount) {
      setHasLoadedAll(true);
    }
    setIsLoadingMore(false);
  };

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isLoadingMore &&
          !hasLoadedAll &&
          !isSearching
        ) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isLoadingMore, hasLoadedAll, isSearching, products.length]);

  const loading = productsLoading || manufacturersLoading;

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      setIsSearching(false);
      setIsLoadingMore(false);
      await useOrderStore.getState().fetchInitialData();
      return;
    }
    setIsLoadingMore(true);
    setIsSearching(true);
    await useOrderStore.getState().searchProducts(term);
    setIsLoadingMore(false);
  }, 500);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      setIsLoadingMore(true);
    }
    debouncedSearch(term);
  };

  const filteredProducts = products;

  const productsByCategory = useMemo(() => {
    return filteredProducts.reduce((acc, product) => {
      const category = product.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [filteredProducts]);

  const productsByManufacturer = useMemo(() => {
    const manufacturerMap = new Map(manufacturers.map((m) => [m.id, m.name]));
    return filteredProducts.reduce((acc, product) => {
      const manufacturerName = product.manufacturerId
        ? manufacturerMap.get(product.manufacturerId) || "Unassigned"
        : "Unassigned";
      if (!acc[manufacturerName]) {
        acc[manufacturerName] = [];
      }
      acc[manufacturerName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [filteredProducts, manufacturers]);



  const handleOpenForm = (product: Product | null) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      setIsAlertOpen(false);
      toast({ title: "Product Deleted" });
    }
  };

  const handleDeleteAllConfirm = async () => {
    try {
      await deleteAllProducts();
    } catch (err) {
      toast({
        title: "Error Deleting Products",
        description: "Failed to delete all products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAllAlertOpen(false);
    }
  };

  const onSubmit = async (data: AddProductData) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
      toast({ title: "Product Updated" });
    } else {
      await addProduct(data);
    }
    setIsFormOpen(false);
    setEditingProduct(null);
  };



  if (loading) return <Loading />;

  return (
    <>


      <AlertDialog
        open={isDeleteAllAlertOpen}
        onOpenChange={setIsDeleteAllAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Products?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible and will permanently delete all
              products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllConfirm}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='flex flex-col gap-8'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold'>Products</h1>
            <p className='text-muted-foreground'>
              Manage your product inventory.
            </p>
          </div>
          <div className='flex items-center gap-2 w-full sm:w-auto'>
            <Button
              onClick={() => handleOpenForm(null)}
              className='w-full sm:w-auto'
            >
              <PlusCircle className='h-4 w-4 mr-2' />
              Add Product
            </Button>
            <Button
              variant='outline'
              onClick={() => setIsImporterOpen(true)}
              className='w-full sm:w-auto'
            >
              <Upload className='h-4 w-4 mr-2' />
              Import
            </Button>
            <Button variant='outline' asChild className='w-full sm:w-auto'>
              <Link href='/products/manufacturers'>Manage Manufacturers</Link>
            </Button>
            <Button variant='outline' asChild className='w-full sm:w-auto'>
              <Link href='/products/categories'>
                <Tags className='h-4 w-4 mr-2' />
                Manage Categories
              </Link>
            </Button>
            <Button
              variant='destructive'
              onClick={() => setIsDeleteAllAlertOpen(true)}
              className='w-full sm:w-auto'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete All
            </Button>
          </div>
        </div>
        <ProductForm
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={onSubmit}
          product={editingProduct}
        />
        <ProductImporterDialog
          isOpen={isImporterOpen}
          onOpenChange={setIsImporterOpen}
        />

        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search products...'
            className='pl-8 pr-10'
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {isLoadingMore && isSearching && (
            <div className='absolute right-2.5 top-2.5'>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='category'>By Category</TabsTrigger>
            <TabsTrigger value='manufacturer'>By Manufacturer</TabsTrigger>
          </TabsList>
          <TabsContent value='overview' className='mt-4'>
            <div className="space-y-8">
              <div className="h-[600px] overflow-y-auto pr-2 border rounded-md p-4">
                <ProductGrid 
                  products={products} 
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                  manufacturers={manufacturers}
                />
              </div>
              
              <div className="pt-4 border-t">
                <h2 className="text-2xl font-bold mb-4">Analytics Overview</h2>
                <ProductsOverview
                  products={products}
                  categories={categories}
                  manufacturers={manufacturers}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value='category' className='mt-4'>
            {selectedCategory ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setSelectedCategory(null)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Categories
                  </Button>
                  <h2 className="text-xl font-bold">{selectedCategory.name}</h2>
                </div>
                <ProductGrid 
                  products={productsByCategory[selectedCategory.name] || []} 
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => {
                   const categoryObj = categories.find(c => c.name === categoryName) || { id: 'uncategorized', name: categoryName };
                   return (
                     <DrillTarget 
                       key={categoryName}
                       kind="category" 
                       payload={{ 
                         id: categoryObj.id, 
                         name: categoryObj.name,
                         productCount: categoryProducts.length 
                       }}
                     >
                       <CategoryCard 
                         category={categoryObj} 
                         products={categoryProducts} 
                         onClick={() => {
                           console.log("Category clicked:", categoryObj);
                           setSelectedCategory(categoryObj);
                         }}
                       />
                     </DrillTarget>
                   );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value='manufacturer' className='mt-4'>
             {selectedManufacturer ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setSelectedManufacturer(null)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Manufacturers
                  </Button>
                  <h2 className="text-xl font-bold">{selectedManufacturer.name}</h2>
                </div>
                <ProductGrid 
                  products={productsByManufacturer[selectedManufacturer.name] || []} 
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(productsByManufacturer).map(([manufacturerName, manufacturerProducts]) => {
                   const manufacturerObj = manufacturers.find(m => m.name === manufacturerName) || { id: 'unknown', name: manufacturerName, icon: undefined };
                   
                   return (
                     <DrillTarget 
                       key={manufacturerName}
                       kind="manufacturer" 
                       payload={{ 
                         id: manufacturerObj.id, 
                         name: manufacturerObj.name,
                         icon: manufacturerObj.icon,
                         productCount: manufacturerProducts.length 
                       }}
                     >
                       <ManufacturerCard 
                         manufacturer={manufacturerObj} 
                         products={manufacturerProducts} 
                         onClick={() => {
                           console.log("Manufacturer clicked:", manufacturerObj);
                           setSelectedManufacturer(manufacturerObj);
                         }}
                       />
                     </DrillTarget>
                   );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {!isSearching && (
          <div ref={loadMoreRef} className='flex justify-center py-8'>
            {isLoadingMore && (
              <p className='text-muted-foreground'>Loading more products...</p>
            )}
            {!isLoadingMore && !hasLoadedAll && products.length >= 50 && (
              <Button variant='outline' onClick={handleLoadMore}>
                Load More Products
              </Button>
            )}
            {hasLoadedAll && (
              <p className='text-sm text-muted-foreground'>
                All products loaded ({products.length} total)
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductsPageContent />
    </Suspense>
  );
}
