import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const tokens = cookieStore.get('google_tasks_tokens');
  
  return NextResponse.json({ connected: !!tokens });
}
