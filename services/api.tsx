
const DEVICE_BASE = "http://192.168.1.7:8000/api";
const ANDROID_EMULATOR_BASE = "http://10.0.2.2:8000/api";

// Optional override: set in app config as EXPO_PUBLIC_API_BASE_URL
const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export function getApiBaseUrl(): string {
  if (ENV_BASE && ENV_BASE.startsWith("http")) return ENV_BASE;
  // Android emulator -> host machine via 10.0.2.2
  // if (Platform.OS === "android") return ANDROID_EMULATOR_BASE;
  return DEVICE_BASE;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  path: string,
  opts?: { method?: string; token?: string; body?: unknown; isForm?: boolean }
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const method = opts?.method ?? "GET";

  const headers: Record<string, string> = {};
  if (opts?.token) headers.Authorization = `Token ${opts.token}`;

  // IMPORTANT: FormData me Content-Type set mat karo (fetch khud boundary set karta hai)
  if (!opts?.isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body:
      opts?.body == null
        ? undefined
        : opts.isForm
          ? (opts.body as any)
          : JSON.stringify(opts.body),
  });

  const data = await parseBody(res);

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : (data as any)?.detail
          ? String((data as any).detail)
          : JSON.stringify(data);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  return data as T;
}

/* ---------------- Phase 1 types ---------------- */

export type User = {
  id?: number;
  name?: string;
  username?: string;
  email?: string;
  is_email_verified?: boolean;
  step_count?: number;
  water_intake?: number;
};

export type LoginResponse = {
  token: string;
  username?: string;
  email?: string;
  is_email_verified?: boolean;
};

export type Medicine = {
  id: number;
  name: string;
  dosage?: string;
  frequency?: number;
  notes?: string;
  image?: string | null;

  // backend fields
  working_mechanism?: string;
  side_effects?: string;

  // UI compatibility (Dashboard uses this name)
  how_it_works?: string;

  is_taken?: boolean;
  created_at?: string;
  user?: number;
  time?: string; // if you ever add it
};

/* ---------------- Phase 2 types ---------------- */

export type Unit = "TABLET" | "CAPSULE" | "ML";
export type MedicineForm = "TABLET" | "CAPSULE" | "SYRUP";
export type IntakeStatus = "PENDING" | "TAKEN" | "SKIPPED";

export type Regimen = {
  id: number;
  medicine: {
    id: number;
    name: string;
    form: MedicineForm;
    strength: string;
    notes: string;
    created_at: string;
  };
  start_date: string;
  end_date: string | null;
  instructions: string;
  is_active: boolean;
  created_at: string;

  dose_times: Array<{
    id: number;
    time: string; // "08:00:00"
    label: string;
    quantity: string; // "1.0"
    unit: Unit;
    days_of_week: string[];
  }>;

  stock: {
    current_quantity: string; // "30.00"
    unit: Unit;
    low_stock_threshold_days: number;
    reorder_url: string;
    last_low_stock_seen_at: string | null;
    last_reorder_response: string | null;
    last_reorder_response_at: string | null;
  };
};

export type CalendarRangeResponse = Record<
  string,
  {
    day: string;
    doses: Array<{
      dose_time_id: number;
      time: string;
      quantity: string;
      unit: Unit;
      label: string;
      status: IntakeStatus;
      scheduled_local: string;
    }>;
  }
>;

export type StockStatus = {
  current_quantity: string;
  unit: Unit;
  low_stock_threshold_days: number;
  avg_daily_required: string;
  days_remaining: string;
  is_low_stock: boolean;
  reorder_url: string;
  last_low_stock_seen_at: string | null;
  last_reorder_response: string | null;
  last_reorder_response_at: string | null;
};

export type LowStockAlertsResponse =
  | any[]
  | { value: any[]; Count?: number };

/* ---------------- Phase 1 API ---------------- */

export const apiLogin = (email: string, password: string) =>
  request<LoginResponse>("/login/", { method: "POST", body: { email, password } });

export const apiLogout = (token: string) =>
  request<{ detail?: string }>("/logout/", { method: "POST", token });

export const apiProfile = (token: string) =>
  request<User>("/profile/", { method: "GET", token });

export async function fetchMedicines(token: string): Promise<Medicine[]> {
  const data = await request<any>("/medicines/", { method: "GET", token });

  const list: Medicine[] = Array.isArray(data) ? data : [data];
  // map for UI compatibility: how_it_works
  return list.map((m) => ({
    ...m,
    how_it_works: (m as any).working_mechanism ?? (m as any).how_it_works,
  }));
}

export const createMedicine = (token: string, body: Partial<Medicine>) =>
  request<Medicine>("/medicines/", { method: "POST", token, body });

export const getReminderSpeech = (token: string, medId: number) =>
  request<{ speech?: string }>(`/reminder-speech/${medId}/`, { method: "GET", token });

export const aiChat = (token: string, message: string) =>
  request<any>("/ai-chat/", { method: "POST", token, body: { message } });

export async function analyzeMedicine(token: string, imageUri: string) {
  const form = new FormData();
  form.append("image", {
    uri: imageUri,
    name: "medicine.jpg",
    type: "image/jpeg",
  } as any);

  return request<any>("/analyze-medicine/", {
    method: "POST",
    token,
    body: form,
    isForm: true,
  });
}

/* ---------------- Phase 2 API ---------------- */

export const listRegimens = (token: string) =>
  request<Regimen[]>("/regimens/", { method: "GET", token });

export const getRegimen = (token: string, id: number) =>
  request<Regimen>(`/regimens/${id}/`, { method: "GET", token });

export const createRegimenWizard = (token: string, body: any) =>
  request<Regimen>("/regimens/wizard/", { method: "POST", token, body });

export const getRegimenCalendar = (token: string, regimenId: number, start: string, end: string) =>
  request<CalendarRangeResponse>(`/regimens/${regimenId}/calendar/?start=${start}&end=${end}`, {
    method: "GET",
    token,
  });

export const intakeUpsert = (token: string, body: { regimen: number; dose_time: number; date: string; status: "TAKEN" | "SKIPPED" }) =>
  request<any>("/intakes/", { method: "POST", token, body });

export const getStockStatus = (token: string, regimenId: number) =>
  request<StockStatus>(`/regimens/${regimenId}/stock/status/`, { method: "GET", token });

export const patchStock = (token: string, regimenId: number, body: { current_quantity: number; unit: Unit }) =>
  request<any>(`/regimens/${regimenId}/stock/`, { method: "PATCH", token, body });

export const restock = (token: string, regimenId: number, add_quantity: number) =>
  request<any>(`/regimens/${regimenId}/stock/restock/`, { method: "POST", token, body: { add_quantity } });

export const reorderResponse = (token: string, regimenId: number, ordered: boolean) =>
  request<any>(`/regimens/${regimenId}/stock/reorder-response/`, { method: "POST", token, body: { ordered } });

export const lowStockAlerts = (token: string) =>
  request<LowStockAlertsResponse>("/alerts/low-stock/", { method: "GET", token });