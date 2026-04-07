import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|@react-native-async-storage/.*)',
  ],
  setupFilesAfterSetup: [],
  moduleNameMapper: {
    '^../../services/supabase$': '<rootDir>/src/__tests__/mocks/supabase',
    '^../services/supabase$': '<rootDir>/src/__tests__/mocks/supabase',
  },
  testPathDirs: ['<rootDir>/src/__tests__'],
  collectCoverageFrom: [
    'src/contexts/**/*.{ts,tsx}',
    'src/screens/auth/**/*.{ts,tsx}',
    'src/screens/onboarding/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};

export default config;
