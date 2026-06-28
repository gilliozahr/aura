import type { InspirationReport, OutfitReport, WardrobeItem, UserProfile, WardrobeAIMetadata, VisionFallbackReason } from '@aura/types';
import type { AIAdapter, InspirationInput, OutfitInput, VisionInput } from '../index';

const NEUTRALS = new Set([
  'black', 'white', 'beige', 'grey', 'gray', 'navy', 'camel', 'cream',
  'ivory', 'brown', 'tan', 'steel', 'charcoal', 'ecru', 'taupe', 'khaki',
]);

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

  async analyzeOutfit(input: OutfitInput): Promise<OutfitReport> {
    const t0 = Date.now();
    const { items, user, weather } = input;

    if (items.length === 0) {
      return {
        outfitItems: [],
        compatibilityScore: 0,
        occasionFitScore: 0,
        weatherFitScore: 0,
        styleMatchScore: 0,
        colorHarmonyScore: 0,
        confidence: 0,
        reasoningSummary: 'No items to analyze.',
        whyItWorks: '',
        risks: [],
        missingItems: ['Add clothes to your wardrobe to receive outfit recommendations.'],
        alternatives: [],
        _meta: { provider: 'mock', mode: 'mock', model: 'mock', latencyMs: 0, fallbackUsed: false },
      };
    }

    const occasionKeyword = (user.occasion || '').toLowerCase().split(' ')[0];
    const occasionMatches = items.filter(i =>
      (i.occasion || '').toLowerCase().includes(occasionKeyword)
    ).length;
    const occasionFitScore = Math.min(95, Math.round(50 + (occasionMatches / items.length) * 45));

    // Use real weather if available, otherwise fall back to profile temperature
    const temp = weather?.available ? weather.temperatureC : user.temperature;
    const weatherAvailable = weather?.available ?? false;
    const isRainy = weatherAvailable && /rain|drizzle|storm/i.test(weather?.condition ?? '');
    const weatherMatches = items.filter(i => {
      if (i.season === 'All') return true;
      if (temp >= 28 && i.season === 'Summer') return true;
      if (temp < 20 && i.season === 'Winter') return true;
      if (temp >= 20 && temp < 28 && ['Spring', 'Autumn', 'Fall'].includes(i.season)) return true;
      return false;
    }).length;
    const rawWeatherScore = Math.round(50 + (weatherMatches / items.length) * 45);
    // Rain penalty: suede/leather shoes score lower
    const suedePenalty = isRainy && items.some(i =>
      /suede|leather/i.test(i.name) && i.category === 'Shoes'
    ) ? 10 : 0;
    const weatherFitScore = weatherAvailable
      ? Math.min(95, rawWeatherScore - suedePenalty)
      : 55; // neutral when data unavailable

    const goalWord = (user.styleGoal || '').toLowerCase().split(' ')[0];
    const styleMatches = items.filter(i =>
      (i.style || '').toLowerCase().includes(goalWord)
    ).length;
    const styleMatchScore = Math.min(95, Math.round(55 + (styleMatches / items.length) * 40));

    const neutralCount = items.filter(i => NEUTRALS.has((i.color || '').toLowerCase())).length;
    const colorHarmonyScore = Math.min(95, Math.round(50 + (neutralCount / items.length) * 45));

    const compatibilityScore = Math.min(
      95,
      Math.round(
        occasionFitScore * 0.30 +
          weatherFitScore * 0.20 +
          styleMatchScore * 0.30 +
          colorHarmonyScore * 0.20
      )
    );

    const hasAccessory = items.some(i =>
      ['Watch', 'Fragrance', 'Accessory'].includes(i.category)
    );

    return {
      outfitItems: items.map(i => i.id),
      compatibilityScore,
      occasionFitScore,
      weatherFitScore,
      styleMatchScore,
      colorHarmonyScore,
      confidence: 72,
      reasoningSummary: `A ${compatibilityScore >= 80 ? 'strong' : 'solid'} ${user.styleGoal} look for ${user.occasion}.`,
      whyItWorks: `The pieces work together through ${colorHarmonyScore >= 75 ? 'cohesive neutral tones' : 'shared aesthetic'} suited for ${user.occasion}.`,
      risks: occasionFitScore < 70 ? [`Some pieces may not be optimal for ${user.occasion}`] : [],
      missingItems: hasAccessory ? [] : ['A watch or accessory would elevate this outfit'],
      alternatives: [],
      _meta: {
        provider: 'mock',
        mode: 'mock',
        model: 'mock',
        latencyMs: Date.now() - t0,
        fallbackUsed: false,
      },
    };
  }

  /** Returns the mock base object synchronously — used by real adapters' fallback paths. */
  analyzeWardrobeImageSync(
    fallbackReason?: VisionFallbackReason,
    providerRequested = 'mock'
  ): WardrobeAIMetadata {
    return {
      detectedCategory: 'Top',
      detectedColor: 'Navy',
      detectedStyle: 'Smart Casual',
      detectedSeason: 'All',
      detectedOccasion: 'Smart Casual',
      confidence: 50,
      tags: ['mock', 'unanalyzed'],
      analysisNote: fallbackReason
        ? `Vision analysis unavailable (${fallbackReason}). Fields are suggestions only.`
        : 'Mock vision analysis — connect a real AI provider for accurate results.',
      providerRequested,
      provider: 'mock',
      model: 'mock',
      fallbackUsed: fallbackReason !== undefined,
      fallbackReason,
      analyzedAt: new Date().toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyzeWardrobeImage(_input: VisionInput): Promise<WardrobeAIMetadata> {
    return this.analyzeWardrobeImageSync();
  }
}
