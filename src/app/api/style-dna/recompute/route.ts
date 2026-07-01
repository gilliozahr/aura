import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { computeStyleDNA } from '@/lib/style-dna/engine';
import type { WardrobeItem, InspirationItem, SavedOutfit, FeedbackEvent } from '@aura/types';
import type { InspirationReport, OutfitReport } from '@aura/types';

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(toSet) {
            try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch { /* read-only in Server Component context */ }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = user.id;

    const [wardrobeRes, outfitsRes, feedbackRes, inspirationsRes] = await Promise.all([
      supabase.from('wardrobe_items').select('*').eq('user_id', uid),
      supabase.from('saved_outfits').select('*').eq('user_id', uid),
      supabase.from('feedback_events').select('*').eq('user_id', uid),
      supabase.from('inspiration_items').select('*').eq('user_id', uid),
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
      aiMetadata: r.ai_metadata as WardrobeItem['aiMetadata'] ?? undefined,
    }));

    const outfits: SavedOutfit[] = ((outfitsRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      outfitItems: r.outfit_items as WardrobeItem[],
      report: r.report as OutfitReport,
      feedback: (r.feedback as SavedOutfit['feedback']) ?? undefined,
      createdAt: r.created_at as string,
    }));

    const feedback: FeedbackEvent[] = ((feedbackRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      type: r.type as string,
      score: r.score as number,
      payload: r.payload as Record<string, unknown> | undefined,
      at: r.created_at as string,
    }));

    const inspirations: InspirationItem[] = ((inspirationsRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      name: r.name as string,
      category: r.category as string,
      color: r.color as string,
      style: r.style as string,
      price: r.price as number,
      image: r.image_url as string,
      report: r.report as InspirationReport,
      createdAt: r.created_at as string,
    }));

    const profile = computeStyleDNA(wardrobe, outfits, feedback, inspirations);

    const { error } = await supabase.from('style_dna_profiles').upsert({
      user_id: uid,
      preferred_colors: profile.preferredColors,
      avoided_colors: profile.avoidedColors,
      preferred_categories: profile.preferredCategories,
      preferred_style_tags: profile.preferredStyleTags,
      avoided_style_tags: profile.avoidedStyleTags,
      preferred_occasions: profile.preferredOccasions,
      wardrobe_gaps: profile.wardrobeGaps,
      favorite_outfit_patterns: profile.favoriteOutfitPatterns,
      rejected_outfit_patterns: profile.rejectedOutfitPatterns,
      confidence_score: profile.confidenceScore,
      signal_count: profile.signalCount,
      last_computed_at: profile.lastComputedAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      console.error('[style-dna/recompute] upsert error:', error.message);
      return NextResponse.json({ error: 'Failed to save Style DNA.' }, { status: 500 });
    }

    console.info('[style-dna/recompute]', {
      signalCount: profile.signalCount,
      confidenceScore: profile.confidenceScore,
    });

    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recompute failed';
    console.error('[style-dna/recompute] unhandled error:', message);
    return NextResponse.json({ error: 'Style DNA recompute failed.' }, { status: 500 });
  }
}
