// components/ui/PrimaryButton.tsx
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "danger";
};

export default function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  style,
  variant = "primary",
}: Props) {
  const isDisabled = disabled || loading;

  const backgroundColor = variant === "danger" ? "#dc2626" : "#00897B";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        { backgroundColor },
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

export { PrimaryButton };

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#00897B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});