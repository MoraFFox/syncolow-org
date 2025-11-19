'use server';
/**
 * @fileOverview An AI agent that analyzes customer feedback to determine satisfaction levels.
 *
 * - analyzeSentiment - A function that analyzes the sentiment of customer feedback.
 * - AnalyzeSentimentInput - The input type for the analyzeSentiment function.
 * - AnalyzeSentimentOutput - The return type for the analyzeSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSentimentInputSchema = z.object({
  feedback: z
    .string()
    .describe('The customer feedback to analyze.'),
});
export type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

const AnalyzeSentimentOutputSchema = z.object({
  sentiment: z
    .string()
    .describe('The sentiment of the feedback (positive, negative, or neutral).'),
  confidence: z
    .number()
    .describe('The confidence level of the sentiment analysis (0 to 1).'),
});
export type AnalyzeSentimentOutput = z.infer<typeof AnalyzeSentimentOutputSchema>;

const prompt = ai.definePrompt({
  name: 'analyzeSentimentPrompt',
  input: {schema: AnalyzeSentimentInputSchema},
  output: {schema: AnalyzeSentimentOutputSchema},
  prompt: `You are a sentiment analysis expert.

  Analyze the following customer feedback and determine its sentiment (positive, negative, or neutral).
  Also, provide a confidence level (0 to 1) for your analysis.

  Feedback: {{{feedback}}}
  `,
});

const analyzeSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeSentimentFlow',
    inputSchema: AnalyzeSentimentInputSchema,
    outputSchema: AnalyzeSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function analyzeSentiment(input: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
  return await analyzeSentimentFlow(input);
}
