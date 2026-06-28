import { NextRequest, NextResponse } from 'next/server';
import { createAuraServerClient } from '@/lib/supabase/server';
import { recommendOutfitForOccasion } from '@/lib/occasions/engine';
import { getTripWeather } from '@/lib/server/weather';
import { isValidItemName } from '@/lib/utils';
import type {
  OccasionFormality,
  OccasionOutfitRecommendation,
  OccasionType,
  StyleDNAProfile,
  WardrobeItem,
} from '@/lib/types';

interface RequestBody {
  eventId?: string;
  title: string;
  eventType: OccasionType;
  date: string;
  city?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  formality: OccasionFormality;
  notes?: string;
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

interface OccasionContext {
  eventType: OccasionType;
  title: string;
  date: string;
  city?: string;
  country?: string;
  formality: OccasionFormality;
  notes?: string;
  weather?: string;
}

async function enhanceWithOpenAI(params: {
  baseline: OccasionOutfitRecommendation;
  wardrobe: WardrobeItem[];
  occasion: OccasionContext;
}): Promise<OccasionOutfitRecommendation | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const { baseline, wardrobe, occasion } = params;
  const relevantWardrobe = wardrobe.slice(0, 20).map(i => ({
    name: i.name, category: i.category, color: i.color, occasion: i.occasion,
  }));

  const prompt = `You are AURA, an AI style assistant. Enhance this outfit recommendation for an occasion.

OCCASION: ${occasion.title} (${occasion.eventType}), ${occasion.formality}, ${occasion.date}${occasion.city ? `, ${occasion.city}` : ''}${occasion.country ? `, ${occasion.country}` : ''}
${occasion.weather ? `WEATHER: ${occasion.weather}` : ''}
${occasion.notes ? `NOTES: ${occasion.notes}` : ''}
WARDROBE: ${JSON.stringify(relevantWardrobe)}
BASELINE RECOMMENDATION: ${baseline.items.join(', ')}

Return ONLY valid JSON matching this structure exactly:
{
  "items": ["item name from wardrobe list"],
  "outfitScore": 85,
  "formalityFitScore": 90,
  "weatherFitScore": 80,
  "styleDNAFitScore": 75,
  "reasoning": "...",
  "risks": ["..."],
  "missingItems": [{"name": "...", "category": "...", "reason": "...", "priority": "essential"}],
  "alternatives": ["item name"]
}

Rules:
- Only reference items from the wardrobe list provided
- Formality must be respected: ${occasion.formality}
- Do not invent wardrobe items
- If an item is missing, add it to missingItems`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as OccasionOutfitRecommendation;
    if (!parsed.items || !Array.isArray(parsed.items)) return null;
    return { ...parsed, aiEnhanced: true };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const { eventId, title, eventType, date, city, country, countryCode, latitude, longitude, formality, notes } = body;

    if (!title || !eventType || !date || !formality) {
      return NextResponse.json({ error: 'title, eventType, date, and formality are required.' }, { status: 400 });
    }

    // Load wardrobe
    const { data: wardrobeRows } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id);

    const wardrobe: WardrobeItem[] = ((wardrobeRows ?? []) as unknown as WardrobeRow[])
      .map(r => ({
        id: r.id, name: r.name, category: r.category, color: r.color,
        season: r.season, occasion: r.occasion, style: r.style,
        wears: r.wears, confidence: r.confidence, image: r.image_url,
      }))
      .filter(w => isValidItemName(w.name));

    // Load Style DNA
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

    // Fetch weather
    const { weather } = city
      ? await getTripWeather({ city, country, countryCode, latitude, longitude })
      : { weather: null };

    // Deterministic recommendation
    const baseline = recommendOutfitForOccasion(
      { formality, eventType, notes },
      wardrobe,
      styleDNA,
      weather ?? undefined,
    );

    // OpenAI enhancement (optional)
    const weatherStr = weather?.available ? `${weather.condition}, ${Math.round(weather.temperatureC)}°C` : undefined;
    const enhancement = await enhanceWithOpenAI({
      baseline,
      wardrobe,
      occasion: { eventType, title, date, city, country, formality, notes, weather: weatherStr },
    });

    const recommendation: OccasionOutfitRecommendation = enhancement ?? baseline;

    // Save back to occasion_events if eventId provided
    if (eventId) {
      await supabase
        .from('occasion_events')
        .update({
          recommended_outfit: recommendation,
          weather_context: weather ?? {},
          outfit_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .eq('user_id', user.id);
    }

    console.info('[occasions/recommend]', {
      eventType,
      formality,
      city: city ?? null,
      outfitScore: recommendation.outfitScore,
      aiEnhanced: recommendation.aiEnhanced ?? false,
      wardrobeCount: wardrobe.length,
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    });

    return NextResponse.json({ recommendation, weatherContext: weather });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[occasions/recommend] error:', message);
    return NextResponse.json({ error: 'Failed to generate recommendation.' }, { status: 500 });
  }
}
