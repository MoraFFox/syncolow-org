import { NextResponse } from 'next/server';
import { googleTasksService } from '@/services/google-tasks-service';

export async function GET() {
  try {
    const url = googleTasksService.getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
