
import { NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { cookies } from 'next/headers';

export const GET = withTraceContext(async () => {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_calendar_tokens');
  return NextResponse.json({ connected: !!tokensCookie });
});
