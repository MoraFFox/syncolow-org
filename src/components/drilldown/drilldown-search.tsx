"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Command } from "cmdk";
import { 
  Search, 
  Package, 
  Building2, 
  ShoppingCart, 
  Users, 
  Wrench, 
  MessageSquare, 
  Bell, 
  DollarSign,
  Factory,
  Tag,
  User,
  MapPin,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DrillKind } from "@/lib/drilldown-types";
import { useDrillDown } from "@/hooks/use-drilldown";
import { drillAnalytics } from "@/lib/drill-analytics";

interface SearchItem {
  id: string;
  name: string;
  kind: DrillKind;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const kindIcons: Record<DrillKind, React.ComponentType<{ className?: string }>> = {
  order: ShoppingCart,
  product: Package,
  company: Building2,
  revenue: TrendingUp,
  maintenance: Wrench,
  inventory: Package,
  customer: Users,
  barista: User,
  branch: MapPin,
  manufacturer: Factory,
  category: Tag,
  feedback: MessageSquare,
  notification: Bell,
  payment: DollarSign,
};

const kindLabels: Record<DrillKind, string> = {
  order: "Order",
  product: "Product",
  company: "Company",
  revenue: "Revenue",
  maintenance: "Maintenance",
  inventory: "Inventory",
  customer: "Customer",
  barista: "Barista",
  branch: "Branch",
  manufacturer: "Manufacturer",
  category: "Category",
  feedback: "Feedback",
  notification: "Notification",
  payment: "Payment",
};

export function DrilldownSearch() {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [recentItems, setRecentItems] = React.useState<SearchItem[]>([]);
  const { goToDetail } = useDrillDown();

  // Keyboard shortcut: Cmd/Ctrl + K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load recent items from analytics
  React.useEffect(() => {
    if (open) {
      const metrics = drillAnalytics.getMetrics();
      const recent = metrics.mostViewedEntities.slice(0, 10).map((entity) => ({
        id: entity.entityId,
        name: entity.entityId,
        kind: entity.kind,
        subtext: `Viewed ${entity.count} times`,
      }));
      setRecentItems(recent);
    }
  }, [open]);

  const handleSelect = (item: SearchItem) => {
    setOpen(false);
    setSearchTerm("");
    
    // Navigate to the detail page
    goToDetail(item.kind, { id: item.id, name: item.name });
  };

  /**
   * Fuzzy match algorithm - returns a score (higher is better, 0 means no match)
   * Matches characters in order but allows gaps
   */
  const fuzzyMatch = (text: string, pattern: string): number => {
    if (!pattern) return 1;
    
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    let score = 0;
    let patternIdx = 0;
    let prevMatchIdx = -1;
    let consecutiveBonus = 0;
    
    for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIdx]) {
        // Base score for match
        score += 1;
        
        // Bonus for consecutive matches
        if (prevMatchIdx === i - 1) {
          consecutiveBonus += 2;
          score += consecutiveBonus;
        } else {
          consecutiveBonus = 0;
        }
        
        // Bonus for matching at start or after separator
        if (i === 0 || /[\s\-_.]/.test(textLower[i - 1])) {
          score += 3;
        }
        
        prevMatchIdx = i;
        patternIdx++;
      }
    }
    
    // Return 0 if pattern wasn't fully matched
    if (patternIdx !== patternLower.length) return 0;
    
    // Bonus for shorter texts (exact or near-exact matches)
    score += Math.max(0, 10 - (textLower.length - patternLower.length));
    
    return score;
  };

  // Filter and rank items based on fuzzy search
  const filteredItems = React.useMemo(() => {
    if (!searchTerm) return recentItems;
    
    const scored = recentItems
      .map((item) => {
        const nameScore = fuzzyMatch(item.name, searchTerm);
        const kindScore = fuzzyMatch(item.kind, searchTerm) * 0.5; // Kind matches less relevant
        const maxScore = Math.max(nameScore, kindScore);
        return { item, score: maxScore };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    
    return scored.map((entry) => entry.item);
  }, [searchTerm, recentItems]);

  // Group items by kind
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.kind]) {
        groups[item.kind] = [];
      }
      groups[item.kind].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md border transition-colors"
        aria-label="Open drilldown search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Search Drilldown</DialogTitle>
          </DialogHeader>
          
          <Command className="rounded-lg border-none" shouldFilter={false}>
            {/* Search Input */}
            <div className="flex items-center border-b px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={searchTerm}
                onValueChange={setSearchTerm}
                placeholder="Search entities..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Results */}
            <Command.List className="max-h-80 overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  {searchTerm ? "No results found." : "No recent items. Start exploring!"}
                </Command.Empty>
              ) : (
                Object.entries(groupedItems).map(([kind, items]) => {
                  const Icon = kindIcons[kind as DrillKind];
                  return (
                    <Command.Group
                      key={kind}
                      heading={
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1.5">
                          <Icon className="h-3 w-3" />
                          <span>{kindLabels[kind as DrillKind]}s</span>
                        </div>
                      }
                    >
                      {items.map((item) => (
                        <Command.Item
                          key={`${item.kind}-${item.id}`}
                          value={`${item.kind}-${item.id}`}
                          onSelect={() => handleSelect(item)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer",
                            "hover:bg-accent text-sm",
                            "aria-selected:bg-accent"
                          )}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">{item.name}</div>
                            {item.subtext && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.subtext}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {kindLabels[item.kind]}
                          </Badge>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })
              )}
            </Command.List>

            {/* Footer */}
            <div className="flex items-center justify-between border-t p-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
