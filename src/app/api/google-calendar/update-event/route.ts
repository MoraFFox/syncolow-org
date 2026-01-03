import { NextRequest, NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { googleCalendarService } from '@/services/google-calendar-service';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export const POST = withTraceContext(async (request: NextRequest) => {
  try {
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get('google_calendar_tokens');

    if (!tokensCookie) {
      return NextResponse.json({ error: 'Not authenticated with Google Calendar' }, { status: 401 });
    }

    const tokens = JSON.parse(tokensCookie.value);
    const body = await request.json();
    const { eventId, event } = body;

    if (!eventId || !event) {
      return NextResponse.json({ error: 'Missing eventId or event data' }, { status: 400 });
    }

    const result = await googleCalendarService.updateEvent(tokens, eventId, event);
    return NextResponse.json({ success: true, eventId: result.data.id, link: result.data.htmlLink });
  } catch (error) {
    logger.error(error, { component: 'GoogleCalendarUpdateEventAPI', action: 'POST' });
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
});
