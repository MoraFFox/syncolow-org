import { NextResponse } from 'next/server';
import { googleTasksService } from '@/services/google-tasks-service';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const url = googleTasksService.getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    logger.error(error, { component: 'GoogleTasksAuthAPI', action: 'GET' });
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
