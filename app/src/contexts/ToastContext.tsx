import React, { createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radius } from '../styles/theme';

type ToastType = 'info' | 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = 2500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const translateY = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, t: ToastType = 'info') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    setType(t);

    translateY.setValue(-100);
    Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }).start();
    }, DURATION);
  }, [translateY]);

  const bgColor = type === 'success' ? colors.success : type === 'error' ? colors.error : colors.primary;

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: bgColor, top: insets.top + 8, transform: [{ translateY }] },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.toastText}>{message}</Text>
      </Animated.View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  toastText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.buttonPrimaryText,
  },
});
