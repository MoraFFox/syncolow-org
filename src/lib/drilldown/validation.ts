import { z } from "zod";
import { DrillKind, DrillPayloadMap } from "../drilldown-types";

// Helper to create optional string/number/boolean schemas
const optionalString = z.string().optional();
const optionalNumber = z.number().optional();
const optionalBoolean = z.boolean().optional();

// Define Zod schemas for each DrillKind payload
export const drillPayloadSchemas: Record<DrillKind, z.ZodType<any>> = {
  revenue: z.object({
    value: optionalString,
    granularity: z.enum(["day", "week", "month", "year"]).optional(),
    amount: optionalNumber,
  }),
  product: z.object({
    id: z.string(),
    name: optionalString,
    stock: optionalNumber,
    price: optionalNumber,
  }),
  company: z.object({
    id: z.string(),
    name: optionalString,
    status: optionalString,
    phoneNumber: optionalString,
  }),
  order: z.object({
    id: z.string(),
    total: optionalNumber,
  }),
  maintenance: z.object({
    id: z.string(),
    branchId: optionalString,
    branchName: optionalString,
    companyId: optionalString,
    companyName: optionalString,
    date: optionalString,
    technicianName: optionalString,
    status: optionalString,
    totalCost: optionalNumber,
    notes: optionalString,
    rating: optionalNumber,
  }),
  inventory: z.object({
    id: optionalString,
  }),
  customer: z.object({
    id: optionalString,
  }),
  barista: z.object({
    id: z.string(),
    name: optionalString,
    branchId: optionalString,
    branchName: optionalString,
    rating: optionalNumber,
    phoneNumber: optionalString,
  }),
  branch: z.object({
    id: z.string(),
    name: optionalString,
    companyId: optionalString,
    companyName: optionalString,
    location: optionalString,
    performanceScore: optionalNumber,
    machineOwned: optionalBoolean,
    phoneNumber: optionalString,
  }),
  manufacturer: z.object({
    id: z.string(),
    name: optionalString,
    icon: optionalString,
    productCount: optionalNumber,
    phoneNumber: optionalString,
  }),
  category: z.object({
    id: z.string(),
    name: optionalString,
    productCount: optionalNumber,
    revenue: optionalNumber,
  }),
  feedback: z.object({
    id: z.string(),
    clientId: optionalString,
    clientName: optionalString,
    rating: optionalNumber,
    sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
    message: optionalString,
    feedbackDate: optionalString,
  }),
  notification: z.object({
    id: z.string(),
    title: optionalString,
    message: optionalString,
    priority: z.enum(["critical", "warning", "info"]).optional(),
    icon: optionalString,
    source: optionalString,
    createdAt: optionalString,
    read: optionalBoolean,
    snoozedUntil: optionalString,
    actionType: optionalString, // Enums can be strict if types are known
    entityId: optionalString,
    link: optionalString,
    metadata: z.object({
        entityType: optionalString,
        entityId: optionalString,
        amount: optionalNumber,
        daysUntil: optionalNumber,
        clientName: optionalString,
        orderCount: optionalNumber,
    }).optional()
  }),
  payment: z.object({
    id: z.string(),
    orderId: z.string(),
    companyId: optionalString,
    companyName: optionalString,
    amount: optionalNumber,
    paidDate: optionalString,
    paymentMethod: z.enum(["transfer", "check"]).optional(),
    paymentReference: optionalString,
    paymentNotes: optionalString,
  }),
};

/**
 * Validates a drill payload against its schema.
 * Logs a warning if validation fails but returns the payload (permissive mode)
 * or returns null (strict mode).
 */
export function validateDrillPayload<K extends DrillKind>(
  kind: K,
  payload: unknown,
  strict = false
): DrillPayloadMap[K] | null {
  const schema = drillPayloadSchemas[kind];
  if (!schema) {
    console.warn(`No validation schema found for drill kind: ${kind}`);
    return payload as DrillPayloadMap[K];
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    console.warn(
      `Invalid payload for drill kind "${kind}":`,
      result.error.flatten()
    );
    return strict ? null : (payload as DrillPayloadMap[K]);
  }

  return result.data;
}
