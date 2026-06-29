import type { AppState, OutfitPlan } from '@/lib/types';
import { LocalRepository } from './local';
import { SupabaseRepository } from './supabase';

export interface IRepository {
  loadState(): Promise<AppState>;
  saveState(state: AppState): Promise<void>;
  getOutfitPlans(): Promise<OutfitPlan[]>;
  saveOutfitPlan(plan: Omit<OutfitPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<OutfitPlan>;
  updateOutfitPlan(planDate: string, updates: Partial<OutfitPlan>): Promise<OutfitPlan>;
  deleteOutfitPlan(planDate: string): Promise<void>;
}

let _instance: IRepository | null = null;

export function getRepository(): IRepository {
  if (_instance) return _instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    _instance = new SupabaseRepository(url, key);
  } else {
    _instance = new LocalRepository();
  }
  return _instance;
}
