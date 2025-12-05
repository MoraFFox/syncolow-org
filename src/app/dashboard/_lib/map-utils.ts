/** @format */

import type { LatLngTuple } from "leaflet";

export function computeZoomToFit(coordsList: LatLngTuple[]) {
  const lats = coordsList.map((c) => c[0]);
  const lngs = coordsList.map((c) => c[1]);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);
  const center = { lat: (latMin + latMax) / 2, lng: (lngMin + lngMax) / 2 };
  const latRange = latMax - latMin;
  const lngRange = lngMax - lngMin;
  let zoom = 8;
  const range = Math.max(latRange, lngRange);
  if (range > 10) zoom = 6;
  else if (range > 5) zoom = 8;
  else if (range > 1) zoom = 10;
  else zoom = 12;

  return { center, zoom };
}
