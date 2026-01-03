'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { DeliveryArea } from '@/lib/types';

export interface AreaStats extends DeliveryArea {
    totalRevenue: number;
    totalOrders: number;
    activeClients: number;
    averageOrderValue: number;
}

/**
 * Normalize an area name for fuzzy matching.
 * Removes whitespace, lowercases, and handles common variations.
 */
function normalizeAreaName(name: string | undefined | null): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '') // Remove all whitespace
        .replace(/[^a-z0-9\u0600-\u06FF]/gi, ''); // Keep only alphanumeric and Arabic
}

/**
 * Create a mapping from normalized order area names to defined area names.
 * This handles variations like 'Obour' -> 'Elobour', 'Tagamo' -> 'TAGMOA'.
 */
function createAreaMappings(definedAreas: DeliveryArea[]): Map<string, string> {
    const mappings = new Map<string, string>();

    // Add normalized versions of defined areas
    definedAreas.forEach(area => {
        const normalized = normalizeAreaName(area.name);
        mappings.set(normalized, area.name);
    });

    // Manual alias mappings for known variations
    // Keys are the CANONICAL area names from the DB, values are ALL known variations
    const aliases: Record<string, string[]> = {
        // English Canonical -> All variations
        'Elobour': ['obour', 'elobour', 'el obour', 'العبور', 'العبور'],
        'TAGMOA': ['tagamo', 'tagmoa', 'tagamoaa', 'tagamoa'],
        'MAADI': ['maadi', 'المعادي', 'المعادى', 'el maadi'],
        'Sherouk': ['sherouk', 'shorouk', 'shrouq', 'الشروق', 'elshorouk'],

        // Arabic Canonical -> All variations  
        'العبور': ['obour', 'elobour', 'el obour'],
        'الشروق': ['sherouk', 'shorouk', 'shrouq', 'elshorouk'],
        'وسط البلد': ['downtown', 'down town', 'وسطالبلد', 'westelbalad', 'wstelbalad'],
        'مصر الجديدة': ['misrelgad', 'misr elgadida', 'heliopolis', 'مصرالجديدة', 'misrelgad'],
        'اكتوبر ': ['6thoctobe', '6thoctober', '6october', 'october', 'اكتوبر', 'السادس'],
        'المعادي': ['maadi', 'el maadi', 'المعادى'],
        'زايد': ['zayed', 'sheikhzayed', 'sheikh zayed', 'الشيخ زايد'],
        'مدينة نصر': ['nasrcity', 'nasr city', 'nasr', 'مدينةنصر'],
        'التجمع منطقة صناعية': ['التجمع', 'industrial', 'التجمعمنطقةصناعية'],
        'شحن ': [
            'shipping', 'stores', 'شحن', 'مخازن',
            'alex', 'alexandria', 'hurg', 'hurghada',
            'sharm', 'sharm el sheikh', 'north coas', 'north coast',
            'aswan', 'lauxor', 'luxor', 'mansoura', 'tanta'
        ],
        'المطار': ['airport', 'المطار', 'مطار'],
    };

    // Add aliases to mappings
    definedAreas.forEach(area => {
        const areaAliases = aliases[area.name];
        if (areaAliases) {
            areaAliases.forEach(alias => {
                mappings.set(normalizeAreaName(alias), area.name);
            });
        }
    });

    return mappings;
}

/**
 * Area groups - areas that are duplicates (EN/AR) and should share stats.
 * Key: Any area name in the group, Value: All area names in the group.
 */
const AREA_GROUPS: Record<string, string[]> = {
    // Obour
    'Elobour': ['Elobour', 'العبور'],
    'العبور': ['Elobour', 'العبور'],
    // Maadi
    'MAADI': ['MAADI', 'المعادي'],
    'المعادي': ['MAADI', 'المعادي'],
    // Sherouk
    'Sherouk': ['Sherouk', 'الشروق'],
    'الشروق': ['Sherouk', 'الشروق'],
};

export async function getAreaStats(): Promise<{ data: AreaStats[], error: unknown }> {
    try {
        // 1. Fetch Areas
        const { data: areas, error: areaError } = await supabaseAdmin.from('areas').select('*');
        if (areaError) {
            console.error('Error fetching areas:', areaError);
            return { data: [], error: areaError };
        }

        // 2. Create area name mappings
        const areaMappings = createAreaMappings(areas as DeliveryArea[]);

        // 3. Fetch Companies (for area mapping and active clients)
        const { data: companies, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('*');

        if (companyError) {
            console.error('Error fetching companies:', companyError);
            return { data: [], error: companyError };
        }



        const companyAreaMap = new Map<string, string>();
        const areaClientCounts = new Map<string, Set<string>>();

        companies.forEach((c: { id: string; area?: string }) => {
            if (c.area) {
                const normalizedArea = normalizeAreaName(c.area);
                const mappedAreaName = areaMappings.get(normalizedArea) || c.area;
                companyAreaMap.set(c.id, mappedAreaName);

                if (!areaClientCounts.has(mappedAreaName)) {
                    areaClientCounts.set(mappedAreaName, new Set());
                }
                areaClientCounts.get(mappedAreaName)?.add(c.id);
            }
        });

        // 4. Fetch Orders (All Time)
        // Optimization: In a real high-scale app, this should be an RPC or materialized view.
        // For now, we fetch selected fields to aggregation.
        const { data: orders, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, grandTotal, total, companyId, area, status')
            .neq('status', 'Cancelled');

        if (orderError) {
            console.error('Error fetching orders:', orderError);
            return { data: [], error: orderError };
        }

        const statsMap = new Map<string, { revenue: number, orders: number, activeClients: Set<string> }>();

        orders.forEach((o: { grandTotal?: number; total?: number; companyId?: string; area?: string }) => {
            let orderArea = o.area;

            // Normalize and map the order area to a defined area
            if (orderArea) {
                const normalizedOrderArea = normalizeAreaName(orderArea);
                orderArea = areaMappings.get(normalizedOrderArea) || orderArea;
            }

            // Fallback to company area if order area is missing
            if (!orderArea && o.companyId) {
                orderArea = companyAreaMap.get(o.companyId);
            }

            if (orderArea) {
                if (!statsMap.has(orderArea)) {
                    statsMap.set(orderArea, { revenue: 0, orders: 0, activeClients: new Set() });
                }
                const current = statsMap.get(orderArea)!;
                const amount = o.grandTotal || o.total || 0;
                current.revenue += amount;
                current.orders += 1;

                if (o.companyId) {
                    current.activeClients.add(o.companyId);
                }
            }
        });

        // DEBUG: Log unmapped order areas (as warn)
        const definedAreaNames = new Set((areas as DeliveryArea[]).map(a => a.name));
        const unmappedAreas = [...statsMap.keys()].filter(key => !definedAreaNames.has(key));
        if (unmappedAreas.length > 0) {
            console.warn('[getAreaStats] Unmapped order areas (not in defined areas):', unmappedAreas);
        }

        // 5. Merge Data - aggregate from area groups for duplicates
        const result: AreaStats[] = (areas as DeliveryArea[]).map((area) => {
            // Check if this area is part of a group and aggregate stats from all group members
            const groupMembers = AREA_GROUPS[area.name] || [area.name];

            let totalRevenue = 0;
            let totalOrders = 0;
            const uniqueClients = new Set<string>();

            groupMembers.forEach(memberName => {
                const memberStats = statsMap.get(memberName);
                if (memberStats) {
                    totalRevenue += memberStats.revenue;
                    totalOrders += memberStats.orders;
                    memberStats.activeClients.forEach(clientId => uniqueClients.add(clientId));
                }

                // Also check the fallback map just in case (though orders logic is primary now)
                const fallbackClients = areaClientCounts.get(memberName);
                if (fallbackClients) {
                    fallbackClients.forEach(id => uniqueClients.add(id));
                }
            });

            return {
                ...area,
                totalRevenue,
                totalOrders,
                activeClients: uniqueClients.size,
                averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
            };
        });

        return { data: result, error: null };
    } catch (error) {
        console.error('Unexpected error in getAreaStats:', error);
        return { data: [], error: error };
    }
}
