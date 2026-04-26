# Phase 2 Build Plan

## Information Gathered
- Existing Expo Router project with NativeWind, AsyncStorage, and a basic auth context.
- Current auth uses `userToken` key in AsyncStorage and `Token <token>` header.
- Existing API layer in `services/api.ts` using fetch.
- Existing black-themed UI; Phase 2 requires warm medical palette (teal/blue + warm neutrals).
- Existing routes need migration into `(auth)` and `(app)` groups.

## Proposed File Structure

```
app/
  _layout.tsx                    (Root layout with auth gate)
  +not-found.tsx
  (auth)/
    _layout.tsx                  (Auth stack: no tabs, clean headers)
    login.tsx                    (Login screen - replaces sign-in/sign-up)
  (app)/
    _layout.tsx                  (Protected layout with bottom tabs)
    regimens/
      index.tsx                  (Regimen list)
      wizard.tsx                 (Create regimen wizard)
      [id].tsx                   (Regimen detail)
      [id]/
        calendar.tsx             (Calendar + dose tracking)
    alerts/
      low-stock.tsx              (Low stock alerts)
    profile/
      index.tsx                  (Profile placeholder)

src/
  types/
    phase2.ts                    (All DTOs, API response types)
  api/
    client.ts                    (Generic fetch wrapper, token attach, 401 handling)
    phase2.ts                    (Typed endpoint functions)
  constants/
    Config.ts                    (getBaseUrl(), API_URL export)
  theme/
    colors.ts                    (Warm medical design tokens)
  components/
    ui/
      ScreenWrapper.tsx          (SafeArea + warm background)
      Card.tsx
      SectionTitle.tsx
      PillBadge.tsx
      PrimaryButton.tsx
      SecondaryButton.tsx
      FormTextInput.tsx
      SelectField.tsx
      LoadingSkeleton.tsx
    auth/
      AuthGuard.tsx              (Redirect to login if no token)

context/
  AuthContext.tsx                (Update to store/read `token` key, add isAuthReady gate)
```

## Detailed Plan

### Step 1: Foundation & Config
1. Update `tsconfig.json` paths to include `@/src/*`.
2. Create `src/constants/Config.ts` with `getBaseUrl()` (Android emulator `10.0.2.2` vs device `192.168.1.6`).
3. Create `src/types/phase2.ts` with all strict types (Regimen, DoseTime, StockStatus, CalendarRange, LoginResponse, etc.).
4. Create `src/theme/colors.ts` with warm medical palette.

### Step 2: API Layer
1. Create `src/api/client.ts`:
   - `api<T>(path, opts)` wrapper.
   - Auto-read `token` from AsyncStorage.
   - Attach `Authorization: Token <token>`.
   - Parse JSON + plain text errors.
   - On 401: clear token, redirect to `/(auth)/login`.
2. Create `src/api/phase2.ts`:
   - Typed functions: `login`, `listRegimens`, `createRegimenWizard`, `getRegimen`, `getStockStatus`, `updateStock`, `restock`, `reorderResponse`, `getCalendar`, `recordIntake`, `getLowStockAlerts`.

### Step 3: Design System Components
Create reusable UI components in `src/components/ui/` with warm medical styling (no emojis).

### Step 4: Auth Context Update
- Update AsyncStorage key from `userToken` to `token` to match requirement.
- Add `isAuthReady` state so root layout can wait before routing.
- Update login to match new `POST /login/` shape.

### Step 5: Root & Group Layouts
- `app/_layout.tsx`: Add auth gate. While `isAuthReady` is false, show splash. Once ready, route to `(app)` or `(auth)`.
- `app/(auth)/_layout.tsx`: Simple stack for login.
- `app/(app)/_layout.tsx`: Bottom tabs (Regimens, Alerts, Profile) with warm theme.

### Step 6: Screens Implementation
1. **Login** (`app/(auth)/login.tsx`): Email/password, inline validation, error messages, store token.
2. **Regimens List** (`app/(app)/regimens/index.tsx`): Cards with medicine info, dose count, stock indicator, Create button.
3. **Regimen Wizard** (`app/(app)/regimens/wizard.tsx`): 3-step form (Medicine details, Schedule, Stock) using React Hook Form + Zod. Time pickers, add/remove dose rows.
4. **Regimen Detail** (`app/(app)/regimens/[id].tsx`): Medicine section, dose schedule list, stock card with Set/Restock/Reorder actions.
5. **Calendar** (`app/(app)/regimens/[id]/calendar.tsx`): Date range selector, day sections, Taken/Skipped buttons, status badges.
6. **Low Stock Alerts** (`app/(app)/alerts/low-stock.tsx`): Normalize `{value, Count}` or array response, empty state, cards linking to detail.
7. **Profile** (`app/(app)/profile/index.tsx`): Placeholder with logout.

### Step 7: Cleanup & Integration
- Remove deprecated `app/sign-in.tsx`, `app/sign-up.tsx`, `app/(tabs)/`.
- Update `app/_layout.tsx` to remove old screen references.
- Ensure `services/api.ts` is either deprecated or aligned.
- Add edge case handling: string-number parsing, retry buttons, loading states.

### Step 8: Verification
- Run TypeScript strict check.
- Verify no emoji usage in UI text.

## Dependent Files to Edit
- `app/_layout.tsx` (complete rewrite for auth gate)
- `context/AuthContext.tsx` (update storage key, add readiness gate)
- `constants/Config.ts` (replace with getBaseUrl logic)
- `tsconfig.json` (add `@/src/*` path)
- Delete: `app/sign-in.tsx`, `app/sign-up.tsx`, `app/(tabs)/`, `app/add-medicine.tsx`, `app/medicine-list.tsx`, `app/ai-chat.tsx`, `app/modal.tsx` (or keep as legacy if desired)

## Follow-up Steps
- Install dependencies: `zod`, `react-hook-form`, `@hookform/resolvers`, `react-native-paper` (optional, we can do custom)
- Run `npx expo start`
- Test on Android emulator (10.0.2.2) and physical device (192.168.1.6)

**Note:** The user specified `fetch` over axios. We will stick to fetch. No emojis in UI text.

