import type { InspirationReport, OutfitReport, WardrobeItem, UserProfile, WeatherContext } from '@aura/types';
import type { AIAdapter, InspirationInput, OutfitInput } from '../index';
import { validateReport, validateOutfitReport } from '../validate';
import { MockAIAdapter } from './mock';

const MODEL = 'claude-sonnet-4-6';

interface AnthropicMessage {
  content: Array<{ type: string; text: string }>;
}

function buildInspirationPrompt(
  item: InspirationInput,
  user: UserProfile,
  wardrobe: WardrobeItem[],
  duplicateCount: number
): string {
  return `You are AURA, an AI personal style operating system. Analyze whether the user should buy this item.

ITEM: "${item.name}" | Category: ${item.category} | Color: ${item.color} | Style: ${item.style} | Price: $${item.price}
USER: Style goal: "${user.styleGoal}" | Budget: $${user.budget}/month | City: ${user.city} | Occasion: "${user.occasion}"
WARDROBE: ${wardrobe.length} total items | ${duplicateCount} item(s) with same category and color already owned

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

Respond with ONLY valid JSON, no markdown, no explanation:
{"compatibilityScore":<int>,"styleMatchScore":<int>,"wardrobeImpactScore":<int>,"budgetFitScore":<int>,"duplicateRisk":<int>,"confidence":<int>,"decision":"<BUY|WAIT|SKIP>","reasoningSummary":"<string>","whyItWorks":"<string>","risks":["<string>"],"suggestedOutfits":["<string>"],"betterAlternatives":["<string>"],"missingWardrobeOpportunities":["<string>"]}`;
}

function buildOutfitPrompt(items: WardrobeItem[], user: UserProfile, weather?: WeatherContext): string {
  const itemList = items
    .map(i => `- ${i.name} (${i.category}, ${i.color}, ${i.style}, ${i.season}, ${i.occasion})`)
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

  return `You are AURA, an AI personal style operating system. Analyze this outfit combination.

OUTFIT ITEMS:
${itemList}

USER CONTEXT:
- Style goal: "${user.styleGoal}"
- Occasion: "${user.occasion}"
${weatherLine}

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

Respond with ONLY valid JSON, no markdown, no explanation:
{"compatibilityScore":<int>,"occasionFitScore":<int>,"weatherFitScore":<int>,"styleMatchScore":<int>,"colorHarmonyScore":<int>,"confidence":<int>,"reasoningSummary":"<string>","whyItWorks":"<string>","risks":["<string>"],"missingItems":["<string>"],"alternatives":["<string>"]}`;
}

export class AnthropicAdapter implements AIAdapter {
  async analyzeInspiration(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    const t0 = Date.now();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.warn('[AnthropicAdapter] ANTHROPIC_API_KEY not set — using mock');
      const report = await new MockAIAdapter().analyzeInspiration(item, context);
      return { ...report, _meta: { ...report._meta!, provider: 'anthropic', fallbackUsed: true } };
    }

    const { user, wardrobe } = context;
    const duplicateCount = wardrobe.filter(
      w => w.category === item.category && w.color.toLowerCase() === item.color.toLowerCase()
    ).length;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          temperature: 0.3,
          messages: [{ role: 'user', content: buildInspirationPrompt(item, user, wardrobe, duplicateCount) }],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Anthropic HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = (await res.json()) as AnthropicMessage;
      const text = data.content?.[0]?.text ?? '';
      const parsed: unknown = JSON.parse(text);
      const report = validateReport(parsed);
      const latencyMs = Date.now() - t0;

      console.info('[AnthropicAdapter] analyzeInspiration success', { model: MODEL, latencyMs, decision: report.decision });

      return {
        ...report,
        _meta: { provider: 'anthropic', mode: 'real', model: MODEL, latencyMs, fallbackUsed: false },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AnthropicAdapter] analyzeInspiration error — falling back to mock:', msg);
      const report = await new MockAIAdapter().analyzeInspiration(item, context);
      return {
        ...report,
        _meta: {
          provider: 'anthropic',
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
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.warn('[AnthropicAdapter] ANTHROPIC_API_KEY not set — using mock for analyzeOutfit');
      const report = await new MockAIAdapter().analyzeOutfit(input);
      return { ...report, _meta: { ...report._meta!, provider: 'anthropic', fallbackUsed: true } };
    }

    const { items, user, weather } = input;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 512,
          temperature: 0.3,
          messages: [{ role: 'user', content: buildOutfitPrompt(items, user, weather) }],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Anthropic HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = (await res.json()) as AnthropicMessage;
      const text = data.content?.[0]?.text ?? '';
      const parsed: unknown = JSON.parse(text);
      const report = validateOutfitReport(parsed);
      const latencyMs = Date.now() - t0;

      console.info('[AnthropicAdapter] analyzeOutfit success', { model: MODEL, latencyMs, score: report.compatibilityScore });

      return {
        ...report,
        outfitItems: items.map(i => i.id),
        _meta: { provider: 'anthropic', mode: 'real', model: MODEL, latencyMs, fallbackUsed: false },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AnthropicAdapter] analyzeOutfit error — falling back to mock:', msg);
      const report = await new MockAIAdapter().analyzeOutfit(input);
      return {
        ...report,
        _meta: {
          provider: 'anthropic',
          mode: 'mock',
          model: MODEL,
          latencyMs: Date.now() - t0,
          fallbackUsed: true,
        },
      };
    }
  }
}
