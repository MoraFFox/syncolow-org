/** @format */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDrillPreviewData } from "../use-drill-preview-data";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { drillAnalytics } from "@/lib/drill-analytics";
import React from "react";

// Mock the drill analytics
vi.mock("@/lib/drill-analytics", () => ({
  drillAnalytics: {
    trackPreviewLoad: vi.fn(),
  },
}));

// Mock the drill registry
const mockFetchPreviewData = vi.fn();
vi.mock("@/lib/drilldown/registry", () => ({
  DRILL_REGISTRY: {
    order: {
      fetchPreviewData: (payload: unknown) => mockFetchPreviewData(payload),
    },
    product: {
      fetchPreviewData: (payload: unknown) => mockFetchPreviewData(payload),
    },
    company: {
      fetchPreviewData: (payload: unknown) => mockFetchPreviewData(payload),
    },
    revenue: {
      // No fetchPreviewData to test null case
    },
  },
}));

// Mock use-debounce
vi.mock("use-debounce", () => ({
  useDebounce: (value: unknown) => [value],
}));

describe("useDrillPreviewData", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    mockFetchPreviewData.mockReset();
    vi.mocked(drillAnalytics.trackPreviewLoad).mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("should return null when kind is null", async () => {
    const { result } = renderHook(
      () => useDrillPreviewData(null, { id: "123" }, true),
      { wrapper }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("should return null when payload is null", async () => {
    const { result } = renderHook(
      () => useDrillPreviewData("order", null, true),
      { wrapper }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("should return null when enabled is false", async () => {
    const { result } = renderHook(
      () => useDrillPreviewData("order", { id: "123" }, false),
      { wrapper }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("should fetch preview data for order kind", async () => {
    const mockData = { status: "Processing", total: 100 };
    mockFetchPreviewData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useDrillPreviewData("order", { id: "ord-123" }, true),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(mockFetchPreviewData).toHaveBeenCalledWith({ id: "ord-123" });
  });

  it("should fetch preview data for product kind", async () => {
    const mockData = { name: "Coffee Beans", stock: 50 };
    mockFetchPreviewData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useDrillPreviewData("product", { id: "prod-456" }, true),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
  });

  it("should track performance on successful fetch", async () => {
    const mockData = { status: "Processing" };
    mockFetchPreviewData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useDrillPreviewData("order", { id: "ord-789" }, true),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(drillAnalytics.trackPreviewLoad).toHaveBeenCalledWith(
      "order",
      "ord-789",
      expect.any(Number),
      false // cacheHit = false on first fetch
    );
  });

  it("should handle fetch errors gracefully", async () => {
    const error = new Error("Network error");
    mockFetchPreviewData.mockRejectedValue(error);

    const { result } = renderHook(
      () => useDrillPreviewData("order", { id: "ord-err" }, true),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(drillAnalytics.trackPreviewLoad).toHaveBeenCalledWith(
      "order",
      "ord-err",
      expect.any(Number),
      false,
      "Network error"
    );
  });

  it("should not fetch when entity has no fetchPreviewData", async () => {
    const { result } = renderHook(
      () => useDrillPreviewData("revenue", { value: "2023-01" }, true),
      { wrapper }
    );

    // Should not be loading since there's no fetchPreviewData
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(mockFetchPreviewData).not.toHaveBeenCalled();
  });

  it("should use entity value as fallback for entityId tracking", async () => {
    const mockData = { amount: 5000 };
    mockFetchPreviewData.mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useDrillPreviewData("company", { id: "comp-100" }, true),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(drillAnalytics.trackPreviewLoad).toHaveBeenCalledWith(
      "company",
      "comp-100",
      expect.any(Number),
      false
    );
  });

  it("should cache data and reuse on subsequent calls", async () => {
    const mockData = { status: "Shipped" };
    mockFetchPreviewData.mockResolvedValue(mockData);

    // First render
    const { result: result1 } = renderHook(
      () => useDrillPreviewData("order", { id: "ord-cache" }, true),
      { wrapper }
    );

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    expect(mockFetchPreviewData).toHaveBeenCalledTimes(1);

    // Second render with same params - should use cache
    const { result: result2 } = renderHook(
      () => useDrillPreviewData("order", { id: "ord-cache" }, true),
      { wrapper }
    );

    // Data should be immediately available from cache
    expect(result2.current.data).toEqual(mockData);
    // Should still only have 1 fetch call
    expect(mockFetchPreviewData).toHaveBeenCalledTimes(1);
  });
});
