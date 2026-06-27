import { NextRequest, NextResponse } from 'next/server';
import { createAIAdapter } from '@aura/ai';
import { recommendationAgent } from '@aura/agents';
import { isValidItemName } from '@/lib/utils';
import type { WardrobeItem, UserProfile, WeatherContext } from '@aura/types';

interface RequestBody {
  wardrobe: WardrobeItem[];
  user: UserProfile;
  weather?: WeatherContext;
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const body = (await request.json()) as RequestBody;
    const { wardrobe, user, weather } = body;

    if (!user || !Array.isArray(wardrobe)) {
      return NextResponse.json({ error: 'Missing wardrobe or user context.' }, { status: 400 });
    }

    if (wardrobe.length === 0) {
      return NextResponse.json({ error: 'Wardrobe is empty.' }, { status: 400 });
    }

    // Strip invalid items before recommendation — server-side safety net
    const validWardrobe = wardrobe.filter(i => isValidItemName(i.name));
    if (validWardrobe.length < 2) {
      return NextResponse.json(
        { error: 'Not enough valid wardrobe items to generate an outfit recommendation.' },
        { status: 400 },
      );
    }

    // Deterministic item selection
    const selection = recommendationAgent.pickBestOutfit(validWardrobe, user);

    if (selection.items.length === 0) {
      return NextResponse.json({ error: 'Could not select outfit items from wardrobe.' }, { status: 400 });
    }

    // AI scoring + narrative
    const adapter = createAIAdapter();
    const report = await adapter.analyzeOutfit({ items: selection.items, user, wardrobe: validWardrobe, weather });

    const latencyMs = Date.now() - t0;
    console.info('[recommend-outfit]', {
      provider: process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'mock',
      itemCount: selection.items.length,
      compatibilityScore: report.compatibilityScore,
      fallbackUsed: report._meta?.fallbackUsed ?? false,
      latencyMs,
    });

    return NextResponse.json({ items: selection.items, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recommendation failed';
    console.error('[recommend-outfit] unhandled error:', message);
    return NextResponse.json(
      { error: 'Outfit recommendation failed. Please try again.' },
      { status: 500 }
    );
  }
}
