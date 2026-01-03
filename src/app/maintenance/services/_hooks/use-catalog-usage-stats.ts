
import { useMemo } from 'react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';

export interface UsageStats {
    count: number;
    totalSpend: number;
    lastUsed: Date | null;
}

export function useCatalogUsageStats() {
    const { maintenanceVisits } = useMaintenanceStore();

    const stats = useMemo(() => {
        const serviceStats: Record<string, UsageStats> = {};
        const partStats: Record<string, UsageStats> = {};
        const problemStats: Record<string, UsageStats> = {};

        maintenanceVisits.forEach(visit => {
            const visitDate = visit.date ? new Date(visit.date) : null;

            // Process Services
            visit.services?.forEach(service => {
                const key = (service as any).id || service.name;

                if (!serviceStats[key]) {
                    serviceStats[key] = { count: 0, totalSpend: 0, lastUsed: null };
                }

                serviceStats[key].count += 1;
                serviceStats[key].totalSpend += (service.cost * service.quantity);

                if (visitDate) {
                    if (!serviceStats[key].lastUsed || visitDate > serviceStats[key].lastUsed!) {
                        serviceStats[key].lastUsed = visitDate;
                    }
                }
            });

            // Process Parts
            visit.spareParts?.forEach(part => {
                const key = (part as any).id || part.name;

                if (!partStats[key]) {
                    partStats[key] = { count: 0, totalSpend: 0, lastUsed: null };
                }

                partStats[key].count += 1;
                partStats[key].totalSpend += ((part.price || 0) * part.quantity);

                if (visitDate) {
                    if (!partStats[key].lastUsed || visitDate > partStats[key].lastUsed!) {
                        partStats[key].lastUsed = visitDate;
                    }
                }
            });

            // Process Problems (stored as array of strings in problemReason)
            visit.problemReason?.forEach(problemName => {
                const key = problemName; // Problems are matched by name

                if (!problemStats[key]) {
                    problemStats[key] = { count: 0, totalSpend: 0, lastUsed: null };
                }

                problemStats[key].count += 1;
                // Problems don't have a cost, so totalSpend stays 0

                if (visitDate) {
                    if (!problemStats[key].lastUsed || visitDate > problemStats[key].lastUsed!) {
                        problemStats[key].lastUsed = visitDate;
                    }
                }
            });
        });

        // DEBUG: Log stats calculation
        console.log('[useCatalogUsageStats] Calculated from', maintenanceVisits.length, 'visits');
        console.log('[useCatalogUsageStats] ServiceStats keys:', Object.keys(serviceStats));
        console.log('[useCatalogUsageStats] PartStats keys:', Object.keys(partStats));
        console.log('[useCatalogUsageStats] ProblemStats keys:', Object.keys(problemStats));

        return { serviceStats, partStats, problemStats };
    }, [maintenanceVisits]);

    return stats;
}
