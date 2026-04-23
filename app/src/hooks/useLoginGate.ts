import { useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { navigationRef } from '../navigation/navigationRef';

/**
 * Returns a guard function that checks authentication.
 * If the user is a guest, it navigates to the Login screen and returns false.
 * If authenticated, it returns true so the caller can proceed.
 *
 * Uses a module-level navigationRef instead of useNavigation so the hook
 * can be called from providers rendered outside NavigationContainer
 * (e.g. PhotographerProvider).
 *
 * Usage:
 *   const requireLogin = useLoginGate();
 *   const handleLike = () => { if (!requireLogin()) return; toggleLike(); };
 */
export function useLoginGate() {
  const { isGuest } = useAuth();

  const requireLogin = useCallback((): boolean => {
    if (isGuest) {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Login');
      }
      return false;
    }
    return true;
  }, [isGuest]);

  return requireLogin;
}
