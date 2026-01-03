import * as z from 'zod';

export const sparePartSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  price: z.number().optional(),
  paidBy: z.enum(['Client', 'Company'])
});

export const maintenanceServiceSchema = z.object({
  name: z.string().min(1, "Service name is required."),
  cost: z.number().min(0, "Cost must be non-negative."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  paidBy: z.enum(['Client', 'Company']),
});

export const visitOutcomeSchema = z.object({
  actualArrivalDate: z.coerce.date().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  delayDays: z.number().optional(),
  delayReason: z.string().optional().nullable(),
  isSignificantDelay: z.boolean().optional(),
  resolutionDate: z.coerce.date().optional().nullable(),
  technicianName: z.string().min(1, "Technician name is required."),
  baristaRecommendations: z.string().optional().nullable(),
  overallReport: z.string().optional().nullable(),
  problemOccurred: z.boolean().default(false),
  problemReasons: z.array(z.object({ reason: z.string() })).optional(),
  resolutionStatus: z.enum(['solved', 'partial', 'not_solved', 'waiting_parts']).optional(),
  nonResolutionReason: z.string().optional().nullable(),
  partialResolutionNotes: z.string().optional().nullable(),
  partsChanged: z.boolean().default(false),
  spareParts: z.array(sparePartSchema).optional(),
  services: z.array(maintenanceServiceSchema).optional(),
  laborCost: z.number().optional(),
  reportSignedBy: z.string().optional().nullable(),
  supervisorWitness: z.string().optional().nullable(),
});

export type VisitOutcomeFormData = z.infer<typeof visitOutcomeSchema>;
