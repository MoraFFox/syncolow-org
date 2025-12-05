/** @format */

import { describe, it, expect } from "vitest";
import { computeKpis, computeTrend, buildSparkline } from "./kpi";
import type { Order, Product, MaintenanceVisit } from "@/lib/types";

describe("computeKpis", () => {
  it("computes correct KPI counts for today", () => {
    const isoNow = new Date().toISOString();

    const orders: Order[] = [
      {
        id: "1",
        companyId: "c1",
        orderDate: isoNow,
        deliveryDate: isoNow,
        status: "Processing",
        paymentStatus: "Pending",
        subtotal: 0,
        totalTax: 0,
        grandTotal: 0,
        items: [],
        total: 0,
      },
      {
        id: "2",
        companyId: "c1",
        orderDate: isoNow,
        deliveryDate: isoNow,
        status: "Delivered",
        paymentStatus: "Overdue",
        subtotal: 0,
        totalTax: 0,
        grandTotal: 0,
        items: [],
        total: 0,
      },
      {
        id: "3",
        companyId: "c1",
        orderDate: isoNow,
        deliveryDate: isoNow,
        status: "Processing",
        paymentStatus: "Overdue",
        subtotal: 0,
        totalTax: 0,
        grandTotal: 0,
        items: [],
        total: 0,
      },
    ];

    const products: Product[] = [
      {
        id: "p1",
        name: "A",
        description: "",
        isVariant: false,
        price: 1,
        stock: 9,
        imageUrl: "",
        manufacturerId: "m1",
      },
      {
        id: "p2",
        name: "B",
        description: "",
        isVariant: false,
        price: 1,
        stock: 20,
        imageUrl: "",
        manufacturerId: "m1",
      },
    ];

    const maintenanceVisits: MaintenanceVisit[] = [
      {
        id: "mv1",
        branchId: "b1",
        companyId: "c1",
        branchName: "B1",
        companyName: "C1",
        date: isoNow,
        technicianName: "T",
        visitType: "periodic",
        maintenanceNotes: "",
        status: "Scheduled",
      },
      {
        id: "mv2",
        branchId: "b1",
        companyId: "c1",
        branchName: "B1",
        companyName: "C1",
        date: isoNow,
        technicianName: "T",
        visitType: "periodic",
        maintenanceNotes: "",
        status: "Completed",
      },
    ];

    const result = computeKpis(orders, products, maintenanceVisits);
    expect(result.scheduledMaintenanceToday).toBe(1);
    expect(result.deliveriesToday).toBe(2);
    expect(result.overduePayments).toBe(2);
    expect(result.lowStock).toBe(1);
  });

  it("computes trend percentage", () => {
    expect(computeTrend(120, 100)).toBe(20);
    expect(computeTrend(50, 100)).toBe(-50);
    expect(computeTrend(0, 0)).toBe(0);
    expect(computeTrend(10, 0)).toBe(100);
  });

  it("builds sparkline with max points", () => {
    const series = Array.from({ length: 50 }, (_, i) => i + 1);
    const compact = buildSparkline(series, 10);
    expect(compact.length).toBeLessThanOrEqual(10);
  });
});
