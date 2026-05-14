
import { Platform } from 'react-native';

const DEVICE_BASE = "http://192.168.1.1:8000/api";
const ANDROID_EMULATOR_BASE = "http://10.0.2.2:8000/api";


/**
 * Backend base URL for mobile.
 * Prefer setting EXPO_PUBLIC_API_URL to your dev machine LAN IP.
 */
export function getBaseUrl(): string {
  // Allow override (recommended)
  const envUrl = (process as any)?.env?.EXPO_PUBLIC_API_URL as string | undefined;
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl : `${envUrl}/`;
  }

  return Platform?.OS === "android" ? `${ANDROID_EMULATOR_BASE}` : `${DEVICE_BASE}`;
}

