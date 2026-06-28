import { NextRequest, NextResponse } from 'next/server';
import { createAIAdapter } from '@aura/ai';
import type { VisionInput } from '@aura/ai';

interface RequestBody {
  imageDataUrl: string;
  nameHint?: string;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB base64 limit

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const body = (await request.json()) as RequestBody;
    const { imageDataUrl, nameHint } = body;

    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'A valid image is required.' }, { status: 400 });
    }

    if (imageDataUrl.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large. Please use an image under 3 MB.' }, { status: 400 });
    }

    const input: VisionInput = { imageDataUrl, nameHint: nameHint?.trim() };
    const adapter = createAIAdapter();
    const metadata = await adapter.analyzeWardrobeImage(input);
    const latencyMs = Date.now() - t0;

    console.info('[analyze-wardrobe-image]', {
      provider: process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'mock',
      detectedCategory: metadata.detectedCategory,
      confidence: metadata.confidence,
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
