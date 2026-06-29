import type {
  ShoppingProduct,
  ShoppingRecommendation,
  ShoppingDecision,
  StyleDNAProfile,
  UserSizeProfile,
  WardrobeItem,
  TripPlan,
  OccasionEvent,
  SavedOutfit,
} from '@/lib/types';
import { uid } from '@/lib/utils';

// Complementary category map: given product category → useful wardrobe categories
const COMPLEMENT_MAP: Record<string, string[]> = {
  Top: ['Bottom', 'Shoes', 'Outerwear'],
  Bottom: ['Top', 'Shoes', 'Outerwear'],
  Shoes: ['Top', 'Bottom', 'Outerwear'],
  Outerwear: ['Top', 'Bottom', 'Shoes'],
  Dress: ['Shoes', 'Bag', 'Accessory'],
  Bag: ['Top', 'Bottom', 'Shoes'],
  Accessory: ['Top', 'Bottom', 'Shoes'],
  Watch: ['Top', 'Bottom', 'Shoes'],
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function computeWardrobeMatchScore(product: ShoppingProduct, wardrobe: WardrobeItem[]): { score: number; matches: string[] } {
  if (wardrobe.length === 0) return { score: 20, matches: [] };
  const cat = product.category ?? '';
  const complements = COMPLEMENT_MAP[cat] ?? Object.keys(COMPLEMENT_MAP);
  const matchingItems = wardrobe.filter(w => complements.includes(w.category));
  const matches = matchingItems.slice(0, 4).map(w => w.name);
  const score = clamp(Math.min(matchingItems.length * 18, 90) + (matchingItems.length > 3 ? 10 : 0));
  return { score, matches };
}

function computeStyleDNAFitScore(product: ShoppingProduct, styleDNA: StyleDNAProfile | undefined): number {
  if (!styleDNA || styleDNA.confidenceScore < 10) return 55;

  let score = 55;
  const productColor = (product.color ?? '').toLowerCase();
  const productStyle = (product.category ?? '').toLowerCase();

  // Preferred colors
  const prefColors = styleDNA.preferredColors.map(e => e.value.toLowerCase());
  const avoidColors = styleDNA.avoidedColors.map(e => e.value.toLowerCase());
  const prefStyles = styleDNA.preferredStyleTags.map(e => e.value.toLowerCase());
  const avoidStyles = styleDNA.avoidedStyleTags.map(e => e.value.toLowerCase());

  if (productColor && prefColors.some(c => productColor.includes(c) || c.includes(productColor))) score += 20;
  if (productColor && avoidColors.some(c => productColor.includes(c) || c.includes(productColor))) score -= 25;
  if (productStyle && prefStyles.some(s => productStyle.includes(s) || s.includes(productStyle))) score += 15;
  if (productStyle && avoidStyles.some(s => productStyle.includes(s) || s.includes(productStyle))) score -= 20;

  return clamp(score);
}

function computeSizeFitScore(product: ShoppingProduct, sizeProfile: UserSizeProfile | undefined): { score: number; notes: string } {
  if (!sizeProfile) {
    return { score: 50, notes: 'Add your size profile in Settings for personalised fit recommendations.' };
  }

  const unit = sizeProfile.measurementUnit ?? 'cm';
  const unitLabel = unit === 'in' ? 'inches' : 'centimeters';
  const unitSuffix = ` (using your measurements in ${unitLabel})`;

  const sizes = product.availableSizes;
  if (sizes.length === 0) {
    return { score: 45, notes: `Size information unavailable for this product. Verify fit before purchasing.${unitSuffix}` };
  }

  const cat = (product.category ?? '').toLowerCase();
  let userSize: string | undefined;

  if (cat.includes('shoe') || cat.includes('footwear')) {
    userSize = sizeProfile.shoeSizeEU?.toString() ?? sizeProfile.shoeSizeUK?.toString();
  } else if (cat === 'bottom') {
    userSize = sizeProfile.bottomSize;
  } else if (cat === 'top' || cat === 'outerwear') {
    userSize = sizeProfile.topSize ?? sizeProfile.blazerSize;
  } else {
    userSize = sizeProfile.topSize;
  }

  if (!userSize) {
    return { score: 50, notes: `Complete your size profile in Settings for better fit confidence.${unitSuffix}` };
  }

  const normalised = userSize.toUpperCase();
  const found = sizes.some(s => s.toUpperCase().includes(normalised) || normalised.includes(s.toUpperCase()));
  if (found) {
    return { score: 88, notes: `Your size (${userSize}) appears to be available.${unitSuffix}` };
  }

  return { score: 25, notes: `Your size (${userSize}) was not found in the available sizes: ${sizes.join(', ')}.${unitSuffix}` };
}

function computeDuplicateRiskScore(product: ShoppingProduct, wardrobe: WardrobeItem[]): number {
  const cat = (product.category ?? '').toLowerCase();
  const color = (product.color ?? '').toLowerCase();

  const sameCategory = wardrobe.filter(w => w.category.toLowerCase() === cat);
  if (sameCategory.length === 0) return 5;

  const sameColorAndCat = sameCategory.filter(w => {
    const wColor = w.color.toLowerCase();
    return color && (wColor.includes(color) || color.includes(wColor));
  });

  if (sameColorAndCat.length > 0) return clamp(70 + sameColorAndCat.length * 10);
  if (sameCategory.length >= 3) return 55;
  if (sameCategory.length === 2) return 35;
  return 15;
}

function computeOccasionUsefulnessScore(product: ShoppingProduct, events: OccasionEvent[]): number {
  if (events.length === 0) return 40;

  const today = new Date();
  const cutoff = new Date(today.getTime() + 60 * 86_400_000);
  const upcoming = events.filter(e => {
    const d = new Date(e.date);
    return d >= today && d <= cutoff;
  });

  if (upcoming.length === 0) return 35;

  const productOccasion = (product.category ?? '').toLowerCase();
  let matches = 0;
  for (const event of upcoming) {
    const formality = event.formality.toLowerCase();
    if (
      formality.includes('business') && (productOccasion.includes('business') || productOccasion.includes('formal')) ||
      formality.includes('casual') && productOccasion.includes('casual') ||
      formality.includes('smart') ||
      true // any upcoming event is somewhat relevant
    ) {
      matches++;
    }
  }

  return clamp(40 + matches * 12);
}

function computeTripUsefulnessScore(product: ShoppingProduct, trips: TripPlan[]): number {
  if (trips.length === 0) return 35;

  const today = new Date();
  const cutoff = new Date(today.getTime() + 90 * 86_400_000);
  const upcoming = trips.filter(t => new Date(t.startDate) <= cutoff && new Date(t.endDate) >= today);

  if (upcoming.length === 0) return 30;

  const cat = (product.category ?? '').toLowerCase();
  let relevance = 40;

  for (const trip of upcoming) {
    // Check if product category is in missing items
    const inMissing = trip.missingItems.some(m => m.category.toLowerCase().includes(cat));
    if (inMissing) { relevance += 25; break; }

    // Check if category is generally travel-useful
    if (['top', 'bottom', 'shoes', 'outerwear'].includes(cat)) relevance += 10;
  }

  return clamp(relevance);
}

function computeGapMatch(product: ShoppingProduct, styleDNA: StyleDNAProfile | undefined): { gap?: string; relevant: boolean } {
  if (!styleDNA) return { relevant: false };
  const cat = (product.category ?? '').toLowerCase();
  for (const gap of styleDNA.wardrobeGaps) {
    if (gap.toLowerCase().includes(cat) || cat.includes(gap.toLowerCase())) {
      return { gap, relevant: true };
    }
  }
  return { relevant: false };
}

function buildOutfitIdeas(product: ShoppingProduct, wardrobe: WardrobeItem[]): string[] {
  const cat = product.category ?? '';
  const complements = COMPLEMENT_MAP[cat] ?? [];
  const ideas: string[] = [];

  const byCategory: Record<string, WardrobeItem[]> = {};
  for (const item of wardrobe) {
    if (complements.includes(item.category)) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }
  }

  const topItem = byCategory['Top']?.[0];
  const bottomItem = byCategory['Bottom']?.[0];
  const shoeItem = byCategory['Shoes']?.[0];

  const title = product.title ?? `New ${cat}`;

  if (cat === 'Top' && bottomItem && shoeItem) {
    ideas.push(`${title} + ${bottomItem.name} + ${shoeItem.name}`);
  } else if (cat === 'Bottom' && topItem && shoeItem) {
    ideas.push(`${topItem.name} + ${title} + ${shoeItem.name}`);
  } else if (cat === 'Shoes' && topItem && bottomItem) {
    ideas.push(`${topItem.name} + ${bottomItem.name} + ${title}`);
  } else if (cat === 'Outerwear' && topItem && bottomItem) {
    ideas.push(`${title} over ${topItem.name} + ${bottomItem.name}`);
  }

  return ideas.slice(0, 3);
}

export interface ShoppingAnalysisInput {
  product: ShoppingProduct;
  wardrobe: WardrobeItem[];
  styleDNA?: StyleDNAProfile;
  sizeProfile?: UserSizeProfile;
  tripPlans: TripPlan[];
  occasionEvents: OccasionEvent[];
  savedOutfits: SavedOutfit[];
}

export function analyzeShoppingProduct(input: ShoppingAnalysisInput): ShoppingRecommendation {
  const { product, wardrobe, styleDNA, sizeProfile, tripPlans, occasionEvents } = input;

  const { score: wardrobeMatchScore, matches: wardrobeMatches } = computeWardrobeMatchScore(product, wardrobe);
  const styleDNAFitScore = computeStyleDNAFitScore(product, styleDNA);
  const { score: sizeFitScore, notes: sizeNotes } = computeSizeFitScore(product, sizeProfile);
  const duplicateRiskScore = computeDuplicateRiskScore(product, wardrobe);
  const occasionUsefulnessScore = computeOccasionUsefulnessScore(product, occasionEvents);
  const tripUsefulnessScore = computeTripUsefulnessScore(product, tripPlans);
  const gapMatch = computeGapMatch(product, styleDNA);
  const outfitIdeas = buildOutfitIdeas(product, wardrobe);

  // Composite score
  const composite =
    wardrobeMatchScore * 0.25 +
    styleDNAFitScore * 0.28 +
    sizeFitScore * 0.15 +
    occasionUsefulnessScore * 0.16 +
    tripUsefulnessScore * 0.16 -
    duplicateRiskScore * 0.28;

  // Decision
  let decision: ShoppingDecision;
  if (duplicateRiskScore >= 70 || styleDNAFitScore < 20) {
    decision = 'Skip';
  } else if (composite >= 55 && duplicateRiskScore < 55 && sizeFitScore >= 40) {
    decision = 'Buy';
  } else {
    decision = 'Wait';
  }

  // Confidence
  let confidenceScore = 65;
  if (styleDNA && styleDNA.confidenceScore > 20) confidenceScore += 10;
  if (sizeProfile) confidenceScore += 10;
  if (occasionEvents.length > 0) confidenceScore += 5;
  if (!sizeProfile) confidenceScore -= 10;
  if (!styleDNA) confidenceScore -= 10;
  confidenceScore = clamp(confidenceScore);

  // Risks
  const risks: string[] = [];
  if (duplicateRiskScore >= 55) risks.push('Similar items already in your wardrobe.');
  if (sizeFitScore < 40) risks.push('Size availability uncertain — verify before purchasing.');
  if (styleDNAFitScore < 30) risks.push('Limited alignment with your Style DNA.');
  if (!product.price) risks.push('Price not confirmed — check current listing.');

  // Reasoning
  const decisionWords = { Buy: 'recommended', Wait: 'worth considering', Skip: 'not recommended' };
  const reasoning =
    `This item is ${decisionWords[decision]} based on your wardrobe and style profile. ` +
    `Wardrobe compatibility is ${wardrobeMatchScore >= 70 ? 'strong' : wardrobeMatchScore >= 40 ? 'moderate' : 'limited'}, ` +
    `Style DNA alignment is ${styleDNAFitScore >= 70 ? 'high' : styleDNAFitScore >= 40 ? 'moderate' : 'low'}, ` +
    `and duplicate risk is ${duplicateRiskScore >= 60 ? 'high' : duplicateRiskScore >= 35 ? 'moderate' : 'low'}.` +
    (gapMatch.relevant ? ` This fills a wardrobe gap: ${gapMatch.gap}.` : '');

  // Alternatives
  const alternatives: string[] = [];
  if (decision === 'Skip' && duplicateRiskScore >= 70) {
    const existing = wardrobe.filter(w => w.category === product.category).slice(0, 2);
    for (const w of existing) alternatives.push(`You already own: ${w.name}`);
  }

  return {
    id: uid(),
    productId: product.id,
    decision,
    confidenceScore,
    wardrobeMatchScore,
    styleDNAFitScore,
    sizeFitScore,
    duplicateRiskScore,
    occasionUsefulnessScore,
    tripUsefulnessScore,
    reasoning,
    risks,
    sizeNotes,
    wardrobeMatches,
    outfitIdeas,
    missingGapMatch: gapMatch,
    alternatives,
    aiEnhanced: false,
    createdAt: new Date().toISOString(),
  };
}
