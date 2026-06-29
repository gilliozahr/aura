import type { AppState, OutfitPlan } from '@/lib/types';
import { defaultState } from '@/store/default';
import type { IRepository } from './index';

const STORE_KEY = 'aura.v0.2.state';

export class LocalRepository implements IRepository {
  private read(): AppState {
    if (typeof window === 'undefined') return defaultState();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) as AppState) : defaultState();
    } catch {
      return defaultState();
    }
  }

  private write(state: AppState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      console.warn('LocalRepository: failed to save state to localStorage');
    }
  }

  async loadState(): Promise<AppState> {
    return this.read();
  }

  async saveState(state: AppState): Promise<void> {
    this.write(state);
  }

  async getOutfitPlans(): Promise<OutfitPlan[]> {
    return this.read().outfitPlans ?? [];
  }

  async saveOutfitPlan(plan: Omit<OutfitPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<OutfitPlan> {
    const now = new Date().toISOString();
    const full: OutfitPlan = { ...plan, id: `local-${Date.now()}`, createdAt: now, updatedAt: now };
    const s = this.read();
    this.write({ ...s, outfitPlans: [full, ...(s.outfitPlans ?? []).filter(p => p.planDate !== plan.planDate)] });
    return full;
  }

  async updateOutfitPlan(planDate: string, updates: Partial<OutfitPlan>): Promise<OutfitPlan> {
    const s = this.read();
    const existing = (s.outfitPlans ?? []).find(p => p.planDate === planDate);
    if (!existing) throw new Error(`No plan for ${planDate}`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.write({ ...s, outfitPlans: (s.outfitPlans ?? []).map(p => p.planDate === planDate ? updated : p) });
    return updated;
  }

  async deleteOutfitPlan(planDate: string): Promise<void> {
    const s = this.read();
    this.write({ ...s, outfitPlans: (s.outfitPlans ?? []).filter(p => p.planDate !== planDate) });
  }
}
