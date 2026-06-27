import type { InspirationReport, OutfitReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput, OutfitInput } from '../index';
import { validateReport, validateOutfitReport } from '../validate';
import { MockAIAdapter } from './mock';

const MODEL = 'gpt-4o';

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
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

Return ONLY valid JSON, no markdown:
{"compatibilityScore":<int>,"styleMatchScore":<int>,"wardrobeImpactScore":<int>,"budgetFitScore":<int>,"duplicateRisk":<int>,"confidence":<int>,"decision":"<BUY|WAIT|SKIP>","reasoningSummary":"<string>","whyItWorks":"<string>","risks":["<string>"],"suggestedOutfits":["<string>"],"betterAlternatives":["<string>"],"missingWardrobeOpportunities":["<string>"]}`;
}

function buildOutfitPrompt(items: WardrobeItem[], user: UserProfile): string {
  const itemList = items
    .map(i => `- ${i.name} (${i.category}, ${i.color}, ${i.style}, ${i.season}, ${i.occasion})`)
    .join('\n');
  return `You are AURA, an AI personal style operating system. Analyze this outfit combination.

OUTFIT ITEMS:
${itemList}

USER CONTEXT:
- Style goal: "${user.styleGoal}"
- City: ${user.city}
- Temperature: ${user.temperature}°C
- Occasion: "${user.occasion}"

Score all dimensions as integers 0-100:
- compatibilityScore: overall outfit cohesion and visual harmony
- occasionFitScore: how well this outfit suits "${user.occasion}"
- weatherFitScore: appropriateness for ${user.temperature}°C in ${user.city}
- styleMatchScore: alignment with "${user.styleGoal}" aesthetic
- colorHarmonyScore: how well the colors work together
- confidence: your confidence in this analysis

Rules:
- Never score any dimension at 100 unless evidence is overwhelming
- compatibilityScore = round(occasionFitScore*0.30 + weatherFitScore*0.20 + styleMatchScore*0.30 + colorHarmonyScore*0.20)

Provide:
- reasoningSummary: one sentence overall verdict
- whyItWorks: specific explanation of why these pieces work together (or don't)
- risks: array of 1-2 specific issues (empty array if none)
- missingItems: array of 1-2 items that would complete the outfit
- alternatives: array of 1-2 specific alternative pieces to consider swapping in

Return ONLY valid JSON, no markdown:
{"compatibilityScore":<int>,"occasionFitScore":<int>,"weatherFitScore":<int>,"styleMatchScore":<int>,"colorHarmonyScore":<int>,"confidence":<int>,"reasoningSummary":"<string>","whyItWorks":"<string>","risks":["<string>"],"missingItems":["<string>"],"alternatives":["<string>"]}`;
}

export class OpenAIAdapter implements AIAdapter {
  async analyzeInspiration(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    const t0 = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[OpenAIAdapter] OPENAI_API_KEY not set — using mock');
      const report = await new MockAIAdapter().analyzeInspiration(item, context);
      return { ...report, _meta: { ...report._meta!, provider: 'openai', fallbackUsed: true } };
    }

    const { user, wardrobe } = context;
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
          messages: [{ role: 'user', content: buildInspirationPrompt(item, user, wardrobe, duplicateCount) }],
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

    const { items, user } = input;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: buildOutfitPrompt(items, user) }],
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
}
