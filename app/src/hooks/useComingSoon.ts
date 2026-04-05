import { useCallback } from 'react';
import { SUPPORT_FEATURE_ENABLED } from '../constants/config';
import { useComingSoonModal } from '../contexts/ComingSoonContext';

/**
 * Returns a guard function for support/ticket/revenue features.
 * While SUPPORT_FEATURE_ENABLED is false, shows a custom "coming soon" modal and returns false.
 * When the flag is true, returns true (no-op pass-through).
 *
 * Usage (same pattern as useLoginGate):
 *   const checkSupport = useComingSoon();
 *   const handlePress = () => { if (!checkSupport()) return; doStuff(); };
 */
export function useComingSoon() {
  const { showComingSoon } = useComingSoonModal();

  const checkFeature = useCallback((): boolean => {
    if (!SUPPORT_FEATURE_ENABLED) {
      showComingSoon();
      return false;
    }
    return true;
  }, [showComingSoon]);

  return checkFeature;
}
