import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { analyzeShoppingProduct } from '@/lib/shopping/engine';
import type {
  ShoppingProduct,
  WardrobeItem,
  StyleDNAProfile,
  UserSizeProfile,
  TripPlan,
  OccasionEvent,
  SavedOutfit,
  ShoppingRecommendation,
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
          catch { /* read-only */ }
        },
      },
    }
  );
}

export async function POST(req: Request) {
  const supabase = await getSupabase().catch(() => null);
  if (!supabase) return NextResponse.json({ error: 'Server error' }, { status: 500 });

  let userId: string;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }

  let body: { product?: ShoppingProduct };
  try {
    body = await req.json() as { product?: ShoppingProduct };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const product = body.product;
  if (!product || !product.id) {
    return NextResponse.json({ error: 'product with id is required' }, { status: 400 });
  }

  const isManual = product.extractionSource === 'manual' || !product.url;
  console.log(`[shopping/analyze] start product=${product.id} manual=${isManual} title="${product.title ?? ''}"`);

  // Load user context in parallel
  let wardrobeData: Record<string, unknown>[] = [];
  let profileRow: Record<string, unknown> | null = null;
  let dnaRow: Record<string, unknown> | null = null;
  let tripsData: Record<string, unknown>[] = [];
  let occasionsData: Record<string, unknown>[] = [];
  let outfitsData: Record<string, unknown>[] = [];

  try {
    const [wardrobeRes, profileRes, dnaRes, tripsRes, occasionsRes, outfitsRes] = await Promise.all([
      supabase.from('wardrobe_items').select('*').eq('user_id', userId),
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase.from('style_dna_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('trip_plans').select('*').eq('user_id', userId),
      supabase.from('occasion_events').select('*').eq('user_id', userId),
      supabase.from('saved_outfits').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);
    wardrobeData = (wardrobeRes.data ?? []) as Record<string, unknown>[];
    profileRow = profileRes.data as Record<string, unknown> | null;
    dnaRow = dnaRes.data as Record<string, unknown> | null;
    tripsData = (tripsRes.data ?? []) as Record<string, unknown>[];
    occasionsData = (occasionsRes.data ?? []) as Record<string, unknown>[];
    outfitsData = (outfitsRes.data ?? []) as Record<string, unknown>[];
  } catch {
    return NextResponse.json({ error: 'Failed to load user context' }, { status: 500 });
  }

  const wardrobe: WardrobeItem[] = wardrobeData.map(r => ({
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

  const sizeProfile: UserSizeProfile | undefined =
    profileRow?.size_profile && typeof profileRow.size_profile === 'object' && Object.keys(profileRow.size_profile as object).length > 0
      ? (profileRow.size_profile as UserSizeProfile)
      : undefined;

  const styleDNA: StyleDNAProfile | undefined = dnaRow
    ? {
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
      }
    : undefined;

  const tripPlans: TripPlan[] = tripsData.map(r => ({
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

  const occasionEvents: OccasionEvent[] = occasionsData.map(r => ({
    id: r.id as string,
    title: r.title as string,
    eventType: r.event_type as OccasionEvent['eventType'],
    date: r.event_date as string,
    formality: r.formality as OccasionEvent['formality'],
    dressCode: (r.dress_code as OccasionEvent['dressCode']) ?? undefined,
    importance: (r.importance as OccasionEvent['importance']) ?? 'Normal',
    outfitStatus: (r.outfit_status as OccasionEvent['outfitStatus']) ?? 'pending',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));

  const savedOutfits: SavedOutfit[] = outfitsData.map(r => ({
    id: r.id as string,
    outfitItems: (r.outfit_items as WardrobeItem[]) ?? [],
    report: r.report as SavedOutfit['report'],
    feedback: (r.feedback as SavedOutfit['feedback']) ?? undefined,
    createdAt: r.created_at as string,
  }));

  // Deterministic analysis
  console.log(`[shopping/analyze] deterministic wardrobe=${wardrobe.length} dna=${!!styleDNA} size=${!!sizeProfile}`);
  const recommendation: ShoppingRecommendation = analyzeShoppingProduct({
    product,
    wardrobe,
    styleDNA,
    sizeProfile,
    tripPlans,
    occasionEvents,
    savedOutfits,
  });

  // Optional OpenAI enhancement
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey && product.title) {
    try {
      const prompt = [
        `You are a personal stylist AI. Analyse whether this product is a smart purchase for this user.`,
        `Product: ${product.title}${product.brand ? ` by ${product.brand}` : ''}`,
        product.color ? `Color: ${product.color}` : '',
        product.material ? `Material: ${product.material}` : '',
        product.category ? `Category: ${product.category}` : '',
        product.price ? `Price: ${product.currency ?? ''}${product.price}` : '',
        ``,
        `User style tags: ${styleDNA?.preferredStyleTags.slice(0, 4).map(e => e.value).join(', ') || 'not available'}`,
        `Wardrobe size: ${wardrobe.length} items`,
        `Wardrobe match score: ${recommendation.wardrobeMatchScore}/100`,
        `Duplicate risk: ${recommendation.duplicateRiskScore}/100`,
        ``,
        `Current decision: ${recommendation.decision}. Reasoning: ${recommendation.reasoning}`,
        ``,
        `In 1-2 sentences, confirm or refine the decision. Be direct and personal. Do not mention scores.`,
      ].filter(Boolean).join('\n');

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120,
          temperature: 0.5,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json() as { choices?: { message?: { content?: string } }[] };
        const aiText = aiData.choices?.[0]?.message?.content?.trim();
        if (aiText) {
          recommendation.reasoning = aiText;
          recommendation.aiEnhanced = true;
        }
      }
    } catch {
      // OpenAI failed — deterministic result stands
    }
  }

  console.log(`[shopping/analyze] success decision=${recommendation.decision} confidence=${recommendation.confidenceScore}`);
  return NextResponse.json({ recommendation });
}
