
'use server';
/**
 * @fileOverview An AI agent that generates a daily business summary.
 *
 * - generateDailyBriefing - A function that creates a concise overview of business metrics.
 * - DailyBriefingInput - The input type for the generateDailyBriefing function.
 * - DailyBriefingOutput - The return type for the generateDailyBriefing function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define schemas using Zod for type safety and validation
const DailyBriefingInputSchema = z.object({
    totalRevenue: z.number().describe('The total revenue amount.'),
    totalSales: z.number().describe('The total number of sales.'),
    newClientsCount: z.number().describe('The number of new clients in the last 30 days.'),
    activeMaintenanceCount: z.number().describe('The number of active maintenance visits.'),
    recentFeedback: z.array(z.object({
        sentiment: z.string(),
        rating: z.number(),
    })).describe('A list of recent customer feedback entries.'),
    lowStockProducts: z.array(z.object({
        name: z.string(),
        stock: z.number(),
    })).describe('A list of products that are low in stock.'),
});
export type DailyBriefingInput = z.infer<typeof DailyBriefingInputSchema>;

const DailyBriefingOutputSchema = z.object({
    briefing: z.string().describe('A concise, natural-language summary of the business status.'),
});
export type DailyBriefingOutput = z.infer<typeof DailyBriefingOutputSchema>;


// Define the AI prompt for Genkit
const prompt = ai.definePrompt({
  name: 'generateDailyBriefingPrompt',
  input: { schema: DailyBriefingInputSchema },
  output: { schema: DailyBriefingOutputSchema },
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `
    You are a business analyst AI for SynergyFlow. Your task is to provide a concise, friendly, and insightful daily briefing.
    The user is busy, so keep it to 2-3 short sentences.
    
    Here is the data for today:
    - Total Revenue: \${{totalRevenue}}
    - Total Sales: {{totalSales}}
    - New Clients (last 30 days): {{newClientsCount}}
    - Active Maintenance Visits: {{activeMaintenanceCount}}
    - Low Stock Products: {{#if lowStockProducts.length}}{{lowStockProducts.length}} items{{else}}None{{/if}}
    - Recent Feedback Count: {{recentFeedback.length}}

    Analyze this data and generate a summary. 
    - Start with a friendly greeting like "Good morning!" or "Here's your daily snapshot:".
    - Highlight the most important positive metric (e.g., strong revenue, many new clients).
    - Then, point out the most critical area needing attention (e.g., low stock products, negative feedback).
    - If there is recent negative feedback, mention it as something to look into.
    - If there are low stock items, mention them as needing attention.
    - Be conversational and avoid just listing the numbers. Frame them as insights.
  `,
});

// Define the Genkit flow
const generateDailyBriefingFlow = ai.defineFlow(
  {
    name: 'generateDailyBriefingFlow',
    inputSchema: DailyBriefingInputSchema,
    outputSchema: DailyBriefingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function generateDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput> {
  return await generateDailyBriefingFlow(input);
}
