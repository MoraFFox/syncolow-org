'use server';
/**
 * @fileOverview An AI agent that generates a standard service contract.
 *
 * - generateContract - A function that creates a professional service agreement for a client.
 * - GenerateContractInput - The input type for the generateContract function.
 * - GenerateContractOutput - The return type for the generateContract function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateContractInputSchema = z.object({
  clientName: z.string().describe('The legal name of the client company.'),
  clientContactName: z.string().describe("The name of the client's primary contact person."),
  clientAddress: z.string().describe("The full mailing address of the client."),
  currentDate: z.string().describe("The effective date of the agreement, in format like 'Month Day, Year'.")
});
export type GenerateContractInput = z.infer<typeof GenerateContractInputSchema>;

const GenerateContractOutputSchema = z.object({
  contract: z.string().describe('The generated service contract in Markdown format.'),
});
export type GenerateContractOutput = z.infer<typeof GenerateContractOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateContractPrompt',
  input: { schema: GenerateContractInputSchema },
  output: { schema: GenerateContractOutputSchema },
  prompt: `
    You are a legal assistant AI for the company "SynergyFlow". Your task is to generate a standard service agreement in Markdown format.

    **Agreement Details:**
    - **Service Provider:** SynergyFlow
    - **Client Name:** {{clientName}}
    - **Client Contact:** {{clientContactName}}
    - **Client Address:** {{clientAddress}}
    - **Effective Date:** {{currentDate}}

    **Instructions:**
    1.  Generate a standard service level agreement (SLA).
    2.  The agreement should be professional, clear, and use standard legal language.
    3.  The output MUST be in Markdown format.
    4.  Include the following sections:
        - **Parties**: Clearly state the service provider (SynergyFlow) and the client.
        - **Services**: Describe the services to be provided. Use a generic placeholder like "SynergyFlow will provide managed IT services, software maintenance, and technical support as outlined in Appendix A."
        - **Term**: State the agreement begins on the effective date and continues on a month-to-month basis until terminated.
        - **Payment**: Specify that payments are due net 30 days from the invoice date. Use a placeholder for the monthly fee (e.g., "[Monthly Fee]").
        - **Confidentiality**: Include a standard confidentiality clause.
        - **Limitation of Liability**: Include a standard limitation of liability clause.
        - **Governing Law**: State that the agreement is governed by the laws of the State of California.
        - **Signatures**: Provide signature lines for both SynergyFlow and the client ({{clientName}}).

    Make sure the final output is a single Markdown string in the 'contract' field.
  `,
});

const generateContractFlow = ai.defineFlow(
  {
    name: 'generateContractFlow',
    inputSchema: GenerateContractInputSchema,
    outputSchema: GenerateContractOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function generateContract(input: GenerateContractInput): Promise<GenerateContractOutput> {
  return await generateContractFlow(input);
}
