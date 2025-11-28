
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

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
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async createEvent(tokens: any, event: any) {
    this.oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    return calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
  }

  async updateEvent(tokens: any, eventId: string, event: any) {
    this.oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    return calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
    });
  }
}

export const googleCalendarService = new GoogleCalendarService();
