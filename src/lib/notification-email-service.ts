import type { Notification } from './types';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-logger';
import { logger } from '@/lib/logger';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Supported metadata keys for email notifications
 */
interface EmailMetadata {
  amount?: number;
  daysUntil?: number;
  clientName?: string;
  orderCount?: number;
}

/**
 * Email notification service
 * Generates email templates for notifications
 */
export class NotificationEmailService {
  /**
   * Generate email template for a notification
   */
  static generateEmailTemplate(notification: Notification): EmailTemplate {
    const subject = this.generateSubject(notification);
    const html = this.generateHTML(notification);
    const text = this.generatePlainText(notification);

    return { subject, html, text };
  }

  /**
   * Generate email subject line
   */
  private static generateSubject(notification: Notification): string {
    const prefix = notification.priority === 'critical' ? '🚨 URGENT: ' : 
                   notification.priority === 'warning' ? '⚠️ ' : '';
    
    return `${prefix}${notification.title} - SynergyFlow ERP`;
  }

  /**
   * Generate HTML email body
   */
  private static generateHTML(notification: Notification): string {
    const priorityColor = {
      critical: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };

    const color = priorityColor[notification.priority];

    let itemsHTML = '';
    if (notification.isGroup && notification.items) {
      itemsHTML = `
        <div style="margin-top: 20px;">
          <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px;">Items Requiring Attention:</h3>
          <ul style="list-style: none; padding: 0;">
            ${notification.items.map(item => `
              <li style="padding: 10px; background: #f9fafb; margin-bottom: 8px; border-radius: 4px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}${item.link}" 
                   style="color: #3b82f6; text-decoration: none;">
                  ${item.title}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">SynergyFlow ERP</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${notification.source} Notification</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background: #f9fafb; border-left: 4px solid ${color}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <h2 style="margin: 0 0 10px 0; color: #111827; font-size: 20px;">${notification.title}</h2>
                <p style="margin: 0; color: #6b7280; font-size: 16px;">${notification.message}</p>
              </div>

              ${notification.metadata ? this.generateMetadataHTML(notification.metadata) : ''}
              ${itemsHTML}

              <!-- Action Button -->
              ${notification.link ? `
                <div style="margin-top: 30px; text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}${notification.link}" 
                     style="display: inline-block; background: ${color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    View Details
                  </a>
                </div>
              ` : ''}

              <!-- Timestamp -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 14px;">
                <p style="margin: 0;">Notification sent on ${format(new Date(notification.createdAt), 'PPpp')}</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                You received this email because you have notifications enabled in SynergyFlow ERP.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}/settings" style="color: #3b82f6; text-decoration: none;">
                  Manage notification preferences
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate metadata HTML section
   */
  private static generateMetadataHTML(metadata: EmailMetadata): string {
    const items: string[] = [];

    if (metadata.amount) {
      items.push(`<strong>Amount:</strong> $${metadata.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }

    if (metadata.daysUntil !== undefined) {
      const label = metadata.daysUntil < 0 ? 'Days Overdue' : 'Days Until Due';
      items.push(`<strong>${label}:</strong> ${Math.abs(metadata.daysUntil)}`);
    }

    if (metadata.clientName) {
      items.push(`<strong>Client:</strong> ${metadata.clientName}`);
    }

    if (metadata.orderCount) {
      items.push(`<strong>Orders:</strong> ${metadata.orderCount}`);
    }

    if (items.length === 0) return '';

    return `
      <div style="background: #eff6ff; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          ${items.join(' • ')}
        </p>
      </div>
    `;
  }

  /**
   * Generate plain text email body
   */
  private static generatePlainText(notification: Notification): string {
    let text = `${notification.title}\n\n${notification.message}\n\n`;

    if (notification.metadata) {
      text += 'Details:\n';
      if (notification.metadata.amount) {
        text += `Amount: $${notification.metadata.amount.toFixed(2)}\n`;
      }
      if (notification.metadata.daysUntil !== undefined) {
        text += `Days: ${notification.metadata.daysUntil}\n`;
      }
      text += '\n';
    }

    if (notification.isGroup && notification.items) {
      text += `Items (${notification.items.length}):\n`;
      notification.items.forEach((item, i) => {
        text += `${i + 1}. ${item.title}\n`;
      });
      text += '\n';
    }

    if (notification.link) {
      text += `View details: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}${notification.link}\n\n`;
    }

    text += `---\nSent: ${format(new Date(notification.createdAt), 'PPpp')}\n`;
    text += `Manage preferences: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}/settings\n`;

    return text;
  }

  /**
   * Generate daily digest email
   */
  static generateDailyDigest(notifications: Notification[]): EmailTemplate {
    const critical = notifications.filter(n => n.priority === 'critical');
    const warning = notifications.filter(n => n.priority === 'warning');
    const info = notifications.filter(n => n.priority === 'info');

    const subject = `Daily Digest: ${notifications.length} notifications - SynergyFlow ERP`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Digest</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Daily Digest</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">${format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>

            <div style="padding: 30px;">
              <p style="font-size: 18px; color: #111827; margin: 0 0 20px 0;">
                You have <strong>${notifications.length}</strong> notifications today.
              </p>

              ${critical.length > 0 ? `
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #ef4444; font-size: 20px; margin: 0 0 15px 0; display: flex; align-items: center;">
                    🚨 Critical (${critical.length})
                  </h2>
                  ${critical.map(n => this.generateDigestItem(n, '#ef4444')).join('')}
                </div>
              ` : ''}

              ${warning.length > 0 ? `
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #f59e0b; font-size: 20px; margin: 0 0 15px 0; display: flex; align-items: center;">
                    ⚠️ Warnings (${warning.length})
                  </h2>
                  ${warning.map(n => this.generateDigestItem(n, '#f59e0b')).join('')}
                </div>
              ` : ''}

              ${info.length > 0 ? `
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #3b82f6; font-size: 18px; margin: 0 0 15px 0;">
                    ℹ️ Updates (${info.length})
                  </h2>
                  ${info.map(n => this.generateDigestItem(n, '#3b82f6')).join('')}
                </div>
              ` : ''}

              <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}/notifications" 
                   style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View All Notifications
                </a>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}/settings" style="color: #3b82f6; text-decoration: none;">
                  Manage notification preferences
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Daily Digest - ${format(new Date(), 'MMMM d, yyyy')}\n\n` +
      `You have ${notifications.length} notifications today.\n\n` +
      (critical.length > 0 ? `CRITICAL (${critical.length}):\n${critical.map(n => `- ${n.title}`).join('\n')}\n\n` : '') +
      (warning.length > 0 ? `WARNINGS (${warning.length}):\n${warning.map(n => `- ${n.title}`).join('\n')}\n\n` : '') +
      (info.length > 0 ? `UPDATES (${info.length}):\n${info.map(n => `- ${n.title}`).join('\n')}\n\n` : '') +
      `View all: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}/notifications\n`;

    return { subject, html, text };
  }

  /**
   * Generate digest item HTML
   */
  private static generateDigestItem(notification: Notification, color: string): string {
    return `
      <div style="background: #f9fafb; padding: 15px; margin-bottom: 10px; border-radius: 4px; border-left: 4px solid ${color};">
        <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #111827;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.synergyflow.com'}${notification.link || '/notifications'}" 
             style="color: #111827; text-decoration: none;">
            ${notification.title}
          </a>
        </h3>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">${notification.message}</p>
      </div>
    `;
  }
}

/**
 * Send email notification via Supabase Edge Function
 */
export async function sendEmailNotification(
  to: string,
  notification: Notification
): Promise<void> {
  try {
    const template = NotificationEmailService.generateEmailTemplate(notification);

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: template.subject,
        html: template.html,
        text: template.text, // Include plain text version
      },
    });

    if (error) throw error;

    logger.debug('Email notification sent', { component: 'NotificationEmailService', action: 'sendEmailNotification', to, subject: template.subject });
  } catch (error: any) {
    logError(error, {
      component: 'NotificationEmailService',
      action: 'sendEmailNotification',
      data: { to, notificationId: notification.id }
    });
    // We don't re-throw here to prevent blocking the UI flow, just log the failure
  }
}

/**
 * Send daily digest email via Supabase Edge Function
 */
export async function sendDailyDigest(
  to: string,
  notifications: Notification[]
): Promise<void> {
  try {
    const template = NotificationEmailService.generateDailyDigest(notifications);

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      },
    });

    if (error) throw error;

    logger.debug('Daily digest sent', { component: 'NotificationEmailService', action: 'sendDailyDigest', to, subject: template.subject, count: notifications.length });
  } catch (error: any) {
    logError(error, {
      component: 'NotificationEmailService',
      action: 'sendDailyDigest',
      data: { to, notificationCount: notifications.length }
    });
  }
}

