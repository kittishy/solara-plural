import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { name, email, password, description } = await request.json();

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await db.query.systems.findFirst({ where: eq(systems.email, email) });
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await db.insert(systems).values({
    id: createId(), name: name.trim(), email: email.toLowerCase().trim(),
    passwordHash, description: description?.trim() ?? null, createdAt: now, updatedAt: now,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
