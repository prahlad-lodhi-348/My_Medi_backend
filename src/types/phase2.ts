// ============= Enums & Unions =============

export type MedicineForm = 'TABLET' | 'CAPSULE' | 'SYRUP' | 'INJECTION' | 'LIQUID';
export type DoseUnit = 'TABLET' | 'CAPSULE' | 'ML';
export type IntakeStatus = 'PENDING' | 'TAKEN' | 'SKIPPED';

// ============= Auth Responses =============

export interface LoginResponse {
  token: string;
  username: string;
  email: string;
  is_email_verified: boolean;
}

export interface RegisterResponse {
  detail?: string;
  username?: string;
  email?: string;
}

export interface ProfileResponse {
  id: number;
  username: string;
  email: string;
  is_email_verified: boolean;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

// ============= Medicine Input Types =============

export interface MedicineInput {
  name: string;
  form: MedicineForm;
  strength: string;
  notes: string;
}

export interface DoseTimeInput {
  time: string; // HH:MM:SS
  quantity: number;
  unit: DoseUnit;
  label: string;
}

export interface StockInput {
  current_quantity: number;
  unit: DoseUnit;
  low_stock_threshold_days: number;
}

export interface RegimenWizardPayload {
  start_date: string;   // YYYY-MM-DD
  end_date?: string;    // ✅ Added — optional
  medicine: MedicineInput;
  dose_times: DoseTimeInput[];
  stock: StockInput;
}

// ============= Medicine Response Types =============

export interface Medicine {
  id: number;
  name: string;
  form: MedicineForm;
  strength: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface DoseTime {
  id: number;
  time: string;
  quantity: string;
  unit: DoseUnit;
  label: string;
}

export interface Stock {
  id: number;
  current_quantity: string;
  unit: DoseUnit;
  low_stock_threshold_days: number;
  last_updated?: string;
}

// ============= Regimen Types =============

export interface Regimen {
  id: number;
  start_date: string;
  end_date?: string;    // ✅ Added — optional
  medicine: Medicine;
  dose_times: DoseTime[];
  stock: Stock;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RegimenListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Regimen[];
}

// ============= Stock Management =============

export interface StockStatus {
  current_quantity: string;
  unit: DoseUnit;
  avg_daily_required: string;
  days_remaining: string;
  is_low_stock: boolean;
}

export interface StockUpdatePayload {
  current_quantity: number;
  unit?: DoseUnit;
  low_stock_threshold_days?: number;
}

// ============= Calendar & Intake =============

export interface CalendarDose {
  dose_time_id: number;
  time: string;
  quantity: string;
  unit: DoseUnit;
  label: string;
  status: IntakeStatus;
  scheduled_local: string;
  intake_id?: number;
}

export interface CalendarDay {
  day: string; // YYYY-MM-DD
  doses: CalendarDose[];
}

export type CalendarRange = Record<string, CalendarDay>;

export interface IntakePayload {
  regimen: number;
  dose_time: number;
  date: string; // YYYY-MM-DD
  status: 'TAKEN' | 'SKIPPED';
  notes?: string;
}

export interface IntakeResponse {
  id: number;
  regimen: number;
  dose_time: number;
  date: string;
  status: IntakeStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============= Alerts =============

export interface LowStockAlert {
  id: number;
  regimen_id: number;
  medicine_name: string;
  days_remaining: number;
  current_quantity: number;
  unit: DoseUnit;
  threshold_days: number;
  created_at: string;
  is_acknowledged: boolean;
}

export interface LowStockAlertResponse {
  count: number;
  results: LowStockAlert[];
}

export interface AlertAckPayload {
  is_acknowledged: boolean;
}

// ============= Wizard Step States =============

export interface WizardStepMedicine extends MedicineInput {
  id?: number;
}

export interface WizardStepDoses {
  doses: DoseTimeInput[];
}

export interface WizardStepStock extends StockInput { }

export interface WizardStepReview {
  start_date: string;
  end_date?: string;    // ✅ Added
  medicine: MedicineInput;
  dose_times: DoseTimeInput[];
  stock: StockInput;
}

// ============= API Error Response =============

export interface ApiErrorResponse {
  detail?: string;
  error?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

export interface DRFErrorResponse {
  message: string;
  status?: number;
}