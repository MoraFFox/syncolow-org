/** @format */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { drillAnalytics } from "../drill-analytics";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("drillAnalytics", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset internal state by calling clearOldEvents with future timestamp
    drillAnalytics.clearOldEvents(Date.now() + 1000000);
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("track", () => {
    it("should track a preview event with id", () => {
      drillAnalytics.track("order", { id: "ord-123" }, "preview");

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.eventsByKind.order).toBe(1);
    });

    it("should track a preview event with value fallback", () => {
      drillAnalytics.track("revenue", { value: "2023-01" }, "preview");

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.eventsByKind.revenue).toBe(1);
    });

    it("should track navigate events", () => {
      drillAnalytics.track("product", { id: "prod-456" }, "navigate");

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.totalEvents).toBe(1);
    });

    it("should track dialog events", () => {
      drillAnalytics.track("company", { id: "comp-789" }, "dialog");

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.totalEvents).toBe(1);
    });

    it("should handle unknown entityId", () => {
      drillAnalytics.track("order", {}, "preview");

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.mostViewedEntities[0].entityId).toBe("unknown");
    });
  });

  describe("trackPreviewLoad", () => {
    it("should track successful preview load", () => {
      drillAnalytics.trackPreviewLoad("order", "ord-123", 150, false);

      const perf = drillAnalytics.getPerformanceMetrics();
      expect(perf).not.toBeNull();
      expect(perf!.totalSamples).toBe(1);
      expect(perf!.averageLoadTime).toBe(150);
    });

    it("should track cache hit", () => {
      drillAnalytics.trackPreviewLoad("product", "prod-456", 5, true);

      const perf = drillAnalytics.getPerformanceMetrics();
      expect(perf!.cacheHitRate).toBe(1);
    });

    it("should track errors", () => {
      drillAnalytics.trackPreviewLoad(
        "company",
        "comp-789",
        0,
        false,
        "Network error"
      );

      const perf = drillAnalytics.getPerformanceMetrics();
      expect(perf!.errorRate).toBe(1);
    });

    it("should calculate cache hit rate correctly", () => {
      drillAnalytics.trackPreviewLoad("order", "ord-1", 100, false);
      drillAnalytics.trackPreviewLoad("order", "ord-2", 5, true);
      drillAnalytics.trackPreviewLoad("order", "ord-3", 5, true);

      const perf = drillAnalytics.getPerformanceMetrics();
      // 2 cache hits out of 3 = 66.67%
      expect(perf!.cacheHitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe("getMetrics", () => {
    it("should return empty metrics when no events", () => {
      const metrics = drillAnalytics.getMetrics();

      expect(metrics.totalEvents).toBe(0);
      expect(metrics.previewToNavigateConversion).toBe(0);
      expect(metrics.mostViewedEntities).toEqual([]);
    });

    it("should calculate conversion rate correctly", () => {
      // 4 previews
      drillAnalytics.track("order", { id: "ord-1" }, "preview");
      drillAnalytics.track("order", { id: "ord-2" }, "preview");
      drillAnalytics.track("product", { id: "prod-1" }, "preview");
      drillAnalytics.track("company", { id: "comp-1" }, "preview");

      // 2 navigations
      drillAnalytics.track("order", { id: "ord-1" }, "navigate");
      drillAnalytics.track("product", { id: "prod-1" }, "navigate");

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.previewToNavigateConversion).toBe(0.5); // 2/4
    });

    it("should return most viewed entities sorted by count", () => {
      drillAnalytics.track("order", { id: "ord-popular" }, "preview");
      drillAnalytics.track("order", { id: "ord-popular" }, "preview");
      drillAnalytics.track("order", { id: "ord-popular" }, "preview");
      drillAnalytics.track("product", { id: "prod-1" }, "preview");

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.mostViewedEntities[0].entityId).toBe("ord-popular");
      expect(metrics.mostViewedEntities[0].count).toBe(3);
    });

    it("should limit most viewed entities to top 10", () => {
      // Create 15 different entities
      for (let i = 0; i < 15; i++) {
        drillAnalytics.track("order", { id: `ord-${i}` }, "preview");
      }

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.mostViewedEntities.length).toBe(10);
    });

    it("should filter by timestamp when since is provided", () => {
      const now = Date.now();
      drillAnalytics.track("order", { id: "ord-old" }, "preview");

      // Simulate time passing
      const future = now + 10000;
      const metrics = drillAnalytics.getMetrics(future);

      expect(metrics.totalEvents).toBe(0);
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should return null when no metrics", () => {
      const perf = drillAnalytics.getPerformanceMetrics();
      expect(perf).toBeNull();
    });

    it("should calculate percentiles correctly", () => {
      // Add 100 samples with increasing durations
      for (let i = 1; i <= 100; i++) {
        drillAnalytics.trackPreviewLoad("order", `ord-${i}`, i * 10, false);
      }

      const perf = drillAnalytics.getPerformanceMetrics();
      expect(perf!.p50LoadTime).toBe(510); // 51st value (index 50)
      expect(perf!.p95LoadTime).toBe(960); // 96th value (index 95)
      expect(perf!.p99LoadTime).toBe(1000); // 100th value (index 99)
    });

    it("should identify slowest entities", () => {
      drillAnalytics.trackPreviewLoad("order", "ord-fast", 50, false);
      drillAnalytics.trackPreviewLoad("order", "ord-fast", 60, false);
      drillAnalytics.trackPreviewLoad("product", "prod-slow", 500, false);
      drillAnalytics.trackPreviewLoad("product", "prod-slow", 600, false);

      const perf = drillAnalytics.getPerformanceMetrics();
      expect(perf!.slowestEntities[0].entityId).toBe("prod-slow");
      expect(perf!.slowestEntities[0].averageDuration).toBe(550);
    });

    it("should break down loads by kind", () => {
      drillAnalytics.trackPreviewLoad("order", "ord-1", 100, false);
      drillAnalytics.trackPreviewLoad("order", "ord-2", 200, false);
      drillAnalytics.trackPreviewLoad("product", "prod-1", 50, false);

      const perf = drillAnalytics.getPerformanceMetrics();
      const orderKind = perf!.loadsByKind.find((k) => k.kind === "order");
      const productKind = perf!.loadsByKind.find((k) => k.kind === "product");

      expect(orderKind!.count).toBe(2);
      expect(orderKind!.averageDuration).toBe(150);
      expect(productKind!.count).toBe(1);
      expect(productKind!.averageDuration).toBe(50);
    });
  });

  describe("clearOldEvents", () => {
    it("should remove events older than specified timestamp", () => {
      const now = Date.now();

      drillAnalytics.track("order", { id: "ord-keep" }, "preview");

      // This will clear all events older than future time
      drillAnalytics.clearOldEvents(now + 10000);

      const metrics = drillAnalytics.getMetrics();
      expect(metrics.totalEvents).toBe(0);
    });
  });

  describe("persistence", () => {
    it("should save events to localStorage", () => {
      drillAnalytics.track("order", { id: "ord-persist" }, "preview");

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should save performance metrics to localStorage", () => {
      drillAnalytics.trackPreviewLoad("order", "ord-perf", 100, false);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
