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

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const body = (await request.json()) as RequestBody;
    const { item, context } = body;

    if (!item?.name || !context?.user) {
      return NextResponse.json({ error: 'Missing item or context' }, { status: 400 });
    }

    const provider = process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'mock';
    const adapter = createAIAdapter();

    const report = await adapter.analyzeInspiration(item, context);
    const latencyMs = Date.now() - t0;

    console.info('[analyze-inspiration]', {
      provider,
      decision: report.decision,
      compatibilityScore: report.compatibilityScore,
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
