import { theme } from '@/src/theme';
import React from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppScreenProps {
  children: React.ReactNode;
  style?: any;
  contentStyle?: any;
}

export function AppScreen({ children, style, contentStyle }: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? theme.dark.background : theme.light.background;

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: bg }, style]} edges={['top', 'left', 'right']}>
      <View style={[{ flex: 1, paddingBottom: insets.bottom + 8 }, contentStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}
