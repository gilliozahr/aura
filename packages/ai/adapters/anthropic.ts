import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput } from '../index';

export class AnthropicAdapter implements AIAdapter {
  async analyzeInspiration(
    _item: InspirationInput,
    _context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    throw new Error(
      'AnthropicAdapter: not yet implemented. Add ANTHROPIC_API_KEY and wire /api/ai route in v0.3.'
    );
  }
}
