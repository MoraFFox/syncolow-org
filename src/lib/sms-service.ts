import { logger } from './logger';

/**
 * SMS notification service using Twilio
 * 
 * Required environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */
export class SMSService {
  private static twilioClient: any = null;

  /**
   * Initialize Twilio client lazily
   */
  private static async getClient(): Promise<any> {
    if (this.twilioClient) return this.twilioClient;

    // Dynamic import to avoid loading Twilio if not needed
    try {
      const twilio = await import('twilio');
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        logger.warn('Twilio credentials not configured', { component: 'SMSService' });
        return null;
      }

      this.twilioClient = twilio.default(accountSid, authToken);
      return this.twilioClient;
    } catch (error) {
      logger.warn('Twilio SDK not installed. Run: npm install twilio', { component: 'SMSService' });
      return null;
    }
  }

  /**
   * Send SMS message
   * @param to - Phone number in E.164 format (e.g., +1234567890)
   * @param message - SMS message content (max 1600 characters)
   */
  static async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      
      if (!client) {
        logger.warn('SMS not sent - Twilio not configured', { to, message: message.substring(0, 50) });
        return false;
      }

      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      if (!fromNumber) {
        logger.warn('TWILIO_PHONE_NUMBER not configured', { component: 'SMSService' });
        return false;
      }

      // Validate E.164 format
      if (!this.isValidE164(to)) {
        logger.warn('Invalid phone number format', { to, component: 'SMSService' });
        return false;
      }

      // Truncate message if too long (SMS limit is 1600 chars for concatenated)
      const truncatedMessage = message.length > 1600 ? message.substring(0, 1597) + '...' : message;

      await client.messages.create({
        body: truncatedMessage,
        from: fromNumber,
        to: to
      });

      logger.debug('SMS sent successfully', { to, messageLength: truncatedMessage.length });
      return true;
    } catch (error) {
      logger.error(error, { 
        component: 'SMSService', 
        action: 'sendSMS', 
        to 
      });
      return false;
    }
  }

  /**
   * Validate E.164 phone number format
   */
  private static isValidE164(phoneNumber: string): boolean {
    // E.164: + followed by 1-15 digits
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 (basic implementation)
   * For production, use libphonenumber-js for accurate parsing
   */
  static formatPhoneNumber(number: string, defaultCountryCode: string = '+20'): string | null {
    // Remove all non-digit characters except leading +
    let cleaned = number.replace(/[^\d+]/g, '');
    
    // If starts with +, validate and return
    if (cleaned.startsWith('+')) {
      return this.isValidE164(cleaned) ? cleaned : null;
    }
    
    // If starts with 0, assume local number and add country code
    if (cleaned.startsWith('0')) {
      cleaned = defaultCountryCode + cleaned.substring(1);
    } else {
      cleaned = defaultCountryCode + cleaned;
    }
    
    return this.isValidE164(cleaned) ? cleaned : null;
  }
}
