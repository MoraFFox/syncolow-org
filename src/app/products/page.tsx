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
import { useProductsStore, useCategoriesStore } from "@/store";
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
// import { CategoryCard } from "./_components/category-card"; // Deprecated
import { CategoryStrip } from "./_components/category-strip";
import { ManufacturerCard } from "./_components/manufacturer-card";
import { ProductGrid } from "./_components/product-grid";
import { ArrowLeft } from "lucide-react";
import { DrillTarget } from '@/components/drilldown/drill-target';
import { ErrorBoundary } from '@/components/error-boundary';

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
    loadAllProducts,
  } = useProductsStore();
  const { categories } = useCategoriesStore();
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

  // Load all products on initial mount
  useEffect(() => {
    const loadInitial = async () => {
      // Only load if we don't have all products yet (initial state has 50 or less)
      if (products.length <= 50 && !hasLoadedAll) {
        await loadAllProducts();
        setHasLoadedAll(true);
      }
    };
    loadInitial();
  }, []);



  // Infinite scroll for loading remaining products
  const handleLoadMore = async () => {
    if (isLoadingMore || hasLoadedAll || isSearching) return;

    setIsLoadingMore(true);
    const initialCount = products.length;
    await loadRemainingProducts();
    const newCount = useProductsStore.getState().products.length;

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
      // searchProducts now properly reloads all products when term is empty
      await useProductsStore.getState().searchProducts('');
      setHasLoadedAll(true);
      return;
    }
    setIsLoadingMore(true);
    setIsSearching(true);
    await useProductsStore.getState().searchProducts(term);
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

      <div className='flex flex-col gap-10 pb-20'>
        {/* Header Section */}
        <div className='flex flex-col gap-8'>
          <div className='flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6'>
            <div className="space-y-1">
              <h1 className='text-5xl font-black tracking-tight text-foreground'>INVENTORY</h1>
              <p className='text-muted-foreground font-mono text-sm uppercase tracking-wider'>
                Logistics & Asset Management Terminal
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-3 w-full lg:w-auto'>
              <Button
                onClick={() => handleOpenForm(null)}
                className='h-11 px-6 font-semibold shadow-lg shadow-primary/20'
              >
                <PlusCircle className='h-4 w-4 mr-2' />
                Add Item
              </Button>
              <Button
                variant='outline'
                onClick={() => setIsImporterOpen(true)}
                className='h-11 border-dashed'
              >
                <Upload className='h-4 w-4 mr-2' />
                Import
              </Button>
              <div className="h-8 w-px bg-border hidden sm:block mx-1" />
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant='secondary' asChild className='h-11 flex-1 sm:w-auto'>
                  <Link href='/products/manufacturers'>Brands</Link>
                </Button>
                <Button variant='secondary' asChild className='h-11 flex-1 sm:w-auto'>
                  <Link href='/products/categories'>
                    <Tags className='h-4 w-4 mr-2' />
                    Categories
                  </Link>
                </Button>
              </div>

              <Button
                variant='destructive'
                size="icon"
                onClick={() => setIsDeleteAllAlertOpen(true)}
                className='h-11 w-11 ml-auto sm:ml-0'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className='relative group'>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className='h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors' />
            </div>
            <Input
              type='search'
              placeholder='SEARCH_INDEX...'
              className='h-14 pl-12 pr-12 text-lg font-mono bg-muted/30 border-2 border-transparent focus-visible:border-primary/50 focus-visible:bg-background transition-all rounded-xl shadow-inner'
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {isLoadingMore && isSearching && (
              <div className='absolute right-4 top-4'>
                <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
              </div>
            )}
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


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/40 rounded-lg border border-border/50 overflow-x-auto flex-nowrap">
            <TabsTrigger value='overview' className="h-10 px-6 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Grid View</TabsTrigger>
            <TabsTrigger value='category' className="h-10 px-6 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">By Category</TabsTrigger>
            <TabsTrigger value='manufacturer' className="h-10 px-6 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">By Brand</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='animate-in fade-in-50 slide-in-from-bottom-2 duration-300'>
            <div className="space-y-12">
              <div className="h-[70vh] overflow-y-auto pr-2  p-1">
                <ErrorBoundary>
                  <ProductGrid
                    products={products}
                    onEdit={handleOpenForm}
                    onDelete={handleDeleteClick}
                    manufacturers={manufacturers}
                  />
                </ErrorBoundary>
              </div>

              {/* Analytics Overview Section - Kept but styled */}
              <div className="pt-8 border-t border-dashed">
                <h2 className="text-xl font-bold mb-6 font-mono uppercase tracking-wider text-muted-foreground">System Metrics</h2>
                <ErrorBoundary>
                  <ProductsOverview
                    products={products}
                    categories={categories}
                    manufacturers={manufacturers}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='category' className='mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300'>
            {selectedCategory ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} className="font-mono text-muted-foreground">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    BACK_TO_INDEX
                  </Button>
                  <h2 className="text-3xl font-bold tracking-tight">{selectedCategory.name}</h2>
                </div>
                <ProductGrid
                  products={productsByCategory[selectedCategory.name] || []}
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                />
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                {Object.entries(productsByCategory).map(([categoryName, categoryProducts], idx) => {
                  const categoryObj = categories.find(c => c.name === categoryName) || { id: 'uncategorized', name: categoryName };
                  return (
                    <CategoryStrip
                      key={categoryName}
                      index={idx}
                      category={categoryObj}
                      products={categoryProducts}
                      onClick={() => {
                        setSelectedCategory(categoryObj);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value='manufacturer' className='mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300'>
            {selectedManufacturer ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedManufacturer(null)} className="font-mono text-muted-foreground">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    BACK_TO_INDEX
                  </Button>
                  <h2 className="text-3xl font-bold tracking-tight">{selectedManufacturer.name}</h2>
                </div>
                <ProductGrid
                  products={productsByManufacturer[selectedManufacturer.name] || []}
                  onEdit={handleOpenForm}
                  onDelete={handleDeleteClick}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Object.entries(productsByManufacturer).map(([manufacturerName, manufacturerProducts]) => {
                  const manufacturerObj = manufacturers.find(m => m.name === manufacturerName) || { id: 'unknown', name: manufacturerName, icon: undefined };

                  return (
                    <ManufacturerCard
                      key={manufacturerName}
                      manufacturer={manufacturerObj}
                      products={manufacturerProducts}
                      onClick={() => {
                        setSelectedManufacturer(manufacturerObj);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {!isSearching && (
          <div ref={loadMoreRef} className='flex justify-center py-12'>
            {isLoadingMore && (
              <div className='flex flex-col items-center gap-2 text-muted-foreground font-mono text-xs'>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                LOADING_DATA...
              </div>
            )}
            {!isLoadingMore && !hasLoadedAll && products.length >= 50 && (
              <Button variant='outline' onClick={handleLoadMore} className="font-mono text-xs tracking-wider">
                LOAD MORE
              </Button>
            )}
            {hasLoadedAll && (
              <p className='text-xs font-mono text-muted-foreground opacity-50 uppercase tracking-widest'>
                -- End of Index ({products.length} records) --
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
