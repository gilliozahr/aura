import type { AppState } from '@/lib/types';
import { defaultState } from '@/store/default';
import type { IRepository } from './index';

const STORE_KEY = 'aura.v0.2.state';

export class LocalRepository implements IRepository {
  async loadState(): Promise<AppState> {
    if (typeof window === 'undefined') return defaultState();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) as AppState) : defaultState();
    } catch {
      return defaultState();
    }
  }

  async saveState(state: AppState): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      console.warn('LocalRepository: failed to save state to localStorage');
    }
  }
}
