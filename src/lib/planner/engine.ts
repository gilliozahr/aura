import type {
  WardrobeItem,
  StyleDNAProfile,
  SavedOutfit,
  OccasionEvent,
  TripPlan,
  OutfitPlan,
  PlannerWeek,
  PlannerDay,
  PlannerRecommendation,
  PlannerDayWeather,
  OccasionFormality,
} from '@/lib/types';

export interface PlannerEngineInput {
  weekStart: string; // YYYY-MM-DD Monday
  wardrobe: WardrobeItem[];
  styleDNA?: StyleDNAProfile;
  savedOutfits: SavedOutfit[];
  existingPlans: OutfitPlan[];
  occasionEvents: OccasionEvent[];
  tripPlans: TripPlan[];
  weatherByDate?: Record<string, PlannerDayWeather>;
}

const FORMAL_CATEGORIES = ['formal', 'business', 'cocktail', 'black tie'];
const TOP_CATEGORIES = ['top', 'shirt', 'blouse', 'tshirt', 't-shirt', 'sweater', 'knitwear', 'jacket'];
const BOTTOM_CATEGORIES = ['bottom', 'trousers', 'pants', 'jeans', 'skirt', 'shorts', 'chinos'];
const SHOES_CATEGORIES = ['shoes', 'sneakers', 'boots', 'loafers', 'heels', 'sandals', 'footwear'];
const OUTER_CATEGORIES = ['outerwear', 'coat', 'jacket', 'blazer'];

function normalizeCategory(cat: string): string {
  return cat.toLowerCase().trim();
}

function isTop(item: WardrobeItem): boolean {
  const cat = normalizeCategory(item.category);
  return TOP_CATEGORIES.some(c => cat.includes(c));
}

function isBottom(item: WardrobeItem): boolean {
  const cat = normalizeCategory(item.category);
  return BOTTOM_CATEGORIES.some(c => cat.includes(c));
}

function isShoes(item: WardrobeItem): boolean {
  const cat = normalizeCategory(item.category);
  return SHOES_CATEGORIES.some(c => cat.includes(c));
}

function isOuterwear(item: WardrobeItem): boolean {
  const cat = normalizeCategory(item.category);
  return OUTER_CATEGORIES.some(c => cat.includes(c));
}

function isFormalItem(item: WardrobeItem): boolean {
  const occ = (item.occasion || '').toLowerCase();
  const style = (item.style || '').toLowerCase();
  return FORMAL_CATEGORIES.some(f => occ.includes(f) || style.includes(f));
}

function isFormalOccasion(formality: OccasionFormality): boolean {
  return ['Business', 'Cocktail', 'Formal', 'Black Tie'].includes(formality);
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateSuggestion(
  wardrobe: WardrobeItem[],
  occasionEvents: OccasionEvent[],
  weather: PlannerDayWeather | undefined,
  usedItemIds: Set<string>,
  styleDNA: StyleDNAProfile | undefined,
): PlannerRecommendation {
  if (wardrobe.length === 0) {
    return {
      outfitItems: [],
      score: 40,
      reason: 'No wardrobe items available.',
      warnings: ['Empty wardrobe'],
      missingCategories: ['top', 'bottom', 'shoes'],
      aiEnhanced: false,
    };
  }

  const isFormal = occasionEvents.some(e => isFormalOccasion(e.formality));
  const hasCriticalEvent = occasionEvents.some(e => e.importance === 'Critical' || e.importance === 'High');
  const dressCode = occasionEvents.find(e => e.dressCode)?.dressCode;
  const isBlackTie = dressCode === 'Black Tie' || dressCode === 'White Tie';
  const isCold = weather?.tempHigh !== undefined && weather.tempHigh < 10;

  const sortedWardrobe = [...wardrobe].sort((a, b) => {
    const aUsed = usedItemIds.has(a.id) ? -1000 : 0;
    const bUsed = usedItemIds.has(b.id) ? -1000 : 0;
    return (b.wears + bUsed) - (a.wears + aUsed);
  });

  const preferFormal = isFormal;

  function pickBest(candidates: WardrobeItem[], prefer: (i: WardrobeItem) => boolean): WardrobeItem | undefined {
    const preferred = candidates.filter(prefer).filter(i => !usedItemIds.has(i.id));
    if (preferred.length > 0) return preferred[0];
    const fallback = candidates.filter(i => !usedItemIds.has(i.id));
    if (fallback.length > 0) return fallback[0];
    return candidates[0];
  }

  const tops = sortedWardrobe.filter(isTop);
  const bottoms = sortedWardrobe.filter(isBottom);
  const shoes = sortedWardrobe.filter(isShoes);
  const outerwear = sortedWardrobe.filter(isOuterwear);

  const top = pickBest(tops, preferFormal ? isFormalItem : () => true);
  const bottom = pickBest(bottoms, preferFormal ? isFormalItem : () => true);
  const shoe = pickBest(shoes, preferFormal ? isFormalItem : () => true);

  const outfitItems: WardrobeItem[] = [];
  if (top) outfitItems.push(top);
  if (bottom) outfitItems.push(bottom);
  if (shoe) outfitItems.push(shoe);

  if (isCold && outerwear.length > 0) {
    const coat = outerwear.find(i => !usedItemIds.has(i.id)) ?? outerwear[0];
    if (coat && !outfitItems.find(i => i.id === coat.id)) {
      outfitItems.push(coat);
    }
  }

  let score = 40;
  const missing: string[] = [];
  const warnings: string[] = [];

  const hasTop = !!top;
  const hasBottom = !!bottom;
  const hasShoe = !!shoe;

  if (hasTop && hasBottom && hasShoe) score += 30;
  if (!hasTop) missing.push('top');
  if (!hasBottom) missing.push('bottom');
  if (!hasShoe) missing.push('shoes');

  if (isFormal && outfitItems.some(isFormalItem)) score += 20;
  if (isBlackTie && outfitItems.every(isFormalItem)) score += 10;
  if (hasCriticalEvent && outfitItems.some(isFormalItem)) score += 5;
  if (isCold && outfitItems.some(isOuterwear)) score += 15;

  if (styleDNA && styleDNA.preferredStyleTags.length > 0) {
    const tags = styleDNA.preferredStyleTags.map(e => e.value.toLowerCase());
    const matches = outfitItems.filter(i => tags.some(t => (i.style || '').toLowerCase().includes(t)));
    if (matches.length > 0) score += 10;
  }

  const repeatedItems = outfitItems.filter(i => usedItemIds.has(i.id));
  if (repeatedItems.length === 0) score += 15;
  else warnings.push(`Repeating ${repeatedItems.map(i => i.name).join(', ')} from yesterday`);

  score = Math.min(90, score);

  const occasionLabel = occasionEvents[0]?.title || (isFormal ? 'formal occasion' : 'daily wear');
  let reason = `Curated for ${occasionLabel}.`;
  if (isCold) reason += ' Warm layering included for cold weather.';
  if (isBlackTie) reason += ' Black tie dress code applied.';
  else if (dressCode) reason += ` ${dressCode} dress code applied.`;
  else if (isFormal) reason += ' Formal-appropriate items prioritised.';
  if (hasCriticalEvent) reason += ' High-importance event — best items selected.';

  return {
    outfitItems,
    score,
    reason,
    warnings,
    missingCategories: missing,
    aiEnhanced: false,
  };
}

export function generatePlannerWeek(input: PlannerEngineInput): PlannerWeek {
  const {
    weekStart,
    wardrobe,
    styleDNA,
    existingPlans,
    occasionEvents,
    tripPlans,
    weatherByDate,
  } = input;

  const days: PlannerDay[] = [];
  const usedItemIdsByDay: Map<string, Set<string>> = new Map();
  const itemUsageCount: Map<string, number> = new Map();
  const globalWarnings: string[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dayLabel = formatDayLabel(date);
    const weather = weatherByDate?.[date];

    const dayOccasions = occasionEvents.filter(e => e.date === date);
    const dayTrips = tripPlans.filter(t => t.startDate <= date && t.endDate >= date);
    const plannedOutfit = existingPlans.find(p => p.planDate === date);

    const prevUsed = i > 0 ? (usedItemIdsByDay.get(addDays(weekStart, i - 1)) ?? new Set<string>()) : new Set<string>();

    let suggestedOutfit: PlannerRecommendation | undefined;
    if (!plannedOutfit) {
      suggestedOutfit = generateSuggestion(wardrobe, dayOccasions, weather, prevUsed, styleDNA);
    }

    const dayItems = plannedOutfit?.outfitItems ?? suggestedOutfit?.outfitItems ?? [];
    const dayItemIds = new Set(dayItems.map(i => i.id));
    usedItemIdsByDay.set(date, dayItemIds);
    for (const id of dayItemIds) {
      itemUsageCount.set(id, (itemUsageCount.get(id) ?? 0) + 1);
    }

    const wardrobeWarnings: string[] = [];
    if (wardrobe.length < 6) {
      wardrobeWarnings.push('Limited wardrobe — add more items for better suggestions');
    }

    days.push({
      date,
      dayLabel,
      weather,
      occasionEvents: dayOccasions,
      tripPlans: dayTrips,
      plannedOutfit,
      suggestedOutfit,
      wardrobeWarnings,
      repeatWarnings: suggestedOutfit?.warnings ?? [],
      missingItems: suggestedOutfit?.missingCategories ?? [],
    });
  }

  for (const [id, count] of itemUsageCount.entries()) {
    if (count >= 3) {
      const item = wardrobe.find(i => i.id === id);
      if (item) globalWarnings.push(`${item.name} is scheduled ${count} times this week`);
    }
  }

  const allMissing = new Set(days.flatMap(d => d.missingItems));
  if (allMissing.size > 0) {
    globalWarnings.push(`Missing wardrobe categories: ${[...allMissing].join(', ')}`);
  }

  return {
    weekStart,
    days,
    globalWarnings,
    generatedAt: new Date().toISOString(),
    aiEnhanced: false,
  };
}
