import { DrillKind, DrillPayload } from "../drilldown-types";

export async function fetchDrillPreview<K extends DrillKind>(kind: K, payload: DrillPayload<K>) {
  try {
    const response = await fetch(`/api/drilldown/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, payload })
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error("Failed to fetch drill preview", e);
    return null;
  }
}
