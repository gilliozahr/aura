import { NextRequest, NextResponse } from 'next/server';
import { createAIAdapter, getAIProvider } from '@aura/ai';
import type { VisionInput } from '@aura/ai';
import { createAuraServerClient } from '@/lib/supabase/server';

interface RequestBody {
  imageDataUrl: string;
  nameHint?: string;
}

const MAX_DATA_URL_BYTES = 4 * 1024 * 1024; // 4 MB base64 limit

const SUPPORTED_VISION_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
]);

function isDataUrl(s: string): boolean {
  return s.startsWith('data:image/');
}

function isHttpsUrl(s: string): boolean {
  return s.startsWith('https://');
}

function extractDataUrlMime(s: string): string | null {
  const m = s.match(/^data:(image\/[^;]+);base64,/);
  return m ? m[1].toLowerCase() : null;
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  // Resolve provider using the same priority logic as createAIAdapter:
  // AI_PROVIDER (runtime) > NEXT_PUBLIC_AI_PROVIDER (build-time) > 'mock'
  const providerFromRuntimeEnv = process.env.AI_PROVIDER || null;
  const providerFromBuildEnv = process.env.NEXT_PUBLIC_AI_PROVIDER || null;
  const providerRequested = getAIProvider();
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  console.info('[analyze-wardrobe-image] request', {
    providerFromRuntimeEnv,   // AI_PROVIDER
    providerFromBuildEnv,     // NEXT_PUBLIC_AI_PROVIDER
    providerRequested,        // what createAIAdapter() will use
    hasOpenAIKey,
    hasAnthropicKey,
  });

  try {
    // Require a valid Supabase auth session
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[analyze-wardrobe-image] unauthenticated request rejected');
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

    // Reject unsupported MIME types before hitting the AI provider
    if (isDataUrl(imageDataUrl)) {
      const mime = extractDataUrlMime(imageDataUrl);
      if (!mime || !SUPPORTED_VISION_MIME_TYPES.has(mime)) {
        console.warn('[analyze-wardrobe-image] unsupported image MIME type', { mime });
        return NextResponse.json(
          {
            error: 'Unsupported image format. Please upload a JPG, PNG, WEBP, or GIF.',
            _debug: {
              providerFromRuntimeEnv,
              providerFromBuildEnv,
              providerRequested,
              fallbackReason: 'unsupported_image_format',
              fallbackUsed: true,
              mime,
            },
          },
          { status: 400 }
        );
      }
    }

    const input: VisionInput = { imageDataUrl, nameHint: nameHint?.trim() };
    const adapter = createAIAdapter();
    const metadata = await adapter.analyzeWardrobeImage(input);
    const latencyMs = Date.now() - t0;

    console.info('[analyze-wardrobe-image] result', {
      providerRequested,
      providerUsed: metadata.provider,
      fallbackUsed: metadata.fallbackUsed,
      fallbackReason: metadata.fallbackReason ?? null,
      model: metadata.model,
      detectedCategory: metadata.detectedCategory,
      confidence: metadata.confidence,
      hasOpenAIKey,
      latencyMs,
    });

    return NextResponse.json({
      metadata,
      _debug: {
        providerFromRuntimeEnv,
        providerFromBuildEnv,
        providerRequested,
        providerUsed: metadata.provider,
        fallbackUsed: metadata.fallbackUsed,
        fallbackReason: metadata.fallbackReason ?? null,
        model: metadata.model,
        hasOpenAIKey,
        hasAnthropicKey,
        latencyMs,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vision analysis failed';
    console.error('[analyze-wardrobe-image] unhandled error:', message);
    return NextResponse.json(
      { error: 'Image analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
