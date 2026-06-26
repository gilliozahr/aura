import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput } from '../index';

export class MockAIAdapter implements AIAdapter {
  async analyzeInspiration(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    const { wardrobe, user } = context;

    const duplicateCount = wardrobe.filter(
      w =>
        w.category === item.category &&
        (w.color || '').toLowerCase() === (item.color || '').toLowerCase()
    ).length;

    const goalWord = (user.styleGoal || '').toLowerCase().split(' ')[0];
    const styleMatch = (item.style || '').toLowerCase().includes(goalWord) ? 92 : 72;
    const wardrobeImpact = Math.max(18, 85 - duplicateCount * 22);
    const budgetFit = item.price <= (user.budget || 1000) ? 90 : 48;
    const score = Math.round(
      styleMatch * 0.35 +
        wardrobeImpact * 0.35 +
        budgetFit * 0.2 +
        (duplicateCount ? 50 : 85) * 0.1
    );
    const decision: InspirationReport['decision'] =
      score >= 82 ? 'BUY' : score >= 62 ? 'WAIT' : 'SKIP';

    return { duplicateCount, styleMatch, wardrobeImpact, budgetFit, score, decision };
  }
}
