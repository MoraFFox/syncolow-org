import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('google_tasks_tokens');
  
  return NextResponse.json({ success: true });
}
