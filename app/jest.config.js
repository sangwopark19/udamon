/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|@react-native-async-storage/.*)',
  ],
  moduleNameMapper: {
    '^../../services/supabase$': '<rootDir>/src/__tests__/mocks/supabase',
    '^../services/supabase$': '<rootDir>/src/__tests__/mocks/supabase',
  },
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/contexts/**/*.{ts,tsx}',
    'src/screens/auth/**/*.{ts,tsx}',
    'src/screens/onboarding/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};

module.exports = config;
