import { theme } from '@/src/theme';
import React from 'react';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? theme.dark.text : theme.light.text;
  const mutedColor = isDark ? theme.dark.textMuted : theme.light.textMuted;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
      <Text style={{ color: textColor, fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
        Failed to load
      </Text>
      <Text style={{ color: mutedColor, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: theme.radius.lg,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
