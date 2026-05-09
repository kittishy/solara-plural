import { NextResponse } from 'next/server';
import { getFirebasePublicConfig } from '@/lib/notifications/firebase-public-config';

export async function GET() {
  const config = getFirebasePublicConfig();
  return NextResponse.json(
    { success: Boolean(config), data: config },
    {
      headers: {
        'Cache-Control': 'private, max-age=0, s-maxage=60',
      },
    },
  );
}

