import { NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { googleTasksService } from '@/services/google-tasks-service';
import { logger } from '@/lib/logger';

export const GET = withTraceContext(async () => {
  try {
    const url = googleTasksService.getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    logger.error(error, { component: 'GoogleTasksAuthAPI', action: 'GET' });
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
});
