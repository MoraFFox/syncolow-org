"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDrillDownStore } from "@/store/use-drilldown-store";
import { DrillContentRenderer } from "./drill-content-renderer";
import { DrillActions } from "./drill-actions";
import { useDrillPreviewData } from "@/hooks/use-drill-preview-data";
import { Eye, ExternalLink } from "lucide-react";
import { useDrillDown } from "@/hooks/use-drilldown";
import { Button } from "@/components/ui/button";

export function DrillPeekModal() {
  const { peek, closePeek } = useDrillDownStore();
  const { isOpen, kind, payload } = peek;
  const { goToDetail } = useDrillDown();
  
  // Use cached data
  const { data: asyncData, isLoading, error } = useDrillPreviewData(kind, payload, isOpen);

  if (!kind || !payload) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closePeek()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
           <div className="flex items-center gap-2 text-muted-foreground mb-1">
             <Eye className="h-4 w-4" />
             <span className="text-xs font-medium uppercase tracking-wider">Peek View</span>
           </div>
           <DialogTitle className="text-xl capitalize flex items-center gap-2">
             {kind} Details
           </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <DrillContentRenderer 
             kind={kind} 
             payload={payload} 
             isLoading={isLoading} 
             error={error} 
             asyncData={asyncData} 
             isPeekMode={true}
          />
        </div>

        <div className="p-4 bg-muted/40 border-t flex items-center justify-between">
            <div className="flex gap-2">
                <DrillActions kind={kind} payload={payload} variant="ghost" size="sm" />
            </div>
            <Button 
                size="sm" 
                onClick={() => {
                    closePeek();
                    goToDetail(kind, payload);
                }}
            >
                Open Full View
                <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
