import { createClient } from '@supabase/supabase-js';
import type { AppState } from '@/lib/types';
import { defaultState } from '@/store/default';
import type { IRepository } from './index';

export class SupabaseRepository implements IRepository {
  private client;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  async loadState(): Promise<AppState> {
    // TODO v0.3: load from user_profiles table after auth is wired
    console.warn('[SupabaseRepository] loadState not yet implemented — returning default state');
    return defaultState();
  }

  async saveState(_state: AppState): Promise<void> {
    // TODO v0.3: upsert into user_profiles table after auth is wired
    console.warn('[SupabaseRepository] saveState not yet implemented');
  }
}
