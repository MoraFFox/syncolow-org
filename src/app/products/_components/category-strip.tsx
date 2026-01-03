"use client";

import { Category, Product } from "@/lib/types";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { ArrowRight, Package, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CategoryStripProps {
    category: Category;
    products: Product[];
    onClick: () => void;
    index: number;
}

export function CategoryStrip({ category, products, onClick, index }: CategoryStripProps) {
    const topProducts = products.slice(0, 3);
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className="group relative w-full border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer py-4"
        >
            <DrillTarget
                kind="category"
                payload={{
                    id: category.id,
                    name: category.name,
                    productCount: products.length,
                }}
                asChild
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">

                    {/* Left: Category Info */}
                    <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-baseline gap-4 min-w-[200px]">
                            <span className="text-xs font-mono text-muted-foreground opacity-50">
                                {(index + 1).toString().padStart(2, '0')}
                            </span>
                            <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                                {category.name}
                            </h3>
                        </div>

                        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                <span>{products.length} Products</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span>{totalStock} in stock</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Preview & Action */}
                    <div className="flex items-center gap-6">
                        {/* Product Preview Text */}
                        <div className="hidden lg:flex gap-2">
                            {topProducts.map((p, i) => (
                                <span
                                    key={p.id}
                                    className={cn(
                                        "text-xs px-2 py-1 rounded-full bg-background border border-border text-muted-foreground",
                                        "group-hover:border-primary/20 transition-colors"
                                    )}
                                >
                                    {p.name}
                                </span>
                            ))}
                            {products.length > 3 && (
                                <span className="text-xs px-2 py-1 text-muted-foreground">+{products.length - 3}</span>
                            )}
                        </div>

                        <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </DrillTarget>

            {/* Hover Background Accent */}
            <div className="absolute inset-y-0 left-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
        </motion.div>
    );
}
