import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { SignJWT } from 'jose';

const SSE_URL = process.env.SSE_URL ?? '';
const SECRET = process.env.NEXTAUTH_SECRET ?? '';

export async function GET() {
  const session = await auth();
  const systemId = session?.user?.id;
  if (!systemId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SSE_URL) {
    return NextResponse.json({ sseUrl: '', token: '' });
  }

  const secret = new TextEncoder().encode(SECRET);
  const token = await new SignJWT({ systemId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(secret);

  return NextResponse.json({ sseUrl: SSE_URL, token });
}
