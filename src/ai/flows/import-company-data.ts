
'use server';
/**
 * @fileOverview An AI agent that can import company data from structured inputs.
 *
 * - importCompanyData - A function that imports company information, including branches and baristas.
 * - ImportCompanyDataInput - The input type for the importCompanyData function.
 * - ImportCompanyDataOutput - The return type for the importCompanyData function.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { type Company } from '@/lib/types';
import { useCompanyStore } from '@/store/use-company-store';

const CompanyInputSchema = z.object({
  name: z.string().describe("The name of the company."),
  industry: z.string().describe("The industry of the company.").optional(),
  taxNumber: z.string().describe("The tax number of the company.").optional(),
  email: z.string().email().describe("The main email of the company.").optional(),
  location: z.string().describe("The main location/address of the company.").optional(),
  managerName: z.string().describe("The name of the company manager.").optional(),
  // Add any other top-level company fields here
});

const BranchInputSchema = z.object({
  name: z.string().describe("The name of the branch."),
  location: z.string().describe("The physical location of the branch."),
  email: z.string().email().describe("The contact email for the branch.").optional(),
  machineOwned: z.boolean().describe("Whether the machine at this branch is owned."),
  // Add any other branch-specific fields here
});

const BaristaInputSchema = z.object({
  name: z.string().describe("The barista's name."),
  phoneNumber: z.string().describe("The barista's phone number."),
  rating: z.number().int().min(1).max(5).describe("The barista's rating (1-5).").optional(),
  notes: z.string().describe("Any additional notes about the barista.").optional(),
});

const ImportCompanyDataInputSchema = z.object({
  company: CompanyInputSchema.describe("The main company data."),
  branches: z.array(BranchInputSchema.extend({
    baristas: z.array(BaristaInputSchema).optional(),
  })).optional().describe("An array of branch data, each with optional baristas."),
});
export type ImportCompanyDataInput = z.infer<typeof ImportCompanyDataInputSchema>;

const ImportCompanyDataOutputSchema = z.object({
  companyId: z.string().describe("The ID of the newly created or updated company."),
  success: z.boolean().default(true),
  companiesCreated: z.number().default(1),
  message: z.string().optional(),
});
export type ImportCompanyDataOutput = z.infer<typeof ImportCompanyDataOutputSchema>;

// Export the combined type for company data import
export type CompanyData = z.infer<typeof ImportCompanyDataInputSchema>;

export const importCompanyDataFlow = ai.defineFlow(
  {
    name: 'importCompanyDataFlow',
    inputSchema: ImportCompanyDataInputSchema,
    outputSchema: ImportCompanyDataOutputSchema,
  },
  async (input) => {
    const { company, branches } = input;

    try {
      // In a real application, you would interact with your database
      // and authentication system here.
      // For this example, we'll simulate the storage and ID generation.
      const { addCompanyAndRelatedData } = useCompanyStore.getState();

      // 1. Create/Update the main company
      
      const companyToCreate: Partial<Omit<Company, 'id'>> = {
          name: company.name,
          industry: company.industry || 'Unspecified',
          taxNumber: company.taxNumber,
          email: company.email,
          location: company.location || null,
          isBranch: false,
          region: 'A', // Default or infer as needed
          createdAt: new Date().toISOString(),
          machineOwned: false,
      };
      
      const branchesToCreate = branches?.map(b => ({ ...b, performanceScore: 0 }));

      // Simulate saving company (replace with actual database logic)
      const newCompany = await addCompanyAndRelatedData(companyToCreate, branchesToCreate);

      return {
        companyId: newCompany.id,
        success: true,
        companiesCreated: 1,
        message: "Company data imported successfully"
      };
    } catch (error) {
      console.error("Failed to import company data:", error);
      return {
        companyId: "",
        success: false,
        companiesCreated: 0,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
);

export async function importCompanyData(input: ImportCompanyDataInput): Promise<ImportCompanyDataOutput> {
  const result = await importCompanyDataFlow(input);
  return {
    companyId: result.companyId,
    success: true,
    companiesCreated: 1,
    message: "Company data imported successfully",
  };
}
