import { api } from '@/src/api/client';
import { storage } from '@/src/lib/storage';
import Constants from 'expo-constants';

import { getBaseUrl } from '@/src/api/baseUrl';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';


// ─── Foreground Notification Handler ───────────────────────────────────────
// Determines how notifications appear when app is in foreground.
// Wrapped in try-catch because expo-notifications throws at module-load time
// in Expo Go SDK 53 when Android push is attempted.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,     // Show alert banner
      shouldShowBanner: true,    // Show notification banner at top
      shouldShowList: true,      // Show in notification center
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('[Notifications] setNotificationHandler skipped (Expo Go):', (e as any)?.message);
}

// ─── Permission & Token ───────────────────────────────────────────────────────

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  // Detect if running in Expo Go (appOwnership === 'expo')
  const isExpoGo = Constants.appOwnership === 'expo';

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Push notification permission denied');
    return null;
  }

  // Setup Android notification channels (works in both Expo Go and standalone)
  if (Platform.OS === 'android') {
    // High priority channel for dose reminders
    await Notifications.setNotificationChannelAsync('mymedi-reminders', {
      name: 'Dose Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#FF0000',
    });

    // Default priority channel for stock/missed alerts
    await Notifications.setNotificationChannelAsync('mymedi-alerts', {
      name: 'Stock & Missed Dose Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
    });
  }

  // In Expo Go (SDK 53+), Android remote push notifications are removed.
  // Local notifications still work fine. Skip remote token fetch.
  if (isExpoGo) {
    console.log('[Notifications] Running in Expo Go – using local notifications only (no remote push token)');
    return 'local-only';
  }

  // In standalone/EAS builds: attempt to get the remote push token
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('[Notifications] No projectId found – skipping remote push token');
      return 'local-only';
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    if (!token) {
      console.warn('[Notifications] Failed to get push token');
      return null;
    }

    console.log('[Notifications] Push token acquired successfully');
    return token;
  } catch (error: any) {
    // Silently handle – do not crash the app
    console.log('[Notifications] Push notification setup skipped:', error?.message ?? error);
    return null;
  }
}

// ─── Schedule Dose Reminder ───────────────────────────────────────────────────
// Schedules notifications for ALL specified weekdays (not just the first one)

export async function scheduleDoseReminder({
  regimenId,
  medicineName,
  hour,
  minute,
  daysOfWeek, // [1=Sun, 2=Mon, ... 7=Sat], empty = daily
}: {
  regimenId: number;
  medicineName: string;
  hour: number;
  minute: number;
  daysOfWeek?: number[];
}): Promise<string[]> {
  // Cancel any existing reminders for this regimen to prevent duplicates
  await cancelAllRemindersForRegimen(regimenId);

  const identifiers: string[] = [];

  // If specific days provided, schedule for each
  if (daysOfWeek && daysOfWeek.length > 0) {
    for (const weekday of daysOfWeek) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Time for your medicine',
          body: `${medicineName} — tap to mark as taken`,
          data: { regimenId, type: 'dose_reminder' },
          sound: 'default',
          categoryIdentifier: 'DOSE_REMINDER',
          // Android specific channel
          ...(Platform.OS === 'android' && {
            channelId: 'mymedi-reminders',
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        },
      });
      identifiers.push(identifier);
    }
    console.log(
      `[Notifications] Scheduled dose reminder for regimen ${regimenId} on ${daysOfWeek.length} days`
    );
  } else {
    // No specific days = daily reminder
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Time for your medicine',
        body: `${medicineName} — tap to mark as taken`,
        data: { regimenId, type: 'dose_reminder' },
        sound: 'default',
        categoryIdentifier: 'DOSE_REMINDER',
        ...(Platform.OS === 'android' && {
          channelId: 'mymedi-reminders',
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    identifiers.push(identifier);
    console.log(`[Notifications] Scheduled daily dose reminder for regimen ${regimenId}`);
  }

  return identifiers;
}

// ─── Cancel All Reminders for a Regimen ──────────────────────────────────────
// Cancels all scheduled notifications for a regimen to prevent duplicates

export async function cancelAllRemindersForRegimen(regimenId: number) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    let cancelCount = 0;

    for (const notif of scheduled) {
      const data = notif.content.data as any;
      if (data?.regimenId === regimenId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        cancelCount++;
      }
    }

    if (cancelCount > 0) {
      console.log(`[Notifications] Cancelled ${cancelCount} scheduled reminders for regimen ${regimenId}`);
    }
  } catch (error) {
    console.error('[Notifications] Error cancelling reminders:', error);
  }
}

// ─── Missed Dose Alert (immediate) ───────────────────────────────────────────

export async function sendMissedDoseAlert(medicineName: string, regimenId: number) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Missed Dose',
        body: `You missed your ${medicineName} dose. Mark it or skip it.`,
        data: { regimenId, type: 'missed_dose' },
        sound: 'default',
        categoryIdentifier: 'MISSED_DOSE',
        ...(Platform.OS === 'android' && {
          channelId: 'mymedi-alerts',
        }),
      },
      trigger: null, // Fire immediately
    });
    console.log(`[Notifications] Missed dose alert sent for regimen ${regimenId}`);
  } catch (error) {
    console.error('[Notifications] Failed to send missed dose alert:', error);
  }
}

// ─── Low Stock Alert (immediate) ─────────────────────────────────────────────
// Now includes regimenId for proper navigation on tap

export async function sendLowStockAlert(
  medicineName: string,
  daysRemaining: number,
  regimenId?: number
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📦 Low Stock Warning',
        body: `${medicineName} has only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of supply left.`,
        data: { regimenId, type: 'low_stock' },
        sound: 'default',
        categoryIdentifier: 'LOW_STOCK',
        ...(Platform.OS === 'android' && {
          channelId: 'mymedi-alerts',
        }),
      },
      trigger: null, // Fire immediately
    });
    console.log(`[Notifications] Low stock alert sent for regimen ${regimenId || 'unknown'}`);
  } catch (error) {
    console.error('[Notifications] Failed to send low stock alert:', error);
  }
}


// ─── Save Push Token to Backend ───────────────────────────────────────────────
// Call this immediately after successful login

export async function savePushTokenToBackend(): Promise<boolean> {
  try {
    const token = await registerForPushNotificationsAsync();

    if (!token) {
      console.warn('[Notifications] No push token available to save');
      return false;
    }

    // 'local-only' means we're in Expo Go – skip backend save
    if (token === 'local-only') {
      console.log('[Notifications] Expo Go detected – skipping backend push token save');
      return false;
    }

    // Get auth token from storage
    const authToken = await storage.getToken();
    if (!authToken) {
      console.warn('[Notifications] No auth token available, cannot save push token');
      return false;
    }

    const baseUrl = getBaseUrl();
    console.log('[Notifications] Saving push token to backend', {
      baseUrl,
      endpoint: 'push-tokens/',
      tokenPreview: String(token).slice(0, 8) + '…',
    });

    await api('push-tokens/', {
      method: 'POST',
      body: { expo_push_token: token },
      token: authToken,
    });


    console.log('[Notifications] Push token saved to backend successfully');
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to save push token to backend:', error);
    return false;
  }
}


// ─── Notification Categories Setup ───────────────────────────────────────────


export async function setupNotificationCategories(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync('DOSE_REMINDER', [
      {
        identifier: 'MARK_TAKEN',
        buttonTitle: 'Mark Taken',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SKIP',
        buttonTitle: 'Skip',
        options: { opensAppToForeground: true },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('MISSED_DOSE', [
      {
        identifier: 'MARK_TAKEN',
        buttonTitle: 'Mark Taken',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SKIP',
        buttonTitle: 'Skip',
        options: { opensAppToForeground: true },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('LOW_STOCK', [
      {
        identifier: 'REORDER',
        buttonTitle: 'Reorder Now',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'DISMISS',
        buttonTitle: 'Dismiss',
        options: { opensAppToForeground: false },
      },
    ]);

    console.log('[Notifications] Categories registered');
  } catch (error) {
    console.error('[Notifications] Failed to setup categories:', error);
  }
}

// ─── Notification Tap Handler ─────────────────────────────────────────────────
// Handles user interaction with notifications

export function setupNotificationTapHandler(router: any): () => void {
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const data = response.notification.request.content.data as {
            type?: string;
            regimenId?: number;
          };

          const notificationType = data?.type;
          const regimenId = data?.regimenId;

          console.log(`[Notifications] Tap received - Type: ${notificationType}, RegimenId: ${regimenId}`);

          // Only navigate if we have regimenId for actions that need it
          if (notificationType === 'dose_reminder' || notificationType === 'missed_dose') {
            if (!regimenId) {
              console.warn('[Notifications] Dose reminder tapped but regimenId is missing');
              return;
            }
            router.push({
              pathname: '/regimen-detail',
              params: { regimenId: regimenId.toString() },
            });
          } else if (notificationType === 'low_stock') {
            if (!regimenId) {
              console.warn('[Notifications] Low stock alert tapped but regimenId is missing');
              // Navigate to stock alerts page instead
              router.push('/alerts');
              return;
            }
            router.push({
              pathname: '/regimen-detail',
              params: { regimenId: regimenId.toString() },
            });
          } else {
            console.warn(`[Notifications] Unknown notification type: ${notificationType}`);
          }
        } catch (error) {
          console.error('[Notifications] Error handling notification tap:', error);
        }
      }
    );

    return () => subscription.remove();
  } catch (error: any) {
    // Expo Go may throw when setting up listeners — return a safe no-op
    console.log('[Notifications] Tap handler skipped (Expo Go):', error?.message);
    return () => {};
  }
}

// ─── Caregiver Push Token Register ───────────────────────────────────────────

export async function registerCaregiverToken(
  caregiverId: number,
  apiClient: any
): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return;

    await apiClient.post(`/api/caregivers/${caregiverId}/register-token/`, {
      expo_push_token: token,
    });

    console.log(`[Notifications] Caregiver ${caregiverId} token registered`);
  } catch (error) {
    console.error('[Notifications] Caregiver token registration failed:', error);
  }
}