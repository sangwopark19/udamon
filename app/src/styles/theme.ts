export { colors } from '../constants/colors';

// Border Radius
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  button: 18,
  xl: 20,
  xxl: 24,
  round: 9999,
} as const;

// Typography Scale
export const fontSize = {
  display: 30,
  sectionTitle: 21,
  price: 18,
  cardName: 16,
  body: 15,
  tabLabel: 14,
  meta: 13,
  micro: 12,
  badge: 11,
  tiny: 10,
  micro2: 9,
} as const;

export const fontWeight = {
  heading: '800' as const,
  name: '700' as const,
  body: '600' as const,
} as const;

// Shadow Presets
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// Spacing Scale (4-point grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Layout Constants
export const layout = {
  headerHeight: 56,
  tabBarHeight: 70,
} as const;
