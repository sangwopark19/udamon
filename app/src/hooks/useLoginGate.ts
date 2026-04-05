import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Returns a guard function that checks authentication.
 * If the user is a guest, it navigates to the Login screen and returns false.
 * If authenticated, it returns true so the caller can proceed.
 *
 * Usage:
 *   const requireLogin = useLoginGate();
 *   const handleLike = () => { if (!requireLogin()) return; toggleLike(); };
 */
export function useLoginGate() {
  const { isGuest } = useAuth();
  const navigation = useNavigation<Nav>();

  const requireLogin = useCallback((): boolean => {
    if (isGuest) {
      navigation.navigate('Login');
      return false;
    }
    return true;
  }, [isGuest, navigation]);

  return requireLogin;
}
