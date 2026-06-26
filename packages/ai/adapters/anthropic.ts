import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput } from '../index';
import { MockAIAdapter } from './mock';

interface AnthropicMessage {
  content: Array<{ type: string; text: string }>;
}

export class AnthropicAdapter implements AIAdapter {
  async analyzeInspiration(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('[AnthropicAdapter] ANTHROPIC_API_KEY not set — falling back to mock');
      return new MockAIAdapter().analyzeInspiration(item, context);
    }

    const { user, wardrobe } = context;
    const duplicateCount = wardrobe.filter(
      w =>
        w.category === item.category &&
        w.color.toLowerCase() === item.color.toLowerCase()
    ).length;

    const prompt = `You are AURA, an AI personal style operating system. Analyze whether a user should buy this item.

Item: "${item.name}" | Category: ${item.category} | Color: ${item.color} | Style: ${item.style} | Price: $${item.price}
User: Style goal "${user.styleGoal}" | Budget $${user.budget}/month | City: ${user.city} | Occasion: "${user.occasion}"
Wardrobe: ${wardrobe.length} items total | ${duplicateCount} similar item(s) already owned (same category + color)

Score each dimension 0-100, then compute:
  score = round(styleMatch*0.35 + wardrobeImpact*0.35 + budgetFit*0.20 + duplicateScore*0.10)
  where duplicateScore = ${duplicateCount > 0 ? 50 : 85}
  decision = BUY if score>=82, WAIT if score>=62, else SKIP

Respond with ONLY valid JSON, no markdown:
{"styleMatch":<int>,"wardrobeImpact":<int>,"budgetFit":<int>,"duplicateCount":${duplicateCount},"score":<int>,"decision":"<BUY|WAIT|SKIP>"}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);

      const data = (await res.json()) as AnthropicMessage;
      const text = data.content?.[0]?.text ?? '';
      const report = JSON.parse(text) as InspirationReport;

      if (typeof report.score !== 'number') throw new Error('Malformed response');
      return report;
    } catch (err) {
      console.error('[AnthropicAdapter] falling back to mock:', err);
      return new MockAIAdapter().analyzeInspiration(item, context);
    }
  }
}
