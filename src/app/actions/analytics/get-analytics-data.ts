'use server';

import { AnalyticsQuery, AnalyticsQuerySchema, AnalyticsResponse, TimeSeriesPoint } from './types';
import { supabaseAdmin } from '@/lib/supabase';
import { startOfDay, endOfDay, eachDayOfInterval, format, parseISO, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, subDays, differenceInDays } from 'date-fns';
import { Order } from '@/lib/types';
import { logger } from '@/lib/logger';

export type DrilldownRequest = {
    value: string; // The date or category label
    type: 'date' | 'category' | 'product';
    context: Partial<AnalyticsQuery>;
};

/**
 * Server Action: Fetch Real Analytics Data
 */
export async function getAnalyticsData(input: AnalyticsQuery): Promise<AnalyticsResponse> {
    try {
        const validated = AnalyticsQuerySchema.parse(input);
        const { dateRange, granularity, entityType, entityId } = validated;

        // 2b. Calculate Previous Period
        const duration = differenceInDays(dateRange.to, dateRange.from) + 1;
        const prevStart = subDays(dateRange.from, duration);
        const prevEnd = subDays(dateRange.to, duration);

        // DEBUG: Log date range
        console.log('[Analytics Debug] Date Range:', {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString(),
            duration
        });

        // DEBUG: Check if ANY orders exist in DB
        const { data: totalOrdersCheck, count: totalOrderCount } = await supabaseAdmin
            .from('orders')
            .select('id, orderDate', { count: 'exact', head: false })
            .limit(5);
        console.log('[Analytics Debug] Total orders in DB (sample):', totalOrderCount, 'Sample dates:', totalOrdersCheck?.map(o => o.orderDate));

        // PERFORMANCE OPTIMIZATION: Pre-fetch entity-specific data ONCE
        let salesAccountCodes: string[] | null = null;
        let areaCompanyIds: string[] | null = null;

        if (entityType === 'client' && entityId) {
            const { data: salesAccount, error: salesAccountError } = await supabaseAdmin
                .from('sales_accounts')
                .select('codes')
                .eq('id', entityId)
                .single();

            if (salesAccountError) {
                logger.error(salesAccountError, { component: 'getAnalyticsData', action: 'prefetchSalesAccountCodes' });
            }
            salesAccountCodes = salesAccount?.codes || null;
        } else if (entityType === 'area' && entityId) {
            const { data: companies, error: companiesError } = await supabaseAdmin
                .from('companies')
                .select('id')
                .eq('area', entityId);

            if (companiesError) {
                logger.error(companiesError, { component: 'getAnalyticsData', action: 'prefetchAreaCompanies' });
            }
            areaCompanyIds = companies?.map((c: { id: string }) => c.id) || null;
        }

        // FETCH PRODUCT METADATA (Crucial for Category Mapping & Product Names)
        const { data: allProducts, error: productMetaError } = await supabaseAdmin
            .from('products')
            .select('id, name, category, stock, price');

        if (productMetaError) {
            logger.error(productMetaError, { component: 'getAnalyticsData', action: 'fetchAllProducts' });
        }

        const productMap = new Map<string, { name: string; category: string; stock: number; price: number }>();
        allProducts?.forEach((p: any) => {
            productMap.set(p.id, {
                name: p.name,
                category: p.category || 'Uncategorized',
                stock: p.stock || 0,
                price: p.price || 0
            });
        });

        // Optimization: Select specific columns
        const ORDER_COLUMNS = 'id, orderDate, grandTotal, total, status, companyId, companyName, customerAccount, area, items';

        const buildQuery = async (startDate: Date, endDate: Date) => {
            let q = supabaseAdmin
                .from('orders')
                .select(ORDER_COLUMNS)
                .neq('status', 'Cancelled') // Base filter
                .gte('orderDate', startDate.toISOString())
                .lte('orderDate', endDate.toISOString())
                .order('orderDate', { ascending: false })
                .limit(10000);

            if (entityType === 'client' && entityId) {
                if (salesAccountCodes && salesAccountCodes.length > 0) {
                    const result = await q;
                    if (result.error) return { data: [], error: result.error };

                    const filtered = (result.data || []).filter((order: { customerAccount?: string }) => {
                        const acc = order.customerAccount?.toString().trim();
                        if (!acc) return false;
                        return salesAccountCodes!.some((code: string) => acc.startsWith(code));
                    });
                    return { data: filtered, error: null };
                } else {
                    return { data: [], error: null };
                }
            } else if (entityType === 'area' && entityId) {
                if (areaCompanyIds && areaCompanyIds.length > 0) {
                    q = q.in('companyId', areaCompanyIds);
                } else {
                    return { data: [], error: null };
                }
            }
            return await q;
        };

        const fetchCancellations = async (startDate: Date, endDate: Date) => {
            let q = supabaseAdmin
                .from('orders')
                .select('id, items, companyId')
                .eq('status', 'Cancelled')
                .gte('orderDate', startDate.toISOString())
                .lte('orderDate', endDate.toISOString());

            return await q;
        }

        const [currentResult, prevResult, rpcSummaryResult, cancellationResult] = await Promise.all([
            buildQuery(dateRange.from, dateRange.to),
            buildQuery(prevStart, prevEnd),
            // PHASE 5: RPC Aggregation (With Time Series)
            supabaseAdmin.rpc('get_analytics_summary', {
                p_start_date: dateRange.from.toISOString(),
                p_end_date: dateRange.to.toISOString(),
                p_prev_start_date: prevStart.toISOString(),
                p_prev_end_date: prevEnd.toISOString(),
                p_entity_type: entityType,
                p_entity_id: entityId || null,
                p_sales_account_codes: salesAccountCodes || null,
                p_granularity: granularity === 'week' ? 'week'
                    : granularity === 'month' ? 'month'
                        : 'day'
            }),
            fetchCancellations(dateRange.from, dateRange.to)
        ]);

        const { data: rawOrders, error } = currentResult;
        const { data: rawPrevOrders, error: prevError } = prevResult;
        const { data: rpcSummary, error: rpcError } = rpcSummaryResult;
        const { data: rawCancellations } = cancellationResult;

        if (error) {
            logger.error(error, { component: 'getAnalyticsData', action: 'fetchCurrentOrders' });
            throw new Error('Failed to fetch analytics data');
        }

        // RAW DATA PROCESSING
        let orders = (rawOrders as Order[]) || [];
        let prevOrders = (rawPrevOrders as Order[]) || [];
        const cancelledOrders = (rawCancellations as Partial<Order>[]) || [];

        // DEBUG: Log data summary
        console.log('[Analytics Debug] entityType:', entityType, 'entityId:', entityId);
        console.log('[Analytics Debug] Raw orders count:', orders.length);
        console.log('[Analytics Debug] Sample order items:', orders[0]?.items?.slice(0, 2));

        // --- FILTERING BY ENTITY (Product / Category) ---
        if (entityType === 'product' && entityId) {
            orders = orders.filter(o => o.items?.some(item => item.productId === entityId));
            prevOrders = prevOrders.filter(o => o.items?.some(item => item.productId === entityId));
        }

        let categoryProductIds: Set<string> | null = null;
        if (entityType === 'category' && entityId) {
            const { data: catData } = await supabaseAdmin.from('categories').select('name').eq('id', entityId).single();
            const categoryName = catData?.name;
            if (categoryName) {
                const relevantProds = Array.from(productMap.entries())
                    .filter(([_, meta]) => meta.category === categoryName)
                    .map(([id]) => id);
                categoryProductIds = new Set(relevantProds);
            }
            if (categoryProductIds) {
                orders = orders.filter(o => o.items?.some(item => categoryProductIds!.has(item.productId)));
                prevOrders = prevOrders.filter(o => o.items?.some(item => categoryProductIds!.has(item.productId)));
            }
        }


        // 4. Generate Time Intervals
        let intervals: Date[];
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to);

        switch (granularity) {
            case 'week': intervals = eachWeekOfInterval({ start, end }); break;
            case 'month': intervals = eachMonthOfInterval({ start, end }); break;
            case 'day': default: intervals = eachDayOfInterval({ start, end }); break;
        }

        // 5. Aggregate Time Series
        let timeSeries: TimeSeriesPoint[] = [];

        // Helper to sum revenue for specific context
        const sumRevenue = (orderList: Order[]) => {
            return orderList.reduce((sum, o) => {
                if (entityType === 'product' && entityId) {
                    const productItems = o.items?.filter(i => i.productId === entityId) || [];
                    return sum + productItems.reduce((s, i) => s + (i.price * i.quantity), 0);
                }
                if (entityType === 'category' && categoryProductIds) {
                    const catItems = o.items?.filter(i => categoryProductIds!.has(i.productId)) || [];
                    return sum + catItems.reduce((s, i) => s + (i.price * i.quantity), 0);
                }
                return sum + (o.grandTotal || o.total || 0);
            }, 0);
        };

        if (rpcSummary?.timeSeries && !['product', 'category'].includes(entityType)) {
            timeSeries = (rpcSummary.timeSeries as any[]).map(pt => ({
                date: new Date(pt.interval_start).toISOString(),
                label: granularity === 'day' ? format(new Date(pt.interval_start), 'MMM dd')
                    : granularity === 'week' ? `W${format(new Date(pt.interval_start), 'w')}`
                        : format(new Date(pt.interval_start), 'MMM yyyy'),
                revenue: pt.revenue,
                orders: pt.order_count,
                previousValue: 0,
                previousOrders: 0,
                previousAov: 0,
                aov: pt.order_count > 0 ? pt.revenue / pt.order_count : 0,
                activeClients: pt.active_clients,
                previousActiveClients: 0
            }));
            timeSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
            timeSeries = intervals.map(date => {
                let label = '';
                let periodOrders: Order[] = [];

                if (granularity === 'day') {
                    label = format(date, 'MMM dd');
                    periodOrders = orders.filter(o => isSameDay(parseISO(o.orderDate), date));
                } else if (granularity === 'week') {
                    label = `W${format(date, 'w')}`;
                    periodOrders = orders.filter(o => {
                        const d = parseISO(o.orderDate);
                        return d >= startOfWeek(date) && d <= endOfWeek(date);
                    });
                } else {
                    label = format(date, 'MMM yyyy');
                    periodOrders = orders.filter(o => {
                        const d = parseISO(o.orderDate);
                        return d >= startOfMonth(date) && d <= endOfMonth(date);
                    });
                }
                const pointRevenue = sumRevenue(periodOrders);
                const periodClients = new Set(periodOrders.map(o => o.companyId)).size;
                return {
                    date: date.toISOString(),
                    label,
                    revenue: pointRevenue,
                    orders: periodOrders.length,
                    aov: periodOrders.length > 0 ? pointRevenue / periodOrders.length : 0,
                    activeClients: periodClients,
                };
            });
        }

        // 6. Calculate Aggregates
        const jsTotalRevenue = sumRevenue(orders);
        const jsPrevRevenue = sumRevenue(prevOrders);
        const useRpc = rpcSummary && !['product', 'category'].includes(entityType);

        const revenueMetric = useRpc
            ? { ...rpcSummary.revenue, trend: rpcSummary.revenue.trend as 'up' | 'down' | 'neutral' }
            : calculateMetric(jsTotalRevenue, jsPrevRevenue);

        const ordersMetric = useRpc
            ? { ...rpcSummary.orders, trend: rpcSummary.orders.trend as 'up' | 'down' | 'neutral' }
            : calculateMetric(orders.length, prevOrders.length);

        // 7. Advanced Product Aggregation
        const categoryRevenue: Record<string, number> = {};
        const areaRevenue: Record<string, number> = {};

        const productStats: Record<string, {
            revenue: number;
            quantity: number;
            name: string;
            consumers: Record<string, {
                name: string;
                quantity: number;
                totalSpent: number;
                lastPurchaseDate: string;
                monthlyData: Record<string, number>;
            }>;
        }> = {};

        const affinityGraph = new Map<string, Map<string, number>>();

        orders.forEach(o => {
            if (o.area) areaRevenue[o.area] = (areaRevenue[o.area] || 0) + (o.grandTotal || o.total || 0);

            const orderItems = o.items || [];
            if (orderItems.length > 1 && entityType === 'product') {
                const hasTarget = orderItems.some(i => i.productId === entityId);
                if (hasTarget) {
                    orderItems.forEach(i => {
                        if (i.productId === entityId) return;
                        const currentMap = affinityGraph.get(entityId!) || new Map();
                        currentMap.set(i.productId, (currentMap.get(i.productId) || 0) + 1);
                        affinityGraph.set(entityId!, currentMap);
                    });
                }
            }

            orderItems.forEach(item => {
                if (entityType === 'product' && entityId && item.productId !== entityId) return;
                if (entityType === 'category' && categoryProductIds && !categoryProductIds.has(item.productId)) return;

                const meta = productMap.get(item.productId);
                const realCategory = meta?.category || 'Uncategorized';
                const lineTotal = item.price * item.quantity;

                categoryRevenue[realCategory] = (categoryRevenue[realCategory] || 0) + lineTotal;

                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        revenue: 0,
                        quantity: 0,
                        name: meta?.name || item.productName || 'Unknown Product',
                        consumers: {}
                    };
                }
                productStats[item.productId].revenue += lineTotal;
                productStats[item.productId].quantity += item.quantity;

                // Consumer Data
                if (o.companyId) {
                    const existingConsumer = productStats[item.productId].consumers[o.companyId] || {
                        name: o.companyName || 'Unknown Client',
                        quantity: 0,
                        totalSpent: 0,
                        lastPurchaseDate: o.orderDate,
                        monthlyData: {} as Record<string, number>
                    };
                    existingConsumer.quantity += item.quantity;
                    existingConsumer.totalSpent += lineTotal;

                    // Track Monthly Volume
                    const monthKey = o.orderDate.substring(0, 7); // YYYY-MM
                    existingConsumer.monthlyData[monthKey] = (existingConsumer.monthlyData[monthKey] || 0) + item.quantity;

                    if (new Date(o.orderDate) > new Date(existingConsumer.lastPurchaseDate)) {
                        existingConsumer.lastPurchaseDate = o.orderDate;
                    }
                    productStats[item.productId].consumers[o.companyId] = existingConsumer;
                }
            });
        });

        // Convert Product Stats (Rich Data for UI Compatibility)
        const unsortedProducts = Object.entries(productStats)
            .map(([id, stat]) => {
                const totalQty = stat.quantity;
                const productMeta = productMap.get(id);

                // Build topClients array from consumers  
                const topClients = Object.entries(stat.consumers)
                    .map(([clientId, consumerData]) => {
                        const months = Object.keys(consumerData.monthlyData);
                        const totalMonths = months.length || 1;

                        // Average Monthly Consumption
                        const avgMonthlyConsumption = consumerData.quantity / totalMonths;

                        // Projected Growth: Compare last 2 months vs previous 2 months
                        let projectedGrowth = 0;
                        if (months.length >= 4) {
                            const sortedMonths = months.sort();
                            const recentTwo = sortedMonths.slice(-2);
                            const previousTwo = sortedMonths.slice(-4, -2);

                            const recentSum = recentTwo.reduce((acc, m) => acc + (consumerData.monthlyData[m] || 0), 0);
                            const previousSum = previousTwo.reduce((acc, m) => acc + (consumerData.monthlyData[m] || 0), 0);

                            if (previousSum > 0) {
                                projectedGrowth = ((recentSum - previousSum) / previousSum) * 100;
                            }
                        }

                        return {
                            id: clientId,
                            name: consumerData.name,
                            quantity: consumerData.quantity,
                            percentage: totalQty > 0 ? (consumerData.quantity / totalQty) * 100 : 0,
                            totalSpent: consumerData.totalSpent,
                            lastActive: consumerData.lastPurchaseDate,
                            avgMonthlyConsumption,
                            projectedGrowth,
                        };
                    })
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 20); // Top 20 consumers

                return {
                    productId: id,
                    id, // Alias for UI compatibility
                    name: stat.name,
                    category: productMeta?.category || 'Uncategorized',
                    revenue: stat.revenue,
                    quantity: stat.quantity,
                    totalUnits: stat.quantity, // Alias
                    percentageOfTotal: 0, // Will be calculated after sorting
                    consumptionRate: 0, // TODO: Calculate if needed
                    trend: 'neutral' as const,
                    cumulativePercentage: 0, // Will be calculated after sorting
                    topClients,
                };
            })
            .sort((a, b) => b.revenue - a.revenue);

        // Calculate percentages after sorting
        let cumulative = 0;
        const sortedProducts = unsortedProducts.map(p => {
            const pct = jsTotalRevenue > 0 ? (p.revenue / jsTotalRevenue) * 100 : 0;
            cumulative += pct;
            return {
                ...p,
                percentageOfTotal: pct,
                cumulativePercentage: cumulative,
            };
        });

        const meta = productMap.get(entityId || '');


        // Convert Category Stats
        const topCategories = Object.entries(categoryRevenue)
            .map(([name, val]) => ({
                name,
                revenue: val,
                percentageOfTotal: (val / jsTotalRevenue) * 100,
                change: 0, trend: 'neutral' as const
            }))
            .sort((a, b) => b.revenue - a.revenue);

        // Convert Area Stats
        const topAreas = Object.entries(areaRevenue)
            .map(([name, val]) => ({
                name,
                revenue: val,
                percentageOfTotal: (val / jsTotalRevenue) * 100,
                change: 0, trend: 'neutral' as const
            }))
            .sort((a, b) => b.revenue - a.revenue);

        // --- METRICS ---

        // Return Rate
        let meaningfulTotalOrders = orders.length; // Approximate
        let meaningfulCancelledCount = 0;

        if (entityType === 'product' && entityId) {
            meaningfulCancelledCount = cancelledOrders.filter(o =>
                o.items?.some(i => i.productId === entityId)
            ).length;
        } else {
            meaningfulCancelledCount = cancelledOrders.length;
        }

        const returnRateMetric = {
            value: meaningfulTotalOrders > 0 ? (meaningfulCancelledCount / (meaningfulTotalOrders + meaningfulCancelledCount)) * 100 : 0,
            change: 0,
            trend: 'neutral' as const
        };

        // Bundle Affinity
        const affinityMap = entityType === 'product' && entityId ? affinityGraph.get(entityId) : null;
        let affinityData = [];
        if (affinityMap) {
            affinityData = Array.from(affinityMap.entries())
                .map(([pid, count]) => {
                    const meta = productMap.get(pid);
                    return {
                        id: pid,
                        name: meta?.name || 'Unknown',
                        correlationScore: count
                    };
                })
                .sort((a, b) => b.correlationScore - a.correlationScore)
                .slice(0, 3);
        }

        // Repeat Purchase Rate
        const clientOrderCounts = new Map<string, number>();
        orders.forEach(o => {
            if (o.companyId) clientOrderCounts.set(o.companyId, (clientOrderCounts.get(o.companyId) || 0) + 1);
        });
        const repeatClients = Array.from(clientOrderCounts.values()).filter(count => count > 1).length;
        const totalUniqueClients = clientOrderCounts.size;

        const repeatRateMetric = {
            value: totalUniqueClients > 0 ? (repeatClients / totalUniqueClients) * 100 : 0,
            change: 0,
            trend: 'neutral' as const
        };

        // Stock Level
        let stockLevelMetric = undefined;
        if (entityType === 'product' && entityId) {
            const meta = productMap.get(entityId);
            if (meta) stockLevelMetric = { value: meta.stock, change: 0, trend: 'neutral' as const };
        }

        return {
            summary: {
                revenue: revenueMetric,
                orders: ordersMetric,
                aov: {
                    value: orders.length > 0 ? jsTotalRevenue / orders.length : 0,
                    change: 0, trend: 'neutral'
                },
                activeClients: {
                    value: totalUniqueClients,
                    change: 0, trend: 'neutral'
                },
                newClients: { value: 0, change: 0, trend: 'neutral' },
                returnRate: returnRateMetric,
                repeatPurchaseRate: repeatRateMetric,
                stockLevel: stockLevelMetric,
                stockTurnover: undefined,
                inventoryRisk: [],
                operational: undefined as any,
                debtAging: undefined as any,
                clientRetention: undefined as any,
                forecast: undefined as any,
                customerSegments: undefined as any,
                productConsumption: sortedProducts,
                productAffinity: affinityData
            },
            timeSeries,
            topProducts: sortedProducts,
            topCategories,
            topAreas,
            serverDiagnostics: {
                queryDuration: 0,
                cached: false
            }
        };

    } catch (error) {
        logger.error(error, { component: 'getAnalyticsData', context: 'RefactorV2' });
        return {
            summary: undefined as any,
            timeSeries: [],
            topProducts: [],
            topCategories: [],
            topAreas: [],
            serverDiagnostics: { queryDuration: 0, cached: false }
        };
    }
}

function calculateMetric(current: number, previous: number) {
    const delta = current - previous;
    const change = previous !== 0 ? (delta / previous) * 100 : 0;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (delta > 0) trend = 'up';
    if (delta < 0) trend = 'down';
    return { value: current, previousValue: previous, change, trend };
}

export async function getDrilldownData(request: DrilldownRequest): Promise<any[]> {
    try {
        const { value, type, context } = request;

        // Base query columns - reusing the optimization from getAnalyticsData
        const ORDER_COLUMNS = 'id, orderDate, grandTotal, total, status, companyId, companyName, customerAccount, area, items';

        let q = supabaseAdmin
            .from('orders')
            .select(ORDER_COLUMNS)
            .neq('status', 'Cancelled')
            .order('orderDate', { ascending: false })
            .limit(100); // Reasonable limit for drilldown view

        // Apply Context Filters (e.g. if we are already viewing a specific client's analytics)
        if (context.entityType === 'client' && context.entityId) {
            // We'd need to fetch sales codes again or assume entityId is usable.
            // For simplicity in this hotfix, we skip deep context entity filtering unless it's direct ID
            // Optimally we should refactor the shared logic from getAnalyticsData.
            // For now, let's just respect the date range from context if provided.
        }

        if (type === 'date') {
            // Value is expected to be an ISO date string or formatted date
            try {
                // Try parsing as ISO
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    q = q.gte('orderDate', startOfDay(date).toISOString())
                        .lte('orderDate', endOfDay(date).toISOString());
                }
            } catch (e) {
                logger.warn(`Invalid date for drilldown: ${value}`, { component: 'getDrilldownData' });
            }
        } else if (type === 'category') {
            // Fetch all products to find those in this category
            const { data: allProducts } = await supabaseAdmin
                .from('products')
                .select('id, category')
                .eq('category', value); // Assuming value is the Category Name

            if (allProducts && allProducts.length > 0) {
                const productIds = allProducts.map(p => p.id);
                // Unfortunately Supabase doesn't support "array contains any of" easily for JSONB arrays without some work
                // But for 'orders', 'items' is JSONB. 
                // We can use .contains() if we construct a partial object, but items is an array of objects.
                // A raw SQL or better filter approach is needed.
                // For now, let's fetch more orders and filter in memory for accuracy if the dataset isn't huge, 
                // OR use a text search on the JSON column if feasible.

                // LIMITATION: Fetching all orders and filtering is bad for scale. 
                // We will filter by date range from context first to limit scope.
                if (context.dateRange) {
                    q = q.gte('orderDate', context.dateRange.from.toISOString())
                        .lte('orderDate', context.dateRange.to.toISOString());
                }

                const { data: orders, error } = await q;
                if (error) throw error;

                const categoryProductIds = new Set(productIds);
                return (orders || []).filter(o =>
                    o.items?.some((i: any) => categoryProductIds.has(i.productId))
                );
            }
            return [];
        } else if (type === 'product') {
            // Value is Product Name or ID. Let's assume ID if it looks like a UUID, otherwise Name.
            // Usually charts pass the ID if available, but let's see. 
            // If value is Name, we resolve to ID.
            let productId = value;

            // Simple UUID check regex
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

            if (!isUUID) {
                const { data: prod } = await supabaseAdmin.from('products').select('id').eq('name', value).single();
                if (prod) productId = prod.id;
            }

            if (context.dateRange) {
                q = q.gte('orderDate', context.dateRange.from.toISOString())
                    .lte('orderDate', context.dateRange.to.toISOString());
            }

            // Filter using JSON contains for specific product ID if possible, or memory filter
            // items @> '[{"productId": "..."}]'
            q = q.contains('items', JSON.stringify([{ productId: productId }]));
        }

        const { data, error } = await q;
        if (error) throw error;

        return data || [];

    } catch (error) {
        logger.error(error, { component: 'getDrilldownData' });
        return [];
    }
}
