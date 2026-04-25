import { mutate } from 'swr';

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error?: string };

export const swrKeys = {
  members: '/api/members',
  front: '/api/front',
  notes: '/api/notes',
  frontHistory: '/api/front/history?limit=50&offset=0',
} as const;

export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!res.ok || !json || json.success !== true) {
    throw new Error(
      (json && 'error' in json && typeof json.error === 'string' && json.error) ||
      'Request failed'
    );
  }

  return json.data;
}

export function revalidateMembersAndFront() {
  void mutate(swrKeys.members);
  void mutate(swrKeys.front);
}

export function revalidateNotes() {
  void mutate(swrKeys.notes);
}

export function revalidateFrontHistory() {
  void mutate(swrKeys.frontHistory);
}
