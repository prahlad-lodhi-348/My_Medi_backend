import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "token";

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Fallback if SecureStore fails (e.g., device not secured)
    await AsyncStorage.setItem(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

export const storage = {
  async getToken(): Promise<string | null> {
    return getSecureItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    return setSecureItem(TOKEN_KEY, token);
  },
  async removeToken(): Promise<void> {
    return deleteSecureItem(TOKEN_KEY);
  },
};

