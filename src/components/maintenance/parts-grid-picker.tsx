"use client";

import { useMemo, useState } from "react";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Plus,
    Minus,
    ShoppingBag,
    Package
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PartItem {
    id: string; // SKU or unique ID
    name: string;
    price: number;
    category?: string;
    imageUrl?: string; // Future proofing
}

interface PartsGridPickerProps {
    currentParts: { name: string; quantity: number; price: number }[];
    onPartChange: (parts: { name: string; quantity: number; price: number }[]) => void;
    className?: string;
}

export function PartsGridPicker({ currentParts, onPartChange, className }: PartsGridPickerProps) {
    const { partsCatalog } = useMaintenanceStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>("All");

    // Memoized Filter Logic
    const filteredParts = useMemo(() => {
        let items = partsCatalog;

        // Category Filter
        if (selectedCategory && selectedCategory !== "All") {
            items = items.filter(p => p.category === selectedCategory);
        }

        // Fuzzy Search (Simple Includes for now, can upgrade to fuse.js if needed)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            items = items.filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                p.category?.toLowerCase().includes(lowerQuery)
            );
        }

        return items;
    }, [partsCatalog, searchQuery, selectedCategory]);

    // Categories Derived from Catalog
    const categories = useMemo(() => {
        const cats = new Set(partsCatalog.map(p => p.category).filter(Boolean));
        return ["All", ...Array.from(cats)];
    }, [partsCatalog]);

    // Handlers
    const handleAdd = (part: any) => {
        const existingIndex = currentParts.findIndex(p => p.name === part.name);
        if (existingIndex >= 0) {
            const newParts = [...currentParts];
            newParts[existingIndex].quantity += 1;
            onPartChange(newParts);
        } else {
            onPartChange([...currentParts, { name: part.name, price: part.price || 0, quantity: 1 }]);
        }
    };

    const handleRemove = (partName: string) => {
        const existingIndex = currentParts.findIndex(p => p.name === partName);
        if (existingIndex >= 0) {
            const newParts = [...currentParts];
            if (newParts[existingIndex].quantity > 1) {
                newParts[existingIndex].quantity -= 1;
            } else {
                newParts.splice(existingIndex, 1);
            }
            onPartChange(newParts);
        }
    };

    const getQuantity = (partName: string) => {
        return currentParts.find(p => p.name === partName)?.quantity || 0;
    };

    const totalCost = currentParts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            {/* Search & Filter Header (Sticky) */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-4 pt-2 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search parts (e.g. 'filter', 'valve')..."
                        className="pl-9 bg-muted/50 border-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Horizontal Scroll Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                                selectedCategory === cat
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-transparent hover:bg-muted"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-2 gap-3 pb-24">
                {filteredParts.length === 0 ? (
                    <div className="col-span-2 text-center py-10 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No parts found matching "{searchQuery}"</p>
                    </div>
                ) : (
                    filteredParts.map((part) => {
                        const qty = getQuantity(part.name);
                        return (
                            <div
                                key={part.name}
                                className={cn(
                                    "flex flex-col justify-between p-3 rounded-xl border bg-card transition-all relative overflow-hidden group",
                                    qty > 0 ? "border-primary/50 ring-1 ring-primary/20 bg-primary/5" : "hover:border-primary/30"
                                )}
                                onClick={() => handleAdd(part)} // Whole card click adds 1
                            >
                                <div className="space-y-1">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                            {part.sku || "GEN"}
                                        </Badge>
                                        {qty > 0 && (
                                            <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center animate-in zoom-in-50">
                                                {qty}
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5em]">
                                        {part.name}
                                    </h3>
                                    <p className="text-primary font-bold text-sm">
                                        {part.price?.toLocaleString()} EGP
                                    </p>
                                </div>

                                {/* +/- Controls (Only show if quantity > 0) */}
                                {qty > 0 && (
                                    <div className="flex items-center justify-end gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full"
                                            onClick={(e) => { e.stopPropagation(); handleRemove(part.name); }}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-medium w-4 text-center">{qty}</span>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="h-8 w-8 p-0 rounded-full"
                                            onClick={(e) => { e.stopPropagation(); handleAdd(part); }}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* The "Toolbelt" (Floating Footer) */}
            {currentParts.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t animate-in slide-in-from-bottom-5 z-20">
                    <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary relative">
                                <ShoppingBag className="h-5 w-5" />
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-background">
                                    {currentParts.reduce((s, p) => s + p.quantity, 0)}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Cost</p>
                                <p className="text-lg font-bold leading-none">{totalCost.toLocaleString()} EGP</p>
                            </div>
                        </div>
                        {/* The caller handles the "Done" action, but we could put a button here if we wanted self-contained confirmation */}
                    </div>
                </div>
            )}
        </div>
    );
}
