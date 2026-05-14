# Expo Notifications Implementation Guide

## Overview
Complete Expo Notifications setup for your Expo Router + Django backend app with proper token management, multi-day scheduling, and tap navigation.

---

## ✅ What Was Fixed

### 1. **Low Stock Alerts Now Include RegimenId**
**Before:**
```typescript
data: { type: 'low_stock' } // ❌ Missing regimenId
```

**After:**
```typescript
export async function sendLowStockAlert(
  medicineName: string,
  daysRemaining: number,
  regimenId?: number  // ✅ Now optional parameter
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      data: { regimenId, type: 'low_stock' },  // ✅ Includes regimenId
      // ...
    },
  });
}
```

**Usage:**
```typescript
// When calling from stock check logic
sendLowStockAlert('Aspirin', 2, regimenId);
```

---

### 2. **Multi-Day Weekly Reminders Now Schedule ALL Weekdays**
**Before:**
```typescript
trigger: {
  weekday: daysOfWeek[0], // ❌ Only first day!
  hour, minute
}
```

**After:**
```typescript
export async function scheduleDoseReminder({
  regimenId,
  medicineName,
  hour,
  minute,
  daysOfWeek,
}): Promise<string[]> {
  // ✅ Loop through all weekdays
  if (daysOfWeek && daysOfWeek.length > 0) {
    for (const weekday of daysOfWeek) {
      const identifier = await Notifications.scheduleNotificationAsync({
        // ...
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,  // ✅ Each iteration schedules for one day
          hour, minute
        },
      });
      identifiers.push(identifier);
    }
  }
  return identifiers;  // ✅ Returns array of all scheduled identifiers
}
```

**Usage:**
```typescript
// Schedule Mon, Wed, Fri at 9:00 AM
await scheduleDoseReminder({
  regimenId: 1,
  medicineName: 'Aspirin',
  hour: 9,
  minute: 0,
  daysOfWeek: [2, 4, 6]  // ✅ Schedules 3 notifications (one per day)
});
```

---

### 3. **Foreground Notifications Properly Display**
✅ Already correct - calls `Notifications.setNotificationHandler()` at module load:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,     // Shows banner at top
    shouldShowBanner: true,    // Shows full notification
    shouldShowList: true,      // Appears in notification center
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

This ensures foreground notifications are visible even when app is open.

---

### 4. **Expo Push Token Now Sent to Backend After Login**
**New Function Added:**
```typescript
export async function savePushTokenToBackend(): Promise<boolean> {
  try {
    // Step 1: Get/request push token
    const token = await registerForPushNotificationsAsync();
    if (!token) return false;

    // Step 2: Get auth token from storage
    const authToken = await storage.getToken();
    if (!authToken) return false;

    // Step 3: Send to backend
    await api('push-tokens/', {
      method: 'POST',
      body: { expo_push_token: token },
      token: authToken,
    });

    console.log('[Notifications] Push token saved to backend');
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to save push token:', error);
    return false;
  }
}
```

**Triggered After Login in `_layout.tsx`:**
```typescript
function RootLayoutContent() {
  const { user } = useAuth();

  useEffect(() => {
    // Save token when user logs in
    if (user) {
      savePushTokenToBackend();
    }
  }, [user]);
}
```

---

### 5. **Improved Notification Tap Handler**
**Before:**
```typescript
if (data?.type === 'dose_reminder' || data?.type === 'missed_dose' || data?.type === 'low_stock') {
  router.push({
    pathname: '/regimen-detail',
    params: { regimenId: data.regimenId },  // ❌ May be undefined
  });
}
```

**After:**
```typescript
export function setupNotificationTapHandler(router: any): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response.notification.request.content.data;
      const regimenId = data?.regimenId;

      // Dose/Missed: Must have regimenId
      if (data?.type === 'dose_reminder' || data?.type === 'missed_dose') {
        if (!regimenId) {
          console.warn('[Notifications] regimenId missing');
          return;
        }
        router.push({
          pathname: '/regimen-detail',
          params: { regimenId: regimenId.toString() },  // ✅ Validated & stringified
        });
      } 
      // Low stock: Navigate to detail if regimenId exists, else to alerts
      else if (data?.type === 'low_stock') {
        if (regimenId) {
          router.push({
            pathname: '/regimen-detail',
            params: { regimenId: regimenId.toString() },
          });
        } else {
          router.push('/alerts');  // ✅ Fallback to alerts page
        }
      }
    } catch (error) {
      console.error('[Notifications] Error handling tap:', error);
    }
  });

  return () => subscription.remove();
}
```

---

### 6. **Android Notification Channels Properly Configured**
```typescript
if (Platform.OS === 'android') {
  // High priority for time-sensitive dose reminders
  await Notifications.setNotificationChannelAsync('mymedi-reminders', {
    name: 'Dose Reminders',
    importance: Notifications.AndroidImportance.HIGH,  // ✅ Heads-up notification
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    enableLights: true,
    lightColor: '#FF0000',
  });

  // Default priority for alerts
  await Notifications.setNotificationChannelAsync('mymedi-alerts', {
    name: 'Stock & Missed Dose Alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    enableVibrate: true,
  });
}
```

**Applied in Notifications:**
```typescript
content: {
  // ...
  ...(Platform.OS === 'android' && {
    channelId: 'mymedi-reminders',  // ✅ Use appropriate channel
  }),
}
```

---

### 7. **Duplicate Reminders Prevented**
```typescript
export async function scheduleDoseReminder({
  regimenId,
  medicineName,
  hour,
  minute,
  daysOfWeek,
}) {
  // ✅ Cancel existing reminders FIRST
  await cancelAllRemindersForRegimen(regimenId);

  // Then schedule new ones
  // ...
}

export async function cancelAllRemindersForRegimen(regimenId: number) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    const data = notif.content.data;
    if (data?.regimenId === regimenId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}
```

---

## 📱 Backend Django Implementation

### Step 1: Create Push Token Model
```python
# models.py
from django.db import models
from django.contrib.auth.models import User

class ExpoPushToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='expo_token')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_valid = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username}: {self.token[:20]}..."

    class Meta:
        verbose_name = "Expo Push Token"
        verbose_name_plural = "Expo Push Tokens"
```

### Step 2: Create Serializer
```python
# serializers.py
from rest_framework import serializers
from .models import ExpoPushToken

class PushTokenSerializer(serializers.Serializer):
    expo_push_token = serializers.CharField(max_length=255)

    def create(self, validated_data):
        token = validated_data['expo_push_token']
        expo_token, created = ExpoPushToken.objects.update_or_create(
            user=self.context['request'].user,
            defaults={'token': token, 'is_valid': True}
        )
        return expo_token
```

### Step 3: Create API Endpoint
```python
# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import ExpoPushToken
from .serializers import PushTokenSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_push_token(request):
    """
    Save Expo push token for authenticated user.
    Expected POST data: {"expo_push_token": "ExponentPushToken[...]"}
    """
    serializer = PushTokenSerializer(
        data=request.data,
        context={'request': request}
    )
    if serializer.is_valid():
        serializer.save()
        return Response(
            {'detail': 'Push token saved successfully'},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

### Step 4: Register URL
```python
# urls.py
from django.urls import path
from .views import save_push_token

urlpatterns = [
    path('push-tokens/', save_push_token, name='save_push_token'),
    # ... other URLs
]
```

### Step 5: Send Notifications (Optional Helper)
```python
# notifications.py
from exponent_server_sdk import (
    DeviceNotDisabledError,
    InvalidCredentialsError,
    InvalidTokenError,
    NotificationTimeout,
    PushClient,
    PushMessage,
)
from .models import ExpoPushToken

def send_dose_reminder(regimen):
    """Send dose reminder to user via Expo push notification."""
    try:
        expo_token = ExpoPushToken.objects.get(user=regimen.user, is_valid=True)
    except ExpoPushToken.DoesNotExist:
        return False

    try:
        push_client = PushClient()
        message = PushMessage(
            to=expo_token.token,
            title='💊 Time for your medicine',
            body=f"{regimen.medicine.name} — tap to mark as taken",
            data={'regimenId': regimen.id, 'type': 'dose_reminder'},
            sound='default',
            badge=1,
        )

        push_client.publish(message)
        return True
    except (InvalidCredentialsError, InvalidTokenError, DeviceNotDisabledError):
        # Mark token as invalid
        expo_token.is_valid = False
        expo_token.save()
        return False
```

---

## 🔧 Testing Notifications

### Test Low Stock Alert
```typescript
// In your stock check logic
import { sendLowStockAlert } from '@/src/lib/notification';

// When days remaining < threshold
if (daysRemaining < 7) {
  await sendLowStockAlert('Aspirin', daysRemaining, regimenId);
}
```

### Test Dose Reminder
```typescript
// When creating/updating regimen
import { scheduleDoseReminder } from '@/src/lib/notification';

await scheduleDoseReminder({
  regimenId: 1,
  medicineName: 'Aspirin',
  hour: 9,
  minute: 0,
  daysOfWeek: [2, 3, 4, 5, 6], // Mon-Fri
});
```

### Test Push Token Saving
```typescript
// Check localStorage after login
import { storage } from '@/src/lib/storage';

const token = await storage.getToken();
console.log('Auth token:', token);

// Check backend - should have saved token
// curl http://localhost:8000/api/push-tokens/ \
//   -H "Authorization: Token YOUR_TOKEN" \
//   -H "Content-Type: application/json"
```

---

## 📋 Notification Data Structure

### Dose Reminder
```json
{
  "type": "dose_reminder",
  "regimenId": 123
}
```

### Low Stock Alert
```json
{
  "type": "low_stock",
  "regimenId": 123
}
```

### Missed Dose Alert
```json
{
  "type": "missed_dose",
  "regimenId": 123
}
```

---

## ⚠️ Common Issues & Solutions

### Issue: Tap doesn't navigate
**Solution:** Check that `regimenId` is included in notification data
```typescript
// ❌ Wrong
data: { type: 'dose_reminder' }

// ✅ Correct
data: { regimenId: 123, type: 'dose_reminder' }
```

### Issue: Only first weekday scheduled
**Solution:** Use updated `scheduleDoseReminder` that loops through all days
```typescript
// Old code (fixed)
weekday: daysOfWeek[0]  // ❌

// New code (correct)
for (const weekday of daysOfWeek) {
  // Schedule each
}
```

### Issue: Notifications don't appear in foreground
**Solution:** Ensure `setNotificationHandler` is called with correct settings
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

### Issue: Android notifications don't show
**Solution:** Ensure channel ID matches and permissions granted
```typescript
// In app.json
{
  "plugins": [
    ["expo-notifications", {
      "icon": "./assets/icon.png",
      "color": "#ffffff"
    }]
  ]
}
```

---

## 🚀 Best Practices

1. **Always Include RegimenId**: Makes navigation reliable
2. **Loop Through Weekdays**: Don't just schedule first day
3. **Cancel Before Reschedule**: Prevents duplicates
4. **Save Token After Login**: Ensures backend can send notifications
5. **Add Try-Catch Blocks**: Notifications shouldn't crash app
6. **Log Extensively**: Use `[Notifications]` prefix for easy debugging
7. **Test on Physical Device**: Simulators have notification limitations
8. **Handle Missing RegimenId**: Fallback to alerts page
9. **Use Appropriate Channels**: HIGH for reminders, DEFAULT for alerts
10. **Validate Data in Tap Handler**: Don't assume all fields exist

---

## 📊 File Changes Summary

| File | Change |
|------|--------|
| `src/lib/notification.tsx` | Complete overhaul: fixed all issues |
| `app/_layout.tsx` | Added token saving after login, separated content |

---

## 🔗 Related Documentation

- [Expo Notifications Docs](https://docs.expo.dev/guides/push-notifications/)
- [Expo Router Navigation](https://docs.expo.dev/routing/introduction/)
- [Android Notification Channels](https://developer.android.com/training/notify-user/channels)

---

## ✅ Verification Checklist

- [x] Low stock alerts include regimenId
- [x] Multi-day reminders schedule all weekdays
- [x] Foreground notifications display
- [x] Push token sent to backend after login
- [x] Tap handler validates regimenId before navigation
- [x] Android channels configured correctly
- [x] Duplicate reminders prevented with cancel logic
- [x] Production-ready with error handling
- [x] Clean logging with [Notifications] prefix
- [x] TypeScript types properly exported

