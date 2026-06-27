import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput } from '../index';
import { MockAIAdapter } from './mock';

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

export class OpenAIAdapter implements AIAdapter {
  async analyzeInspiration(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[OpenAIAdapter] OPENAI_API_KEY not set — falling back to mock');
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

Score each dimension 0-100, compute score = round(styleMatch*0.35 + wardrobeImpact*0.35 + budgetFit*0.20 + ${duplicateCount > 0 ? 50 : 85}*0.10), decision = BUY if >=82, WAIT if >=62, else SKIP.

Return ONLY valid JSON: {"styleMatch":<int>,"wardrobeImpact":<int>,"budgetFit":<int>,"duplicateCount":${duplicateCount},"score":<int>,"decision":"<BUY|WAIT|SKIP>"}`;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 256,
        }),
      });

      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);

      const data = (await res.json()) as OpenAIResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      const report = JSON.parse(text) as InspirationReport;

      if (typeof report.score !== 'number') throw new Error('Malformed response');
      return report;
    } catch (err) {
      console.error('[OpenAIAdapter] falling back to mock:', err);
      return new MockAIAdapter().analyzeInspiration(item, context);
    }
  }
}
