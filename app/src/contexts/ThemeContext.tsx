// @ts-nocheck — MVP 블라인드: 다크모드 비활성화
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors as lightColors, darkColors, type ColorScheme } from '../constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  themeColors: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  isDark: false,
  themeColors: lightColors,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('light');

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const themeColors = isDark ? darkColors : lightColors;

  const setThemeMode = useCallback((m: ThemeMode) => {
    setMode(m);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, isDark, themeColors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
