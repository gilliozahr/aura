import type { InspirationReport, WardrobeItem, UserProfile } from '@aura/types';
import type { AIAdapter, InspirationInput } from '../index';

export class MockAIAdapter implements AIAdapter {
  async analyzeInspiration(
    item: InspirationInput,
    context: { wardrobe: WardrobeItem[]; user: UserProfile }
  ): Promise<InspirationReport> {
    const t0 = Date.now();
    const { wardrobe, user } = context;

    const duplicateCount = wardrobe.filter(
      w =>
        w.category === item.category &&
        (w.color || '').toLowerCase() === (item.color || '').toLowerCase()
    ).length;

    const goalWord = (user.styleGoal || '').toLowerCase().split(' ')[0];
    const styleMatchScore = (item.style || '').toLowerCase().includes(goalWord) ? 88 : 70;
    const wardrobeImpactScore = Math.max(20, 88 - duplicateCount * 22);
    const budgetFitScore = item.price <= (user.budget || 1000) ? 90 : 45;
    const duplicateRisk = Math.min(100, duplicateCount * 35);
    const compatibilityScore = Math.round(
      styleMatchScore * 0.35 +
        wardrobeImpactScore * 0.35 +
        budgetFitScore * 0.2 +
        (100 - duplicateRisk) * 0.1
    );
    const decision: InspirationReport['decision'] =
      compatibilityScore >= 82 ? 'BUY' : compatibilityScore >= 62 ? 'WAIT' : 'SKIP';
    const confidence = 72;

    const reasoningSummary =
      decision === 'BUY'
        ? `A strong match for your ${user.styleGoal} aesthetic within budget.`
        : decision === 'WAIT'
        ? `Decent fit, but ${duplicateCount > 0 ? 'you already own something similar' : 'consider alternatives first'}.`
        : 'Too much overlap with your existing wardrobe — low added value.';

    const whyItWorks =
      decision === 'BUY'
        ? `The ${item.color} ${item.category} pairs well with your existing pieces.`
        : `The ${item.style} style is ${styleMatchScore >= 75 ? 'compatible' : 'somewhat misaligned'} with your ${user.styleGoal} goal.`;

    const risks: string[] =
      duplicateCount > 0
        ? [`You already own ${duplicateCount} similar ${item.category.toLowerCase()}`]
        : item.price > (user.budget || 1000)
        ? [`Price ($${item.price}) exceeds your monthly budget ($${user.budget})`]
        : [];

    const suggestedOutfits = [
      `${item.name} with tailored trousers and leather loafers`,
      `${item.name} layered over a crisp white shirt`,
    ];

    const betterAlternatives =
      decision !== 'BUY'
        ? [`A more versatile ${item.color} ${item.category} in a different cut`]
        : [];

    const missingWardrobeOpportunities = [
      `A complementary ${item.color === 'Black' ? 'white' : 'black'} ${item.category === 'Top' ? 'bottom' : 'top'} would complete this look`,
    ];

    return {
      compatibilityScore,
      styleMatchScore,
      wardrobeImpactScore,
      budgetFitScore,
      duplicateRisk,
      confidence,
      decision,
      reasoningSummary,
      whyItWorks,
      risks,
      suggestedOutfits,
      betterAlternatives,
      missingWardrobeOpportunities,
      _meta: {
        provider: 'mock',
        mode: 'mock',
        model: 'mock',
        latencyMs: Date.now() - t0,
        fallbackUsed: false,
      },
    };
  }
}
