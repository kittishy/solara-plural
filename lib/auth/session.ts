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

export const getAccountType = cache(async (): Promise<'system' | 'singlet'> => {
  const session = await getCachedSession();
  return session?.user?.accountType === 'singlet' ? 'singlet' : 'system';
});

export const requireSystemAccount = cache(async () => {
  const systemId = await requireSystemId();
  const accountType = await getAccountType();
  if (accountType === 'singlet') {
    redirect('/');
  }
  return systemId;
});
