import { AuthProvider } from "@/context/AuthContext";
import {
  registerForPushNotificationsAsync,
  setupNotificationCategories,
  setupNotificationTapHandler,
} from "@/src/lib/notification";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    setupNotificationCategories();
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) console.log('Push notification token:', token);
      })
      .catch((error) => console.error('Notification setup failed:', error));

    const cleanup = setupNotificationTapHandler(router);
    return cleanup;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ headerShown: false }} />

          <Stack.Screen
            name="regimen-list"
            options={{
              headerShown: true,
              title: "My Medicines",
              headerStyle: { backgroundColor: "#fafafa" },
              headerTintColor: "#0d9488",
              headerTitleStyle: { fontSize: 18, fontWeight: "600" },
            }}
          />
          <Stack.Screen
            name="regimen-detail"
            options={{
              headerShown: true,
              title: "Medicine Details",
              headerStyle: { backgroundColor: "#fafafa" },
              headerTintColor: "#0d9488",
            }}
          />
          <Stack.Screen
            name="wizard"
            options={{
              headerShown: true,
              title: "Add Medicine Regimen",
              headerStyle: { backgroundColor: "#fafafa" },
              headerTintColor: "#0d9488",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="calendar"
            options={{
              headerShown: true,
              title: "Medicine Calendar",
              headerStyle: { backgroundColor: "#fafafa" },
              headerTintColor: "#0d9488",
            }}
          />
          <Stack.Screen
            name="alerts"
            options={{
              headerShown: true,
              title: "Stock Alerts",
              headerStyle: { backgroundColor: "#fafafa" },
              headerTintColor: "#0d9488",
            }}
          />

          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen name="ai-chat" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="add-medicine"
            options={{
              headerShown: true,
              title: "Add Medicine",
              headerStyle: { backgroundColor: "#fafafa" },
              headerTintColor: "#0d9488",
            }}
          />

          <Stack.Screen
            name="+not-found"
            options={{
              headerShown: true,
              title: "Oops!",
              headerStyle: { backgroundColor: "#fafafa" },
              headerTintColor: "#0d9488",
            }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}