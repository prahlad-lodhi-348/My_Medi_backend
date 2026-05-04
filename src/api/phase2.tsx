/**
 * Phase 2 API Service
 * 
 * Handles all Phase 2 regimen, medicine, calendar, and alert API calls.
 * Uses the centralized api() client with strict TypeScript types.
 */

import {
  AlertAckPayload,
  CalendarRange,
  IntakePayload,
  IntakeResponse,
  LoginResponse,
  LowStockAlert,
  LowStockAlertResponse,
  Medicine,
  Regimen,
  RegimenListResponse,
  RegimenWizardPayload,
  StockStatus
} from '@/src/types/phase2';
import { api } from './client';

// ============= AUTH (Phase 1 Compat) =============

/**
 * POST /login/
 * Login and get token
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>('login/', {
    method: 'POST',
    body: { email, password } as unknown as Record<string, unknown>,
    skipAuth: true,
  });
}

// ============= REGIMEN MANAGEMENT =============

/**
 * GET /regimens/
 * Fetch all regimens for the current user
 */
export async function listRegimens(): Promise<Regimen[]> {
  const response = await api<RegimenListResponse | Regimen[]>('regimens/');

  // Handle both paginated and simple array responses
  if (Array.isArray(response)) {
    return response;
  }

  if (response && 'results' in response) {
    return response.results;
  }

  return [];
}

/**
 * POST /regimens/wizard/
 * Create a new regimen via wizard
 */
export async function createRegimenWizard(payload: RegimenWizardPayload): Promise<Regimen> {
  return api<Regimen>('regimens/wizard/', {   // ✅ FIXED: was 'regimens/'
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}

/**
 * GET /regimens/{id}/
 * Fetch a single regimen by ID
 */
export async function getRegimen(id: number): Promise<Regimen> {
  return api<Regimen>(`regimens/${id}/`);
}

/**
 * PATCH /regimens/{id}/
 * Update regimen details
 */
export async function updateRegimen(
  id: number,
  updates: Partial<RegimenWizardPayload>
): Promise<Regimen> {
  return api<Regimen>(`regimens/${id}/`, {
    method: 'PATCH',
    body: updates as unknown as Record<string, unknown>,
  });
}

/**
 * DELETE /regimens/{id}/
 * Delete a regimen
 */
export async function deleteRegimen(id: number): Promise<void> {
  await api<void>(`regimens/${id}/`, {
    method: 'DELETE',
  });
}

// ============= STOCK MANAGEMENT =============

/**
 * GET /regimens/{id}/stock/status/
 * Fetch stock status for a regimen
 */
export async function getStockStatus(id: number): Promise<StockStatus> {
  return api<StockStatus>(`regimens/${id}/stock/status/`);
}

/**
 * PATCH /regimens/{id}/stock/
 * Update stock information
 */
export async function updateStock(
  id: number,
  current_quantity: number,
  unit?: string
): Promise<StockStatus> {
  return api<StockStatus>(`regimens/${id}/stock/`, {
    method: 'PATCH',
    body: { current_quantity, unit } as unknown as Record<string, unknown>,
  });
}

/**
 * POST /regimens/{id}/stock/restock/
 * Add quantity to stock
 */
export async function restock(id: number, add_quantity: number): Promise<StockStatus> {
  return api<StockStatus>(`regimens/${id}/stock/restock/`, {
    method: 'POST',
    body: { add_quantity },
  });
}

/**
 * POST /regimens/{id}/stock/reorder-response/
 * Update reorder status
 */
export async function reorderResponse(id: number, ordered: boolean): Promise<StockStatus> {
  return api<StockStatus>(`regimens/${id}/stock/reorder-response/`, {
    method: 'POST',
    body: { ordered },
  });
}

// ============= CALENDAR & INTAKE TRACKING =============

/**
 * GET /regimens/{id}/calendar/?start={YYYY-MM-DD}&end={YYYY-MM-DD}
 * Fetch calendar data for a date range
 */
export async function getCalendar(
  id: number,
  start: string,
  end: string
): Promise<CalendarRange> {
  return api<CalendarRange>(`regimens/${id}/calendar/?start=${start}&end=${end}`);
}

/**
 * POST /intakes/
 * Create or update an intake record
 */
export async function recordIntake(payload: IntakePayload): Promise<IntakeResponse> {
  return api<IntakeResponse>('intakes/', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}

/**
 * GET /intakes/{id}/
 * Fetch a specific intake record
 */
export async function getIntake(id: number): Promise<IntakeResponse> {
  return api<IntakeResponse>(`intakes/${id}/`);
}

/**
 * PATCH /intakes/{id}/
 * Update an intake record
 */
export async function updateIntake(
  id: number,
  updates: Partial<IntakePayload>
): Promise<IntakeResponse> {
  return api<IntakeResponse>(`intakes/${id}/`, {
    method: 'PATCH',
    body: updates as unknown as Record<string, unknown>,
  });
}

// ============= ALERTS =============

/**
 * GET /alerts/low-stock/
 * Fetch all low stock alerts
 */
export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  const response = await api<LowStockAlertResponse | LowStockAlert[]>('alerts/low-stock/');

  // Handle both paginated and simple array responses
  if (Array.isArray(response)) {
    return response;
  }

  if (response && 'results' in response) {
    return response.results;
  }

  return [];
}

/**
 * PATCH /alerts/low-stock/{id}/
 * Acknowledge or update an alert
 */
export async function updateAlert(
  id: number,
  payload: AlertAckPayload
): Promise<LowStockAlert> {
  return api<LowStockAlert>(`alerts/low-stock/${id}/`, {
    method: 'PATCH',
    body: payload as unknown as Record<string, unknown>,
  });
}

/**
 * GET /alerts/low-stock/{id}/
 * Fetch a specific alert
 */
export async function getAlert(id: number): Promise<LowStockAlert> {
  return api<LowStockAlert>(`alerts/low-stock/${id}/`);
}

// ============= MEDICINES (Phase 1 + Phase 2) =============

/**
 * GET /medicines/
 * Fetch all medicines (used in wizard)
 */
export async function getMedicines(): Promise<Medicine[]> {
  return api<Medicine[]>('medicines/');
}

/**
 * POST /medicines/
 * Create a new medicine
 */
export async function createMedicine(
  payload: Omit<Medicine, 'id' | 'created_at' | 'updated_at'>
): Promise<Medicine> {
  return api<Medicine>('medicines/', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}

/**
 * GET /medicines/{id}/
 * Fetch a single medicine
 */
export async function getMedicineDetail(id: number): Promise<Medicine> {
  return api<Medicine>(`medicines/${id}/`);
}

/**
 * POST /medicines/ (multipart/form-data)
 * Create a new medicine with optional image
 */
export async function createMedicineWithImage(
  payload: Omit<Medicine, 'id' | 'created_at' | 'updated_at'> & { imageUri?: string }
): Promise<Medicine> {
  const form = new FormData();
  form.append('name', payload.name);
  form.append('form', payload.form);
  form.append('strength', payload.strength);
  if (payload.notes) form.append('notes', payload.notes);
  if (payload.brand) form.append('brand', payload.brand);
  if (payload.description) form.append('description', payload.description);
  if (payload.imageUri) {
    const filename = payload.imageUri.split('/').pop() ?? 'medicine.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    form.append('image', { uri: payload.imageUri, name: filename, type: mimeType } as any);
  }
  return api<Medicine>('medicines/', {
    method: 'POST',
    body: form,
    isForm: true,
  });
}

/**
 * GET /regimens/ with embedded stock — used for rich inventory display
 * Re-export listRegimens as getInventory for semantic clarity
 */
export { listRegimens as getInventory };

