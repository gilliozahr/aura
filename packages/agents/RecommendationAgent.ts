import type { WardrobeItem, UserProfile } from '@aura/types';

export interface OutfitRecommendation {
  items: WardrobeItem[];
  score: number;
  explanation: string;
}

export class RecommendationAgent {
  scoreItem(item: WardrobeItem, context: UserProfile): number {
    let score = 50;
    const occasion = (context.occasion || '').toLowerCase();
    const temp = context.temperature || 25;
    if ((item.occasion || '').toLowerCase().includes('business') && occasion.includes('business')) score += 18;
    if ((item.occasion || '').toLowerCase().includes('casual') && occasion.includes('casual')) score += 12;
    const goalWord = (context.styleGoal || '').toLowerCase().split(' ')[0];
    if ((item.style || '').toLowerCase().includes(goalWord)) score += 14;
    if (temp >= 30 && ['Summer', 'All'].includes(item.season)) score += 8;
    if (temp < 22 && ['Winter', 'All'].includes(item.season)) score += 8;
    score += Math.min((item.confidence || 75) / 10, 10);
    score -= Math.min((item.wears || 0) / 20, 6);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  pickBestOutfit(wardrobe: WardrobeItem[], user: UserProfile): OutfitRecommendation {
    const pick = (category: string) =>
      [...wardrobe.filter(i => i.category === category)].sort(
        (a, b) => this.scoreItem(b, user) - this.scoreItem(a, user)
      )[0];

    const accessories = [...wardrobe.filter(i => ['Watch', 'Fragrance', 'Accessory'].includes(i.category))].sort(
      (a, b) => this.scoreItem(b, user) - this.scoreItem(a, user)
    )[0];

    const items = [pick('Top'), pick('Bottom'), pick('Shoes'), pick('Outerwear'), accessories].filter(
      (x): x is WardrobeItem => Boolean(x)
    );

    const score = items.length
      ? Math.round(items.reduce((s, i) => s + this.scoreItem(i, user), 0) / items.length)
      : 0;

    const explanation = items.length
      ? `AURA selected this combination because it best matches your ${user.styleGoal} goal, today's ${user.occasion}, and your confidence history.`
      : 'Add clothes to receive recommendations.';

    return { items, score, explanation };
  }
}

export const recommendationAgent = new RecommendationAgent();
