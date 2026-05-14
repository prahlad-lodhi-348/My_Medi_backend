import { Platform } from 'react-native';

/**
 * Returns the appropriate backend base URL.
 * Priority:
 * 1. EXPO_PUBLIC_API_URL env override (for development/testing)
 * 2. Android emulator fallback (10.0.2.2)
 * 3. Default Wi-Fi IP for physical devices
 */
export function getBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }

  if (Platform.OS === 'android') {
    // Android emulator special IP
    return 'http://10.0.2.2:8000/api/';
  }

  // Default for physical iOS/Android on same Wi-Fi
  return 'http://192.168.1.1:8000/api/';
}

export const API_URL = getBaseUrl();

