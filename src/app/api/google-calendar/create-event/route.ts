import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/services/google-calendar-service';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get('google_calendar_tokens');

    if (!tokensCookie) {
      return NextResponse.json({ error: 'Not authenticated with Google Calendar' }, { status: 401 });
    }

    const tokens = JSON.parse(tokensCookie.value);
    const body = await request.json();
    const { event } = body;

    if (!event) {
      return NextResponse.json({ error: 'Missing event data' }, { status: 400 });
    }

    const result = await googleCalendarService.createEvent(tokens, event);
    return NextResponse.json({ success: true, eventId: result.data.id, link: result.data.htmlLink });
  } catch (error) {
    logger.error(error, { component: 'GoogleCalendarCreateEventAPI', action: 'POST' });
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
