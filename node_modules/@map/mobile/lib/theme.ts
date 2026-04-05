import { TextStyle } from 'react-native';

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  gold:       '#D4AF37',
  goldLight:  '#F0D060',
  goldDark:   '#B8962E',
  white:      '#FFFFFF',
  offWhite:   '#FAF9F6',
  nearBlack:  '#1A1A1A',
  grayText:   '#888888',
  grayLight:  '#F2F2F2',
  grayBorder: '#E0E0E0',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const TYPOGRAPHY: Record<string, TextStyle> = {
  h1: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.nearBlack,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.nearBlack,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.grayText,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    // textTransform handled inline (RN TextStyle limitation with const)
  },
};

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const SPACING = {
  screenPadding: 24,
  cardGap:       16,
  sectionGap:    32,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOWS = {
  card: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius:  20,
    elevation:     10,
  },
  button: {
    shadowColor:   COLORS.gold,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius:  16,
    elevation:     8,
  },
  searchBar: {
    shadowColor:   COLORS.gold,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     3,
  },
} as const;
