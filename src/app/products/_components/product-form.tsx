
"use client"
import { useState, ChangeEvent, DragEvent, useEffect } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Product, Category } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrderStore } from '@/store/use-order-store';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combo-box';

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
  image: z.any().optional(),
  hint: z.string().optional(),
  isVariant: z.boolean().default(false),
  parentProductId: z.string().optional(),
  variantName: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  manufacturerId: z.string(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (data: AddProductData) => void;
    product?: Partial<Product> | null;
}

type AddProductData = Omit<Product, 'id' | 'imageUrl'> & { image?: File };

function ProductFormContent({ product, onSubmit, onCancel, isEmbedded }: Omit<ProductFormProps, 'isOpen'|'onOpenChange'> & { onCancel: () => void, isEmbedded?: boolean }) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { categories, addCategory } = useOrderStore();

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });
  
  const isVariant = watch('isVariant');
  const categoryValue = watch('category');

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        stock: product.stock || 0,
        hint: product.hint || '',
        isVariant: product.isVariant || false,
        parentProductId: product.parentProductId || undefined,
        variantName: product.variantName || '',
        sku: product.sku || '',
        category: product.category || '',
      });
      setImagePreview(product.imageUrl || null);
    } else {
      reset({ name: '', description: '', price: 0, stock: 0, hint: '', isVariant: false, parentProductId: undefined, variantName: '', sku: '', category: '' });
      setImagePreview(null);
    }
  }, [product, reset]);


  const handleFileChange = (file: File | null) => {
    if (file) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      setValue('image', dataTransfer.files, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
       setValue('image', undefined);
       setImagePreview(null);
    }
  };

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(event.target.files?.[0] || null);
  };
  
  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault(); setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault(); setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileChange(event.dataTransfer.files?.[0] || null);
  };
  
  const onFormSubmit = (data: ProductFormData) => {
    const { image, ...productData } = data;
    const submissionData: AddProductData = { ...productData };
    if (image && image.length > 0) {
        submissionData.image = image[0];
    }
    onSubmit(submissionData);
    if (!isEmbedded) {
        onCancel();
    }
  };

  const categoryOptions = categories.map(c => ({ label: c.name, value: c.name }));

  const handleCategoryChange = async (value: string) => {
      const isNewCategory = !categories.some(c => c.name.toLowerCase() === value.toLowerCase());
      if (isNewCategory && value) {
        await addCategory({ name: value });
      }
      setValue('category', value, { shouldValidate: true });
  }

  const formBody = (
       <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="isVariant" checked={isVariant} onCheckedChange={(checked) => setValue('isVariant', !!checked)} />
                <Label htmlFor="isVariant">This product is a variant of another product.</Label>
              </div>

              {isVariant && (
                <div className="grid gap-2">
                    <Label htmlFor="parentProductId">Parent Product</Label>
                    {/* TODO: Replace with a product selector combobox */}
                    <Input id="parentProductId" {...register("parentProductId")} placeholder="Enter parent product ID" />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="name">{isVariant ? 'Base Product Name' : 'Product Name'}</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              {isVariant && (
                 <div className="grid gap-2">
                    <Label htmlFor="variantName">Variant Name (e.g., &quot;250g&quot;, &quot;Dark Roast&quot;)</Label>
                    <Input id="variantName" {...register("variantName")} />
                 </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                           <Combobox
                                options={categoryOptions}
                                value={field.value}
                                onChange={handleCategoryChange}
                                placeholder="Select a category"
                                searchPlaceholder="Search categories..."
                                emptyText="No categories found."
                            />
                        )}
                    />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                    <Input id="sku" {...register("sku")} />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price ($)</Label>
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
                  <Label>Product Image</Label>
                  <Label htmlFor="image-upload" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={cn("flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors", isDragging && "border-primary bg-primary/10", errors.image && "border-destructive")}>
                     {imagePreview ? (
                        <Image src={imagePreview} alt="Image preview" width={160} height={160} className="object-contain h-full w-full p-2" />
                     ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP</p>
                        </div>
                     )}
                  </Label>
                  <Input id="image-upload" type="file" accept="image/*" {...register("image", { onChange: handleImageInputChange })} className="hidden" />
                  {errors.image && <p className="text-sm text-destructive">{errors.image.message?.toString()}</p>}
                <p className="text-sm text-muted-foreground text-center">Or generate an image with AI below.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hint">AI Image Hint</Label>
                <Input id="hint" placeholder="e.g. 'industrial widget', 'sleek office chair'" {...register("hint")} />
                 <p className="text-sm text-muted-foreground">Describe the product for AI image generation.</p>
              </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">{product ? 'Save Changes' : 'Save Product'}</Button>
          </DialogFooter>
        </form>
  )

  if(isEmbedded) return formBody;

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the product details.' : 'Enter the details of the new product.'}
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
  )
}

export function ProductForm({ isOpen, onOpenChange, onSubmit, product }: ProductFormProps) {
  // This mode is for when the form is embedded directly, like in the error resolution flow.
  if (isOpen && !onOpenChange) {
      return <ProductFormContent product={product} onSubmit={onSubmit} onCancel={() => {}} isEmbedded={true} />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <ProductFormContent product={product} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} isEmbedded={false} />
    </Dialog>
  );
}
