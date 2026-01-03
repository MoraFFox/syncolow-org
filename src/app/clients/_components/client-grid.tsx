"use client";

import { motion } from "framer-motion";
import { Company, ListItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Building2,
    MapPin,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    GitBranch,
    Phone,
    Mail,
    TrendingUp,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PaymentScoreBadge } from "@/components/payment-score-badge";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { cn } from "@/lib/utils";

interface ClientGridProps {
    items: ListItem[];
    allCompanies: Company[]; // needed for parent lookup
    onEdit: (company: Company) => void;
    onDelete: (company: Company) => void;
}

// Simplified motion variants for better performance
const itemVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1
    }
};

export function ClientGrid({ items, allCompanies, onEdit, onDelete }: ClientGridProps) {

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border dashed rounded-lg">
                <Building2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No companies found</h3>
                <p className="text-sm text-muted-foreground/60 max-w-sm mt-2">
                    Try adjusting your search or filters to find what you're looking for.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6" role="list" aria-label="Client companies grid">
            {items.map((company, index) => {
                const isBranch = company.isBranch;
                const parentName = isBranch && company.parentCompanyId
                    ? allCompanies.find(p => p.id === company.parentCompanyId)?.name
                    : '';

                return (
                    <motion.div
                        key={company.id}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        variants={itemVariants}
                        className="h-full"
                    >
                        <div className="relative group h-full flex flex-col bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:border-primary/30 hover:bg-card/60">

                            {/* Header Decorative Line */}
                            <div className={cn(
                                "h-1 w-full",
                                isBranch ? "bg-muted-foreground/30" : "bg-gradient-to-r from-primary to-primary/50"
                            )} />

                            <div className="p-6 flex flex-col gap-5 flex-1">
                                {/* Header Section */}
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "h-11 w-11 rounded-lg flex items-center justify-center shrink-0 border border-white/5",
                                            isBranch ? "bg-muted/50 text-muted-foreground" : "bg-primary/10 text-primary"
                                        )}>
                                            {isBranch ? <GitBranch className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <DrillTarget kind="company" payload={{ id: company.id, name: company.name }}>
                                                <h3 className="font-bold text-lg leading-tight hover:text-primary transition-colors cursor-pointer truncate max-w-[170px]" title={company.name} aria-label={`View details for ${company.name}`}>
                                                    {company.name}
                                                </h3>
                                            </DrillTarget>

                                            {isBranch ? (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                                                    <span className="opacity-70">Branch of</span>
                                                    {company.parentCompanyId ? (
                                                        <DrillTarget kind="company" payload={{ id: company.parentCompanyId, name: parentName || 'Parent' }}>
                                                            <span className="font-medium hover:text-foreground cursor-pointer transition-colors max-w-[100px] truncate border-b border-dashed border-muted-foreground/50 hover:border-primary/50">{parentName || 'Unknown'}</span>
                                                        </DrillTarget>
                                                    ) : (
                                                        <span>{parentName || 'Unknown'}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {company.industry && (
                                                        <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider font-mono border border-white/10">
                                                            {company.industry}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                                                aria-label={`Actions for ${company.name}`}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/clients/${company.parentCompanyId ? `${company.parentCompanyId}/` : ''}${company.id}`} className="cursor-pointer flex items-center">
                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEdit(company)} className="cursor-pointer flex items-center">
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onDelete(company)} className="text-destructive cursor-pointer flex items-center">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Location & Contact Info */}
                                <div className="space-y-2 py-1">
                                    {(company.location || (company.region && company.region !== 'Custom')) && (
                                        <div className="flex items-start gap-2.5 text-sm text-muted-foreground/80">
                                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
                                            <span className="line-clamp-1">{company.location || `Region ${company.region}`}</span>
                                        </div>
                                    )}
                                    {company.contacts && company.contacts.length > 0 && company.contacts[0].phoneNumbers && company.contacts[0].phoneNumbers.length > 0 && (
                                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80">
                                            <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                            <span>{company.contacts[0].phoneNumbers[0].number}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 gap-4 mt-auto pt-5 border-t border-border/30">
                                    <div className="flex flex-col">
                                        <span className="text-xs uppercase text-muted-foreground font-semibold tracking-wider opacity-70">Revenue (12m)</span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="font-mono text-sm font-semibold tracking-tight">
                                                {company.last12MonthsRevenue ? formatCurrency(company.last12MonthsRevenue) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs uppercase text-muted-foreground font-semibold tracking-wider opacity-70">Balance</span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", (company.totalOutstandingAmount || 0) > 0 ? "bg-amber-500" : "bg-muted-foreground/30")} />
                                            <span className={cn(
                                                "font-mono text-sm font-semibold tracking-tight",
                                                (company.totalOutstandingAmount || 0) > 0 ? "text-amber-500" : "text-muted-foreground"
                                            )}>
                                                {company.totalOutstandingAmount ? formatCurrency(company.totalOutstandingAmount) : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-span-2 flex justify-between items-center mt-1">
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1.5 opacity-70">Payment Score</span>
                                            {company.currentPaymentScore !== undefined ? (
                                                <PaymentScoreBadge
                                                    score={company.currentPaymentScore}
                                                    status={company.paymentStatus}
                                                    size={40}
                                                />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {company.email && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                                                    asChild
                                                    aria-label={`Send email to ${company.name}`}
                                                >
                                                    <a href={`mailto:${company.email}`} title={`Send email to ${company.name}`}>
                                                        <Mail className="h-3.5 w-3.5" />
                                                    </a>
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 text-xs font-medium px-4 bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-all"
                                                asChild
                                                aria-label={`View details for ${company.name}`}
                                            >
                                                <Link href={`/clients/${company.parentCompanyId ? `${company.parentCompanyId}/` : ''}${company.id}`} aria-label={`View details for ${company.name}`}>
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
