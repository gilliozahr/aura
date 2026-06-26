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
  try {
    const body = (await request.json()) as RequestBody;
    const { item, context } = body;

    if (!item || !context) {
      return NextResponse.json({ error: 'Missing item or context' }, { status: 400 });
    }

    const adapter = createAIAdapter();
    const report = await adapter.analyzeInspiration(item, context);

    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
