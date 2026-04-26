# Y Medi UI/UX & Auth Fix Plan

## 1. Safe Area & Status Bar
- [ ] Wrap root layout in SafeAreaProvider + StatusBar
- [ ] Create reusable AppScreen component with safe area insets
- [ ] Apply to all tab screens + stack screens

## 2. Theme Centralization
- [ ] Extend src/theme/colors.ts into full theme tokens
- [ ] Create components/ui/* reusable UI kit

## 3. Tab Screens Fixes
- [ ] Home (index.tsx): AppScreen wrapper, bottom padding, theme tokens
- [ ] Schedule (regimen-list.tsx): use listRegimens(), RefreshControl, states
- [ ] Inventory (medicine-list.tsx): use getMedicines(), RefreshControl, timeout, states
- [ ] Alerts (alerts.tsx): use getLowStockAlerts(), RefreshControl, proper card layout

## 4. Profile Redesign + Logout Fix
- [ ] Redesign Profile (two.tsx) with themed cards/sections
- [ ] Fix logout: confirm dialog, clear tokens/state, router.replace('/sign-in')

## 5. Bottom Tabs
- [ ] Shorten labels: Home, Schedule, Inventory, Alerts, Profile
- [ ] Dynamic tab bar height respecting safe-area bottom inset

## 6. AI Chat Fix
- [ ] Implement sendAIMessage calling backend /ai/chat/
- [ ] Add medical disclaimer + loading/error UI

## 7. API & Auth Improvements
- [ ] Update api client: better error messages, 401 handling
- [ ] Update AuthContext: robust logout with backend call (swallow errors)

## 8. Testing
- [ ] Manual checklist on Android emulator / real device

