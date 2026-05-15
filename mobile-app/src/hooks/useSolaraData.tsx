import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { sampleSnapshot } from '@src/constants/sampleData';
import { fetchRemoteSolaraSnapshot } from '@src/services/solaraApi';
import type { DataState, SolaraSnapshot } from '@src/types/solara';

type SolaraDataContextValue = DataState & {
  clearFront: () => void;
  refresh: () => Promise<void>;
  setFrontMembers: (memberIds: string[]) => void;
  toggleFrontMember: (memberId: string) => void;
};

const SolaraDataContext = createContext<SolaraDataContextValue | null>(null);

function startFront(snapshot: SolaraSnapshot, memberIds: string[]): SolaraSnapshot {
  const uniqueMemberIds = Array.from(new Set(memberIds));
  const endedHistory = snapshot.frontHistory.map((entry) => (
    entry.endedAt ? entry : { ...entry, endedAt: new Date().toISOString() }
  ));
  const currentFront = uniqueMemberIds.length > 0
    ? {
        id: `local-front-${Date.now()}`,
        memberIds: uniqueMemberIds,
        startedAt: new Date().toISOString(),
        endedAt: null,
      }
    : null;

  return {
    ...snapshot,
    currentFront,
    frontHistory: currentFront ? [currentFront, ...endedHistory] : endedHistory,
  };
}

export function SolaraDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    snapshot: sampleSnapshot,
    source: 'demo',
    loading: false,
    message: 'Local preview data loaded',
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      const remoteSnapshot = await fetchRemoteSolaraSnapshot();
      if (!remoteSnapshot) {
        setState({
          snapshot: sampleSnapshot,
          source: 'demo',
          loading: false,
          message: 'Using bundled preview data',
        });
        return;
      }

      setState({
        snapshot: remoteSnapshot,
        source: 'remote',
        loading: false,
        message: 'Connected to Solara API',
      });
    } catch (error) {
      setState({
        snapshot: sampleSnapshot,
        source: 'error',
        loading: false,
        message: error instanceof Error ? error.message : 'Could not reach Solara API',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setFrontMembers = useCallback((memberIds: string[]) => {
    setState((current) => ({
      ...current,
      snapshot: startFront(current.snapshot, memberIds),
      source: current.source === 'remote' ? 'remote' : 'demo',
      message: current.source === 'remote' ? 'Local front preview updated' : current.message,
    }));
  }, []);

  const clearFront = useCallback(() => {
    setFrontMembers([]);
  }, [setFrontMembers]);

  const toggleFrontMember = useCallback((memberId: string) => {
    setState((current) => {
      const activeIds = current.snapshot.currentFront?.memberIds ?? [];
      const nextIds = activeIds.includes(memberId)
        ? activeIds.filter((id) => id !== memberId)
        : [...activeIds, memberId];

      return {
        ...current,
        snapshot: startFront(current.snapshot, nextIds),
        message: current.source === 'remote' ? 'Local front preview updated' : current.message,
      };
    });
  }, []);

  const value = useMemo<SolaraDataContextValue>(
    () => ({
      ...state,
      clearFront,
      refresh,
      setFrontMembers,
      toggleFrontMember,
    }),
    [clearFront, refresh, setFrontMembers, state, toggleFrontMember],
  );

  return <SolaraDataContext.Provider value={value}>{children}</SolaraDataContext.Provider>;
}

export function useSolaraData(): SolaraDataContextValue {
  const value = useContext(SolaraDataContext);
  if (!value) {
    throw new Error('useSolaraData must be used inside SolaraDataProvider');
  }
  return value;
}
