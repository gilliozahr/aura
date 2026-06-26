import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';

export interface InspirationInput {
  name: string;
  category: string;
  color: string;
  style: string;
  price: number;
}

export interface AIAdapter {
  analyzeInspiration(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport>;
}

export { MockAIAdapter } from './adapters/mock';
export { OpenAIAdapter } from './adapters/openai';
export { AnthropicAdapter } from './adapters/anthropic';
export { GeminiAdapter } from './adapters/gemini';

import { MockAIAdapter } from './adapters/mock';
import { OpenAIAdapter } from './adapters/openai';
import { AnthropicAdapter } from './adapters/anthropic';
import { GeminiAdapter } from './adapters/gemini';

export function createAIAdapter(): AIAdapter {
  const provider =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_AI_PROVIDER : undefined;
  if (provider === 'openai') return new OpenAIAdapter();
  if (provider === 'anthropic') return new AnthropicAdapter();
  if (provider === 'gemini') return new GeminiAdapter();
  return new MockAIAdapter();
}
