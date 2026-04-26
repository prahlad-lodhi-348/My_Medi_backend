import { theme } from '@/src/theme';
import React from 'react';
import { useColorScheme, View } from 'react-native';

interface AppCardProps {
  children: React.ReactNode;
  style?: any;
  variant?: 'default' | 'danger' | 'warning' | 'info';
}

export function AppCard({ children, style, variant = 'default' }: AppCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? theme.dark.surface : theme.light.surface;
  const border = isDark ? theme.dark.border : theme.light.border;

  const variantBg = {
    default: bg,
    danger: isDark ? '#1f1115' : theme.colors.dangerLight,
    warning: isDark ? '#1f1a10' : theme.colors.warningLight,
    info: isDark ? '#101520' : theme.colors.infoLight,
  }[variant];

  const variantBorder = {
    default: border,
    danger: isDark ? '#3f1a20' : theme.colors.danger,
    warning: isDark ? '#3f2a10' : theme.colors.warning,
    info: isDark ? '#1a2a40' : theme.colors.info,
  }[variant];

  return (
    <View
      style={[
        {
          backgroundColor: variantBg,
          borderRadius: theme.radius.xxl,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: variantBorder,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.15 : 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
