import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={token ? "/(tabs)" : "/sign-in"} />;
}

