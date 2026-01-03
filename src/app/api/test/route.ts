
import { NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';

export const GET = withTraceContext(async () => {
  return NextResponse.json({ message: 'Test route works' });
});
