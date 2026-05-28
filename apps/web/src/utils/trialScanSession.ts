/** Session-only attendance demo state for TRIAL users (cleared when tab closes). */

export const TRIAL_SCAN_SESSION_KEY = 'smartattendance_trial_scan';

export interface TrialScanSession {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export function getTodayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function loadTrialScanSession(): TrialScanSession | null {
  try {
    const raw = sessionStorage.getItem(TRIAL_SCAN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrialScanSession;
    if (parsed.date !== getTodayDateKey()) {
      sessionStorage.removeItem(TRIAL_SCAN_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(TRIAL_SCAN_SESSION_KEY);
    return null;
  }
}

export function saveTrialScanSession(session: TrialScanSession): void {
  sessionStorage.setItem(TRIAL_SCAN_SESSION_KEY, JSON.stringify(session));
}

export function clearTrialScanSession(): void {
  sessionStorage.removeItem(TRIAL_SCAN_SESSION_KEY);
}
