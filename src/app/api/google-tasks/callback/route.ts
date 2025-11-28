import { NextRequest, NextResponse } from 'next/server';
import { googleTasksService } from '@/services/google-tasks-service';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    const tokens = await googleTasksService.getTokens(code);
    
    const cookieStore = await cookies();
    cookieStore.set('google_tasks_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.redirect(new URL('/settings?tasks_sync=success', request.url));
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.json({ error: 'Failed to exchange code' }, { status: 500 });
  }
}
