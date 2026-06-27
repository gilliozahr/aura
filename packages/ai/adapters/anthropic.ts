import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput } from '../index';
import { validateReport } from '../validate';
import { MockAIAdapter } from './mock';

const MODEL = 'claude-sonnet-4-6';

interface AnthropicMessage {
  content: Array<{ type: string; text: string }>;
}

function buildPrompt(
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
- confidence: your confidence in this analysis

Compute: compatibilityScore = round(styleMatchScore*0.35 + wardrobeImpactScore*0.35 + budgetFitScore*0.20 + (100-duplicateRisk)*0.10)
Decision: BUY if compatibilityScore>=82, WAIT if>=62, SKIP otherwise

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
          messages: [{ role: 'user', content: buildPrompt(item, user, wardrobe, duplicateCount) }],
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

      console.info('[AnthropicAdapter] success', { model: MODEL, latencyMs, decision: report.decision });

      return {
        ...report,
        _meta: { provider: 'anthropic', mode: 'real', model: MODEL, latencyMs, fallbackUsed: false },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AnthropicAdapter] error — falling back to mock:', msg);
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
}
