import type { InspirationReport, OutfitReport, WardrobeItem, UserProfile, WardrobeAIMetadata } from '@aura/types';
import type { AIAdapter, InspirationContext, InspirationInput, OutfitInput, VisionInput } from '../index';

export class GeminiAdapter implements AIAdapter {
  async analyzeInspiration(
    _item: InspirationInput,
    _context: InspirationContext
  ): Promise<InspirationReport> {
    throw new Error(
      'GeminiAdapter: not yet implemented. Add GEMINI_API_KEY and wire /api/ai route in v0.3.'
    );
  }

  async analyzeOutfit(_input: OutfitInput): Promise<OutfitReport> {
    throw new Error('GeminiAdapter: analyzeOutfit not yet implemented.');
  }

  async analyzeWardrobeImage(_input: VisionInput): Promise<WardrobeAIMetadata> {
    throw new Error('GeminiAdapter: analyzeWardrobeImage not yet implemented.');
  }
}
