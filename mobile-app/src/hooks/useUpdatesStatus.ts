import * as Updates from 'expo-updates';
import { useCallback, useMemo, useState } from 'react';

export type UpdatesStatus = {
  channel: string;
  enabled: boolean;
  message: string;
  runtimeVersion: string;
  updateId: string | null;
  checking: boolean;
  checkNow: () => Promise<void>;
};

export function useUpdatesStatus(): UpdatesStatus {
  const [message, setMessage] = useState('Ready');
  const [checking, setChecking] = useState(false);

  const checkNow = useCallback(async () => {
    if (!Updates.isEnabled) {
      setMessage('Updates are enabled in EAS builds.');
      return;
    }

    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setMessage('No update available');
        return;
      }

      await Updates.fetchUpdateAsync();
      setMessage('Update downloaded. Restart the app to apply.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update check failed');
    } finally {
      setChecking(false);
    }
  }, []);

  return useMemo(
    () => ({
      channel: Updates.channel ?? 'development',
      enabled: Updates.isEnabled,
      message,
      runtimeVersion: Updates.runtimeVersion ?? '1.0.0',
      updateId: Updates.updateId ?? null,
      checking,
      checkNow,
    }),
    [checkNow, checking, message],
  );
}
