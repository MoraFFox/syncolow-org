import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/services/google-calendar-service';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
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
    console.error('Error updating calendar event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
