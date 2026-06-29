import { NextRequest, NextResponse } from 'next/server';
import { createAuraServerClient } from '@/lib/supabase/server';
import type { WardrobeItem, OutfitPlan, PlannerStatus, PlannerSource, PlannerRecommendation } from '@/lib/types';

interface RequestBody {
  planDate: string;
  outfitItems: WardrobeItem[];
  notes?: string;
  occasionEventId?: string;
  tripPlanId?: string;
}

export async function POST(request: NextRequest) {
  console.log('[planner/save-day] start');
  try {
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const { planDate, outfitItems, notes, occasionEventId, tripPlanId } = body;

    if (!planDate || !outfitItems) {
      return NextResponse.json({ error: 'planDate and outfitItems are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const recommendation: PlannerRecommendation = {
      outfitItems,
      score: 75,
      reason: 'Manually accepted outfit plan.',
      warnings: [],
      missingCategories: [],
      aiEnhanced: false,
    };

    const { data, error } = await supabase
      .from('outfit_plans')
      .upsert({
        user_id: user.id,
        plan_date: planDate,
        occasion_event_id: occasionEventId ?? null,
        trip_plan_id: tripPlanId ?? null,
        outfit_items: outfitItems,
        recommendation,
        status: 'planned',
        source: 'planner',
        notes: notes ?? null,
        updated_at: now,
      }, { onConflict: 'user_id,plan_date' })
      .select()
      .single();

    if (error) {
      console.error('[planner/save-day] db error:', error.message);
      return NextResponse.json({ error: 'Failed to save outfit plan.' }, { status: 500 });
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

    console.log('[planner/save-day] saved', { planDate, itemCount: outfitItems.length });
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[planner/save-day] error:', message);
    return NextResponse.json({ error: 'Failed to save outfit plan.' }, { status: 500 });
  }
}
