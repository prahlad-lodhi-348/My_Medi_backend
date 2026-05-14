# Quick Reference - Notification Functions

## 📞 Function Signatures & Usage Examples

### 1. Schedule Dose Reminder (Multi-day support) ✅
**Function:**
```typescript
scheduleDoseReminder({
  regimenId: number;
  medicineName: string;
  hour: number;
  minute: number;
  daysOfWeek?: number[];  // [1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat]
}): Promise<string[]>     // Returns array of notification IDs
```

**Examples:**
```typescript
// Daily reminder at 9:00 AM
await scheduleDoseReminder({
  regimenId: 1,
  medicineName: 'Aspirin',
  hour: 9,
  minute: 0,
});

// Mon, Wed, Fri at 9:00 AM
await scheduleDoseReminder({
  regimenId: 2,
  medicineName: 'Vitamin D',
  hour: 9,
  minute: 0,
  daysOfWeek: [2, 4, 6],
});

// Weekdays (Mon-Fri) at 8:30 AM
await scheduleDoseReminder({
  regimenId: 3,
  medicineName: 'Blood Pressure Med',
  hour: 8,
  minute: 30,
  daysOfWeek: [2, 3, 4, 5, 6],
});

// Weekend only (Sat-Sun) at 10:00 AM
await scheduleDoseReminder({
  regimenId: 4,
  medicineName: 'Multivitamin',
  hour: 10,
  minute: 0,
  daysOfWeek: [1, 7],
});
```

---

### 2. Send Low Stock Alert (With RegimenId) ✅
**Function:**
```typescript
sendLowStockAlert(
  medicineName: string,
  daysRemaining: number,
  regimenId?: number  // Optional but recommended for navigation
): Promise<void>
```

**Examples:**
```typescript
// Basic usage
import { sendLowStockAlert } from '@/src/lib/notification';

// With regimenId (enables tap navigation)
if (daysRemaining < 7) {
  await sendLowStockAlert('Aspirin', daysRemaining, regimenId);
}

// Without regimenId (user must navigate manually)
await sendLowStockAlert('Paracetamol', 3);

// In your stock check logic
async function checkStockLevels() {
  const regimens = await fetchUserRegimens();
  
  for (const regimen of regimens) {
    const daysRemaining = calculateDaysRemaining(regimen);
    
    if (daysRemaining < 7) {
      await sendLowStockAlert(
        regimen.medicine.name,
        daysRemaining,
        regimen.id  // ✅ Pass regimenId
      );
    }
  }
}
```

---

### 3. Send Missed Dose Alert ✅
**Function:**
```typescript
sendMissedDoseAlert(
  medicineName: string,
  regimenId: number
): Promise<void>
```

**Examples:**
```typescript
import { sendMissedDoseAlert } from '@/src/lib/notification';

// When user passes scheduled time
await sendMissedDoseAlert('Aspirin', regimenId);

// In your schedule check (e.g., runs daily at 11 PM)
async function checkMissedDoses() {
  const today = new Date();
  const todaysDoses = await fetchTodaysDoses(today);
  
  for (const dose of todaysDoses) {
    if (!dose.taken && new Date() > dose.scheduledTime + 30min) {
      await sendMissedDoseAlert(dose.medicineName, dose.regimenId);
    }
  }
}
```

---

### 4. Cancel All Reminders for Regimen ✅
**Function:**
```typescript
cancelAllRemindersForRegimen(regimenId: number): Promise<void>
```

**Examples:**
```typescript
import { cancelAllRemindersForRegimen } from '@/src/lib/notification';

// When user deletes a regimen
async function deleteRegimen(regimenId) {
  await cancelAllRemindersForRegimen(regimenId);  // ✅ Cancel notifications first
  await api(`regimens/${regimenId}`, { method: 'DELETE' });
}

// When user disables a regimen
async function disableRegimen(regimenId) {
  await cancelAllRemindersForRegimen(regimenId);
  await api(`regimens/${regimenId}`, {
    method: 'PATCH',
    body: { is_active: false }
  });
}

// When user reschedules
async function updateRegimenSchedule(regimenId, newTime, newDays) {
  await cancelAllRemindersForRegimen(regimenId);  // ✅ Cancel old schedule
  
  // Schedule new one
  await scheduleDoseReminder({
    regimenId,
    medicineName: 'NewName',
    hour: newTime.hour,
    minute: newTime.minute,
    daysOfWeek: newDays,
  });
}
```

---

### 5. Save Push Token to Backend ✅
**Function:**
```typescript
savePushTokenToBackend(): Promise<boolean>
```

**Called Automatically:**
```typescript
// In app/_layout.tsx - already integrated!
// Triggers automatically when user logs in
useEffect(() => {
  if (user) {
    savePushTokenToBackend();  // ✅ Runs after login
  }
}, [user]);
```

**Manual Usage (if needed):**
```typescript
import { savePushTokenToBackend } from '@/src/lib/notification';

// Manually refresh token (e.g., if updating profile)
async function updateUserProfile(data) {
  const response = await api('profile/', {
    method: 'PATCH',
    body: data,
  });
  
  // Refresh push token in backend
  await savePushTokenToBackend();
  
  return response;
}
```

---

### 6. Setup Notification Tap Handler ✅
**Function:**
```typescript
setupNotificationTapHandler(router: any): () => void
```

**Already Integrated:**
```typescript
// In app/_layout.tsx - runs automatically!
useEffect(() => {
  const cleanup = setupNotificationTapHandler(router);
  return cleanup;
}, [router]);
```

**Behavior:**
- Dose Reminder → Navigate to `/regimen-detail?regimenId=X`
- Missed Dose → Navigate to `/regimen-detail?regimenId=X`
- Low Stock (with ID) → Navigate to `/regimen-detail?regimenId=X`
- Low Stock (no ID) → Navigate to `/alerts`

---

### 7. Register for Notifications ✅
**Function:**
```typescript
registerForPushNotificationsAsync(): Promise<string | null>
```

**Already Called:**
```typescript
// In app/_layout.tsx - runs on app start!
useEffect(() => {
  registerForPushNotificationsAsync()
    .then((token) => {
      if (token) {
        console.log('[App] Push notification token acquired');
      }
    })
    .catch((error) => 
      console.error('[App] Notification setup failed:', error)
    );
}, []);
```

**Manual Usage (rarely needed):**
```typescript
import { registerForPushNotificationsAsync } from '@/src/lib/notification';

// Get token for display/testing
const token = await registerForPushNotificationsAsync();
console.log('Current token:', token);
```

---

### 8. Setup Notification Categories ✅
**Function:**
```typescript
setupNotificationCategories(): Promise<void>
```

**Already Called:**
```typescript
// In app/_layout.tsx - runs on app start!
useEffect(() => {
  setupNotificationCategories();
}, []);
```

**Categories Available:**
- `DOSE_REMINDER` → "Mark Taken", "Skip"
- `MISSED_DOSE` → "Mark Taken", "Skip"
- `LOW_STOCK` → "Reorder Now", "Dismiss"

---

## 🎯 Common Implementation Patterns

### Pattern 1: Schedule Regimen with Reminders
```typescript
// In your wizard/add-regimen component
import { scheduleDoseReminder } from '@/src/lib/notification';

async function handleCreateRegimen(formData) {
  try {
    // 1. Create regimen in backend
    const response = await api('regimens/', {
      method: 'POST',
      body: formData,
    });
    
    const newRegimen = response.data;
    
    // 2. Schedule notifications
    if (formData.enableReminders) {
      await scheduleDoseReminder({
        regimenId: newRegimen.id,
        medicineName: newRegimen.medicine_name,
        hour: formData.time.hour,
        minute: formData.time.minute,
        daysOfWeek: formData.daysOfWeek,  // ✅ Supports multi-day
      });
      
      showToast('Reminders scheduled!');
    }
    
    router.back();
  } catch (error) {
    showError('Failed to create regimen');
  }
}
```

### Pattern 2: Update Regimen Reminders
```typescript
import { 
  scheduleDoseReminder, 
  cancelAllRemindersForRegimen 
} from '@/src/lib/notification';

async function handleUpdateRegimen(regimenId, newData) {
  try {
    // 1. Cancel old reminders
    await cancelAllRemindersForRegimen(regimenId);
    
    // 2. Update backend
    await api(`regimens/${regimenId}/`, {
      method: 'PATCH',
      body: newData,
    });
    
    // 3. Schedule new reminders
    if (newData.enableReminders) {
      await scheduleDoseReminder({
        regimenId,
        medicineName: newData.medicine_name,
        hour: newData.time.hour,
        minute: newData.time.minute,
        daysOfWeek: newData.daysOfWeek,
      });
    }
    
    showToast('Regimen updated!');
  } catch (error) {
    showError('Failed to update regimen');
  }
}
```

### Pattern 3: Stock Check Background Task
```typescript
// In a service or background task handler
import { sendLowStockAlert } from '@/src/lib/notification';

export async function checkStockLevelsDaily() {
  try {
    const regimens = await api('regimens/');
    
    for (const regimen of regimens) {
      const daysRemaining = calculateDaysRemaining(
        regimen.total_quantity,
        regimen.daily_dose
      );
      
      // Threshold: 7 days
      if (daysRemaining < 7 && !regimen.stock_alert_sent) {
        await sendLowStockAlert(
          regimen.medicine_name,
          daysRemaining,
          regimen.id  // ✅ Enable navigation on tap
        );
        
        // Mark alert as sent
        await api(`regimens/${regimen.id}/`, {
          method: 'PATCH',
          body: { stock_alert_sent: true }
        });
      }
    }
  } catch (error) {
    console.error('[Background] Stock check failed:', error);
  }
}
```

### Pattern 4: Handle Notification Actions
```typescript
// In your API/dose-marking logic
export async function handleDoseTaken(regimenId: number) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await api('doses/', {
      method: 'POST',
      body: {
        regimen_id: regimenId,
        date: today,
        taken: true,
        taken_at: new Date().toISOString(),
      }
    });
    
    showToast('Dose marked as taken!');
  } catch (error) {
    showError('Failed to mark dose');
  }
}
```

---

## 🧪 Testing Checklist

- [ ] Scheduled daily reminder at correct time
- [ ] Scheduled multi-day reminders for all days
- [ ] Low stock alert navigates to regimen detail
- [ ] Missed dose alert navigates correctly
- [ ] Token saved to backend after login
- [ ] Foreground notifications appear (app open)
- [ ] Background notifications work (app closed)
- [ ] Android: Notifications appear with correct channels
- [ ] iOS: Notifications appear with correct badge
- [ ] Duplicate reminders don't occur after update
- [ ] Canceling regimen removes all notifications
- [ ] Tap handler doesn't crash if data missing

---

## 🐛 Debugging Tips

### Check Scheduled Notifications
```typescript
import * as Notifications from 'expo-notifications';

async function debugScheduledNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log('Scheduled notifications:', JSON.stringify(scheduled, null, 2));
}
```

### Check Push Token
```typescript
import { storage } from '@/src/lib/storage';

async function debugToken() {
  const authToken = await storage.getToken();
  console.log('Auth token:', authToken?.substring(0, 10) + '...');
  
  const token = await registerForPushNotificationsAsync();
  console.log('Push token:', token?.substring(0, 20) + '...');
}
```

### Test Notification Tap
```typescript
// Add to your tap handler
console.log('Full notification data:', JSON.stringify(response.notification, null, 2));
```

---

## 📝 Notes

- `daysOfWeek` uses 1-7 (1=Sunday, 7=Saturday)
- Return values now include full arrays for multi-day scheduling
- Always include `regimenId` in notification data when possible
- Token saved automatically after login - no manual action needed
- All functions include proper error handling and logging

