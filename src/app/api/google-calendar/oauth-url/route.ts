
import { NextResponse } from 'next/server';
import { googleCalendarService } from '@/services/google-calendar-service';

export async function GET() {
  try {
    const url = googleCalendarService.getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
