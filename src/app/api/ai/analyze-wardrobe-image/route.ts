import { NextRequest, NextResponse } from 'next/server';
import { createAIAdapter } from '@aura/ai';
import type { VisionInput } from '@aura/ai';
import { createAuraServerClient } from '@/lib/supabase/server';

interface RequestBody {
  imageDataUrl: string;
  nameHint?: string;
}

const MAX_DATA_URL_BYTES = 4 * 1024 * 1024; // 4 MB base64 limit

function isDataUrl(s: string): boolean {
  return s.startsWith('data:image/');
}

function isHttpsUrl(s: string): boolean {
  return s.startsWith('https://');
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    // Require an authenticated Supabase session — images belong to signed-in users
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const { imageDataUrl, nameHint } = body;

    if (!imageDataUrl || (!isDataUrl(imageDataUrl) && !isHttpsUrl(imageDataUrl))) {
      return NextResponse.json(
        { error: 'A valid image is required (data URL or HTTPS URL).' },
        { status: 400 }
      );
    }

    if (isDataUrl(imageDataUrl) && imageDataUrl.length > MAX_DATA_URL_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large. Please use an image under 3 MB.' },
        { status: 400 }
      );
    }

    const input: VisionInput = { imageDataUrl, nameHint: nameHint?.trim() };
    const adapter = createAIAdapter();
    const metadata = await adapter.analyzeWardrobeImage(input);
    const latencyMs = Date.now() - t0;

    console.info('[analyze-wardrobe-image]', {
      provider: process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'mock',
      detectedCategory: metadata.detectedCategory,
      confidence: metadata.confidence,
      fallbackToMock: metadata.provider === 'mock',
      latencyMs,
    });

    return NextResponse.json({ metadata });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vision analysis failed';
    console.error('[analyze-wardrobe-image] unhandled error:', message);
    return NextResponse.json(
      { error: 'Image analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
