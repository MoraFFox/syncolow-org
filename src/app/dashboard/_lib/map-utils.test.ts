/** @format */

import { describe, it, expect } from "vitest";
import { computeZoomToFit } from "./map-utils";
import type { LatLngTuple } from "leaflet";

describe("computeZoomToFit", () => {
  it("returns higher zoom for tight clusters", () => {
    const coords: LatLngTuple[] = [
      [30.0, 31.0],
      [30.05, 31.05],
      [30.1, 31.1],
    ];
    const { center, zoom } = computeZoomToFit(coords);
    expect(center.lat).toBeGreaterThan(30.0);
    expect(center.lng).toBeGreaterThan(31.0);
    expect(zoom).toBeGreaterThanOrEqual(10);
  });

  it("returns lower zoom for wide spread", () => {
    const coords: LatLngTuple[] = [
      [25.0, 29.0],
      [35.0, 39.0],
    ];
    const { zoom } = computeZoomToFit(coords);
    expect(zoom).toBeLessThanOrEqual(8);
  });
});
