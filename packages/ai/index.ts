import type { InspirationReport, OutfitReport, StyleDNASummary, WardrobeItem, UserProfile, WeatherContext, WardrobeAIMetadata } from '@aura/types';

export interface InspirationInput {
  name: string;
  category: string;
  color: string;
  style: string;
  price: number;
}

export interface OccasionContext {
  eventType: string;
  formality: string;
  date: string;
  city?: string;
  country?: string;
  notes?: string;
}

export interface OutfitInput {
  items: WardrobeItem[];
  user: UserProfile;
  wardrobe: WardrobeItem[];
  weather?: WeatherContext;
  styleDNA?: StyleDNASummary;
  occasionContext?: OccasionContext;
}

export interface InspirationContext {
  wardrobe: WardrobeItem[];
  user: UserProfile;
  styleDNA?: StyleDNASummary;
}

export interface VisionInput {
  /**
   * Either a base64 data URL (data:image/jpeg;base64,...) or a public HTTPS URL
   * such as a Supabase Storage public URL. The adapters handle both forms.
   */
  imageDataUrl: string;
  /** hint from the user, e.g. "Navy blazer" */
  nameHint?: string;
}

export interface AIAdapter {
  analyzeInspiration(
    item: InspirationInput,
    context: InspirationContext
  ): Promise<InspirationReport>;
  analyzeOutfit(input: OutfitInput): Promise<OutfitReport>;
  analyzeWardrobeImage(input: VisionInput): Promise<WardrobeAIMetadata>;
}

export { validateReport, validateOutfitReport, validateVisionReport } from './validate';
export type { VisionReportOptions } from './validate';
export { MockAIAdapter } from './adapters/mock';
export { OpenAIAdapter } from './adapters/openai';
export { AnthropicAdapter } from './adapters/anthropic';
export { GeminiAdapter } from './adapters/gemini';

import { MockAIAdapter } from './adapters/mock';
import { OpenAIAdapter } from './adapters/openai';
import { AnthropicAdapter } from './adapters/anthropic';
import { GeminiAdapter } from './adapters/gemini';

/**
 * Returns the configured AI provider name.
 *
 * Checks in priority order:
 *  1. AI_PROVIDER  — server-only runtime env var (always available at request time)
 *  2. NEXT_PUBLIC_AI_PROVIDER — build-time var (baked into server bundle at build)
 *
 * Use AI_PROVIDER on Vercel/Railway so the value is readable even if it wasn't
 * set at build time. Set NEXT_PUBLIC_AI_PROVIDER if you also need it client-side.
 */
export function getAIProvider(): string {
  if (typeof process === 'undefined') return 'mock';
  return (
    process.env.AI_PROVIDER ||
    process.env.NEXT_PUBLIC_AI_PROVIDER ||
    'mock'
  );
}

export function createAIAdapter(): AIAdapter {
  const provider = getAIProvider();
  if (provider === 'openai') return new OpenAIAdapter();
  if (provider === 'anthropic') return new AnthropicAdapter();
  if (provider === 'gemini') return new GeminiAdapter();
  return new MockAIAdapter();
}
