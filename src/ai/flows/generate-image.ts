'use server';
/**
 * @fileOverview An AI agent that generates an image from a text prompt.
 *
 * - generateImage - A function that creates an image based on a description.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ prompt }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `A professional, high-quality product photograph of a ${prompt} on a clean, white background. The image should be well-lit and clearly show the product's details.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed to return a data URI.');
    }

    return {
      imageUrl: media.url,
    };
  }
);

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return await generateImageFlow(input);
}
