import { NextRequest, NextResponse } from 'next/server';
import { createAuraServerClient } from '@/lib/supabase/server';
import { generatePlannerWeek } from '@/lib/planner/engine';
import type {
  DressCode,
  OccasionImportance,
  WardrobeItem,
  StyleDNAProfile,
  SavedOutfit,
  OccasionEvent,
  TripPlan,
  OutfitPlan,
  PlannerStatus,
  PlannerSource,
  OccasionFormality,
  OccasionType,
  PlannerRecommendation,
  PlannerWeek,
} from '@/lib/types';

interface RequestBody {
  weekStart: string;
}

function isMonday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.getUTCDay() === 1;
}

async function enhanceWithOpenAI(week: PlannerWeek): Promise<PlannerWeek> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return week;

  const daysToEnhance = week.days.filter(d => d.suggestedOutfit && d.suggestedOutfit.outfitItems.length > 0);
  if (daysToEnhance.length === 0) return week;

  const prompt = `You are AURA, an AI style assistant. Enhance the reason text for each outfit suggestion below. Return ONLY valid JSON array with one object per day: [{"date": "YYYY-MM-DD", "reason": "improved reason text"}]. Keep reasons concise (1-2 sentences). Do not change items or scores.

Days: ${JSON.stringify(daysToEnhance.map(d => ({
    date: d.date,
    dayLabel: d.dayLabel,
    occasion: d.occasionEvents[0]?.title,
    items: d.suggestedOutfit?.outfitItems.map(i => i.name),
    currentReason: d.suggestedOutfit?.reason,
  })))}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.4,
      }),
    });
    if (!res.ok) return week;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return week;
    const parsed = JSON.parse(content) as { days?: Array<{ date: string; reason: string }> } | Array<{ date: string; reason: string }>;
    const enhanced: Array<{ date: string; reason: string }> = Array.isArray(parsed) ? parsed : (parsed.days ?? []);

    const reasonMap = new Map(enhanced.map(e => [e.date, e.reason]));
    return {
      ...week,
      aiEnhanced: true,
      days: week.days.map(d => {
        const newReason = reasonMap.get(d.date);
        if (!newReason || !d.suggestedOutfit) return d;
        return {
          ...d,
          suggestedOutfit: { ...d.suggestedOutfit, reason: newReason, aiEnhanced: true },
        };
      }),
    };
  } catch {
    return week;
  }
}

export async function POST(request: NextRequest) {
  console.log('[planner/generate-week] start');
  try {
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const { weekStart } = body;

    if (!weekStart || !isMonday(weekStart)) {
      return NextResponse.json({ error: 'weekStart must be a Monday in YYYY-MM-DD format' }, { status: 400 });
    }

    const weekEnd = new Date(weekStart + 'T12:00:00Z');
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const [wardrobeRes, dnaRes, outfitsRes, plansRes, occasionsRes, tripsRes] = await Promise.all([
      supabase.from('wardrobe_items').select('*').eq('user_id', user.id),
      supabase.from('style_dna_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('saved_outfits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('outfit_plans').select('*').eq('user_id', user.id).gte('plan_date', weekStart).lte('plan_date', weekEndStr),
      supabase.from('occasion_events').select('*').eq('user_id', user.id).gte('event_date', weekStart).lte('event_date', weekEndStr),
      supabase.from('trip_plans').select('*').eq('user_id', user.id),
    ]);

    const wardrobe: WardrobeItem[] = ((wardrobeRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      name: r.name as string,
      category: r.category as string,
      color: r.color as string,
      season: r.season as string,
      occasion: r.occasion as string,
      style: r.style as string,
      wears: r.wears as number,
      confidence: r.confidence as number,
      image: r.image_url as string,
    }));

    const dnaRow = dnaRes.data as Record<string, unknown> | null;
    const styleDNA: StyleDNAProfile | undefined = dnaRow ? {
      preferredColors: (dnaRow.preferred_colors as StyleDNAProfile['preferredColors']) ?? [],
      avoidedColors: (dnaRow.avoided_colors as StyleDNAProfile['avoidedColors']) ?? [],
      preferredCategories: (dnaRow.preferred_categories as StyleDNAProfile['preferredCategories']) ?? [],
      preferredStyleTags: (dnaRow.preferred_style_tags as StyleDNAProfile['preferredStyleTags']) ?? [],
      avoidedStyleTags: (dnaRow.avoided_style_tags as StyleDNAProfile['avoidedStyleTags']) ?? [],
      preferredOccasions: (dnaRow.preferred_occasions as StyleDNAProfile['preferredOccasions']) ?? [],
      wardrobeGaps: (dnaRow.wardrobe_gaps as string[]) ?? [],
      favoriteOutfitPatterns: (dnaRow.favorite_outfit_patterns as string[]) ?? [],
      rejectedOutfitPatterns: (dnaRow.rejected_outfit_patterns as string[]) ?? [],
      confidenceScore: (dnaRow.confidence_score as number) ?? 0,
      signalCount: (dnaRow.signal_count as number) ?? 0,
      lastComputedAt: (dnaRow.last_computed_at as string) ?? new Date().toISOString(),
    } : undefined;

    const savedOutfits: SavedOutfit[] = ((outfitsRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      outfitItems: r.outfit_items as WardrobeItem[],
      report: r.report as SavedOutfit['report'],
      feedback: (r.feedback as SavedOutfit['feedback']) ?? undefined,
      createdAt: r.created_at as string,
    }));

    const existingPlans: OutfitPlan[] = ((plansRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      userId: r.user_id as string,
      planDate: r.plan_date as string,
      occasionEventId: (r.occasion_event_id as string | null) ?? undefined,
      tripPlanId: (r.trip_plan_id as string | null) ?? undefined,
      outfitItems: (r.outfit_items as WardrobeItem[]) ?? [],
      recommendation: (r.recommendation as PlannerRecommendation) ?? { outfitItems: [], score: 0, reason: '', warnings: [], missingCategories: [], aiEnhanced: false },
      status: (r.status as PlannerStatus) ?? 'planned',
      source: (r.source as PlannerSource) ?? 'planner',
      notes: (r.notes as string | null) ?? undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));

    const occasionEvents: OccasionEvent[] = ((occasionsRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      title: r.title as string,
      eventType: r.event_type as OccasionType,
      date: r.event_date as string,
      startTime: (r.start_time as string | null) ?? undefined,
      endTime: (r.end_time as string | null) ?? undefined,
      city: (r.city as string | null) ?? undefined,
      country: (r.country as string | null) ?? undefined,
      formality: r.formality as OccasionFormality,
      dressCode: (r.dress_code as DressCode | null) ?? undefined,
      importance: (r.importance as OccasionImportance) ?? 'Normal',
      notes: (r.notes as string | null) ?? undefined,
      outfitStatus: (r.outfit_status as OccasionEvent['outfitStatus']) ?? 'pending',
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));

    const tripPlans: TripPlan[] = ((tripsRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      destinationCity: r.destination_city as string,
      destinationCountry: (r.destination_country as string | null) ?? undefined,
      startDate: r.start_date as string,
      endDate: r.end_date as string,
      purpose: r.purpose as string,
      occasions: (r.occasions as TripPlan['occasions']) ?? [],
      luggageType: r.luggage_type as string,
      laundryAvailable: r.laundry_available as boolean,
      dailyOutfits: (r.daily_outfits as TripPlan['dailyOutfits']) ?? [],
      packingItems: (r.packing_items as TripPlan['packingItems']) ?? [],
      missingItems: (r.missing_items as TripPlan['missingItems']) ?? [],
      riskNotes: (r.risk_notes as string[]) ?? [],
      aiEnhanced: r.ai_enhanced as boolean,
      createdAt: r.created_at as string,
    }));

    let week = generatePlannerWeek({
      weekStart,
      wardrobe,
      styleDNA,
      savedOutfits,
      existingPlans,
      occasionEvents,
      tripPlans,
    });

    week = await enhanceWithOpenAI(week);

    console.log('[planner/generate-week] done', {
      weekStart,
      daysGenerated: week.days.length,
      aiEnhanced: week.aiEnhanced,
      wardrobeCount: wardrobe.length,
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    });

    return NextResponse.json({ week });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[planner/generate-week] error:', message);
    return NextResponse.json({ error: 'Failed to generate planner week.' }, { status: 500 });
  }
}
