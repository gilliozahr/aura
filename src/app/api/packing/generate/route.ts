import { NextRequest, NextResponse } from 'next/server';
import { createAuraServerClient } from '@/lib/supabase/server';
import { generatePackingPlan } from '@/lib/packing/engine';
import { isValidItemName } from '@/lib/utils';
import type {
  WardrobeItem,
  StyleDNAProfile,
  TravelWeather,
  TripOccasion,
  TripPlan,
  PackingItem,
  MissingItem,
  TripDailyOutfit,
} from '@/lib/types';

interface RequestBody {
  destinationCity: string;
  destinationCountry?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  startDate: string;
  endDate: string;
  purpose: string;
  occasions: TripOccasion[];
  luggageType: string;
  laundryAvailable: boolean;
}

interface WardrobeRow {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  occasion: string;
  style: string;
  wears: number;
  confidence: number;
  image_url: string;
}

interface StyleDNARow {
  preferred_colors: StyleDNAProfile['preferredColors'];
  avoided_colors: StyleDNAProfile['avoidedColors'];
  preferred_categories: StyleDNAProfile['preferredCategories'];
  preferred_style_tags: StyleDNAProfile['preferredStyleTags'];
  avoided_style_tags: StyleDNAProfile['avoidedStyleTags'];
  preferred_occasions: StyleDNAProfile['preferredOccasions'];
  wardrobe_gaps: string[];
  favorite_outfit_patterns: string[];
  rejected_outfit_patterns: string[];
  confidence_score: number;
  signal_count: number;
  last_computed_at: string;
}


async function fetchWeather(
  city: string,
  baseUrl: string,
  lat?: number,
  lon?: number,
): Promise<TravelWeather | undefined> {
  try {
    const params = lat !== undefined && lon !== undefined
      ? `lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`
      : `city=${encodeURIComponent(city)}`;
    const url = `${baseUrl}/api/weather/current?${params}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return undefined;
    const data = (await res.json()) as Record<string, unknown>;
    if (!data.available) return undefined;
    return {
      city: (data.city as string) ?? city,
      temperatureC: (data.temperatureC as number) ?? 20,
      condition: (data.condition as string) ?? 'Clear',
      humidity: data.humidity as number | undefined,
      feelsLikeC: data.feelsLikeC as number | undefined,
      available: true,
      source: 'openweathermap',
    };
  } catch {
    return undefined;
  }
}

interface OpenAIEnhancement {
  dailyOutfits?: TripDailyOutfit[];
  packingItems?: PackingItem[];
  missingItems?: MissingItem[];
  riskNotes?: string[];
  capsuleNotes?: string;
  aiSummary?: string;
}

async function enhanceWithOpenAI(params: {
  city: string;
  purpose: string;
  days: number;
  luggageType: string;
  weather?: TravelWeather;
  wardrobe: WardrobeItem[];
  styleDNA?: StyleDNAProfile;
  baseline: { packingItems: PackingItem[]; occasions: TripOccasion[] };
}): Promise<OpenAIEnhancement | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const { city, purpose, days, luggageType, weather, wardrobe, styleDNA, baseline } = params;

  const relevantWardrobe = wardrobe.slice(0, 20).map(i => ({
    name: i.name,
    category: i.category,
    color: i.color,
    style: i.style,
    occasion: i.occasion,
  }));

  const styleSummary =
    styleDNA && styleDNA.confidenceScore >= 30
      ? `Preferred styles: ${styleDNA.preferredStyleTags.slice(0, 3).map(e => e.value).join(', ')}. Preferred colors: ${styleDNA.preferredColors.slice(0, 3).map(e => e.value).join(', ')}.`
      : null;

  const weatherStr = weather?.available
    ? `${weather.condition}, ${Math.round(weather.temperatureC)}°C`
    : 'Weather data unavailable';

  const prompt = `You are AURA, an AI travel packing assistant. Enhance this packing plan for a trip to ${city}.

TRIP: ${city}, ${purpose}, ${days} days, luggage: ${luggageType}
WEATHER: ${weatherStr}
WARDROBE ITEMS: ${JSON.stringify(relevantWardrobe)}${styleSummary ? `\nSTYLE DNA: ${styleSummary}` : ''}
BASELINE PACKING: ${baseline.packingItems.map(i => i.name).join(', ')}
OCCASIONS: ${baseline.occasions.map(o => `${o.label} (${o.formality})`).join(', ') || purpose}

Return ONLY valid JSON:
{"dailyOutfits": [...], "packingItems": [...], "missingItems": [...], "riskNotes": [...], "capsuleNotes": "...", "aiSummary": "..."}

Rules:
- Only reference wardrobe items that exist in the list provided
- Missing items are for gaps, not random suggestions
- Keep it practical and specific
- Daily outfits should use specific wardrobe item names from the list
- packingItems must include: id (string), name, category, source ("wardrobe"|"suggested"|"missing"), quantity (number), packed (false), reason, priority ("essential"|"recommended"|"optional")
- missingItems must include: name, category, reason, priority ("essential"|"recommended"|"optional")
- dailyOutfits must include: date (YYYY-MM-DD), occasion, items (array of strings), reasoning`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.warn('[packing/generate] OpenAI HTTP error:', res.status);
      return null;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as OpenAIEnhancement;
    // Basic validation
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (e) {
    console.warn('[packing/generate] OpenAI enhancement failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const { destinationCity, destinationCountry, destinationLatitude, destinationLongitude, startDate, endDate, purpose, occasions, luggageType, laundryAvailable } = body;

    const cityTrimmed = (destinationCity ?? '').trim();
    const countryTrimmed = (destinationCountry ?? '').trim();

    if (cityTrimmed.length < 2) {
      return NextResponse.json({ error: 'Destination city is required (minimum 2 characters).' }, { status: 400 });
    }
    if (countryTrimmed.length < 2) {
      return NextResponse.json({ error: 'Destination country is required.' }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required.' }, { status: 400 });
    }

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (isNaN(startMs) || isNaN(endMs)) {
      return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
    }
    if (endMs < startMs) {
      return NextResponse.json({ error: 'End date must be on or after start date.' }, { status: 400 });
    }
    const tripDuration = Math.round((endMs - startMs) / 86_400_000) + 1;
    if (tripDuration > 30) {
      return NextResponse.json({ error: 'Trip duration cannot exceed 30 days.' }, { status: 400 });
    }

    // Load wardrobe
    const { data: wardrobeRows } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id);

    const wardrobe: WardrobeItem[] = ((wardrobeRows ?? []) as unknown as WardrobeRow[])
      .map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        color: r.color,
        season: r.season,
        occasion: r.occasion,
        style: r.style,
        wears: r.wears,
        confidence: r.confidence,
        image: r.image_url,
      }))
      .filter(w => isValidItemName(w.name));

    // Load style DNA
    const { data: dnaRow } = await supabase
      .from('style_dna_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const styleDNA: StyleDNAProfile | undefined = dnaRow
      ? (() => {
          const r = dnaRow as unknown as StyleDNARow;
          return {
            preferredColors: r.preferred_colors ?? [],
            avoidedColors: r.avoided_colors ?? [],
            preferredCategories: r.preferred_categories ?? [],
            preferredStyleTags: r.preferred_style_tags ?? [],
            avoidedStyleTags: r.avoided_style_tags ?? [],
            preferredOccasions: r.preferred_occasions ?? [],
            wardrobeGaps: r.wardrobe_gaps ?? [],
            favoriteOutfitPatterns: r.favorite_outfit_patterns ?? [],
            rejectedOutfitPatterns: r.rejected_outfit_patterns ?? [],
            confidenceScore: r.confidence_score ?? 0,
            signalCount: r.signal_count ?? 0,
            lastComputedAt: r.last_computed_at ?? new Date().toISOString(),
          };
        })()
      : undefined;

    // Fetch weather — use lat/lon from city lookup when available for better accuracy
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const weather = await fetchWeather(destinationCity, baseUrl, destinationLatitude, destinationLongitude);

    const trip = { destinationCity, destinationCountry, startDate, endDate, purpose, occasions: occasions ?? [], luggageType, laundryAvailable };

    // Deterministic baseline
    const baseline = generatePackingPlan(trip, wardrobe, styleDNA, weather);

    // OpenAI enhancement
    const days = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1);
    const enhancement = await enhanceWithOpenAI({
      city: destinationCity,
      purpose,
      days,
      luggageType,
      weather,
      wardrobe,
      styleDNA,
      baseline: { packingItems: baseline.packingItems, occasions: occasions ?? [] },
    });

    const aiEnhanced = enhancement !== null;
    const finalPlan = {
      // Always use baseline dailyOutfits — they have the exact trip dates.
      // AI enhancement may hallucinate dates so we never trust it for this field.
      dailyOutfits: baseline.dailyOutfits,
      packingItems: enhancement?.packingItems ?? baseline.packingItems,
      missingItems: enhancement?.missingItems ?? baseline.missingItems,
      riskNotes: enhancement?.riskNotes ?? baseline.riskNotes,
      capsuleNotes: enhancement?.capsuleNotes ?? baseline.capsuleNotes,
      aiSummary: enhancement?.aiSummary,
    };

    // Ensure packed: false on all packing items (AI might not set it)
    const packingItems: PackingItem[] = (finalPlan.packingItems ?? []).map((item: PackingItem) => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      packed: false,
      quantity: item.quantity ?? 1,
    }));

    const missingItems: MissingItem[] = finalPlan.missingItems ?? [];

    // Save to Supabase — omit id so Supabase generates a valid UUID, then read it back
    const planId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('trip_plans').insert({
      id: planId,
      user_id: user.id,
      destination_city: destinationCity,
      destination_country: destinationCountry ?? null,
      start_date: startDate,
      end_date: endDate,
      purpose,
      occasions: occasions ?? [],
      luggage_type: luggageType,
      laundry_available: laundryAvailable,
      weather_summary: weather ?? null,
      daily_outfits: finalPlan.dailyOutfits,
      packing_items: packingItems,
      missing_items: missingItems,
      risk_notes: finalPlan.riskNotes,
      capsule_notes: finalPlan.capsuleNotes ?? null,
      ai_summary: finalPlan.aiSummary ?? null,
      ai_enhanced: aiEnhanced,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      console.error('[packing/generate] insert error:', insertError.message);
      // Still return the plan even if save failed
    }

    const savedPlan: TripPlan = {
      id: planId,
      destinationCity,
      destinationCountry,
      startDate,
      endDate,
      purpose,
      occasions: occasions ?? [],
      luggageType,
      laundryAvailable,
      weatherSummary: weather,
      dailyOutfits: finalPlan.dailyOutfits,
      packingItems,
      missingItems,
      riskNotes: finalPlan.riskNotes,
      capsuleNotes: finalPlan.capsuleNotes,
      aiSummary: finalPlan.aiSummary,
      aiEnhanced,
      createdAt: now,
    };

    const latencyMs = Date.now() - t0;
    console.info('[packing/generate]', {
      city: destinationCity,
      days,
      wardrobeCount: wardrobe.length,
      aiEnhanced,
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      latencyMs,
    });

    return NextResponse.json(savedPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[packing/generate] unhandled error:', message);
    return NextResponse.json({ error: 'Failed to generate packing plan. Please try again.' }, { status: 500 });
  }
}
