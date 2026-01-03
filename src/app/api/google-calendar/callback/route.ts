import { NextRequest, NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { googleCalendarService } from '@/services/google-calendar-service';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export const GET = withTraceContext(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    const tokens = await googleCalendarService.getTokens(code);

    // Store tokens in HTTP-only cookie
    // In a real app, store refresh_token in DB and access_token in cookie/DB
    // For now, we store the whole token object in a cookie
    const cookieStore = await cookies();
    cookieStore.set('google_calendar_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Redirect back to the app (e.g., dashboard or close window)
    // We can redirect to a success page that closes itself
    return NextResponse.redirect(new URL('/dashboard?calendar_sync=success', request.url));
  } catch (error) {
    logger.error(error, { component: 'GoogleCalendarCallbackAPI', action: 'GET' });
    return NextResponse.json({ error: 'Failed to exchange code' }, { status: 500 });
  }
});
