import { NextResponse, type NextRequest } from 'next/server';
import { doUnsubscribe } from '@/app/email-actions';

// One-click unsubscribe (RFC 8058): mail apps POST here from the
// "Unsubscribe" button they show next to the sender's name.
export async function POST(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t') ?? '';
  const k = request.nextUrl.searchParams.get('k') ?? 'sub';
  const ok = await doUnsubscribe(t, k);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
