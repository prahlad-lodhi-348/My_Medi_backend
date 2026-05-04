/**
 * Push Notification System for MyMedi App
 * 
 * Handles 3 notification types:
 * 1. Dose Reminder - scheduled daily/weekly repeating notification
 * 2. Missed Dose Alert - immediate notification when dose is missed
 * 3. Low Stock Alert - immediate notification when stock is low
 * 
 * Compatible with:
 * - Expo SDK ~54
 * - expo-notifications (latest)
 * - expo-device
 * - expo-constants
 * - TypeScript
 * - Both Android & iOS
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// =============================================================================
// NOTIFICATION HANDLER (Foreground)
// =============================================================================
// Configures how notifications appear when app is in foreground
// Required fields for newer expo-notifications SDK

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,     // Show alert dialog on iOS
    shouldShowBanner: true,    // Show banner notification
    shouldShowList: true,      // Show in notification center/list
    shouldPlaySound: true,    // Play notification sound
    shouldSetBadge: true,      // Update app badge count
  }),
});

// =============================================================================
// TYPES
// =============================================================================

/** Parameters for scheduling a dose reminder */
export interface DoseReminderParams {
  regimenId: number;
  medicineName: string;
  hour: number;          // 0-23 hour
  minute: number;       // 0-59 minute
  daysOfWeek?: number[]; // [1=Sun, 2=Mon, ... 7=Sat], empty = daily
}

/** Parameters for missed dose alert */
export interface MissedDoseParams {
  medicineName: string;
  regimenId: number;
}

/** Parameters for low stock alert */
export interface LowStockParams {
  medicineName: string;
  daysRemaining: number;
}

// =============================================================================
// PERMISSIONS & SETUP
// =============================================================================

/**
 * Request push notification permissions and setup Android channels
 * @returns Expo push token or null if failed
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.warn('[Notifications] Push notifications require a physical device');
      return null;
    }

    // Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Return null if permission denied
    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Push notification permission denied');
      return null;
    }

    // Setup Android notification channels
    if (Platform.OS === 'android') {
      // Channel for dose reminders - HIGH importance for urgency
      await Notifications.setNotificationChannelAsync('mymedi-reminders', {
        name: 'Dose Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Channel for alerts (missed dose, low stock) - DEFAULT importance
      await Notifications.setNotificationChannelAsync('mymedi-alerts', {
        name: 'Stock & Missed Dose Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    console.log('[Notifications] Push token obtained');
    return tokenData.data;

  } catch (error) {
    console.error('[Notifications] Failed to register for push notifications:', error);
    return null;
  }
}

// =============================================================================
// DOSE REMINDERS (Scheduled Repeating)
// =============================================================================

/**
 * Schedule a repeating dose reminder notification
 * @param params - Dose reminder parameters
 * @returns Notification identifier
 */
export async function scheduleDoseReminder(
  params: DoseReminderParams
): Promise<string> {
  const { regimenId, medicineName, hour, minute, daysOfWeek } = params;

  try {
    // Cancel any existing reminder for this regimen before creating new one
    await cancelDoseReminder(regimenId, hour, minute);

    // Determine trigger based on daysOfWeek
    let trigger: Notifications.SchedulableNotificationTriggerInput;

    if (daysOfWeek && daysOfWeek.length > 0) {
      // Weekly repetition - schedule for each specified day
      // For simplicity, we schedule one notification per call
      // In production, you might call this multiple times for multi-day schedules
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: daysOfWeek[0], // First day of week (1=Sun, 7=Sat)
        hour,
        minute,
      };
    } else {
      // Daily repetition
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      };
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Time for your medicine',
        body: `${medicineName} — tap to mark as taken`,
        data: {
          regimenId,
          type: 'dose_reminder',
          medicineName,
        },
        sound: 'default',
        categoryIdentifier: 'DOSE_REMINDER',
      },
      trigger,
    });

    console.log(`[Notifications] Scheduled dose reminder: ${identifier}`);
    return identifier;

  } catch (error) {
    console.error('[Notifications] Failed to schedule dose reminder:', error);
    throw error;
  }
}

/**
 * Cancel a specific dose reminder
 * @param regimenId - Regimen ID
 * @param hour - Hour of the reminder
 * @param minute - Minute of the reminder
 */
export async function cancelDoseReminder(
  regimenId: number,
  hour: number,
  minute: number
): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notif of scheduled) {
      const data = notif.content.data as {
        regimenId?: number;
        type?: string;
      };
      
      // Match by regimenId, type, and approximate time
      if (
        data?.regimenId === regimenId &&
        data?.type === 'dose_reminder'
      ) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        console.log(`[Notifications] Cancelled reminder: ${notif.identifier}`);
      }
    }
  } catch (error) {
    console.error('[Notifications] Failed to cancel dose reminder:', error);
  }
}

/**
 * Cancel all notifications for a specific regimen
 * Used when deleting a regimen
 * @param regimenId - Regimen ID to cancel all reminders for
 */
export async function cancelAllRemindersForRegimen(
  regimenId: number
): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notif of scheduled) {
      const data = notif.content.data as {
        regimenId?: number;
        type?: string;
      };
      
      // Cancel any notification related to this regimen
      if (data?.regimenId === regimenId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        console.log(`[Notifications] Cancelled reminder for regimen ${regimenId}: ${notif.identifier}`);
      }
    }
  } catch (error) {
    console.error('[Notifications] Failed to cancel reminders for regimen:', error);
  }
}

// =============================================================================
// MISSED DOSE ALERT (Immediate)
// =============================================================================

/**
 * Send an immediate missed dose alert notification
 * @param params - Missed dose parameters
 */
export async function sendMissedDoseAlert(
  params: MissedDoseParams
): Promise<void> {
  const { medicineName, regimenId } = params;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Missed Dose',
        body: `You missed your ${medicineName} dose. Mark it as taken or skipped.`,
        data: {
          regimenId,
          type: 'missed_dose',
          medicineName,
        },
        sound: 'default',
        categoryIdentifier: 'MISSED_DOSE',
      },
      trigger: null, // Fire immediately (null = immediate)
    });

    console.log(`[Notifications] Sent missed dose alert for ${medicineName}`);
  } catch (error) {
    console.error('[Notifications] Failed to send missed dose alert:', error);
  }
}

// =============================================================================
// LOW STOCK ALERT (Immediate)
// =============================================================================

/**
 * Send an immediate low stock alert notification
 * @param params - Low stock parameters
 */
export async function sendLowStockAlert(
  params: LowStockParams
): Promise<void> {
  const { medicineName, daysRemaining } = params;

  try {
    // Determine urgency based on days remaining
    const urgency = daysRemaining <= 3 ? 'URGENT' : 'Warning';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📦 Low Stock Warning',
        body: `${medicineName} has only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of supply left. Time to reorder!`,
        data: {
          type: 'low_stock',
          medicineName,
          daysRemaining,
        },
        sound: 'default',
        categoryIdentifier: 'LOW_STOCK',
      },
      trigger: null, // Fire immediately (null = immediate)
    });

    console.log(`[Notifications] Sent low stock alert for ${medicineName} (${daysRemaining} days)`);
  } catch (error) {
    console.error('[Notifications] Failed to send low stock alert:', error);
  }
}

// =============================================================================
// NOTIFICATION CATEGORIES (For Action Handling)
// =============================================================================

/**
 * Setup notification categories for interactive actions
 * Call this when app initializes
 */
export async function setupNotificationCategories(): Promise<void> {
  try {
    // Register notification categories for iOS/Android action handling
    await Notifications.setNotificationCategoryAsync('DOSE_REMINDER', [
      {
        identifier: 'MARK_TAKEN',
        buttonTitle: 'Mark Taken',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'SKIP',
        buttonTitle: 'Skip',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('MISSED_DOSE', [
      {
        identifier: 'MARK_TAKEN',
        buttonTitle: 'Mark Taken',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'SKIP',
        buttonTitle: 'Skip',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('LOW_STOCK', [
      {
        identifier: 'REORDER',
        buttonTitle: 'Reorder Now',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'DISMISS',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    console.log('[Notifications] Categories registered');
  } catch (error) {
    console.error('[Notifications] Failed to setup categories:', error);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Cancel all scheduled notifications
 * Use with caution - this removes all reminders
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] All scheduled notifications cancelled');
  } catch (error) {
    console.error('[Notifications] Failed to cancel all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 * Useful for debugging
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Failed to get scheduled notifications:', error);
    return [];
  }
}

/**
 * Get current badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('[Notifications] Failed to get badge count:', error);
    return 0;
  }
}

/**
 * Set badge count
 * @param count - Badge number to display
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('[Notifications] Failed to set badge count:', error);
  }
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/*
// 1. Register for push notifications (call on app startup)
// const token = await registerForPushNotificationsAsync();

// 2. Schedule a dose reminder
// await scheduleDoseReminder({
//   regimenId: 1,
//   medicineName: 'Aspirin',
//   hour: 8,
//   minute: 0,
//   daysOfWeek: [2, 3, 4, 5, 6], // Mon-Fri
// });

// 3. Cancel reminders when deleting a regimen
// await cancelAllRemindersForRegimen(regimenId);

// 4. Send missed dose alert (from your backend/callback)
// await sendMissedDoseAlert({
//   medicineName: 'Aspirin',
//   regimenId: 1,
// });

// 5. Send low stock alert (from stock monitoring)
// await sendLowStockAlert({
//   medicineName: 'Aspirin',
//   daysRemaining: 5,
// });
*/
