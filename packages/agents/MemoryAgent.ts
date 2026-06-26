import type { FeedbackEvent, AppState } from '@aura/types';

export interface StyleDNA {
  topCategories: string[];
  avgConfidence: number;
  mostWorn: string;
  preferredOccasion: string;
  totalFeedbackEvents: number;
}

export class MemoryAgent {
  deriveStyleDNA(state: Pick<AppState, 'wardrobe' | 'feedback'>): StyleDNA {
    const { wardrobe, feedback } = state;

    const categoryCounts: Record<string, number> = {};
    wardrobe.forEach(i => { categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1; });
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    const avgConfidence = wardrobe.length
      ? Math.round(wardrobe.reduce((s, i) => s + (i.confidence || 75), 0) / wardrobe.length)
      : 0;

    const mostWorn = wardrobe.length
      ? [...wardrobe].sort((a, b) => (b.wears || 0) - (a.wears || 0))[0].name
      : 'None';

    const preferredOccasion = wardrobe.length
      ? Object.entries(
          wardrobe.reduce<Record<string, number>>((acc, i) => {
            acc[i.occasion] = (acc[i.occasion] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0][0]
      : 'Business';

    return { topCategories, avgConfidence, mostWorn, preferredOccasion, totalFeedbackEvents: feedback.length };
  }

  recordFeedback(events: FeedbackEvent[]): void {
    // TODO v0.3: persist feedback to Supabase and use to refine recommendations
    console.info('[MemoryAgent] feedback recorded:', events.length, 'events');
  }
}

export const memoryAgent = new MemoryAgent();
