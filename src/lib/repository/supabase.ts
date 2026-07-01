import { createBrowserClient } from '@supabase/ssr';
import type { AppState, OutfitPlan, WardrobeItem } from '@/lib/types';
import { defaultState } from '@/store/default';
import type { IRepository } from './index';

export class SupabaseRepository implements IRepository {
  private client;

  constructor(url: string, anonKey: string) {
    this.client = createBrowserClient(url, anonKey);
  }

  private assertNoError(error: { message: string } | null, context: string): void {
    if (error) throw new Error(`[SupabaseRepository.${context}] ${error.message}`);
  }

  private async userId(): Promise<string | null> {
    const { data: { user } } = await this.client.auth.getUser();
    return user?.id ?? null;
  }

  async loadState(): Promise<AppState> {
    console.warn('[SupabaseRepository] loadState not yet implemented — returning default state');
    return { ...defaultState(), outfitPlans: [] };
  }

  async saveState(_: AppState): Promise<void> {
    console.warn('[SupabaseRepository] saveState not yet implemented');
  }

  async getOutfitPlans(): Promise<OutfitPlan[]> {
    const uid = await this.userId();
    if (!uid) return [];
    const { data } = await this.client
      .from('outfit_plans')
      .select('*')
      .eq('user_id', uid)
      .order('plan_date', { ascending: true });
    if (!data) return [];
    return (data as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      userId: r.user_id as string,
      planDate: r.plan_date as string,
      occasionEventId: (r.occasion_event_id as string | null) ?? undefined,
      tripPlanId: (r.trip_plan_id as string | null) ?? undefined,
      outfitItems: (r.outfit_items as WardrobeItem[]) ?? [],
      recommendation: r.recommendation as OutfitPlan['recommendation'],
      status: (r.status as OutfitPlan['status']) ?? 'planned',
      source: (r.source as OutfitPlan['source']) ?? 'planner',
      notes: (r.notes as string | null) ?? undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));
  }

  async saveOutfitPlan(plan: Omit<OutfitPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<OutfitPlan> {
    const uid = await this.userId();
    if (!uid) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('outfit_plans')
      .upsert({
        user_id: uid,
        plan_date: plan.planDate,
        occasion_event_id: plan.occasionEventId ?? null,
        trip_plan_id: plan.tripPlanId ?? null,
        outfit_items: plan.outfitItems,
        recommendation: plan.recommendation,
        status: plan.status,
        source: plan.source,
        notes: plan.notes ?? null,
        updated_at: now,
      }, { onConflict: 'user_id,plan_date' })
      .select()
      .single();
    this.assertNoError(error, 'saveOutfitPlan');
    const r = data as Record<string, unknown>;
    return {
      id: r.id as string,
      userId: r.user_id as string,
      planDate: r.plan_date as string,
      occasionEventId: (r.occasion_event_id as string | null) ?? undefined,
      tripPlanId: (r.trip_plan_id as string | null) ?? undefined,
      outfitItems: (r.outfit_items as WardrobeItem[]) ?? [],
      recommendation: r.recommendation as OutfitPlan['recommendation'],
      status: (r.status as OutfitPlan['status']) ?? 'planned',
      source: (r.source as OutfitPlan['source']) ?? 'planner',
      notes: (r.notes as string | null) ?? undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  async updateOutfitPlan(planDate: string, updates: Partial<OutfitPlan>): Promise<OutfitPlan> {
    const uid = await this.userId();
    if (!uid) throw new Error('Not authenticated');
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.outfitItems !== undefined) row.outfit_items = updates.outfitItems;
    if (updates.notes !== undefined) row.notes = updates.notes;
    const { data, error } = await this.client
      .from('outfit_plans')
      .update(row)
      .eq('plan_date', planDate)
      .eq('user_id', uid)
      .select()
      .single();
    this.assertNoError(error, 'updateOutfitPlan');
    const r = data as Record<string, unknown>;
    return {
      id: r.id as string,
      userId: r.user_id as string,
      planDate: r.plan_date as string,
      occasionEventId: (r.occasion_event_id as string | null) ?? undefined,
      tripPlanId: (r.trip_plan_id as string | null) ?? undefined,
      outfitItems: (r.outfit_items as WardrobeItem[]) ?? [],
      recommendation: r.recommendation as OutfitPlan['recommendation'],
      status: (r.status as OutfitPlan['status']) ?? 'planned',
      source: (r.source as OutfitPlan['source']) ?? 'planner',
      notes: (r.notes as string | null) ?? undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  async deleteOutfitPlan(planDate: string): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client
      .from('outfit_plans')
      .delete()
      .eq('plan_date', planDate)
      .eq('user_id', uid);
    this.assertNoError(error, 'deleteOutfitPlan');
  }
}
