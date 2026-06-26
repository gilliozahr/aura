import { createAIAdapter } from '@aura/ai';
import type { InspirationInput } from '@aura/ai';
import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';

export class InspirationAgent {
  private adapter = createAIAdapter();

  async analyze(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    return this.adapter.analyzeInspiration(item, context);
  }
}

export const inspirationAgent = new InspirationAgent();
