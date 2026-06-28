import { NextResponse } from 'next/server';
import { createAuraServerClient } from '@/lib/supabase/server';
import { buildWeeklyOccasionBrief } from '@/lib/occasions/engine';
import type { OccasionEvent, OccasionFormality, OccasionOutfitRecommendation, OccasionType, TravelWeather } from '@/lib/types';

interface OccasionEventRow {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  country_code: string | null;
  formality: string;
  notes: string | null;
  weather_context: Record<string, unknown> | null;
  recommended_outfit: OccasionOutfitRecommendation | null;
  outfit_status: string;
  created_at: string;
  updated_at: string;
}

function rowToEvent(r: OccasionEventRow): OccasionEvent {
  const wc = r.weather_context;
  const weatherContext: TravelWeather | undefined =
    wc && typeof wc === 'object' && 'available' in wc && (wc as { available: unknown }).available
      ? (wc as unknown as TravelWeather)
      : undefined;

  return {
    id: r.id,
    title: r.title,
    eventType: r.event_type as OccasionType,
    date: r.event_date,
    startTime: r.start_time ?? undefined,
    endTime: r.end_time ?? undefined,
    city: r.city ?? undefined,
    country: r.country ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    countryCode: r.country_code ?? undefined,
    formality: r.formality as OccasionFormality,
    notes: r.notes ?? undefined,
    weatherContext,
    recommendedOutfit: r.recommended_outfit ?? undefined,
    outfitStatus: (r.outfit_status as OccasionEvent['outfitStatus']) ?? 'pending',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET() {
  try {
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('occasion_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('event_date', today)
      .lte('event_date', weekEnd)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('[occasions/weekly-brief] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to load events.' }, { status: 500 });
    }

    const events: OccasionEvent[] = ((data ?? []) as unknown as OccasionEventRow[]).map(rowToEvent);
    const brief = buildWeeklyOccasionBrief(events, new Date());

    return NextResponse.json(brief);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[occasions/weekly-brief] error:', message);
    return NextResponse.json({ error: 'Failed to build weekly brief.' }, { status: 500 });
  }
}
