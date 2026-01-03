'use client';

import { useQuery } from "@tanstack/react-query";
import { getAnalyticsData } from "@/app/actions/analytics/get-analytics-data";
import { AnalyticsQuery } from "@/app/actions/analytics/types";

// Allow callers to omit fields that have Zod defaults
type AnalyticsQueryInput = Omit<AnalyticsQuery, 'comparisonMode' | 'metrics'> & {
    comparisonMode?: AnalyticsQuery['comparisonMode'];
    metrics?: AnalyticsQuery['metrics'];
};

// Default metrics - defined outside component to maintain referential equality
const DEFAULT_METRICS = ['revenue', 'orders'] as const;

export function useAnalyticsData(query: AnalyticsQueryInput) {
    // Apply defaults for optional fields
    const fullQuery: AnalyticsQuery = {
        ...query,
        comparisonMode: query.comparisonMode ?? 'previous',
        metrics: query.metrics ?? [...DEFAULT_METRICS],
    };

    // Serialize ALL non-primitive values for stable query key
    // React Query uses referential equality, so new objects/arrays = new key = new fetch
    const dateRangeKey = fullQuery.dateRange
        ? `${fullQuery.dateRange.from?.toISOString() ?? ''}-${fullQuery.dateRange.to?.toISOString() ?? ''}`
        : 'no-range';
    const metricsKey = fullQuery.metrics.sort().join(',');

    return useQuery({
        // ALL values in key must be primitives or serialized strings
        queryKey: ['analytics', fullQuery.entityType, fullQuery.entityId ?? 'global', dateRangeKey, fullQuery.granularity, fullQuery.comparisonMode, metricsKey],
        queryFn: async () => {
            return await getAnalyticsData(fullQuery);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes garbage collection

        // Optional: Keep previous data while fetching new range to avoid flicker
        placeholderData: (previousData) => previousData,
    });
}

