import type { AppState } from '../types/payment';
import { createSeedState, isAppState } from './payments';
export const STORAGE_KEY = 'payment-approval-v1';
export function loadState(storage: Pick<Storage, 'getItem'>): { state: AppState; warning: string } {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) return { state: createSeedState(), warning: '' };
    const parsed: unknown = JSON.parse(saved);
    if (!isAppState(parsed)) throw new Error('Invalid saved state');
    return { state: parsed, warning: '' };
  } catch {
    return { state: createSeedState(), warning: 'Saved data could not be loaded. Original seed data is displayed; use Reset Data to replace the saved data.' };
  }
}
export function saveState(storage: Pick<Storage, 'setItem'>, state: AppState) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
