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

async function getSupabase() {
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

function capitaliseDomain(domain: string): string {
  const name = domain.replace(/^www\./, '').split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildDeterministicRec(
  domain: string,
  wardrobe: WardrobeItem[],
  styleDNA: StyleDNAProfile | undefined,
  sizeProfile: UserSizeProfile | undefined,
  trips: TripPlan[],
  occasions: OccasionEvent[]
): ShoppingSiteRecommendation {
  const brandName = capitaliseDomain(domain);

  // Focus categories: wardrobe gaps first, then under-represented categories
  const gaps = styleDNA?.wardrobeGaps ?? [];
  const focusCategories: string[] = [...gaps.slice(0, 3)];
  if (focusCategories.length === 0) {
    const categoryCounts: Record<string, number> = {};
    for (const item of wardrobe) {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    }
    const allCats = ['Top', 'Bottom', 'Shoes', 'Outerwear', 'Accessory'];
    for (const cat of allCats) {
      if (!categoryCounts[cat] || categoryCounts[cat] < 2) focusCategories.push(cat);
      if (focusCategories.length >= 3) break;
    }
  }

  // Avoid: over-represented categories
  const categoryCounts: Record<string, { count: number; colors: string[] }> = {};
  for (const item of wardrobe) {
    if (!categoryCounts[item.category]) categoryCounts[item.category] = { count: 0, colors: [] };
    categoryCounts[item.category].count++;
    if (item.color) categoryCounts[item.category].colors.push(item.color.toLowerCase());
  }
  const avoidCategories: string[] = [];
  for (const [cat, { count, colors }] of Object.entries(categoryCounts)) {
    if (count >= 4) {
      const dominantColor = colors.length > 0
        ? colors.sort((a, b) => colors.filter(c => c === b).length - colors.filter(c => c === a).length)[0]
        : null;
      avoidCategories.push(
        dominantColor
          ? `more ${dominantColor} ${cat.toLowerCase()}s (already have ${count})`
          : `more ${cat.toLowerCase()}s (already have ${count})`
      );
    }
  }

  // Style notes
  const prefColors = styleDNA?.preferredColors.slice(0, 3).map(e => e.value) ?? [];
  const prefStyles = styleDNA?.preferredStyleTags.slice(0, 3).map(e => e.value) ?? [];
  const avoidStyles = styleDNA?.avoidedStyleTags.slice(0, 2).map(e => e.value) ?? [];
  const styleParts: string[] = [];
  if (prefColors.length > 0) styleParts.push(`Look for ${prefColors.join(', ')} colourways.`);
  if (prefStyles.length > 0) styleParts.push(`Your Style DNA favours ${prefStyles.join(', ')}.`);
  if (avoidStyles.length > 0) styleParts.push(`Avoid ${avoidStyles.join(', ')} styles.`);
  const styleNotes = styleParts.join(' ') ||
    'Complete your Style DNA in Settings for personalised colour and style guidance.';

  // Size notes
  let sizeNotes = '';
  if (sizeProfile) {
    const unit = sizeProfile.measurementUnit ?? 'cm';
    const parts: string[] = [];
    if (sizeProfile.topSize) parts.push(`top ${sizeProfile.topSize}`);
    if (sizeProfile.bottomSize) parts.push(`bottom ${sizeProfile.bottomSize}`);
    if (sizeProfile.shoeSizeEU) parts.push(`EU shoe ${sizeProfile.shoeSizeEU}`);
    sizeNotes = parts.length > 0
      ? `Your sizes: ${parts.join(', ')} (${unit}). Confirm with the brand's size guide before ordering.`
      : 'Add your sizes in Settings for fit guidance.';
  } else {
    sizeNotes = 'Add your size profile in Settings for personalised fit guidance.';
  }

  // Occasion notes
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

  // Reasoning
  const focusStr = focusCategories.length > 0 ? focusCategories.join(' and ') : 'wardrobe essentials';
  const reasoning =
    `Based on your wardrobe and Style DNA, ${brandName} is worth browsing for ${focusStr}. ` +
    (avoidCategories.length > 0 ? `Skip ${avoidCategories[0]}. ` : '') +
    (styleDNA
      ? `Confidence is based on ${styleDNA.signalCount} style signals.`
      : 'Build your Style DNA by rating outfits for better guidance.');

  // Confidence
  const confidenceScore = Math.min(
    50 +
    (styleDNA ? Math.min(Math.round(styleDNA.confidenceScore / 2), 30) : 0) +
    (sizeProfile ? 10 : 0) +
    (gaps.length > 0 ? 10 : 0),
    95
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

export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { url?: string };
  try { body = await req.json() as { url?: string }; }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const rawUrl = (body.url ?? '').trim();
  if (!rawUrl) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  let domain: string;
  try {
    domain = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname;
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const uid = user.id;
  const [
    { data: wardrobeRows },
    { data: profile },
    { data: styleDNARow },
    { data: tripRows },
    { data: occasionRows },
  ] = await Promise.all([
    supabase.from('wardrobe_items').select('*').eq('user_id', uid),
    supabase.from('user_profiles').select('size_profile').eq('id', uid).single(),
    supabase.from('style_dna_profiles').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('trip_plans').select('*').eq('user_id', uid),
    supabase.from('occasion_events').select('*').eq('user_id', uid),
  ]);

  const wardrobe = (wardrobeRows ?? []) as WardrobeItem[];
  const sizeProfile = (profile?.size_profile ?? undefined) as UserSizeProfile | undefined;
  const styleDNA = styleDNARow as StyleDNAProfile | undefined ?? undefined;
  const tripPlans = (tripRows ?? []) as TripPlan[];
  const occasions = (occasionRows ?? []) as OccasionEvent[];

  const rec = buildDeterministicRec(domain, wardrobe, styleDNA, sizeProfile, tripPlans, occasions);

  // Optional AI enhancement — compact prompt, no personal measurements
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json() as { choices?: { message?: { content?: string } }[] };
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as {
            reasoning?: string;
            focusCategories?: string[];
            avoidCategories?: string[];
            styleNotes?: string;
          };
          if (parsed.reasoning) rec.reasoning = parsed.reasoning;
          if (Array.isArray(parsed.focusCategories) && parsed.focusCategories.length > 0)
            rec.focusCategories = parsed.focusCategories;
          if (Array.isArray(parsed.avoidCategories) && parsed.avoidCategories.length > 0)
            rec.avoidCategories = parsed.avoidCategories;
          if (parsed.styleNotes) rec.styleNotes = parsed.styleNotes;
          rec.aiEnhanced = true;
        }
      }
    } catch {
      // AI failed — serve deterministic result
    }
  }

  return NextResponse.json({ recommendation: rec });
}
