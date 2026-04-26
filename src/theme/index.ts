import { colors } from './colors';

export const theme = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 28,
    full: 9999,
  },
  dark: {
    background: '#000000',
    surface: '#0b1220',
    surfaceElevated: '#111827',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#1f2937',
    input: '#111827',
  },
  light: {
    background: '#FAFAF9',
    surface: '#FFFFFF',
    surfaceElevated: '#F5F5F4',
    text: '#1C1917',
    textSecondary: '#78716C',
    textMuted: '#A8A29E',
    border: '#E7E5E4',
    input: '#F5F5F4',
  },
};

export type Theme = typeof theme;
