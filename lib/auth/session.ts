import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from './config';

export const getCachedSession = cache(async () => auth());

export const requireSystemId = cache(async () => {
  const session = await getCachedSession();
  const systemId = session?.user?.id;

  if (!systemId) {
    redirect('/login');
  }

  return systemId;
});
