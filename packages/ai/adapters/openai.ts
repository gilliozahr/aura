import type { InspirationReport, OutfitReport, StyleDNASummary, WardrobeItem, UserProfile, WeatherContext, WardrobeAIMetadata, VisionFallbackReason } from '@aura/types';
import type { AIAdapter, InspirationContext, InspirationInput, OutfitInput, VisionInput } from '../index';
import { validateReport, validateOutfitReport, validateVisionReport } from '../validate';
import { MockAIAdapter } from './mock';

const MODEL = 'gpt-4o';

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

function buildDNABlock(dna: StyleDNASummary): string {
  if (dna.confidenceScore < 30) return '';
  const lines: string[] = [`STYLE DNA (confidence: ${dna.confidenceScore}/100 — use as soft guidance only):`];
  if (dna.preferredColors.length) lines.push(`- Preferred colors: ${dna.preferredColors.join(', ')}`);
  if (dna.preferredStyleTags.length) lines.push(`- Preferred styles: ${dna.preferredStyleTags.join(', ')}`);
  if (dna.avoidedStyleTags.length) lines.push(`- Styles to avoid: ${dna.avoidedStyleTags.join(', ')}`);
  if (dna.preferredOccasions.length) lines.push(`- Preferred occasions: ${dna.preferredOccasions.join(', ')}`);
  if (dna.wardrobeGaps.length) lines.push(`- Wardrobe gaps: ${dna.wardrobeGaps.join(', ')}`);
  return lines.join('\n');
}

function buildInspirationPrompt(
  item: InspirationInput,
  user: UserProfile,
  wardrobe: WardrobeItem[],
  duplicateCount: number,
  styleDNA?: StyleDNASummary
): string {
  const dnaBlock = styleDNA ? buildDNABlock(styleDNA) : '';
  return `You are AURA, an AI personal style operating system. Analyze whether the user should buy this item.

ITEM: "${item.name}" | Category: ${item.category} | Color: ${item.color} | Style: ${item.style} | Price: $${item.price}
USER: Style goal: "${user.styleGoal}" | Budget: $${user.budget}/month | City: ${user.city} | Occasion: "${user.occasion}"
WARDROBE: ${wardrobe.length} total items | ${duplicateCount} item(s) with same category and color already owned${dnaBlock ? `\n${dnaBlock}` : ''}

Score all dimensions as integers 0-100:
- styleMatchScore: alignment with the user's style goal and aesthetic
- wardrobeImpactScore: versatility added (penalise for duplicates)
- budgetFitScore: 100 if price is within monthly budget, lower if over
- duplicateRisk: redundancy risk (0 = fully unique, 100 = many duplicates)
- confidence: your confidence in this analysis (lower when item data is vague or generic)

Compute: compatibilityScore = round(styleMatchScore*0.35 + wardrobeImpactScore*0.35 + budgetFitScore*0.20 + (100-duplicateRisk)*0.10)
Decision: BUY if compatibilityScore>=82, WAIT if>=62, SKIP otherwise

Scoring rules — follow these strictly:
- Never score any single dimension at 100 unless the evidence is overwhelming and specific
- If the item name is generic, unclear, or non-descriptive, set confidence below 55 and recommend WAIT
- A BUY decision requires: strong named style alignment, a clear wardrobe gap filled, budget within range, and low duplicate risk — all four
- When in doubt between BUY and WAIT, choose WAIT
- compatibilityScore above 90 requires exceptional alignment across all four dimensions

Provide specific, item-aware analysis:
- reasoningSummary: one sentence overall verdict
- whyItWorks: one sentence on why it fits (or doesn't, for SKIP)
- risks: array of 1-3 specific risk strings
- suggestedOutfits: array of 2-3 specific outfit ideas using the existing wardrobe
- betterAlternatives: array of 1-2 alternative item ideas if WAIT/SKIP, empty array if BUY
- missingWardrobeOpportunities: array of 1-2 items that would pair well if purchased

Return ONLY valid JSON, no markdown:
{"compatibilityScore":<int>,"styleMatchScore":<int>,"wardrobeImpactScore":<int>,"budgetFitScore":<int>,"duplicateRisk":<int>,"confidence":<int>,"decision":"<BUY|WAIT|SKIP>","reasoningSummary":"<string>","whyItWorks":"<string>","risks":["<string>"],"suggestedOutfits":["<string>"],"betterAlternatives":["<string>"],"missingWardrobeOpportunities":["<string>"]}`;
}

function buildOutfitPrompt(items: WardrobeItem[], user: UserProfile, weather?: WeatherContext, styleDNA?: StyleDNASummary): string {
  const itemList = items
    .map(i => {
      const base = `- ${i.name} (${i.category}, ${i.color}, ${i.style}, ${i.season}, ${i.occasion})`;
      if (i.aiMetadata?.tags?.length) return `${base} [AI tags: ${i.aiMetadata.tags.join(', ')}]`;
      return base;
    })
    .join('\n');

  const weatherLine = weather?.available
    ? `- Weather: ${weather.temperatureC}°C, ${weather.condition}${weather.humidity != null ? `, ${weather.humidity}% humidity` : ''}${weather.feelsLikeC != null ? ` (feels like ${weather.feelsLikeC}°C)` : ''} in ${weather.city}`
    : `- Weather: unavailable — use neutral weatherFitScore (50-60) and note data is unavailable`;

  const weatherGuidance = weather?.available
    ? `Weather guidance for weatherFitScore:
- Above 30°C: prioritize breathable fabrics (linen, cotton), light colors; penalise heavy layers
- 20–30°C: moderate — most outfits work; reward breathable but not strictly summer pieces
- Below 15°C: reward layering, knitwear, jackets; penalise exposed/thin items
- Rain or high humidity (>75%): avoid suede; reward waterproof outerwear, breathable fabrics
- Current condition "${weather.condition}": apply relevant guidance`
    : `Weather guidance: data unavailable — set weatherFitScore to 55 and note "Weather data unavailable" in reasoningSummary`;

  const dnaBlock = styleDNA ? buildDNABlock(styleDNA) : '';
  return `You are AURA, an AI personal style operating system. Analyze this outfit combination.

OUTFIT ITEMS:
${itemList}

USER CONTEXT:
- Style goal: "${user.styleGoal}"
- Occasion: "${user.occasion}"
${weatherLine}${dnaBlock ? `\n${dnaBlock}` : ''}

${weatherGuidance}

Score all dimensions as integers 0-100:
- compatibilityScore: overall outfit cohesion and visual harmony
- occasionFitScore: how well this outfit suits "${user.occasion}"
- weatherFitScore: appropriateness for current weather conditions
- styleMatchScore: alignment with "${user.styleGoal}" aesthetic
- colorHarmonyScore: how well the colors work together
- confidence: your confidence in this analysis

Rules:
- Never score any dimension at 100 unless evidence is overwhelming
- compatibilityScore = round(occasionFitScore*0.30 + weatherFitScore*0.20 + styleMatchScore*0.30 + colorHarmonyScore*0.20)

Provide:
- reasoningSummary: one sentence overall verdict (mention weather if relevant)
- whyItWorks: specific explanation of why these pieces work together (or don't)
- risks: array of 1-2 specific issues including weather-related risks (empty array if none)
- missingItems: array of 1-2 items that would complete the outfit (consider weather)
- alternatives: array of 1-2 specific alternative pieces to consider swapping in

Return ONLY valid JSON, no markdown:
{"compatibilityScore":<int>,"occasionFitScore":<int>,"weatherFitScore":<int>,"styleMatchScore":<int>,"colorHarmonyScore":<int>,"confidence":<int>,"reasoningSummary":"<string>","whyItWorks":"<string>","risks":["<string>"],"missingItems":["<string>"],"alternatives":["<string>"]}`;
}

export class OpenAIAdapter implements AIAdapter {
  async analyzeInspiration(
    item: InspirationInput,
    context: InspirationContext
  ): Promise<InspirationReport> {
    const t0 = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[OpenAIAdapter] OPENAI_API_KEY not set — using mock');
      const report = await new MockAIAdapter().analyzeInspiration(item, context);
      return { ...report, _meta: { ...report._meta!, provider: 'openai', fallbackUsed: true } };
    }

    const { user, wardrobe, styleDNA } = context;
    const duplicateCount = wardrobe.filter(
      w => w.category === item.category && w.color.toLowerCase() === item.color.toLowerCase()
    ).length;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: buildInspirationPrompt(item, user, wardrobe, duplicateCount, styleDNA) }],
          response_format: { type: 'json_object' },
          max_tokens: 1024,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenAI HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = (await res.json()) as OpenAIResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      const parsed: unknown = JSON.parse(text);
      const report = validateReport(parsed);
      const latencyMs = Date.now() - t0;

      console.info('[OpenAIAdapter] analyzeInspiration success', { model: MODEL, latencyMs, decision: report.decision });

      return {
        ...report,
        _meta: { provider: 'openai', mode: 'real', model: MODEL, latencyMs, fallbackUsed: false },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OpenAIAdapter] analyzeInspiration error — falling back to mock:', msg);
      const report = await new MockAIAdapter().analyzeInspiration(item, context);
      return {
        ...report,
        _meta: {
          provider: 'openai',
          mode: 'mock',
          model: MODEL,
          latencyMs: Date.now() - t0,
          fallbackUsed: true,
        },
      };
    }
  }

  async analyzeOutfit(input: OutfitInput): Promise<OutfitReport> {
    const t0 = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[OpenAIAdapter] OPENAI_API_KEY not set — using mock for analyzeOutfit');
      const report = await new MockAIAdapter().analyzeOutfit(input);
      return { ...report, _meta: { ...report._meta!, provider: 'openai', fallbackUsed: true } };
    }

    const { items, user, weather, styleDNA } = input;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: buildOutfitPrompt(items, user, weather, styleDNA) }],
          response_format: { type: 'json_object' },
          max_tokens: 512,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenAI HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = (await res.json()) as OpenAIResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      const parsed: unknown = JSON.parse(text);
      const report = validateOutfitReport(parsed);
      const latencyMs = Date.now() - t0;

      console.info('[OpenAIAdapter] analyzeOutfit success', { model: MODEL, latencyMs, score: report.compatibilityScore });

      return {
        ...report,
        outfitItems: items.map(i => i.id),
        _meta: { provider: 'openai', mode: 'real', model: MODEL, latencyMs, fallbackUsed: false },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OpenAIAdapter] analyzeOutfit error — falling back to mock:', msg);
      const report = await new MockAIAdapter().analyzeOutfit(input);
      return {
        ...report,
        _meta: {
          provider: 'openai',
          mode: 'mock',
          model: MODEL,
          latencyMs: Date.now() - t0,
          fallbackUsed: true,
        },
      };
    }
  }

  async analyzeWardrobeImage(input: VisionInput): Promise<WardrobeAIMetadata> {
    const t0 = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;

    const mockFallback = (reason: VisionFallbackReason, latencyMs: number): WardrobeAIMetadata => {
      console.warn('[OpenAIAdapter] analyzeWardrobeImage fallback', { reason, latencyMs });
      return new MockAIAdapter().analyzeWardrobeImageSync(reason, 'openai');
    };

    if (!apiKey) {
      return mockFallback('missing_openai_key', Date.now() - t0);
    }

    const prompt = `You are AURA, an AI wardrobe assistant. Analyze the clothing item in this image and classify it precisely.

${input.nameHint ? `User label hint: "${input.nameHint}" — use this to resolve ambiguity but trust the image first.` : ''}

CATEGORY RULES — choose exactly one:
- Top: shirt, t-shirt, blouse, sweater, jumper, polo, tank top, hoodie, cardigan, knitwear
- Bottom: jeans, trousers, pants, chinos, shorts, leggings, skirt, denim, joggers
- Shoes: sneakers, loafers, boots, sandals, heels, trainers, oxfords
- Outerwear: coat, jacket, blazer, parka, raincoat, overcoat, suit jacket
- Dress: dress, gown, jumpsuit, playsuit, romper
- Bag: handbag, backpack, tote, clutch, briefcase, duffel
- Accessory: belt, scarf, hat, cap, sunglasses, tie, jewellery, watch, fragrance
- Other: anything not clearly fitting above categories

SEASON RULES:
- Summer: lightweight fabrics, shorts, sandals, linen, visible skin
- Winter: coat, heavy knit, boots, layers, wool
- Spring/Autumn: transitional items, light jacket, medium weight
- All: versatile basics that work year-round (most trousers, shirts, shoes)

OCCASION RULES:
- Business: formal suit, dress shirt, blazer, formal shoes
- Smart Casual: chinos, polo, neat jeans, loafers — not gym/beach
- Casual: t-shirt, jeans, sneakers, everyday wear
- Evening: dress, cocktail attire, formal gown, smart heels
- Travel: practical, comfortable, wrinkle-resistant

COLOR: state the primary dominant color precisely (e.g. "Light Blue Denim", "Camel", "Charcoal Grey", "Olive Green").

Return ONLY valid JSON, no markdown:
{"detectedCategory":"<Top|Bottom|Shoes|Outerwear|Dress|Bag|Accessory|Other>","detectedColor":"<precise color>","detectedStyle":"<style aesthetic e.g. Smart Casual, Quiet Luxury, Streetwear, Classic>","detectedSeason":"<All|Summer|Winter|Spring|Autumn>","detectedOccasion":"<Business|Smart Casual|Casual|Evening|Travel>","confidence":<integer 0-100, lower if image is unclear>,"tags":["<tag1>","<tag2>","<tag3>"],"analysisNote":"<one sentence describing what you see>"}

IMPORTANT: jeans and denim trousers must always be "Bottom", not "Top".`;

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: input.imageDataUrl, detail: 'low' } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 512,
          temperature: 0.2,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OpenAIAdapter] analyzeWardrobeImage fetch error:', msg);
      return mockFallback('openai_vision_error', Date.now() - t0);
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const isFormatError = res.status === 400 && errBody.toLowerCase().includes('unsupported image');
      const reason: VisionFallbackReason =
        isFormatError ? 'unsupported_image_format'
        : res.status === 401 ? 'openai_http_401'
        : res.status === 429 ? 'openai_http_429'
        : 'openai_http_error';
      console.error('[OpenAIAdapter] analyzeWardrobeImage HTTP error', { status: res.status, reason, body: errBody.slice(0, 200) });
      return mockFallback(reason, Date.now() - t0);
    }

    let parsed: unknown;
    try {
      const data = (await res.json()) as OpenAIResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      parsed = JSON.parse(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OpenAIAdapter] analyzeWardrobeImage parse error:', msg);
      return mockFallback('openai_parse_error', Date.now() - t0);
    }

    const latencyMs = Date.now() - t0;
    console.info('[OpenAIAdapter] analyzeWardrobeImage success', { model: MODEL, latencyMs });

    return validateVisionReport(parsed, {
      providerRequested: 'openai',
      provider: 'openai',
      model: MODEL,
      fallbackUsed: false,
    });
  }
}
