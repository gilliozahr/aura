import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { uid } from '@/lib/utils';
import type { ShoppingProduct, ShoppingExtractionStatus } from '@/lib/types';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export const runtime = 'nodejs';

// ── HTML helpers ──────────────────────────────────────────────────────────────

function metaContent(html: string, ...props: string[]): string | undefined {
  for (const prop of props) {
    const m = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')
    ) ?? html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i')
    );
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const og = metaContent(html, 'og:title', 'twitter:title');
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim();
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      const parsed: unknown = JSON.parse(m[1]);
      const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of candidates) {
        if (item && typeof item === 'object' && '@type' in item) {
          const typed = item as Record<string, unknown>;
          if (typed['@type'] === 'Product' || (Array.isArray(typed['@type']) && (typed['@type'] as string[]).includes('Product'))) {
            return typed;
          }
        }
      }
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return null;
}

function extractPrice(html: string, jsonLd: Record<string, unknown> | null): { price?: number; currency?: string } {
  // JSON-LD price
  if (jsonLd) {
    const offers = jsonLd['offers'] as Record<string, unknown> | undefined;
    if (offers) {
      const price = parseFloat(String(offers['price'] ?? ''));
      const currency = String(offers['priceCurrency'] ?? '');
      if (!isNaN(price)) return { price, currency: currency || undefined };
    }
  }
  // OG price
  const ogPrice = metaContent(html, 'product:price:amount', 'og:price:amount');
  const ogCurrency = metaContent(html, 'product:price:currency', 'og:price:currency');
  if (ogPrice) {
    const price = parseFloat(ogPrice);
    if (!isNaN(price)) return { price, currency: ogCurrency };
  }
  return {};
}

function extractImages(html: string, jsonLd: Record<string, unknown> | null): string[] {
  const images: string[] = [];
  // JSON-LD images
  if (jsonLd?.image) {
    const raw = jsonLd.image;
    if (typeof raw === 'string') images.push(raw);
    else if (Array.isArray(raw)) images.push(...(raw as string[]).filter(s => typeof s === 'string'));
  }
  // OG image
  const og = metaContent(html, 'og:image', 'twitter:image');
  if (og && !images.includes(og)) images.push(og);
  // Return only https images, max 3
  return images.filter(u => u.startsWith('https://')).slice(0, 3);
}

function extractSizes(html: string, jsonLd: Record<string, unknown> | null): string[] {
  if (jsonLd) {
    const offers = jsonLd['offers'];
    const arr = Array.isArray(offers) ? offers : offers ? [offers] : [];
    const sizes: string[] = [];
    for (const offer of arr as Record<string, unknown>[]) {
      const size = offer['size'] ?? (offer['eligibleQuantity'] as Record<string, unknown> | undefined)?.['value'];
      if (typeof size === 'string' && size.length < 20) sizes.push(size);
    }
    if (sizes.length > 0) return sizes;
  }
  // Try meta
  const sizeMeta = metaContent(html, 'product:size');
  if (sizeMeta) return [sizeMeta];
  return [];
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { url?: string };
  try {
    body = await req.json() as { url?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawUrl = (body.url ?? '').trim();
  if (!rawUrl) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  // Validate URL — http/https only
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only http/https URLs are supported' }, { status: 400 });
  }

  // Fetch the page
  let html = '';
  let fetchOk = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AURABot/1.0; +https://aura.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (res.ok) {
      // Only read text, limit to 512KB to avoid storing huge HTML
      const buf = await res.arrayBuffer();
      html = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 524_288));
      fetchOk = true;
    }
  } catch {
    fetchOk = false;
  }

  let status: ShoppingExtractionStatus;
  let product: ShoppingProduct;

  if (!fetchOk || !html) {
    status = 'manual_required';
    product = {
      id: uid(),
      url: rawUrl,
      imageUrls: [],
      availableSizes: [],
      sizeGuide: {},
      extractionStatus: status,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({
      product,
      extractionStatus: status,
      missingFields: ['title', 'brand', 'price', 'category', 'color', 'material'],
      warnings: ['Could not load the product page. Please enter the product details manually.'],
    });
  }

  // Parse
  const jsonLd = extractJsonLd(html);
  const { price, currency } = extractPrice(html, jsonLd);
  const images = extractImages(html, jsonLd);
  const sizes = extractSizes(html, jsonLd);

  const title = (jsonLd?.['name'] as string | undefined) ?? extractTitle(html);
  const brand = (jsonLd?.['brand'] as Record<string, unknown> | undefined)?.['name'] as string | undefined
    ?? metaContent(html, 'og:site_name');
  const description = (jsonLd?.['description'] as string | undefined)
    ?? metaContent(html, 'og:description', 'description');
  const color = (jsonLd?.['color'] as string | undefined)
    ?? metaContent(html, 'product:color');
  const material = (jsonLd?.['material'] as string | undefined);

  const missingFields: string[] = [];
  if (!title) missingFields.push('title');
  if (!brand) missingFields.push('brand');
  if (price === undefined) missingFields.push('price');
  if (!color) missingFields.push('color');
  if (!material) missingFields.push('material');

  // Determine source
  const source = jsonLd ? 'json_ld' : images.length > 0 ? 'open_graph' : 'metadata';
  status = missingFields.length >= 3 ? 'partial' : 'success';

  product = {
    id: uid(),
    url: rawUrl,
    title: title ?? undefined,
    brand: brand ?? undefined,
    price,
    currency: currency ?? undefined,
    color: color ?? undefined,
    material: material ?? undefined,
    description: description?.slice(0, 500) ?? undefined,
    imageUrls: images,
    availableSizes: sizes,
    sizeGuide: {},
    extractedAt: new Date().toISOString(),
    extractionSource: source,
    extractionStatus: status,
    createdAt: new Date().toISOString(),
  };

  const warnings: string[] = [];
  if (missingFields.length > 0) {
    warnings.push(`Some fields could not be extracted: ${missingFields.join(', ')}. You can fill these in manually.`);
  }

  return NextResponse.json({ product, extractionStatus: status, missingFields, warnings });
}
