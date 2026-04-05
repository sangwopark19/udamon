import { useState, useEffect } from 'react';
import Constants from 'expo-constants';

const CURRENT_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// Mock: in production, fetch from Supabase `app_config` table
const MOCK_MIN_VERSION = '1.0.0';

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface ForceUpdateState {
  needsUpdate: boolean;
  currentVersion: string;
  minVersion: string;
  loading: boolean;
}

export function useForceUpdate(): ForceUpdateState {
  const [state, setState] = useState<ForceUpdateState>({
    needsUpdate: false,
    currentVersion: CURRENT_VERSION,
    minVersion: MOCK_MIN_VERSION,
    loading: true,
  });

  useEffect(() => {
    // Simulate async config fetch
    const timer = setTimeout(() => {
      const needsUpdate = compareSemver(CURRENT_VERSION, MOCK_MIN_VERSION) < 0;
      setState({
        needsUpdate,
        currentVersion: CURRENT_VERSION,
        minVersion: MOCK_MIN_VERSION,
        loading: false,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return state;
}
