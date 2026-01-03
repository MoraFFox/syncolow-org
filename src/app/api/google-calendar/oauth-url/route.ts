import { NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { googleCalendarService } from '@/services/google-calendar-service';
import { logger } from '@/lib/logger';

export const GET = withTraceContext(async () => {
  try {
    const url = googleCalendarService.getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    logger.error(error, { component: 'GoogleCalendarOAuthAPI', action: 'GET' });
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
});
