'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DrilldownInsightInputSchema = z.object({
  kind: z.string().describe('The type of entity (e.g., product, order, revenue).'),
  entityName: z.string().describe('The name or identifier of the entity.'),
  contextData: z.string().describe('A JSON string containing relevant data about the entity.'),
});

export type DrilldownInsightInput = z.infer<typeof DrilldownInsightInputSchema>;

const DrilldownInsightOutputSchema = z.object({
  insight: z.string().describe('A single, concise, actionable sentence providing insight about the entity.'),
  action: z.string().optional().describe('A suggested short action label (e.g. "Restock Now", "Email Client").'),
});

export type DrilldownInsightOutput = z.infer<typeof DrilldownInsightOutputSchema>;

const prompt = ai.definePrompt({
  name: 'drilldownInsightPrompt',
  input: {schema: DrilldownInsightInputSchema},
  output: {schema: DrilldownInsightOutputSchema},
  prompt: `
  You are an expert ERP analyst. Your goal is to provide a single, high-value insight for a specific entity based on its data.

  Entity Type: {{kind}}
  Entity Name: {{entityName}}
  Context Data: {{contextData}}

  Task:
  1. Analyze the context data.
  2. Identify the most critical anomaly, trend, or status.
  3. Generate a ONE-SENTENCE insight (max 15 words).
  4. Suggest a short 2-3 word action label if applicable.

  Examples:
  - "Stock is critically low relative to 30-day sales velocity." (Action: "Restock Now")
  - "Customer hasn't ordered in 90 days despite active contract." (Action: "Contact Client")
  - "Revenue is up 20% compared to last month." (Action: null)

  Keep it professional, concise, and direct.
  `,
});

const drilldownInsightFlow = ai.defineFlow(
  {
    name: 'drilldownInsightFlow',
    inputSchema: DrilldownInsightInputSchema,
    outputSchema: DrilldownInsightOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function generateDrilldownInsight(input: DrilldownInsightInput): Promise<DrilldownInsightOutput> {
  return await drilldownInsightFlow(input);
}
