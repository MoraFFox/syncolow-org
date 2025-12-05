"use client";

import { useMemo, useState, ChangeEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrderStore } from '@/store/use-order-store';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle, GitBranch, Clock } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Separator } from '@/components/ui/separator';
import { ProductSalesAnalytics } from './_components/product-sales-analytics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { PriceAuditDialog } from '@/components/price-audit-dialog';
import { DrillTarget } from '@/components/drilldown/drill-target';

const productSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  description: z.string().min(1, "Description is required."),
  price: z.preprocess(
      (a) => parseFloat(z.string().parse(a)),
      z.number().positive("Price must be a positive number.")
  ),
  stock: z.preprocess(
      (a) => parseInt(z.string().parse(a), 10),
      z.number().int().nonnegative("Stock cannot be negative.")
  ),
  variantName: z.string().optional(),
  sku: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
    switch (status) {
        case 'saving':
            return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></div>;
        case 'saved':
            return <div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-4 w-4" /><span>All changes saved</span></div>;
        case 'error':
            return <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /><span>Error saving changes</span></div>;
        default:
            return <div className="flex items-center gap-2 text-muted-foreground"><span>Changes will be saved automatically</span></div>;
    }
}


export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const { products, loading, updateProduct } = useOrderStore();

  const product = useMemo(() => {
    if (!id) return null;
    return products.find(p => p.id === id);
  }, [id, products]);
  
  const productVariants = useMemo(() => {
      if (!product || product.isVariant) return [];
      return products.filter(p => p.parentProductId === product.id);
  }, [product, products]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPriceAudit, setShowPriceAudit] = useState(false);

  const { register, reset, watch, formState: { errors, isDirty, dirtyFields } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });
  
  const handleAutoSave = useDebouncedCallback(async (data: ProductFormData) => {
    if (!product || (!isDirty && !imageFile)) return;
    setSaveStatus("saving");

    try {
        let imageUrl = product.imageUrl;
        if (imageFile) {
            imageUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
            setImageFile(null);
        }

        const updatedData: Partial<Product> = {};
        
        if (dirtyFields.name) updatedData.name = data.name;
        if (dirtyFields.description) updatedData.description = data.description;
        if (dirtyFields.variantName) updatedData.variantName = data.variantName || undefined;
        if (dirtyFields.sku) updatedData.sku = data.sku || undefined;
        if (dirtyFields.price) updatedData.price = Number(data.price);
        if (dirtyFields.stock) updatedData.stock = Number(data.stock);
        if (imageUrl) updatedData.imageUrl = imageUrl;

        await updateProduct(product.id, updatedData);
        
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        reset(data); // Resets the form's dirty state after saving

    } catch (error) {
        setSaveStatus("error");
        toast({
            title: "Update Failed",
            description: (error as Error).message || "There was a problem saving the product.",
            variant: "destructive"
        });
        setTimeout(() => setSaveStatus("idle"), 5000);
    }
  }, 1000);


  // Effect to initialize form and image preview
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        price: Number(product.price) || 0,
        stock: product.stock,
        variantName: product.variantName || undefined,
        sku: product.sku || undefined,
      });
      setImagePreview(product.imageUrl);
    }
  }, [product, reset]);

  // Effect to trigger autosave on data change
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
        if(isDirty && type === 'change') {
            handleAutoSave(value as ProductFormData);
        }
    });
    return () => subscription.unsubscribe();
  }, [watch, handleAutoSave, isDirty]);


  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Manually trigger autosave for image change
      if(product) {
        handleAutoSave(watch() as ProductFormData);
      }
    }
  };


  if (loading) return <Loading />;

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested product could not be found.</p>
        <Button onClick={() => router.push('/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-8 w-8" type="button" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{product.name} {product.variantName && `- ${product.variantName}`}</h1>
                        <p className="text-muted-foreground">Manage product details, stock, and pricing.</p>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <SaveStatusIndicator status={saveStatus} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                <Card>
                        <CardHeader>
                        <CardTitle>Product Image</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                        <Image
                            src={imagePreview || "https://placehold.co/200x200.png"}
                            alt="Product Image"
                            width={200}
                            height={200}
                            className="rounded-lg object-cover aspect-square w-auto"
                        />
                        <div className="w-full">
                            <Label htmlFor="picture" className="sr-only">Product Image</Label>
                            <Input id="picture" type="file" onChange={handleImageChange} accept="image/*" />
                        </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                <Card>
                        <CardHeader>
                            <CardTitle>Product Details</CardTitle>
                            <CardDescription>
                                Changes are saved automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Product Name</Label>
                                <Input id="name" {...register("name")} />
                                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                            </div>
                            {product.isVariant && (
                                <div className="grid gap-2">
                                    <Label htmlFor="variantName">Variant Name</Label>
                                    <Input id="variantName" {...register("variantName")} />
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" {...register("description")} />
                                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="price">Price ($)</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPriceAudit(true)}
                                        >
                                            <Clock className="h-4 w-4 mr-1" />
                                            Price History
                                        </Button>
                                    </div>
                                    <Input id="price" type="number" step="0.01" {...register("price")} />
                                    {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="stock">Stock</Label>
                                    <Input id="stock" type="number" {...register("stock")} />
                                    {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
                                </div>
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input id="sku" {...register("sku")} />
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </form>
        
        {!product.isVariant && productVariants.length > 0 && (
            <>
                <Separator />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" /> Variants</CardTitle>
                        <CardDescription>Other variants of this product.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variant Name</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productVariants.map((variant) => (
                                <TableRow key={variant.id}>
                                    <TableCell className="font-medium">
                                        <DrillTarget kind="product" payload={{ id: variant.id, name: variant.variantName || variant.name }} asChild>
                                            <span className="cursor-pointer hover:underline">{variant.variantName}</span>
                                        </DrillTarget>
                                    </TableCell>
                                    <TableCell>{variant.sku}</TableCell>
                                    <TableCell className="text-right">${variant.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{variant.stock}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/products/${variant.id}`}>View</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </>
        )}
        
        <Separator />

        <div>
            <h2 className="text-2xl font-bold mb-4">Product Analytics</h2>
            <ProductSalesAnalytics product={product} />
        </div>
        
        <PriceAuditDialog
            productId={product.id}
            productName={product.name}
            isOpen={showPriceAudit}
            onOpenChange={setShowPriceAudit}
        />
    </div>
  );
}
