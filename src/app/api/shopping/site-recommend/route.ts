import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  WardrobeItem,
  StyleDNAProfile,
  UserSizeProfile,
  TripPlan,
  OccasionEvent,
  ShoppingSiteRecommendation,
} from '@/lib/types';

export const runtime = 'nodejs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParseAiJson(content: string): Record<string, unknown> | null {
  const stripped = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { /* give up */ }
    }
    return null;
  }
}

function normalizeServerError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'unknown error';
}

function capitaliseDomain(domain: string): string {
  const name = domain.replace(/^www\./, '').split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── DB row normalizers ────────────────────────────────────────────────────────

// style_dna_profiles uses snake_case columns — map to camelCase StyleDNAProfile
function normalizeStyleDNA(row: Record<string, unknown>): StyleDNAProfile {
  return {
    preferredColors: (row.preferred_colors as StyleDNAProfile['preferredColors']) ?? [],
    avoidedColors: (row.avoided_colors as StyleDNAProfile['avoidedColors']) ?? [],
    preferredCategories: (row.preferred_categories as StyleDNAProfile['preferredCategories']) ?? [],
    preferredStyleTags: (row.preferred_style_tags as StyleDNAProfile['preferredStyleTags']) ?? [],
    avoidedStyleTags: (row.avoided_style_tags as StyleDNAProfile['avoidedStyleTags']) ?? [],
    preferredOccasions: (row.preferred_occasions as StyleDNAProfile['preferredOccasions']) ?? [],
    wardrobeGaps: (row.wardrobe_gaps as string[]) ?? [],
    favoriteOutfitPatterns: (row.favorite_outfit_patterns as string[]) ?? [],
    rejectedOutfitPatterns: (row.rejected_outfit_patterns as string[]) ?? [],
    confidenceScore: (row.confidence_score as number) ?? 0,
    signalCount: (row.signal_count as number) ?? 0,
    lastComputedAt: (row.last_computed_at as string) ?? new Date().toISOString(),
  };
}

// size_profile is stored as camelCase JSONB (saved directly from UserSizeProfile)
// but tolerate snake_case keys as a fallback
function normalizeSizeProfile(raw: unknown): UserSizeProfile | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).length === 0) return undefined;

  // Prefer camelCase, fall back to snake_case variants
  return {
    measurementUnit: (r.measurementUnit ?? r.measurement_unit) as UserSizeProfile['measurementUnit'] | undefined,
    heightCm: (r.heightCm ?? r.height_cm ?? r.height) as number | undefined,
    weightKg: (r.weightKg ?? r.weight_kg ?? r.weight) as number | undefined,
    chestCm: (r.chestCm ?? r.chest_cm ?? r.chest) as number | undefined,
    waistCm: (r.waistCm ?? r.waist_cm ?? r.waist) as number | undefined,
    hipsCm: (r.hipsCm ?? r.hips_cm ?? r.hips) as number | undefined,
    shoulderCm: (r.shoulderCm ?? r.shoulder_cm ?? r.shoulder) as number | undefined,
    inseamCm: (r.inseamCm ?? r.inseam_cm ?? r.inseam) as number | undefined,
    neckCm: (r.neckCm ?? r.neck_cm ?? r.neck) as number | undefined,
    sleeveCm: (r.sleeveCm ?? r.sleeve_cm ?? r.sleeve) as number | undefined,
    shoeSizeEU: (r.shoeSizeEU ?? r.shoe_size_eu ?? r.shoeSize) as number | undefined,
    shoeSizeUK: (r.shoeSizeUK ?? r.shoe_size_uk) as number | undefined,
    shoeSizeUS: (r.shoeSizeUS ?? r.shoe_size_us) as number | undefined,
    preferredFit: (r.preferredFit ?? r.preferred_fit) as UserSizeProfile['preferredFit'] | undefined,
    topSize: (r.topSize ?? r.top_size) as string | undefined,
    bottomSize: (r.bottomSize ?? r.bottom_size) as string | undefined,
    blazerSize: (r.blazerSize ?? r.blazer_size) as string | undefined,
    notes: r.notes as string | undefined,
  };
}

// ── Supabase client factory ───────────────────────────────────────────────────

async function makeSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* read-only in Server Component */ }
        },
      },
    }
  );
}

// ── Deterministic recommendation ──────────────────────────────────────────────

function buildDeterministicRec(
  domain: string,
  wardrobe: WardrobeItem[],
  styleDNA: StyleDNAProfile | undefined,
  sizeProfile: UserSizeProfile | undefined,
  trips: TripPlan[],
  occasions: OccasionEvent[]
): ShoppingSiteRecommendation {
  const brandName = capitaliseDomain(domain);

  // Focus categories: wardrobe gaps first, then under-represented
  const gaps = styleDNA?.wardrobeGaps ?? [];
  const focusCategories: string[] = [...gaps.slice(0, 3)];
  if (focusCategories.length === 0) {
    const catCounts: Record<string, number> = {};
    for (const item of wardrobe) {
      catCounts[item.category] = (catCounts[item.category] ?? 0) + 1;
    }
    for (const cat of ['Top', 'Bottom', 'Shoes', 'Outerwear', 'Accessory']) {
      if (!catCounts[cat] || catCounts[cat] < 2) focusCategories.push(cat);
      if (focusCategories.length >= 3) break;
    }
  }

  // Avoid: over-represented categories
  const catData: Record<string, { count: number; colors: string[] }> = {};
  for (const item of wardrobe) {
    if (!catData[item.category]) catData[item.category] = { count: 0, colors: [] };
    catData[item.category].count++;
    if (item.color) catData[item.category].colors.push(item.color.toLowerCase());
  }
  const avoidCategories: string[] = [];
  for (const [cat, { count, colors }] of Object.entries(catData)) {
    if (count >= 4) {
      const dominant = colors.length > 0
        ? colors.sort((a, b) => colors.filter(c => c === b).length - colors.filter(c => c === a).length)[0]
        : null;
      avoidCategories.push(
        dominant
          ? `more ${dominant} ${cat.toLowerCase()}s (already have ${count})`
          : `more ${cat.toLowerCase()}s (already have ${count})`
      );
    }
  }

  // Style notes — use real data when available
  const prefColors = styleDNA?.preferredColors.slice(0, 3).map(e => e.value) ?? [];
  const prefStyles = styleDNA?.preferredStyleTags.slice(0, 3).map(e => e.value) ?? [];
  const avoidStyles = styleDNA?.avoidedStyleTags.slice(0, 2).map(e => e.value) ?? [];
  const styleParts: string[] = [];
  if (styleDNA) {
    const conf = styleDNA.confidenceScore;
    const confLabel = conf >= 70 ? 'high' : conf >= 40 ? 'moderate' : 'building';
    styleParts.push(`Style DNA confidence: ${conf}/100 (${confLabel}).`);
  }
  if (prefColors.length > 0) styleParts.push(`Look for ${prefColors.join(', ')} colourways.`);
  if (prefStyles.length > 0) styleParts.push(`Your Style DNA favours ${prefStyles.join(', ')}.`);
  if (avoidStyles.length > 0) styleParts.push(`Avoid ${avoidStyles.join(', ')} styles.`);
  const styleNotes = styleParts.join(' ') ||
    'Complete your Style DNA in Settings for personalised colour and style guidance.';

  // Size notes — use fit profile when available, without exposing body measurements
  let sizeNotes: string;
  if (sizeProfile) {
    const fitParts: string[] = [];
    if (sizeProfile.preferredFit) fitParts.push(`${sizeProfile.preferredFit} fit`);
    if (sizeProfile.topSize) fitParts.push(`top ${sizeProfile.topSize}`);
    if (sizeProfile.bottomSize) fitParts.push(`bottom ${sizeProfile.bottomSize}`);
    if (sizeProfile.blazerSize) fitParts.push(`blazer ${sizeProfile.blazerSize}`);
    if (sizeProfile.shoeSizeEU) fitParts.push(`EU shoe ${sizeProfile.shoeSizeEU}`);
    sizeNotes = fitParts.length > 0
      ? `Saved fit profile: ${fitParts.join(', ')}. Check the brand's size guide — sizing can vary.`
      : 'Add your clothing sizes in Settings for fit guidance.';
  } else {
    sizeNotes = 'Add your size profile in Settings for personalised fit guidance.';
  }

  // Occasion / trip notes
  const today = new Date();
  const soon = new Date(today.getTime() + 30 * 86_400_000);
  const occasionNotes: string[] = [];
  for (const e of occasions) {
    const d = new Date(e.date);
    if (d >= today && d <= soon) {
      occasionNotes.push(
        `You have a ${e.eventType} on ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — consider ${e.formality.toLowerCase()} options.`
      );
      if (occasionNotes.length >= 2) break;
    }
  }
  for (const t of trips) {
    if (new Date(t.startDate) <= new Date(today.getTime() + 90 * 86_400_000) && new Date(t.endDate) >= today) {
      const missing = t.missingItems.slice(0, 2).map(m => m.name);
      if (missing.length > 0) {
        occasionNotes.push(`Upcoming trip to ${t.destinationCity}: check for ${missing.join(', ')}.`);
        break;
      }
    }
  }

  // Verdict / reasoning — specific, actionable, first-person AURA voice
  const focusStr = focusCategories.length > 0 ? focusCategories.join(', ') : 'wardrobe essentials';
  const avoidHint = avoidCategories.length > 0 ? ` Skip ${avoidCategories[0]}.` : '';
  const signalHint = styleDNA
    ? ` Based on ${styleDNA.signalCount} style signal${styleDNA.signalCount === 1 ? '' : 's'}.`
    : ' Rate outfits in the Style section to improve guidance.';
  const reasoning =
    `Browse ${brandName} selectively — good for ${focusStr}.${avoidHint}${signalHint}`;

  // Confidence: base 50, +up to 20 from styleDNA (capped lower for site-level), +10 sizes, +10 gaps, +5 occasions/trips
  // Max 85 — site-level guidance is less precise than per-product analysis
  const hasSizes = !!(sizeProfile && (sizeProfile.topSize || sizeProfile.bottomSize || sizeProfile.shoeSizeEU));
  const hasUpcoming = occasionNotes.length > 0;
  const confidenceScore = Math.min(
    50 +
    (styleDNA ? Math.min(Math.round(styleDNA.confidenceScore / 5) * 2, 20) : 0) +
    (hasSizes ? 10 : 0) +
    (gaps.length > 0 ? 10 : 0) +
    (hasUpcoming ? 5 : 0),
    85
  );

  return {
    domain,
    brandName,
    focusCategories,
    avoidCategories,
    reasoning,
    styleNotes,
    confidenceScore,
    wardrobeGapMatches: gaps.slice(0, 4),
    sizeNotes,
    occasionNotes,
    aiEnhanced: false,
    createdAt: new Date().toISOString(),
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Parse domain first — needed for any fallback response
  let domain = '';
  let rawUrl = '';
  try {
    const body = await req.json() as { url?: string };
    rawUrl = (body.url ?? '').trim();
    if (rawUrl) {
      domain = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!rawUrl) return NextResponse.json({ error: 'url is required' }, { status: 400 });
  if (!domain) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });

  console.log('[shopping/site-recommend] start', { domain });

  // ── Auth ──────────────────────────────────────────────────────────────────
  let userId: string | null = null;
  try {
    const supabase = await makeSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  } catch (err) {
    console.warn('[shopping/site-recommend] auth error', normalizeServerError(err));
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Load context ──────────────────────────────────────────────────────────
  let wardrobe: WardrobeItem[] = [];
  let sizeProfile: UserSizeProfile | undefined;
  let styleDNA: StyleDNAProfile | undefined;
  let tripPlans: TripPlan[] = [];
  let occasions: OccasionEvent[] = [];

  try {
    const supabase = await makeSupabase();
    const [
      { data: wardrobeRows, error: wErr },
      { data: profile, error: pErr },
      { data: styleDNARow, error: dErr },
      { data: tripRows, error: tErr },
      { data: occasionRows, error: oErr },
    ] = await Promise.all([
      supabase.from('wardrobe_items').select('*').eq('user_id', userId),
      supabase.from('user_profiles').select('size_profile').eq('id', userId).single(),
      supabase.from('style_dna_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('trip_plans').select('*').eq('user_id', userId),
      supabase.from('occasion_events').select('*').eq('user_id', userId),
    ]);

    if (wErr) console.warn('[shopping/site-recommend] wardrobe query error', wErr.message);
    if (pErr) console.warn('[shopping/site-recommend] profile query error', pErr.message);
    if (dErr) console.warn('[shopping/site-recommend] style_dna query error', dErr.message);
    if (tErr) console.warn('[shopping/site-recommend] trips query error', tErr.message);
    if (oErr) console.warn('[shopping/site-recommend] occasions query error', oErr.message);

    wardrobe = (wardrobeRows ?? []) as WardrobeItem[];

    // size_profile is stored as camelCase JSONB — normalize to handle both shapes
    sizeProfile = normalizeSizeProfile(profile?.size_profile);

    // style_dna_profiles uses snake_case columns — must normalize before use
    styleDNA = styleDNARow ? normalizeStyleDNA(styleDNARow as Record<string, unknown>) : undefined;

    tripPlans = (tripRows ?? []) as TripPlan[];
    occasions = (occasionRows ?? []) as OccasionEvent[];
  } catch (err) {
    console.warn('[shopping/site-recommend] context load failed, using empty context', normalizeServerError(err));
  }

  console.log('[shopping/site-recommend] data loaded', {
    wardrobeCount: wardrobe.length,
    styleDnaFound: !!styleDNA,
    styleDnaConfidence: styleDNA?.confidenceScore,
    styleDnaSignalCount: styleDNA?.signalCount,
    sizeProfileFound: !!sizeProfile,
    sizeProfileKeys: sizeProfile ? Object.keys(sizeProfile).filter(k => (sizeProfile as Record<string, unknown>)[k] != null) : [],
    tripsCount: tripPlans.length,
    occasionsCount: occasions.length,
  });

  // ── Build deterministic recommendation (always succeeds) ──────────────────
  let rec: ShoppingSiteRecommendation;
  try {
    rec = buildDeterministicRec(domain, wardrobe, styleDNA, sizeProfile, tripPlans, occasions);
  } catch (err) {
    console.warn('[shopping/site-recommend] deterministic build failed', normalizeServerError(err));
    rec = {
      domain,
      brandName: capitaliseDomain(domain),
      focusCategories: ['Top', 'Bottom', 'Shoes'],
      avoidCategories: [],
      reasoning: `Browse ${capitaliseDomain(domain)} for wardrobe essentials. Add your Style DNA in Settings for personalised guidance.`,
      styleNotes: 'Complete your Style DNA in Settings for personalised colour and style guidance.',
      sizeNotes: 'Add your size profile in Settings for personalised fit guidance.',
      confidenceScore: 50,
      wardrobeGapMatches: [],
      occasionNotes: [],
      aiEnhanced: false,
      createdAt: new Date().toISOString(),
    };
  }

  console.log('[shopping/site-recommend] deterministic ready', {
    confidenceScore: rec.confidenceScore,
    focusCount: rec.focusCategories.length,
    avoidCount: rec.avoidCategories.length,
  });

  // ── Optional AI enhancement ────────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const gaps = rec.wardrobeGapMatches.join(', ') || 'none identified';
      const colors = styleDNA?.preferredColors.slice(0, 3).map(e => e.value).join(', ') || 'not set';
      const styles = styleDNA?.preferredStyleTags.slice(0, 3).map(e => e.value).join(', ') || 'not set';
      const avoid = styleDNA?.avoidedStyleTags.slice(0, 2).map(e => e.value).join(', ') || 'none';

      const prompt = `You are AURA, a personal style AI. The user is browsing ${domain} (${rec.brandName}).

Wardrobe gaps: ${gaps}
Preferred colours: ${colors}
Preferred styles: ${styles}
Styles to avoid: ${avoid}
Wardrobe size: ${wardrobe.length} items

Give concise, personalised shopping guidance for this brand (2-3 sentences). Focus on categories/items to look for based on gaps, and what to avoid. Do not invent products or prices.

Reply with JSON only: {"reasoning":"...","focusCategories":["..."],"avoidCategories":["..."],"styleNotes":"..."}`;

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
      });

      if (aiRes.ok) {
        let content: string | undefined;
        try {
          const aiData = await aiRes.json() as { choices?: { message?: { content?: string } }[] };
          content = aiData.choices?.[0]?.message?.content;
        } catch {
          content = undefined;
        }
        if (content) {
          const parsed = safeParseAiJson(content);
          if (parsed) {
            if (typeof parsed.reasoning === 'string' && parsed.reasoning) rec.reasoning = parsed.reasoning;
            if (Array.isArray(parsed.focusCategories) && (parsed.focusCategories as unknown[]).length > 0)
              rec.focusCategories = parsed.focusCategories as string[];
            if (Array.isArray(parsed.avoidCategories) && (parsed.avoidCategories as unknown[]).length > 0)
              rec.avoidCategories = parsed.avoidCategories as string[];
            if (typeof parsed.styleNotes === 'string' && parsed.styleNotes) rec.styleNotes = parsed.styleNotes;
            rec.aiEnhanced = true;
          } else {
            console.warn('[shopping/site-recommend] ai fallback: safeParseAiJson returned null');
          }
        }
      } else {
        console.warn('[shopping/site-recommend] ai fallback: OpenAI HTTP', aiRes.status);
      }
    } catch (err) {
      console.warn('[shopping/site-recommend] ai fallback', normalizeServerError(err));
    }
  } else {
    console.log('[shopping/site-recommend] ai skipped: no OPENAI_API_KEY');
  }

  console.log('[shopping/site-recommend] success', { aiEnhanced: rec.aiEnhanced });
  return NextResponse.json({ recommendation: rec });
}
