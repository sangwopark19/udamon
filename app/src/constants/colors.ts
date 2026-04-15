// udamon Color System
// Based on udamon Color System

export type ColorScheme = { [K in keyof typeof lightColors]: string };

const lightColors = {
  // Primary
  primary: '#1B2A4A',        // Deep Navy — CTA, header, emphasis

  // Backgrounds
  background: '#FFFFFF',     // Main background
  surface: '#F5F7FA',        // Card, section background
  surfaceLight: '#F0F2F5',   // Subtle surface variant
  surfaceElevated: '#FFFFFF', // Elevated cards, modals

  // Text
  textPrimary: '#1A1A2E',    // Headings, body
  textSecondary: '#6B7280',  // Supplementary info
  textTertiary: '#9CA3AF',   // Hints, placeholders

  // Borders
  border: '#E5E7EB',         // Dividers, card borders
  borderLight: '#D1D5DB',    // Stronger borders

  // Buttons
  buttonPrimary: '#1B2A4A',
  buttonPrimaryText: '#FFFFFF',
  buttonDisabled: '#F5F7FA',
  buttonDisabledText: '#9CA3AF',

  // Status
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Semantic
  trending: '#EF4444',           // Trending badge
  communityBadge: '#1B2A4A',     // Community card badge in home feed
  verified: '#22C55E',           // Verified/HQ badge
  star: '#FACC15',               // Ratings
  featuredAccent: '#D97706',     // Featured/best cut tag text (amber)
  // UI-SPEC §Color: bronze 는 Phase 4 의 유일한 신규 hex (GradeBadge tier 브론즈 시그니파이어)
  bronze: '#A97142',             // Photographer bronze grade

  // Active/Highlight
  activeLight: '#FFF0F0',         // Light tint for active category/filter
  activeBorder: '#FFB8B8',        // Border for active category/filter

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.45)',
  overlayHeavy: 'rgba(0, 0, 0, 0.6)',

  // Primary Alpha
  primaryAlpha3: 'rgba(27, 42, 74, 0.03)',
  primaryAlpha8: 'rgba(27, 42, 74, 0.08)',
  primaryAlpha12: 'rgba(27, 42, 74, 0.12)',
  primaryAlpha15: 'rgba(27, 42, 74, 0.15)',

  // Featured Alpha (star/gold)
  featuredAlpha20: 'rgba(250, 204, 21, 0.2)',
  featuredAlpha25: 'rgba(250, 204, 21, 0.25)',
  featuredAlpha40: 'rgba(250, 204, 21, 0.4)',

  // Error Alpha
  errorAlpha10: 'rgba(239, 68, 68, 0.1)',
  errorAlpha12: 'rgba(239, 68, 68, 0.12)',

  // Notification type colors
  notifBlue: '#3B82F6',
  notifBlueBg: 'rgba(59, 130, 246, 0.12)',
  notifGreen: '#22C55E',
  notifGreenBg: 'rgba(34, 197, 94, 0.12)',

  // White Alpha (gradient overlay text)
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
  whiteAlpha15: 'rgba(255, 255, 255, 0.15)',
  whiteAlpha50: 'rgba(255, 255, 255, 0.5)',
  whiteAlpha60: 'rgba(255, 255, 255, 0.6)',
  whiteAlpha70: 'rgba(255, 255, 255, 0.7)',
  whiteAlpha85: 'rgba(255, 255, 255, 0.85)',
} as const;

// Default export — used by theme.ts static import
export const colors = lightColors;

// darkColors 보류 — MVP 이후 다크모드 적용 시 복원
const _darkColors: ColorScheme = {
  // Primary
  primary: '#4A7BF7',

  // Backgrounds
  background: '#0F1117',
  surface: '#1A1D27',
  surfaceLight: '#22252F',
  surfaceElevated: '#1E2130',

  // Text
  textPrimary: '#F0F0F5',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',

  // Borders
  border: '#2A2D3A',
  borderLight: '#3A3D4A',

  // Buttons
  buttonPrimary: '#4A7BF7',
  buttonPrimaryText: '#FFFFFF',
  buttonDisabled: '#1A1D27',
  buttonDisabledText: '#6B7280',

  // Status
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Semantic
  trending: '#EF4444',
  communityBadge: '#4A7BF7',
  verified: '#22C55E',
  star: '#FACC15',
  featuredAccent: '#F59E0B',
  bronze: '#A97142',

  // Active/Highlight
  activeLight: '#2A1515',
  activeBorder: '#5A3030',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',

  // Primary Alpha
  primaryAlpha3: 'rgba(74, 123, 247, 0.05)',
  primaryAlpha8: 'rgba(74, 123, 247, 0.10)',
  primaryAlpha12: 'rgba(74, 123, 247, 0.15)',
  primaryAlpha15: 'rgba(74, 123, 247, 0.18)',

  // Featured Alpha
  featuredAlpha20: 'rgba(250, 204, 21, 0.2)',
  featuredAlpha25: 'rgba(250, 204, 21, 0.25)',
  featuredAlpha40: 'rgba(250, 204, 21, 0.4)',

  // Error Alpha
  errorAlpha10: 'rgba(239, 68, 68, 0.12)',
  errorAlpha12: 'rgba(239, 68, 68, 0.15)',

  // Notification type colors
  notifBlue: '#60A5FA',
  notifBlueBg: 'rgba(96, 165, 250, 0.15)',
  notifGreen: '#34D399',
  notifGreenBg: 'rgba(52, 211, 153, 0.15)',

  // White Alpha
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
  whiteAlpha15: 'rgba(255, 255, 255, 0.15)',
  whiteAlpha50: 'rgba(255, 255, 255, 0.5)',
  whiteAlpha60: 'rgba(255, 255, 255, 0.6)',
  whiteAlpha70: 'rgba(255, 255, 255, 0.7)',
  whiteAlpha85: 'rgba(255, 255, 255, 0.85)',
} as const;
