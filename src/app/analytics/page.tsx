
"use client"
import { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useOrderStore } from "@/store/use-order-store";
import { useProductsStore } from "@/store/use-products-store";
import './page.css';
import { DollarSign, Package, Users, TrendingUp, Timer, Wrench, UserPlus, ShoppingCart, CheckCircle, Repeat } from 'lucide-react';
import { KpiCard } from './_components/kpi-card';
import { Skeleton } from "@/components/ui/skeleton";

const ChartsVisuals = lazy(() => import("./_components/charts-visuals").then(m => ({ default: m.ChartsVisuals })));
const YearComparisonChart = lazy(() => import("./_components/year-comparison-chart").then(m => ({ default: m.YearComparisonChart })));
const RevenueForecastChart = lazy(() => import("./_components/revenue-forecast-chart").then(m => ({ default: m.RevenueForecastChart })));
const InventoryReport = lazy(() => import("./_components/inventory-report").then(m => ({ default: m.InventoryReport })));
const CustomerReport = lazy(() => import("./_components/customer-report").then(m => ({ default: m.CustomerReport })));
import { differenceInMilliseconds, differenceInDays, parseISO, format, subMonths, subDays, parse, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { useCompanyStore } from "@/store/use-company-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { RevenueDeepDiveDialog } from "./_components/revenue-deep-dive-dialog";
import { DateRangePicker } from "./_components/date-range-picker";
import { Button } from "@/components/ui/button";
import { Printer, RefreshCw } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";


export default function AnalyticsPage() {
    const { analyticsOrders, analyticsLoading, fetchOrdersByDateRange } = useOrderStore();
    const { products } = useProductsStore();
    const { companies } = useCompanyStore();
    const { maintenanceVisits } = useMaintenanceStore();
    const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [dateRange, setDateRange] = useState<{ from: string, to: string }>({
        from: format(subMonths(new Date(), 5), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd')
    });
    const analytics = useMemo(() => {
        const fromDate = parse(dateRange.from, 'yyyy-MM-dd', new Date());
        const toDate = parse(dateRange.to, 'yyyy-MM-dd', new Date());
        const start = startOfDay(fromDate);
        const end = endOfDay(toDate);

        const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        const prevStart = startOfDay(new Date(fromDate.getTime() - periodDays * 24 * 60 * 60 * 1000));
        const prevEnd = startOfDay(new Date(fromDate.getTime() - 24 * 60 * 60 * 1000));

        const filteredOrders = analyticsOrders.filter(o =>
            isWithinInterval(new Date(o.orderDate), { start, end })
        );

        const prevOrders = analyticsOrders.filter(o =>
            isWithinInterval(new Date(o.orderDate), { start: prevStart, end: prevEnd })
        );

        const revenue = filteredOrders.reduce((acc, o) => acc + (o.grandTotal || o.total || 0), 0);
        const prevRevenue = prevOrders.reduce((acc, o) => acc + (o.grandTotal || o.total || 0), 0);
        const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

        const stockValue = products.reduce((acc, p) => acc + (p.price || 0) * p.stock, 0);

        const activeCustomers = new Set(filteredOrders.map(o => o.companyId)).size;
        const prevActiveCustomers = new Set(prevOrders.map(o => o.companyId)).size;
        const customerChange = prevActiveCustomers > 0 ? ((activeCustomers - prevActiveCustomers) / prevActiveCustomers) * 100 : 0;

        const outstandingReceivables = filteredOrders
            .filter(o => o.paymentStatus === 'Pending' || o.paymentStatus === 'Overdue')
            .reduce((acc, o) => acc + (o.grandTotal || o.total || 0), 0);
        const prevReceivables = prevOrders
            .filter(o => o.paymentStatus === 'Pending' || o.paymentStatus === 'Overdue')
            .reduce((acc, o) => acc + (o.grandTotal || o.total || 0), 0);
        const receivablesChange = prevReceivables > 0 ? ((outstandingReceivables - prevReceivables) / prevReceivables) * 100 : 0;

        let totalDeliveryMilliseconds = 0;
        let deliveredOrderCount = 0;
        filteredOrders.forEach(order => {
            if (order.statusHistory && order.statusHistory.length > 1) {
                const shippedEntry = order.statusHistory.find(h => h.status === 'Shipped');
                const deliveredEntry = order.statusHistory.find(h => h.status === 'Delivered');

                if (shippedEntry && deliveredEntry) {
                    const shippedDate = new Date(shippedEntry.timestamp);
                    const deliveredDate = new Date(deliveredEntry.timestamp);
                    totalDeliveryMilliseconds += differenceInMilliseconds(deliveredDate, shippedDate);
                    deliveredOrderCount++;
                }
            }
        });

        const avgDeliveryHours = deliveredOrderCount > 0 ? (totalDeliveryMilliseconds / deliveredOrderCount) / (1000 * 60 * 60) : 0;
        const avgDeliveryDays = avgDeliveryHours / 24;

        let prevTotalDeliveryMilliseconds = 0;
        let prevDeliveredOrderCount = 0;
        prevOrders.forEach(order => {
            if (order.statusHistory && order.statusHistory.length > 1) {
                const shippedEntry = order.statusHistory.find(h => h.status === 'Shipped');
                const deliveredEntry = order.statusHistory.find(h => h.status === 'Delivered');
                if (shippedEntry && deliveredEntry) {
                    const shippedDate = new Date(shippedEntry.timestamp);
                    const deliveredDate = new Date(deliveredEntry.timestamp);
                    prevTotalDeliveryMilliseconds += differenceInMilliseconds(deliveredDate, shippedDate);
                    prevDeliveredOrderCount++;
                }
            }
        });
        const prevAvgDeliveryDays = prevDeliveredOrderCount > 0 ? (prevTotalDeliveryMilliseconds / prevDeliveredOrderCount) / (1000 * 60 * 60 * 24) : 0;
        const deliveryChange = prevAvgDeliveryDays > 0 ? ((avgDeliveryDays - prevAvgDeliveryDays) / prevAvgDeliveryDays) * 100 : 0;

        const filteredMaintenanceVisits = maintenanceVisits.filter(v =>
            isWithinInterval(new Date(v.date), { start, end })
        );

        const completedCases = filteredMaintenanceVisits.filter(
            v => !v.rootVisitId && v.status === 'Completed' && v.resolutionTimeDays !== undefined
        );

        const totalMaintenanceDays = completedCases.reduce((sum, v) => sum + (v.resolutionTimeDays || 0), 0);
        const avgMaintenanceDays = completedCases.length > 0 ? totalMaintenanceDays / completedCases.length : 0;

        const prevMaintenanceVisits = maintenanceVisits.filter(v =>
            isWithinInterval(new Date(v.date), { start: prevStart, end: prevEnd })
        );
        const prevCompletedCases = prevMaintenanceVisits.filter(
            v => !v.rootVisitId && v.status === 'Completed' && v.resolutionTimeDays !== undefined
        );
        const prevTotalMaintenanceDays = prevCompletedCases.reduce((sum, v) => sum + (v.resolutionTimeDays || 0), 0);
        const prevAvgMaintenanceDays = prevCompletedCases.length > 0 ? prevTotalMaintenanceDays / prevCompletedCases.length : 0;
        const maintenanceChange = prevAvgMaintenanceDays > 0 ? ((avgMaintenanceDays - prevAvgMaintenanceDays) / prevAvgMaintenanceDays) * 100 : 0;

        let totalCreationDelayDays = 0;
        let convertedClientCount = 0;

        const potentialOrders = filteredOrders.filter(o => o.isPotentialClient && o.temporaryCompanyName);
        const parentCompanies = companies.filter(c => !c.isBranch);

        potentialOrders.forEach(order => {
            const matchedCompany = parentCompanies.find(c => c.name === order.temporaryCompanyName);
            if (matchedCompany && matchedCompany.createdAt) {
                const orderDate = parseISO(order.orderDate);
                const creationDate = parseISO(matchedCompany.createdAt);
                const delay = differenceInDays(creationDate, orderDate);
                if (delay >= 0) {
                    totalCreationDelayDays += delay;
                    convertedClientCount++;
                }
            }
        });


        const avgClientCreationDays = convertedClientCount > 0 ? totalCreationDelayDays / convertedClientCount : 0;

        const overdueCount = filteredOrders.filter(o => o.paymentStatus === 'Overdue').length;

        // AOV calculation
        const aov = filteredOrders.length > 0 ? revenue / filteredOrders.length : 0;
        const prevAov = prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0;
        const aovChange = prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : 0;

        // Order Fulfillment Rate
        const deliveredOrders = filteredOrders.filter(o => o.status === 'Delivered').length;
        const fulfillmentRate = filteredOrders.length > 0 ? (deliveredOrders / filteredOrders.length) * 100 : 0;
        const prevDeliveredOrders = prevOrders.filter(o => o.status === 'Delivered').length;
        const prevFulfillmentRate = prevOrders.length > 0 ? (prevDeliveredOrders / prevOrders.length) * 100 : 0;
        const fulfillmentChange = prevFulfillmentRate > 0 ? fulfillmentRate - prevFulfillmentRate : 0;

        // Conversion Rate (Potential to Registered)
        const conversionRate = potentialOrders.length > 0 ? (convertedClientCount / potentialOrders.length) * 100 : 0;

        // Payment Collection Efficiency
        const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'Paid');
        let totalPaymentDays = 0;
        let paidOrdersWithDates = 0;
        paidOrders.forEach(order => {
            if (order.statusHistory) {
                const deliveredEntry = order.statusHistory.find(h => h.status === 'Delivered');
                const paidDate = order.paidDate ? parseISO(order.paidDate) : null;
                if (deliveredEntry && paidDate) {
                    const deliveredDate = parseISO(deliveredEntry.timestamp);
                    const daysToPay = differenceInDays(paidDate, deliveredDate);
                    if (daysToPay >= 0) {
                        totalPaymentDays += daysToPay;
                        paidOrdersWithDates++;
                    }
                }
            }
        });
        const avgPaymentDays = paidOrdersWithDates > 0 ? totalPaymentDays / paidOrdersWithDates : 0;
        const onTimePayments = paidOrders.filter(o => {
            if (!o.statusHistory || !o.paidDate) return false;
            const deliveredEntry = o.statusHistory.find(h => h.status === 'Delivered');
            if (!deliveredEntry) return false;
            const daysToPay = differenceInDays(parseISO(o.paidDate), parseISO(deliveredEntry.timestamp));
            return daysToPay <= 30;
        }).length;
        const paymentEfficiency = paidOrders.length > 0 ? (onTimePayments / paidOrders.length) * 100 : 0;

        const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
        const revenueSparkline = last7Days.map(day => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            return analyticsOrders
                .filter(o => isWithinInterval(new Date(o.orderDate), { start: dayStart, end: dayEnd }))
                .reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0);
        });

        const customerSparkline = last7Days.map(day => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            return new Set(
                analyticsOrders
                    .filter(o => isWithinInterval(new Date(o.orderDate), { start: dayStart, end: dayEnd }))
                    .map(o => o.companyId)
            ).size;
        });

        return {
            revenue,
            revenueChange,
            revenueSparkline,
            stockValue,
            activeCustomers,
            customerChange,
            customerSparkline,
            outstandingReceivables,
            receivablesChange,
            overdueCount,
            avgDeliveryDays,
            deliveryChange,
            avgMaintenanceDays,
            maintenanceChange,
            avgClientCreationDays,
            aov,
            aovChange,
            fulfillmentRate,
            fulfillmentChange,
            conversionRate,
            avgPaymentDays,
            paymentEfficiency,
        }
    }, [analyticsOrders, companies, products, maintenanceVisits, dateRange]);


    useEffect(() => {
        setLastUpdated(new Date());
    }, [analyticsOrders, products, companies, maintenanceVisits]);

    useEffect(() => {
        // Fetch wider range to account for timezone differences
        // The client-side filtering will handle the exact date range
        const from = new Date(`${dateRange.from}T00:00:00`);
        const to = new Date(`${dateRange.to}T23:59:59.999`);

        // Expand by 1 day on each side to account for timezone storage
        from.setDate(from.getDate() - 1);
        to.setDate(to.getDate() + 1);

        fetchOrdersByDateRange(from.toISOString(), to.toISOString());
    }, [dateRange, fetchOrdersByDateRange]);

    const handlePrint = () => {
        window.print();
    };

    const handleRefresh = useCallback(() => {
        setLastUpdated(new Date());
        // Force refresh data
        const from = new Date(`${dateRange.from}T00:00:00`);
        const to = new Date(`${dateRange.to}T23:59:59.999`);
        from.setDate(from.getDate() - 1);
        to.setDate(to.getDate() + 1);
        fetchOrdersByDateRange(from.toISOString(), to.toISOString(), true);
    }, [dateRange, fetchOrdersByDateRange]);

    const handleDateRangeChange = useCallback((range: { from: string; to: string }) => {
        setDateRange(range);
    }, []);


    return (
        <>
            <RevenueDeepDiveDialog
                isOpen={isRevenueDialogOpen}
                onOpenChange={setIsRevenueDialogOpen}
            />
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">Business KPI Dashboard</h1>
                            <p className="text-muted-foreground">
                                A focused overview of your inventory, sales, and financial performance.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 no-print">
                            <Button variant="outline" size="sm" onClick={handleRefresh}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <p className="text-xs text-muted-foreground">
                            Last updated: {lastUpdated.toLocaleString()}
                            {analyticsLoading && <span className="ml-2">(Loading...)</span>}
                        </p>
                        <div className="no-print">
                            <DateRangePicker
                                dateRange={dateRange}
                                onDateRangeChange={handleDateRangeChange}
                            />
                        </div>
                    </div>
                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 print-break-inside-avoid">
                    <KpiCard
                        title="Revenue"
                        value={`$${analytics.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                        icon={<DollarSign className="h-6 w-6 text-green-500" />}
                        trend={`${analytics.revenueChange >= 0 ? '+' : ''}${analytics.revenueChange.toFixed(1)}% vs previous period`}
                        trendDirection={analytics.revenueChange > 0 ? 'up' : analytics.revenueChange < 0 ? 'down' : 'neutral'}
                        isPositiveTrend={true}
                        onClick={() => setIsRevenueDialogOpen(true)}
                        className="cursor-pointer hover:bg-muted/50"
                        tooltip="Total revenue from completed orders in the selected period"
                        sparklineData={analytics.revenueSparkline}
                    />
                    <KpiCard
                        title="Stock Value"
                        value={`$${analytics.stockValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                        icon={<Package className="h-6 w-6 text-amber-500" />}
                        trend="Current inventory value"
                        trendDirection="neutral"
                        tooltip="Total value of all products in stock (price × quantity)"
                    />
                    <KpiCard
                        title="Active Customers"
                        value={analytics.activeCustomers.toString()}
                        icon={<Users className="h-6 w-6 text-indigo-500" />}
                        trend={`${analytics.customerChange >= 0 ? '+' : ''}${analytics.customerChange.toFixed(1)}% vs previous period`}
                        trendDirection={analytics.customerChange > 0 ? 'up' : analytics.customerChange < 0 ? 'down' : 'neutral'}
                        isPositiveTrend={true}
                        tooltip="Unique customers who placed orders in the selected period"
                        sparklineData={analytics.customerSparkline}
                    />
                    <KpiCard
                        title="Receivables"
                        value={`$${analytics.outstandingReceivables.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                        icon={<TrendingUp className="h-6 w-6 text-orange-500" />}
                        trend={`${analytics.overdueCount} overdue invoice${analytics.overdueCount !== 1 ? 's' : ''}`}
                        trendDirection={analytics.receivablesChange > 0 ? 'up' : analytics.receivablesChange < 0 ? 'down' : 'neutral'}
                        isPositiveTrend={false}
                        tooltip="Total pending and overdue payments from customers"
                    />
                    <KpiCard
                        title="Avg. Delivery Time"
                        value={`${analytics.avgDeliveryDays.toFixed(1)} days`}
                        icon={<Timer className="h-6 w-6 text-cyan-500" />}
                        trend={`${analytics.deliveryChange >= 0 ? '+' : ''}${analytics.deliveryChange.toFixed(1)}% vs previous period`}
                        trendDirection={analytics.deliveryChange > 0 ? 'up' : analytics.deliveryChange < 0 ? 'down' : 'neutral'}
                        isPositiveTrend={false}
                        tooltip="Average time from 'Shipped' to 'Delivered' status"
                    />
                    <KpiCard
                        title="Avg. Maintenance Time"
                        value={`${analytics.avgMaintenanceDays.toFixed(1)} days`}
                        icon={<Wrench className="h-6 w-6 text-purple-500" />}
                        trend={`${analytics.maintenanceChange >= 0 ? '+' : ''}${analytics.maintenanceChange.toFixed(1)}% vs previous period`}
                        trendDirection={analytics.maintenanceChange > 0 ? 'up' : analytics.maintenanceChange < 0 ? 'down' : 'neutral'}
                        isPositiveTrend={false}
                        tooltip="Average time from maintenance request to completion"
                    />
                    <KpiCard
                        title="Avg. Client Creation Delay"
                        value={`${analytics.avgClientCreationDays.toFixed(1)} days`}
                        icon={<UserPlus className="h-6 w-6 text-pink-500" />}
                        trend="From potential to registered"
                        trendDirection="neutral"
                        tooltip="Average time from first order to client registration"
                    />
                    <KpiCard
                        title="Avg. Order Value"
                        value={`$${analytics.aov.toFixed(2)}`}
                        icon={<ShoppingCart className="h-6 w-6 text-blue-500" />}
                        trend={`${analytics.aovChange >= 0 ? '+' : ''}${analytics.aovChange.toFixed(1)}% vs previous period`}
                        trendDirection={analytics.aovChange > 0 ? 'up' : analytics.aovChange < 0 ? 'down' : 'neutral'}
                        isPositiveTrend={true}
                        tooltip="Average revenue per order (Total Revenue / Number of Orders)"
                    />
                    <KpiCard
                        title="Order Fulfillment Rate"
                        value={`${analytics.fulfillmentRate.toFixed(1)}%`}
                        icon={<CheckCircle className="h-6 w-6 text-emerald-500" />}
                        trend={`${analytics.fulfillmentChange >= 0 ? '+' : ''}${analytics.fulfillmentChange.toFixed(1)}% vs previous period`}
                        trendDirection={analytics.fulfillmentChange > 0 ? 'up' : analytics.fulfillmentChange < 0 ? 'down' : 'neutral'}
                        isPositiveTrend={true}
                        tooltip="Percentage of orders successfully delivered"
                    />
                    <KpiCard
                        title="Conversion Rate"
                        value={`${analytics.conversionRate.toFixed(1)}%`}
                        icon={<Repeat className="h-6 w-6 text-violet-500" />}
                        trend="Potential to registered clients"
                        trendDirection="neutral"
                        tooltip="Percentage of potential clients that became registered customers"
                    />
                    <KpiCard
                        title="Avg. Payment Time"
                        value={`${analytics.avgPaymentDays.toFixed(1)} days`}
                        icon={<Timer className="h-6 w-6 text-rose-500" />}
                        trend={`${analytics.paymentEfficiency.toFixed(0)}% paid within 30 days`}
                        trendDirection="neutral"
                        tooltip="Average days from delivery to payment received"
                    />
                </div>

                <Suspense fallback={<div className="space-y-4"><Skeleton className="h-[400px] w-full" /><Skeleton className="h-[400px] w-full" /></div>}>
                    <ErrorBoundary>
                        <div className="print-break-inside-avoid">
                            <ChartsVisuals dateRange={dateRange} />
                        </div>
                    </ErrorBoundary>
                </Suspense>

                <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Skeleton className="h-[300px]" /><Skeleton className="h-[300px]" /></div>}>
                    <ErrorBoundary>
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Advanced Analytics</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <YearComparisonChart />
                                <RevenueForecastChart />
                            </div>
                        </div>
                    </ErrorBoundary>
                </Suspense>

                <Suspense fallback={<div className="space-y-6"><Skeleton className="h-[400px] w-full" /><Skeleton className="h-[400px] w-full" /></div>}>
                    <ErrorBoundary>
                        <div className="print-break-inside-avoid">
                            <h2 className="text-2xl font-bold mb-4">Drill-Down Reports</h2>
                            <div className="flex flex-col gap-6">
                                <InventoryReport dateRange={dateRange} />
                                <CustomerReport dateRange={dateRange} />
                            </div>
                        </div>
                    </ErrorBoundary>
                </Suspense>
            </div>
        </>
    );
}
