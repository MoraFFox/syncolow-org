'use client';

import { useState, useCallback } from 'react';
import { AnalyticsQuery } from '@/app/actions/analytics/types';
import { getDrilldownData } from '@/app/actions/analytics/get-analytics-data';

export type DrilldownType = 'date' | 'category' | 'product';

export interface DrilldownState {
    isOpen: boolean;
    type: DrilldownType | null;
    value: string | null; // e.g., '2024-05-21' or 'Coffee Category'
    label: string | null; // Display name
    queryContext: Partial<AnalyticsQuery> | null; // Context from the parent dashboard
    data: any[] | null;
    loading: boolean;
}

export function useAnalyticsDrilldown() {
    const [state, setState] = useState<DrilldownState>({
        isOpen: false,
        type: null,
        value: null,
        label: null,
        queryContext: null,
        data: null,
        loading: false,
    });

    const openDrilldown = useCallback(async (
        value: string,
        label: string,
        type: DrilldownType,
        queryContext: Partial<AnalyticsQuery>
    ) => {
        setState(prev => ({
            ...prev,
            isOpen: true,
            loading: true,
            type,
            value,
            label,
            queryContext
        }));

        try {
            // Fetch drilldown data
            const data = await getDrilldownData({
                value,
                type,
                context: queryContext
            });

            setState(prev => ({
                ...prev,
                loading: false,
                data
            }));
        } catch (error) {
            console.error("Drilldown fetch error:", error);
            setState(prev => ({
                ...prev,
                loading: false,
                data: []
            }));
        }
    }, []);

    const closeDrilldown = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return {
        drilldownState: state,
        openDrilldown,
        closeDrilldown
    };
}
