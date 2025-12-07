import * as z from 'zod';

export const orderItemSchema = z.object({
    id: z.string(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
    taxId: z.string().nullable().optional(),
    taxRate: z.number().optional(),
    discountType: z.enum(['percentage', 'fixed']).nullable().optional(),
    discountValue: z.number().nullable().optional(),
});

export const orderSchema = z.object({
    isPotentialClient: z.boolean(),
    temporaryCompanyName: z.string().optional(),
    branchId: z.string().optional(),
    region: z.enum(['A', 'B', 'Custom']).optional(),
    area: z.string().optional(),
    paymentDueDate: z.date().optional().nullable(),
    items: z.array(orderItemSchema).min(1, "Order must have at least one item."),
    discountType: z.enum(['percentage', 'fixed']).nullable().optional(),
    discountValue: z.number().optional(),
    // Calculated fields, for review step display
    subtotal: z.number().optional(),
    totalTax: z.number().optional(),
    discountAmount: z.number().optional(),
    grandTotal: z.number().optional(),
}).refine(data => {
    if (data.isPotentialClient) {
        return !!data.temporaryCompanyName && data.temporaryCompanyName.length > 0;
    }
    return !!data.branchId;
}, {
    message: "Client selection is required.",
    path: ["branchId"], // Assign error to a relevant field
});

export type OrderFormData = z.infer<typeof orderSchema>;
