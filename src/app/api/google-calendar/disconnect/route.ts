import { NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { cookies } from 'next/headers';

export const POST = withTraceContext(async () => {
  const cookieStore = await cookies();
  cookieStore.delete('google_calendar_tokens');

  return NextResponse.json({ success: true });
});
