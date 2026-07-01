import { NextRequest, NextResponse } from 'next/server';
import { createAuraServerClient } from '@/lib/supabase/server';
import type { WardrobeItem, OutfitPlan, PlannerStatus, PlannerSource, PlannerRecommendation } from '@/lib/types';

interface RequestBody {
  planDate: string;
  status?: PlannerStatus;
  outfitItems?: WardrobeItem[];
  notes?: string;
}

export async function PATCH(request: NextRequest) {
  console.log('[planner/update-day] start');
  try {
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const { planDate, status, outfitItems, notes } = body;

    if (!planDate) {
      return NextResponse.json({ error: 'planDate is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (outfitItems !== undefined) updates.outfit_items = outfitItems;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('outfit_plans')
      .update(updates)
      .eq('user_id', user.id)
      .eq('plan_date', planDate)
      .select()
      .single();

    if (error) {
      console.error('[planner/update-day] db error:', error.message);
      return NextResponse.json({ error: 'Failed to update outfit plan.' }, { status: 500 });
    }

    const r = data as Record<string, unknown>;
    const plan: OutfitPlan = {
      id: r.id as string,
      userId: r.user_id as string,
      planDate: r.plan_date as string,
      occasionEventId: (r.occasion_event_id as string | null) ?? undefined,
      tripPlanId: (r.trip_plan_id as string | null) ?? undefined,
      outfitItems: (r.outfit_items as WardrobeItem[]) ?? [],
      recommendation: (r.recommendation as PlannerRecommendation),
      status: (r.status as PlannerStatus) ?? 'planned',
      source: (r.source as PlannerSource) ?? 'planner',
      notes: (r.notes as string | null) ?? undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };

    console.log('[planner/update-day] updated', { planDate, status });
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[planner/update-day] error:', message);
    return NextResponse.json({ error: 'Failed to update outfit plan.' }, { status: 500 });
  }
}
