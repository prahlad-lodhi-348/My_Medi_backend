import { theme } from '@/src/theme';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

interface DangerButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function DangerButton({ title, onPress, loading, disabled }: DangerButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: theme.colors.danger,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: theme.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled || loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
