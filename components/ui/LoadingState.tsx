import { theme } from '@/src/theme';
import React from 'react';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? theme.dark.textSecondary : theme.light.textSecondary;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ color: textColor, marginTop: 16, fontSize: 14, fontWeight: '500' }}>
        {message}
      </Text>
    </View>
  );
}
