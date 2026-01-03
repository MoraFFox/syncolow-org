"use client";

import { useMemo, useState, ChangeEvent, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store/use-products-store';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Loader2,
    CheckCircle2,
    AlertCircle,
    GitBranch,
    History,
    UploadCloud,
    Box,
    DollarSign,
    Barcode,
    Image as ImageIcon
} from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { ProductAnalyticsDashboard } from '@/components/analytics/product-analytics-dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { PriceAuditDialog } from '@/components/price-audit-dialog';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
    return (
        <AnimatePresence mode="wait">
            {status === 'saving' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="saving"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium border border-blue-500/20"
                >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving changes...</span>
                </motion.div>
            )}
            {status === 'saved' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="saved"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium border border-emerald-500/20"
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Saved</span>
                </motion.div>
            )}
            {status === 'error' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="error"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20"
                >
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Error saving</span>
                </motion.div>
            )}
            {status === 'idle' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="idle"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium border border-border"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
                    </span>
                    <span>Auto-save ready</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


export default function ProductDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const { loading } = useOrderStore();
    const { products, updateProduct, getProduct } = useProductsStore();

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
    const [hasFetched, setHasFetched] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch product if missing
    useEffect(() => {
        if (id && !product && !hasFetched) {
            getProduct(id).finally(() => setHasFetched(true));
        }
    }, [id, product, hasFetched, getProduct]);

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

            if (Object.keys(updatedData).length === 0 && !imageUrl) {
                setSaveStatus("idle");
                return;
            }

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
        const subscription = watch((value, { type }) => {
            if (isDirty && type === 'change') {
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
            if (product) {
                handleAutoSave(watch() as ProductFormData);
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Wait for initial fetch attempt before showing 404
    if ((loading || (!product && !hasFetched))) return <Loading />;

    if (!product && hasFetched) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="bg-muted p-6 rounded-full">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Product Not Found</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">The product you are looking for does not exist or has been removed.</p>
                <Button onClick={() => router.push('/products')} variant="default" size="lg">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Catalog
                </Button>
            </div>
        );
    }

    if (!product) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 rounded-lg border-b">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted" type="button" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                            {product.name}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Box className="h-3 w-3" /> {product.isVariant ? "Variant" : "Master Product"}</span>
                            {product.variantName && (
                                <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span>{product.variantName}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <SaveStatusIndicator status={saveStatus} />
                </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Visuals & Quick Status */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                        <Card className="overflow-hidden border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-0">
                                <div className="group relative aspect-square w-full bg-gradient-to-b from-muted/50 to-muted/20 flex items-center justify-center overflow-hidden">
                                    {imagePreview ? (
                                        <Image
                                            src={imagePreview}
                                            alt={product.name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <ImageIcon className="h-20 w-20 text-muted-foreground/20" />
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="font-medium"
                                            onClick={triggerFileInput}
                                        >
                                            <UploadCloud className="mr-2 h-4 w-4" />
                                            Change Image
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    ref={fileInputRef}
                                    id="picture"
                                    type="file"
                                    className="hidden"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                />
                            </CardContent>
                            <CardFooter className="flex justify-between p-4 border-t bg-muted/20">
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">SKU</div>
                                <div className="font-mono text-sm">{product.sku || 'N/A'}</div>
                            </CardFooter>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-0 shadow-md bg-card/60">
                                <CardContent className="p-6">
                                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" /> Price
                                    </div>
                                    <div className="text-2xl font-bold tracking-tight">${product.price.toFixed(2)}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-md bg-card/60">
                                <CardContent className="p-6">
                                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                        <Box className="h-4 w-4" /> Stock
                                    </div>
                                    <div className={cn("text-2xl font-bold tracking-tight", product.stock < 10 ? "text-amber-500" : "")}>
                                        {product.stock}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Editor forms */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* General Information */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle>General Information</CardTitle>
                                <CardDescription>Basic details about the product.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Product Name</Label>
                                    <Input id="name" {...register("name")} className="h-11" />
                                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                                </div>

                                {product.isVariant && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="variantName" className="flex items-center gap-2">
                                            Variant Name
                                            <Badge variant="outline" className="text-[10px] h-5">Optional</Badge>
                                        </Label>
                                        <Input id="variantName" {...register("variantName")} className="h-11" placeholder="e.g. XL, Red, 250g" />
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        {...register("description")}
                                        className="min-h-[140px] resize-y leading-relaxed"
                                    />
                                    {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pricing & Inventory */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                                <div>
                                    <CardTitle>Pricing & Inventory</CardTitle>
                                    <CardDescription>Manage stock levels and unit costs.</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPriceAudit(true)}
                                    className="hidden sm:flex"
                                >
                                    <History className="h-4 w-4 mr-2" />
                                    Price History
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Price ($)</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                {...register("price")}
                                                className="pl-10 h-11 font-mono"
                                            />
                                        </div>
                                        {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPriceAudit(true)}
                                            className="sm:hidden w-full mt-2"
                                        >
                                            <History className="h-4 w-4 mr-2" />
                                            View History
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="stock">Current Stock</Label>
                                        <div className="relative">
                                            <Box className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                                            <Input
                                                id="stock"
                                                type="number"
                                                {...register("stock")}
                                                className="pl-10 h-11 font-mono"
                                            />
                                        </div>
                                        {errors.stock && <p className="text-sm text-destructive mt-1">{errors.stock.message}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                                    <div className="relative">
                                        <Barcode className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                                        <Input
                                            id="sku"
                                            {...register("sku")}
                                            className="pl-10 h-11 font-mono tracking-widest uppercase"
                                            placeholder="Ex: PROD-001"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Variants Table */}
                        {!product.isVariant && productVariants.length > 0 && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <GitBranch className="h-5 w-5 text-primary" />
                                        Variants
                                    </CardTitle>
                                    <CardDescription>Other variants associated with this master product.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="pl-6">Variant Name</TableHead>
                                                <TableHead>SKU</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead className="text-right">Stock</TableHead>
                                                <TableHead className="text-right pr-6">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productVariants.map((variant) => (
                                                <TableRow key={variant.id} className="group">
                                                    <TableCell className="font-medium pl-6">
                                                        <DrillTarget kind="product" payload={{ id: variant.id, name: variant.variantName || variant.name }} asChild>
                                                            <div className="flex items-center gap-2 cursor-pointer transition-colors group-hover:text-primary">
                                                                <div className="h-8 w-8 rounded bg-muted/50 overflow-hidden relative">
                                                                    {variant.imageUrl && (
                                                                        <Image
                                                                            src={variant.imageUrl}
                                                                            alt={variant.name}
                                                                            fill
                                                                            className="object-cover"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <span className="font-semibold">{variant.variantName}</span>
                                                            </div>
                                                        </DrillTarget>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{variant.sku || '—'}</TableCell>
                                                    <TableCell className="text-right font-mono">${variant.price.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{variant.stock}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button variant="ghost" size="sm" asChild className="hover:bg-primary/5 hover:text-primary">
                                                            <Link href={`/products/${variant.id}`}>Edit</Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}



                    </div>
                </div>
            </form>

            {/* Analytics Section (Full Width) */}
            <div className="space-y-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Analytics Overview</h2>
                </div>
                <ProductAnalyticsDashboard productId={product.id} />
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
