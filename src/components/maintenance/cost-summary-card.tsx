"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { MaintenanceVisit, SparePart, MaintenanceService } from "@/lib/types";
import { DollarSign, Wrench, Package, Truck } from "lucide-react";

export interface CostSummaryCardProps {
    visit: MaintenanceVisit;
    className?: string;
    compact?: boolean;
}

interface CostLineItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    payer: "Client" | "Company";
}

/**
 * Cost Summary Card showing detailed breakdown of maintenance visit costs.
 * 
 * Displays:
 * - Labor/travel costs
 * - Services performed with quantities and costs
 * - Parts used with quantities and costs
 * - Client vs Company payment breakdown
 */
export function CostSummaryCard({ visit, className, compact = false }: CostSummaryCardProps) {
    const { laborCost = 0, services = [], spareParts = [] } = visit;

    // Calculate totals
    const servicesCost = services.reduce((sum, s) => sum + (s.cost * s.quantity), 0);
    const clientServicesCost = services
        .filter(s => s.paidBy === "Client")
        .reduce((sum, s) => sum + (s.cost * s.quantity), 0);
    const companyServicesCost = services
        .filter(s => s.paidBy === "Company")
        .reduce((sum, s) => sum + (s.cost * s.quantity), 0);

    const partsCost = spareParts.reduce((sum, p) => sum + ((p.price || 0) * p.quantity), 0);
    const clientPartsCost = spareParts
        .filter(p => p.paidBy === "Client")
        .reduce((sum, p) => sum + ((p.price || 0) * p.quantity), 0);
    const companyPartsCost = spareParts
        .filter(p => p.paidBy === "Company")
        .reduce((sum, p) => sum + ((p.price || 0) * p.quantity), 0);

    const totalCost = laborCost + servicesCost + partsCost;
    const clientPays = laborCost + clientServicesCost + clientPartsCost;
    const companyAbsorbs = companyServicesCost + companyPartsCost;

    if (compact) {
        return (
            <div className={cn("flex items-center gap-4 text-sm", className)}>
                <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{totalCost.toLocaleString()} EGP</span>
                </div>
                {companyAbsorbs > 0 && (
                    <span className="text-xs text-muted-foreground">
                        (Company: {companyAbsorbs.toLocaleString()})
                    </span>
                )}
            </div>
        );
    }

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Labor Cost */}
                {laborCost > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                            <Truck className="h-3.5 w-3.5" />
                            Travel / Labor
                        </div>
                        <CostRow
                            label="Travel Cost"
                            value={laborCost}
                            payer="Client"
                        />
                    </div>
                )}

                {/* Services */}
                {services.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                            <Wrench className="h-3.5 w-3.5" />
                            Services ({services.length})
                        </div>
                        <div className="space-y-1">
                            {services.map((service, idx) => (
                                <CostRow
                                    key={idx}
                                    label={service.name}
                                    quantity={service.quantity}
                                    unitPrice={service.cost}
                                    value={service.cost * service.quantity}
                                    payer={service.paidBy}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Parts */}
                {spareParts.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                            <Package className="h-3.5 w-3.5" />
                            Parts ({spareParts.length})
                        </div>
                        <div className="space-y-1">
                            {spareParts.map((part, idx) => (
                                <CostRow
                                    key={idx}
                                    label={part.name}
                                    quantity={part.quantity}
                                    unitPrice={part.price}
                                    value={(part.price || 0) * part.quantity}
                                    payer={part.paidBy}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Totals */}
                <Separator />
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400">Client Pays</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {clientPays.toLocaleString()} EGP
                        </span>
                    </div>
                    {companyAbsorbs > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-amber-600 dark:text-amber-400">Company Absorbs</span>
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                {companyAbsorbs.toLocaleString()} EGP
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold pt-1">
                        <span>Total</span>
                        <span>{totalCost.toLocaleString()} EGP</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface CostRowProps {
    label: string;
    quantity?: number;
    unitPrice?: number;
    value: number;
    payer: "Client" | "Company";
}

function CostRow({ label, quantity, unitPrice, value, payer }: CostRowProps) {
    return (
        <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{label}</span>
                {quantity && quantity > 1 && (
                    <span className="text-muted-foreground shrink-0">
                        ×{quantity}
                    </span>
                )}
                {payer === "Company" && (
                    <span className="text-amber-600 dark:text-amber-400 text-[10px] shrink-0">
                        (Co.)
                    </span>
                )}
            </div>
            <span className={cn(
                "font-medium shrink-0 ml-2",
                payer === "Company" && "text-amber-600 dark:text-amber-400"
            )}>
                {value.toLocaleString()}
            </span>
        </div>
    );
}

/**
 * Compact cost display for table rows
 */
export function CostBadge({
    total,
    companyAbsorbs,
    className,
}: {
    total: number;
    companyAbsorbs?: number;
    className?: string;
}) {
    return (
        <div className={cn("text-right", className)}>
            <div className="font-medium">{total.toLocaleString()} EGP</div>
            {companyAbsorbs && companyAbsorbs > 0 && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                    Co. {companyAbsorbs.toLocaleString()}
                </div>
            )}
        </div>
    );
}
