/** @format */

import { describe, it, expect } from "vitest";
import {
  calculateAlertPriority,
  sortAlertsByPriority,
  toAlertItems,
} from "./alert-utils";

describe("alert-utils", () => {
  it("calculates priority for low stock", () => {
    expect(
      calculateAlertPriority("Low Stock", { id: "p1", name: "X", stock: 3 })
    ).toBe("high");
    expect(
      calculateAlertPriority("Low Stock", { id: "p2", name: "Y", stock: 8 })
    ).toBe("medium");
    expect(
      calculateAlertPriority("Low Stock", { id: "p3", name: "Z", stock: 12 })
    ).toBe("low");
  });

  it("sorts alerts by priority", () => {
    const alerts = toAlertItems([
      { type: "Low Stock", data: { id: "1", stock: 12 }, link: "/x" },
      { type: "Low Stock", data: { id: "2", stock: 3 }, link: "/x" },
      { type: "Tomorrow Delivery", data: { id: "3" }, link: "/x" },
    ]);
    const sorted = sortAlertsByPriority(alerts);
    expect(sorted[0].data.id).toBe("2");
  });
});
