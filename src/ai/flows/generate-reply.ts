'use server';
/**
 * @fileOverview An AI agent that generates a suggested reply to customer feedback.
 *
 * - generateReply - A function that creates a professional and empathetic response.
 * - GenerateReplyInput - The input type for the generateReply function.
 * - GenerateReplyOutput - The return type for the generateReply function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateReplyInputSchema = z.object({
  clientName: z.string().describe('The name of the client who gave the feedback.'),
  feedback: z.string().describe('The customer feedback text.'),
  sentiment: z.string().describe('The sentiment of the feedback (positive, negative, or neutral).'),
});
export type GenerateReplyInput = z.infer<typeof GenerateReplyInputSchema>;

const GenerateReplyOutputSchema = z.object({
  reply: z.string().describe('The suggested reply to the customer.'),
});
export type GenerateReplyOutput = z.infer<typeof GenerateReplyOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateReplyPrompt',
  input: { schema: GenerateReplyInputSchema },
  output: { schema: GenerateReplyOutputSchema },
  prompt: `
    You are a customer service expert for SynergyFlow. Your task is to draft a professional, empathetic, and helpful reply to customer feedback.

    The client's name is: {{clientName}}
    The feedback is: "{{feedback}}"
    The sentiment of this feedback is: {{sentiment}}

    Based on the sentiment, write a suitable response.

    - If the sentiment is POSITIVE:
      - Thank the client warmly.
      - Express appreciation for their business and for taking the time to provide feedback.
      - Keep it concise and friendly.

    - If the sentiment is NEGATIVE:
      - Start with a sincere apology for the negative experience.
      - Acknowledge their specific complaint (e.g., "I'm sorry to hear about the issue with...").
      - Offer to investigate the issue or provide a solution.
      - Reassure them that their feedback is valuable for improvement.
      - Provide a clear next step (e.g., "Someone from our team will reach out to you shortly.").

    - If the sentiment is NEUTRAL:
      - Thank the client for their feedback.
      - Acknowledge their comments and let them know their input is being considered.
      - Keep it professional and straightforward.

    The reply should be addressed to the client directly (e.g., "Hi {{clientName}},").
  `,
});


const generateReplyFlow = ai.defineFlow(
  {
    name: 'generateReplyFlow',
    inputSchema: GenerateReplyInputSchema,
    outputSchema: GenerateReplyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
  return await generateReplyFlow(input);
}
