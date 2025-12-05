import { QueryClient } from "@tanstack/react-query";
import { DrillKind } from "../drilldown-types";

/**
 * Central utility for invalidating drilldown preview caches.
 * This ensures that when data changes, related previews are refreshed.
 */
export class DrilldownCacheInvalidator {
  private queryClient: QueryClient | null = null;

  /**
   * Initialize with a QueryClient instance.
   * Call this once during app initialization.
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  /**
   * Invalidate a specific preview cache entry
   */
  invalidatePreview(kind: DrillKind, entityId: string): void {
    if (!this.queryClient) return;
    
    this.queryClient.invalidateQueries({
      queryKey: ["drill-preview", kind, { id: entityId }],
    });
  }

  /**
   * Invalidate all previews of a specific kind
   */
  invalidateAllPreviews(kind: DrillKind): void {
    if (!this.queryClient) return;
    
    this.queryClient.invalidateQueries({
      queryKey: ["drill-preview", kind],
    });
  }

  /**
   * Invalidate related previews based on entity relationships
   */
  invalidateRelatedPreviews(
    kind: DrillKind,
    entityId: string,
    relations?: {
      companyId?: string;
      branchId?: string;
      baristaId?: string;
      manufacturerId?: string;
      productId?: string;
      clientId?: string;
    }
  ): void {
    // Always invalidate the main entity
    this.invalidatePreview(kind, entityId);

    // Invalidate related entities based on relationships
    if (relations?.companyId) {
      this.invalidatePreview("company", relations.companyId);
    }

    if (relations?.branchId) {
      this.invalidatePreview("branch", relations.branchId);
    }

    if (relations?.baristaId) {
      this.invalidatePreview("barista", relations.baristaId);
    }

    if (relations?.manufacturerId) {
      this.invalidatePreview("manufacturer", relations.manufacturerId);
    }

    if (relations?.productId) {
      this.invalidatePreview("product", relations.productId);
    }

    if (relations?.clientId) {
      this.invalidatePreview("feedback", relations.clientId);
    }
  }

  /**
   * Invalidate all drilldown preview caches
   */
  invalidateAll(): void {
    if (!this.queryClient) return;
    
    this.queryClient.invalidateQueries({
      queryKey: ["drill-preview"],
    });
  }
}

// Export singleton instance
export const drilldownCacheInvalidator = new DrilldownCacheInvalidator();
