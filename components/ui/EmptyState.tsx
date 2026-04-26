import { theme } from "@/src/theme";
import React from "react";
import { Text, useColorScheme, View } from "react-native";

interface EmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
}

export function EmptyState({
  icon = "📭",
  title = "Nothing here",
  subtitle = "There's nothing to show right now.",
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? theme.dark.text : theme.light.text;
  const textSecondary = isDark ? theme.dark.textSecondary : theme.light.textSecondary;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text
        style={{
          color: textColor,
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: textSecondary,
          fontSize: 14,
          textAlign: "center",
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

