export const colors = {
  primary: '#0F766E',
  primaryLight: '#14B8A6',
  primaryDark: '#115E59',
  background: '#FAFAF9',
  surface: '#FFFFFF',
  text: '#1C1917',
  textSecondary: '#78716C',
  textMuted: '#A8A29E',
  border: '#E7E5E4',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',
  shadow: '#000000',
} as const;

export type MedicalColors = typeof colors;

