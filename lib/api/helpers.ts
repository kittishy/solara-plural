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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function parseJsonBody<T = unknown>(
  request: Request,
): Promise<
  { data: T; error?: never } | { data?: never; error: NextResponse }
> {
  try {
    return { data: await request.json() as T };
  } catch {
    return { error: err('Invalid JSON payload', 400) };
  }
}

export async function parseJsonRecord(
  request: Request,
): Promise<
  { data: Record<string, unknown>; error?: never } | { data?: never; error: NextResponse }
> {
  const parsed = await parseJsonBody<unknown>(request);
  if (parsed.error) return { error: parsed.error };
  if (!isRecord(parsed.data)) return { error: err('JSON payload must be an object', 400) };
  return { data: parsed.data };
}

export async function requireAuth(): Promise<
  { systemId: string; error?: never } | { systemId?: never; error: NextResponse }
> {
  const systemId = await getSystemId();
  if (!systemId) return { error: err('Unauthorized', 401) };
  return { systemId };
}

export async function requireSystemAuth(): Promise<
  { systemId: string; error?: never } | { systemId?: never; error: NextResponse }
> {
  const session = await auth();
  const systemId = session?.user?.id ?? null;
  if (!systemId) return { error: err('Unauthorized', 401) };
  if (session?.user?.accountType === 'singlet') {
    return { error: err('This feature is only available for system accounts', 403) };
  }
  return { systemId };
}
