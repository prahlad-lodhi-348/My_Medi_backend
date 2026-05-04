import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // legacy field (still needed)
    shouldShowBanner: true,  // required in newer expo-notifications
    shouldShowList: true,    // required in newer expo-notifications
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Permission & Token ───────────────────────────────────────────────────────

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mymedi-reminders', {
      name: 'Dose Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('mymedi-alerts', {
      name: 'Stock & Missed Dose Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })
  ).data;

  return token;
}

// ─── Schedule Dose Reminder ───────────────────────────────────────────────────

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
}): Promise<string> {
  // Cancel any existing reminder for this regimen+time first
  await cancelDoseReminder(regimenId, hour, minute);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💊 Time for your medicine',
      body: `${medicineName} — tap to mark as taken`,
      data: { regimenId, type: 'dose_reminder' },
      sound: 'default',
      categoryIdentifier: 'DOSE_REMINDER',
    },
    trigger: daysOfWeek && daysOfWeek.length > 0
      ? {
          // Repeat for each day in daysOfWeek
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: daysOfWeek[0], // Schedule one; call multiple times for multi-day
          hour,
          minute,
        }
      : {
          // Daily repeat
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
  });

  return identifier;
}

// ─── Cancel Specific Dose Reminder ───────────────────────────────────────────

export async function cancelDoseReminder(
  regimenId: number,
  hour: number,
  minute: number
) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    const data = notif.content.data as any;
    if (data?.regimenId === regimenId && data?.type === 'dose_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

// ─── Cancel All Reminders for a Regimen ──────────────────────────────────────

export async function cancelAllRemindersForRegimen(regimenId: number) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    const data = notif.content.data as any;
    if (data?.regimenId === regimenId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

// ─── Missed Dose Alert (immediate) ───────────────────────────────────────────

export async function sendMissedDoseAlert(medicineName: string, regimenId: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Missed Dose',
      body: `You missed your ${medicineName} dose. Mark it or skip it.`,
      data: { regimenId, type: 'missed_dose' },
      sound: 'default',
    },
    trigger: null, // Fire immediately
  });
}

// ─── Low Stock Alert (immediate) ─────────────────────────────────────────────

export async function sendLowStockAlert(medicineName: string, daysRemaining: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📦 Low Stock Warning',
      body: `${medicineName} has only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of supply left.`,
      data: { type: 'low_stock' },
      sound: 'default',
    },
    trigger: null, // Fire immediately
  });
}