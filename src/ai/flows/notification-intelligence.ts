 
'use server';

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import type { Notification, Order, Company, NotificationType, NotificationActionType } from '@/lib/types';

// Schemas for robust type validation
const NotificationActionTypeSchema = z.custom<NotificationActionType>();

const NotificationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  actionType: NotificationActionTypeSchema,
  entityId: z.string(),
  link: z.string(),
  data: z.any().optional(),
});

const NotificationSchema = z.object({
  id: z.string(),
  message: z.string(),
  type: z.custom<NotificationType>(),
  createdAt: z.string(),
  read: z.boolean(),
  priority: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  icon: z.string(),
  source: z.string(),
  snoozedUntil: z.string().optional(),
  isGroup: z.boolean(),
  items: z.array(NotificationItemSchema).optional(),
  actionType: NotificationActionTypeSchema.optional(),
  entityId: z.string().optional(),
  link: z.string().optional(),
  data: z.any().optional(),
  readAt: z.string().optional(),
  actionTakenAt: z.string().optional(),
  expiresAt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const OrderSchema = z.object({
  id: z.string(),
  // Add other relevant order fields
});

const CompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  // Add other relevant company fields
});

/**
 * AI flow to generate natural language summaries for notifications
 */
export const generateNotificationSummary = ai.defineFlow(
  {
    name: 'generateNotificationSummary',
    inputSchema: z.object({
      notifications: z.array(NotificationSchema),
      context: z.string().optional(),
    }),
    outputSchema: z.string(),
  },
  async ({ notifications, context }) => {
    const prompt = `
    You are an AI assistant for SynergyFlow ERP. Generate a concise, actionable summary of the following notifications.

    Context: ${context || 'General business operations'}

    Notifications:
    ${JSON.stringify(notifications, null, 2)}

    Provide a brief summary (2-3 sentences) that:
    1. Highlights the most critical items
    2. Suggests immediate actions
    3. Uses clear, professional language

    Summary:`;

    const result = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.0-flash',
      config: {
        temperature: 0.3,
        maxOutputTokens: 200,
      },
    });

    return result.text;
  }
);

/**
 * AI flow to suggest actions for a notification
 */
export const suggestNotificationActions = ai.defineFlow(
  {
    name: 'suggestNotificationActions',
    inputSchema: z.object({
      notification: NotificationSchema,
      orderData: OrderSchema.optional(),
      companyData: CompanySchema.optional(),
    }),
    outputSchema: z.object({
      actions: z.array(z.string()),
      reasoning: z.string(),
    }),
  },
  async ({ notification, orderData, companyData }) => {
    const prompt = `
    You are an AI assistant for SynergyFlow ERP. Analyze this notification and suggest 3-5 specific, actionable steps.

    Notification:
    ${JSON.stringify(notification, null, 2)}

    ${orderData ? `Order Data:\n${JSON.stringify(orderData, null, 2)}\n` : ''}
    ${companyData ? `Company Data:\n${JSON.stringify(companyData, null, 2)}\n` : ''}

    Provide:
    1. A list of 3-5 specific actions to take
    2. Brief reasoning for why these actions are recommended

    Format as JSON:
    {
      "actions": ["action 1", "action 2", ...],
      "reasoning": "explanation"
    }`;

    const result = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.0-flash',
      config: {
        temperature: 0.4,
        maxOutputTokens: 300,
      },
    });

    return JSON.parse(result.text);
  }
);

/**
 * AI flow to analyze notification trends
 */
export const analyzeNotificationTrends = ai.defineFlow(
  {
    name: 'analyzeNotificationTrends',
    inputSchema: z.object({
      notifications: z.array(NotificationSchema),
      timeframe: z.string(),
    }),
    outputSchema: z.object({
      insights: z.array(z.string()),
      recommendations: z.array(z.string()),
      riskLevel: z.string(),
    }),
  },
  async ({ notifications, timeframe }) => {
    const prompt = `
    You are an AI business analyst for SynergyFlow ERP. Analyze notification patterns over ${timeframe}.

    Notifications:
    ${JSON.stringify(notifications, null, 2)}

    Provide:
    1. Key insights about patterns and trends
    2. Actionable recommendations to address issues
    3. Overall risk level (low, medium, high, critical)

    Format as JSON:
    {
      "insights": ["insight 1", "insight 2", ...],
      "recommendations": ["recommendation 1", "recommendation 2", ...],
      "riskLevel": "medium"
    }`;

    const result = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.0-flash',
      config: {
        temperature: 0.5,
        maxOutputTokens: 400,
      },
    });

    return JSON.parse(result.text);
  }
);

/**
 * AI flow to generate personalized notification message
 */
export const personalizeNotificationMessage = ai.defineFlow(
  {
    name: 'personalizeNotificationMessage',
    inputSchema: z.object({
      notificationType: z.string(),
      context: z.any(), // Using any() for flexible context object
      userPreferences: z.any().optional(), // User preferences can be varied
    }),
    outputSchema: z.object({
      title: z.string(),
      message: z.string(),
    }),
  },
  async ({ notificationType, context, userPreferences }) => {
    const prompt = `
    Generate a personalized notification message for SynergyFlow ERP.

    Type: ${notificationType}
    Context: ${JSON.stringify(context, null, 2)}
    User Preferences: ${JSON.stringify(userPreferences || {}, null, 2)}

    Create:
    1. A clear, concise title (max 60 characters)
    2. A detailed message (max 150 characters)

    Use professional but friendly tone. Be specific with numbers and dates.

    Format as JSON:
    {
      "title": "notification title",
      "message": "notification message"
    }`;

    const result = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.0-flash',
      config: {
        temperature: 0.6,
        maxOutputTokens: 150,
      },
    });

    return JSON.parse(result.text);
  }
);

/**
 * Helper function to call AI flows from client code
 */
export async function getAINotificationSummary(notifications: Notification[]): Promise<string> {
  try {
    // The flow is now a server action and can be called directly
    return await generateNotificationSummary({
      notifications: notifications.slice(0, 10), // Limit to 10 for token efficiency
      context: 'Current business operations',
    });
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return `You have ${notifications.length} notifications requiring attention.`;
  }
}

export async function getAISuggestedActions(
  notification: Notification,
  order?: Order,
  company?: Company
): Promise<{ actions: string[]; reasoning: string }> {
  try {
    // The flow is now a server action and can be called directly
    return await suggestNotificationActions({
      notification,
      orderData: order,
      companyData: company,
    });
  } catch (error) {
    console.error('AI action suggestion failed:', error);
    return {
      actions: ['Review notification details', 'Take appropriate action'],
      reasoning: 'Unable to generate AI suggestions at this time.',
    };
  }
}
