import type { InspirationReport, OutfitReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput, OutfitInput } from '../index';

export class GeminiAdapter implements AIAdapter {
  async analyzeInspiration(
    _item: InspirationInput,
    _context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    throw new Error(
      'GeminiAdapter: not yet implemented. Add GEMINI_API_KEY and wire /api/ai route in v0.3.'
    );
  }

  async analyzeOutfit(_input: OutfitInput): Promise<OutfitReport> {
    throw new Error('GeminiAdapter: analyzeOutfit not yet implemented.');
  }
}
