import { AuthProvider, useAuth } from "@/context/AuthContext";
import {
  registerForPushNotificationsAsync,
  savePushTokenToBackend,
  setupNotificationCategories,
  setupNotificationTapHandler,
} from "@/src/lib/notification";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

function RootLayoutContent() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Setup notification categories on app start
    setupNotificationCategories().catch((error) =>
      console.error("Failed to setup notification categories:", error)
    );

    // Setup notification tap handler on app start
    const cleanup = setupNotificationTapHandler(router);

    // Request permissions and register for push notifications
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          console.log("[App] Push notification token acquired");
        }
      })
      .catch((error) => console.error("[App] Notification setup failed:", error));

    return cleanup;
  }, [router]);


  // Save push token to backend after user logs in
  useEffect(() => {
    if (user) {
      savePushTokenToBackend();
    }
  }, [user]);

  return (
    <>
      <StatusBar style={statusBarStyle} />
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
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}