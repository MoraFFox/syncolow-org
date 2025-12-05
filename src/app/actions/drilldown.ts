"use server";

import { getCompanyPreview, getProductPreview, getBranchPreview } from "@/lib/drilldown/data-service";
import { DrillPayload } from "@/lib/drilldown-types";

export async function fetchProductPreviewAction(payload: DrillPayload<"product">) {
  if (!payload.id) return null;
  try {
    return await getProductPreview(payload.id);
  } catch (error) {
    console.error("Failed to fetch product preview:", error);
    return null;
  }
}

export async function fetchCompanyPreviewAction(payload: DrillPayload<"company">) {
  if (!payload.id) return null;
  try {
    return await getCompanyPreview(payload.id);
  } catch (error) {
    console.error("Failed to fetch company preview:", error);
    return null;
  }
}

export async function fetchBranchPreviewAction(payload: DrillPayload<"branch">) {
  if (!payload.id) return null;
  try {
    return await getBranchPreview(payload.id);
  } catch (error) {
    console.error("Failed to fetch branch preview:", error);
    return null;
  }
}
