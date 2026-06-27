import { NextRequest, NextResponse } from 'next/server';
import { createAIAdapter } from '@aura/ai';
import type { InspirationInput } from '@aura/ai';
import type { WardrobeItem, UserProfile } from '@aura/types';

interface RequestBody {
  item: InspirationInput;
  context: {
    wardrobe: WardrobeItem[];
    user: UserProfile;
  };
}

/** Returns true if the string contains at least `min` ASCII letter characters. */
function hasEnoughLetters(s: string, min = 2): boolean {
  return (s.match(/[a-zA-Z]/g) ?? []).length >= min;
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const body = (await request.json()) as RequestBody;
    const { item, context } = body;

    // ── Input validation ───────────────────────────────────────────────────
    if (!item || !context?.user) {
      return NextResponse.json({ error: 'Missing item or context.' }, { status: 400 });
    }

    if (!item.name || !hasEnoughLetters(item.name)) {
      return NextResponse.json(
        { error: 'Item name must contain at least 2 letters. Please enter a real item name.' },
        { status: 400 }
      );
    }

    if (!item.price || item.price < 1) {
      return NextResponse.json(
        { error: 'Price must be at least $1. Enter the item\'s actual price for an accurate analysis.' },
        { status: 400 }
      );
    }

    if (!item.category) {
      return NextResponse.json({ error: 'Category is required.' }, { status: 400 });
    }

    // ── Analysis ───────────────────────────────────────────────────────────
    const provider = process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'mock';
    const adapter = createAIAdapter();

    const report = await adapter.analyzeInspiration(item, context);
    const latencyMs = Date.now() - t0;

    console.info('[analyze-inspiration]', {
      provider,
      decision: report.decision,
      compatibilityScore: report.compatibilityScore,
      confidence: report.confidence,
      fallbackUsed: report._meta?.fallbackUsed ?? false,
      latencyMs,
    });

    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    console.error('[analyze-inspiration] unhandled error:', message);
    return NextResponse.json(
      { error: 'AI analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
