
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_calendar_tokens');
  return NextResponse.json({ connected: !!tokensCookie });
}
