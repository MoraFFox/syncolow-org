"use client";

import { motion } from "framer-motion";
import { Product, Manufacturer } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Box, Layers, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DrillTarget } from "@/components/drilldown/drill-target";
import Link from "next/link";

interface ProductCardProps {
    product: Product;
    manufacturers?: Manufacturer[];
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

export function ProductCard({ product, manufacturers, onEdit, onDelete }: ProductCardProps) {
    const manufacturerName = manufacturers?.find(m => m.id === product.manufacturerId)?.name;

    // Stock Level Logic for Visualization
    const maxStock = 100; // Arbitrary visualization baseline
    const stockInclude = Math.min(product.stock, maxStock);
    const stockPercentage = (stockInclude / maxStock) * 100;

    const isLowStock = product.stock < 10;
    const inStock = product.stock > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative flex flex-col h-full bg-card border border-border/50 hover:border-primary/50 transition-colors duration-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md"
        >
            {/* Decorative Header Line */}
            <div className={cn(
                "h-1 w-full",
                isLowStock ? "bg-red-500" : "bg-primary"
            )} />

            <div className="p-4 flex flex-col flex-1 gap-4">
                {/* Header Section: ID & Manufacturer */}
                <div className="flex justify-between items-start text-xs font-mono text-muted-foreground tracking-tighter">
                    <span className="opacity-70">#{product.id.slice(0, 8).toUpperCase()}</span>
                    {manufacturerName && (
                        <DrillTarget kind="company" payload={{ id: product.manufacturerId!, name: manufacturerName }} asChild>
                            <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                                <Box className="w-3 h-3" />
                                <span>{manufacturerName}</span>
                            </div>
                        </DrillTarget>
                    )}
                </div>

                {/* Main Content: Image & Title */}
                <div className="flex gap-4 items-start">
                    <div className="relative w-20 h-20 shrink-0 bg-muted/30 rounded-lg overflow-hidden border border-border/50 group-hover:border-primary/20 transition-colors">
                        <Image
                            src={product.imageUrl || "https://placehold.co/100x100.png"}
                            alt={product.name}
                            fill
                            className="object-cover"
                            data-ai-hint={product.hint}
                        />
                    </div>

                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <DrillTarget kind="product" payload={{ id: product.id, name: product.name, price: product.price, stock: product.stock }} asChild>
                            <h3 className="font-bold text-lg leading-tight truncate cursor-pointer group-hover:text-primary transition-colors">
                                {product.name}
                            </h3>
                        </DrillTarget>
                        {product.variantName && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {product.variantName}
                            </span>
                        )}

                        {product.category && (
                            <span className="inline-flex mt-1 self-start items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground border border-secondary-foreground/10">
                                {product.category}
                            </span>
                        )}
                    </div>
                </div>

                {/* Data Grid: Price & Stock */}
                <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-border/60">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Price</span>
                        <span className="text-xl font-mono font-bold tracking-tight">
                            ${typeof product.price === "number" ? product.price.toFixed(2) : "0.00"}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center justify-between">
                            Stock
                            {isLowStock && inStock && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            {!inStock && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            {!isLowStock && inStock && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-xl font-mono font-bold tracking-tight",
                                isLowStock ? "text-amber-500" : "",
                                !inStock ? "text-red-500" : ""
                            )}>
                                {product.stock}
                            </span>
                            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full", isLowStock ? "bg-amber-500" : "bg-primary")}
                                    style={{ width: `${stockPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Layer - appears on hover */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-x-2 group-hover:translate-x-0">
                <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 shadow-sm backdrop-blur-sm bg-background/80 hover:bg-background"
                    onClick={(e) => {
                        e.preventDefault();
                        onEdit(product);
                    }}
                >
                    <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 shadow-sm backdrop-blur-sm opacity-90 hover:opacity-100"
                    onClick={(e) => {
                        e.preventDefault();
                        onDelete(product);
                    }}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            <Link href={`/products/${product.id}`} className="absolute inset-0 z-0" aria-label={`View ${product.name}`} />
            {/* Z-index fix for interactions */}
            <div className="relative z-10 pointer-events-none h-full w-full">
                {/* Transparent overlay to allow clicks but let buttons below work? No, the buttons are absolute on top. 
                The Link covers everything. Buttons need higher z-index.
            */}
            </div>
            {/* Re-enable pointer events for specific children that need them */}
            <style jsx global>{`
         .group:hover .absolute button { pointer-events: auto; }
       `}</style>
        </motion.div>
    );
}
