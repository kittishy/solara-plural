import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export async function getSystemId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function ok<T>(
  data: T,
  status = 200,
  init?: { headers?: Record<string, string> }
) {
  return NextResponse.json(
    { success: true, data },
    { status, headers: init?.headers }
  );
}

export function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function requireAuth(): Promise<
  { systemId: string; error?: never } | { systemId?: never; error: NextResponse }
> {
  const systemId = await getSystemId();
  if (!systemId) return { error: err('Unauthorized', 401) };
  return { systemId };
}
