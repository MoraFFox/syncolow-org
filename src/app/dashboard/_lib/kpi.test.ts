/** @format */

import { describe, it, expect } from "vitest";
import { computeKpis } from "./kpi";

describe("computeKpis", () => {
  it("computes correct KPI counts for today", () => {
    const isoNow = new Date().toISOString();

    const orders = [
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
      } as any,
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
      } as any,
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
      } as any,
    ];

    const products = [
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
    ] as any;

    const maintenanceVisits = [
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
    ] as any;

    const result = computeKpis(orders, products, maintenanceVisits);
    expect(result.scheduledMaintenanceToday).toBe(1);
    expect(result.deliveriesToday).toBe(2);
    expect(result.overduePayments).toBe(2);
    expect(result.lowStock).toBe(1);
  });
});
