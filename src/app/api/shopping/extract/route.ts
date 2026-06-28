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
    // property/name before content
    const m = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')
    ) ?? html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i')
    );
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const og = metaContent(html, 'og:title', 'twitter:title');
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim();
}

// Walk JSON-LD looking for a Product node (handles @graph, nested arrays)
function findProductNode(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findProductNode(item);
      if (found) return found;
    }
    return null;
  }
  const typed = obj as Record<string, unknown>;
  const type = typed['@type'];
  const isProduct =
    type === 'Product' ||
    (Array.isArray(type) && (type as string[]).includes('Product'));
  if (isProduct) return typed;
  // Recurse into @graph
  if (typed['@graph']) return findProductNode(typed['@graph']);
  return null;
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const matches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of matches) {
    try {
      const parsed: unknown = JSON.parse(m[1]);
      const product = findProductNode(parsed);
      if (product) return product;
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return null;
}

function extractPrice(
  html: string,
  jsonLd: Record<string, unknown> | null
): { price?: number; currency?: string } {
  if (jsonLd) {
    const offers = jsonLd['offers'];
    // offers may be a single object or an array — take first available
    const offerArr: Record<string, unknown>[] = Array.isArray(offers)
      ? (offers as Record<string, unknown>[])
      : offers
      ? [offers as Record<string, unknown>]
      : [];
    for (const offer of offerArr) {
      const raw = offer['price'];
      const price = parseFloat(String(raw ?? ''));
      if (!isNaN(price) && price > 0) {
        const currency = String(offer['priceCurrency'] ?? '');
        return { price, currency: currency || undefined };
      }
    }
  }
  // OG product price
  const ogPrice = metaContent(html, 'product:price:amount', 'og:price:amount');
  const ogCurrency = metaContent(html, 'product:price:currency', 'og:price:currency');
  if (ogPrice) {
    const price = parseFloat(ogPrice);
    if (!isNaN(price)) return { price, currency: ogCurrency };
  }
  return {};
}

function ensureHttps(url: string): string | null {
  if (url.startsWith('https://')) return url;
  // Upgrade http to https for safety
  if (url.startsWith('http://')) return 'https://' + url.slice(7);
  // Absolute path without scheme — prepend https
  if (url.startsWith('//')) return 'https:' + url;
  return null;
}

function extractImages(
  html: string,
  jsonLd: Record<string, unknown> | null,
  pageUrl: string
): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  function push(url: string) {
    const safe = ensureHttps(url);
    if (safe && !seen.has(safe)) { seen.add(safe); images.push(safe); }
  }

  // 1. JSON-LD image
  if (jsonLd?.image) {
    const raw = jsonLd.image;
    if (typeof raw === 'string') push(raw);
    else if (Array.isArray(raw)) {
      for (const item of raw as unknown[]) {
        if (typeof item === 'string') push(item);
        else if (item && typeof item === 'object') {
          const src = (item as Record<string, unknown>)['url'] ?? (item as Record<string, unknown>)['contentUrl'];
          if (typeof src === 'string') push(src);
        }
      }
    } else if (typeof raw === 'object') {
      const src = (raw as Record<string, unknown>)['url'] ?? (raw as Record<string, unknown>)['contentUrl'];
      if (typeof src === 'string') push(src);
    }
  }

  // 2. og:image (may appear multiple times)
  const ogImagePattern = /<meta[^>]+(?:property)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']*)["']/gi;
  let ogMatch: RegExpExecArray | null;
  while ((ogMatch = ogImagePattern.exec(html)) !== null && images.length < 5) {
    push(ogMatch[1]);
  }
  // content-before-property variant
  const ogImagePattern2 = /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image(?::secure_url)?["']/gi;
  while ((ogMatch = ogImagePattern2.exec(html)) !== null && images.length < 5) {
    push(ogMatch[1]);
  }

  // 3. Twitter card image
  const tw = metaContent(html, 'twitter:image', 'twitter:image:src');
  if (tw) push(tw);

  // 4. Fallback: largest <img> in page that looks like a product image
  if (images.length === 0) {
    const imgPattern = /<img[^>]+src=["']([^"']*(?:product|item|pdp|detail)[^"']*)["']/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgPattern.exec(html)) !== null && images.length < 3) {
      let src = imgMatch[1];
      if (src.startsWith('/')) {
        try { src = new URL(src, pageUrl).href; } catch { continue; }
      }
      push(src);
    }
  }

  return images.slice(0, 5);
}

function extractAdditionalProperty(
  jsonLd: Record<string, unknown>,
  names: string[]
): string | undefined {
  const props = jsonLd['additionalProperty'];
  if (!Array.isArray(props)) return undefined;
  const lower = names.map(n => n.toLowerCase());
  for (const p of props as Record<string, unknown>[]) {
    const propName = String(p['name'] ?? '').toLowerCase();
    if (lower.some(n => propName.includes(n))) {
      return String(p['value'] ?? '') || undefined;
    }
  }
  return undefined;
}

function extractSizes(
  html: string,
  jsonLd: Record<string, unknown> | null
): string[] {
  const sizes: string[] = [];

  if (jsonLd) {
    // From offers array with size property
    const offers = jsonLd['offers'];
    const offerArr = Array.isArray(offers) ? offers : offers ? [offers] : [];
    for (const offer of offerArr as Record<string, unknown>[]) {
      const size =
        offer['size'] ??
        (offer['eligibleQuantity'] as Record<string, unknown> | undefined)?.['value'] ??
        (offer['itemOffered'] as Record<string, unknown> | undefined)?.['size'];
      if (typeof size === 'string' && size.length > 0 && size.length < 25) {
        if (!sizes.includes(size)) sizes.push(size);
      }
    }
    if (sizes.length > 0) return sizes.slice(0, 20);

    // From additionalProperty
    const fromProp = extractAdditionalProperty(jsonLd, ['size', 'sizes']);
    if (fromProp) return fromProp.split(/[,/|]/).map(s => s.trim()).filter(Boolean);
  }

  // Meta tag
  const sizeMeta = metaContent(html, 'product:size');
  if (sizeMeta) return sizeMeta.split(/[,/|]/).map(s => s.trim()).filter(Boolean);

  return [];
}

function extractCategory(
  html: string,
  jsonLd: Record<string, unknown> | null
): string | undefined {
  if (jsonLd) {
    const cat = jsonLd['category'];
    if (typeof cat === 'string' && cat.trim()) return cat.trim();
    // breadcrumb can imply category
    const bc = jsonLd['breadcrumb'];
    if (bc && typeof bc === 'object') {
      const items = (bc as Record<string, unknown>)['itemListElement'];
      if (Array.isArray(items) && items.length >= 2) {
        const last = items[items.length - 2] as Record<string, unknown>;
        const name = last?.['name'] ?? (last?.['item'] as Record<string, unknown>)?.['name'];
        if (typeof name === 'string') return name.trim();
      }
    }
  }
  return metaContent(html, 'product:category');
}

function extractBrand(
  html: string,
  jsonLd: Record<string, unknown> | null
): string | undefined {
  if (jsonLd) {
    const brand = jsonLd['brand'];
    if (typeof brand === 'string' && brand.trim()) return brand.trim();
    if (brand && typeof brand === 'object') {
      const name = (brand as Record<string, unknown>)['name'];
      if (typeof name === 'string' && name.trim()) return name.trim();
    }
    const seller = jsonLd['seller'];
    if (seller && typeof seller === 'object') {
      const name = (seller as Record<string, unknown>)['name'];
      if (typeof name === 'string' && name.trim()) return name.trim();
    }
  }
  return (
    metaContent(html, 'og:site_name') ??
    metaContent(html, 'application-name')
  );
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
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      // Limit to 768 KB — enough to capture <head> and early <body> with JSON-LD
      html = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 786_432));
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
      warnings: ['Product details could not be read automatically. Add the details manually.'],
    });
  }

  // Parse — priority: JSON-LD → OG/Twitter → HTML meta
  const jsonLd = extractJsonLd(html);
  const { price, currency } = extractPrice(html, jsonLd);
  const images = extractImages(html, jsonLd, rawUrl);
  const sizes = extractSizes(html, jsonLd);

  const title =
    (jsonLd?.['name'] as string | undefined)?.trim() ??
    extractTitle(html);

  const brand = extractBrand(html, jsonLd);

  const description =
    (jsonLd?.['description'] as string | undefined)?.trim() ??
    metaContent(html, 'og:description', 'twitter:description', 'description');

  const color =
    (jsonLd?.['color'] as string | undefined)?.trim() ??
    extractAdditionalProperty(jsonLd ?? {}, ['color', 'colour']) ??
    metaContent(html, 'product:color');

  const material =
    (jsonLd?.['material'] as string | undefined)?.trim() ??
    extractAdditionalProperty(jsonLd ?? {}, ['material', 'fabric', 'composition']);

  const category = extractCategory(html, jsonLd);

  const missingFields: string[] = [];
  if (!title) missingFields.push('title');
  if (!brand) missingFields.push('brand');
  if (price === undefined) missingFields.push('price');
  if (!color) missingFields.push('color');
  if (!material) missingFields.push('material');

  // Extraction source quality
  const source = jsonLd
    ? 'json_ld'
    : images.length > 0
    ? 'open_graph'
    : 'metadata';

  // partial if 3+ core fields missing AND no image; success if we have at minimum title + image
  const hasCore = !!(title && images.length > 0);
  status = hasCore ? (missingFields.length >= 4 ? 'partial' : 'success') : missingFields.length >= 3 ? 'partial' : 'success';

  product = {
    id: uid(),
    url: rawUrl,
    title: title ?? undefined,
    brand: brand ?? undefined,
    price,
    currency: currency ?? undefined,
    category: category ?? undefined,
    color: color ?? undefined,
    material: material ?? undefined,
    description: description?.slice(0, 600) ?? undefined,
    imageUrls: images,
    availableSizes: sizes,
    sizeGuide: {},
    extractedAt: new Date().toISOString(),
    extractionSource: source,
    extractionStatus: status,
    createdAt: new Date().toISOString(),
  };

  const warnings: string[] = [];
  if (missingFields.length > 0 && missingFields.length < 5) {
    warnings.push(
      `Some details could not be extracted automatically: ${missingFields.join(', ')}. You can add them manually.`
    );
  }

  return NextResponse.json({ product, extractionStatus: status, missingFields, warnings });
}
