import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import { logger } from '@/lib/logger';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

/**
 * Interface for calendar event data when creating/updating events.
 */
export interface CalendarEventData {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
}

export class GoogleCalendarService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh token
    });
  }

  async getTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      logger.error(error, {
        component: 'GoogleCalendarService',
        action: 'getTokens',
      });
      throw new Error('Failed to authenticate with Google Calendar. Please try reconnecting.');
    }
  }

  async createEvent(tokens: Credentials, event: CalendarEventData) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      return calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
    } catch (error) {
      logger.error(error, {
        component: 'GoogleCalendarService',
        action: 'createEvent',
      });
      throw new Error('Failed to create calendar event. Please try again.');
    }
  }

  async updateEvent(tokens: Credentials, eventId: string, event: CalendarEventData) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      return calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
      });
    } catch (error) {
      logger.error(error, {
        component: 'GoogleCalendarService',
        action: 'updateEvent',
        eventId,
      });
      throw new Error('Failed to update calendar event. Please try again.');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
