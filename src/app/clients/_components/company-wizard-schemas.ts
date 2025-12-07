import * as z from 'zod';

export const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required."),
  position: z.string().min(1, "Position is required."),
  phoneNumbers: z.array(z.object({ number: z.string().min(1, "Phone number cannot be empty.") })),
});

export const baristaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(1, "Phone is required"),
  rating: z.number().min(1).max(5).default(3),
  notes: z.string().optional(),
});

export const maintenancePartSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  price: z.preprocess(v => parseFloat(v as string), z.number().min(0)),
  paidByClient: z.boolean().default(false),
});

export const maintenanceHistorySchema = z.object({
  date: z.date(),
  technicianName: z.string().min(1, "Technician name required"),
  visitType: z.enum(["customer_request", "periodic"]),
  maintenanceNotes: z.string().min(1, "Notes are required"),
  spareParts: z.array(maintenancePartSchema).optional(),
  baristaId: z.string().optional(),
  reportSignedBy: z.string().min(1, "Signature is required"),
});

export const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  email: z.string().email().optional().or(z.literal('')),
  location: z.string().min(1, "Location is required"),
  machineOwned: z.boolean().default(false),
  machineLeased: z.boolean().optional(),
  leaseMonthlyCost: z.number().nullable().optional().or(z.nan().transform(() => null)),
  taxNumber: z.string().optional(),
  warehouseContacts: z.array(contactSchema).optional(),
  warehouseLocation: z.string().optional(),
  baristas: z.array(baristaSchema).optional(),
  maintenanceHistory: z.array(maintenanceHistorySchema).optional(),
  contacts: z.array(contactSchema).optional(),
  region: z.enum(['A', 'B', 'Custom']).optional(),
  area: z.string().optional(),
});

export const companyWizardSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email().optional().or(z.literal('')),
  taxNumber: z.string().optional(),
  location: z.string().optional(),
  area: z.string().optional(),
  region: z.enum(['A', 'B', 'Custom']).optional(),
  contacts: z.array(contactSchema).optional(),
  hasBranches: z.enum(["yes", "no"]),
  branchCount: z.number().min(0).optional(),
  branches: z.array(branchSchema).optional(),
  // Fields for single entity
  machineOwned: z.boolean().default(false),
  machineLeased: z.boolean().optional(),
  leaseMonthlyCost: z.number().nullable().optional().or(z.nan().transform(() => null)),
  warehouseContacts: z.array(contactSchema).optional(),
  warehouseLocation: z.string().optional(),
  // Payment Configuration
  paymentMethod: z.enum(['transfer', 'check']).default('transfer'),
  paymentDueType: z.enum(['immediate', 'days_after_order', 'monthly_date']).default('days_after_order'),
  paymentDueDays: z.number().min(1).max(365).optional(),
  paymentDueDate: z.number().min(1).max(31).optional(),
}).refine((data) => {
  if (data.paymentDueType === 'days_after_order' && !data.paymentDueDays) {
    return false;
  }
  if (data.paymentDueType === 'monthly_date' && !data.paymentDueDate) {
    return false;
  }
  return true;
}, {
  message: "Payment due days or date is required based on payment type",
  path: ['paymentDueDays'],
});

export type CompanyWizardFormData = z.infer<typeof companyWizardSchema>;
