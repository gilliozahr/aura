import { isValidItemName } from '@/lib/utils';
import type {
  OccasionEvent,
  OccasionFormality,
  OccasionOutfitRecommendation,
  OccasionType,
  MissingItem,
  StyleDNAProfile,
  TravelWeather,
  WardrobeItem,
  WeeklyOccasionBrief,
} from '@/lib/types';

// ── Formality helpers ─────────────────────────────────────────────────────────

const FORMALITY_RANK: Record<OccasionFormality, number> = {
  'Casual': 1,
  'Smart Casual': 2,
  'Business': 3,
  'Cocktail': 4,
  'Formal': 5,
  'Black Tie': 6,
};

export function inferFormalityFromEventType(type: OccasionType): OccasionFormality {
  const map: Record<OccasionType, OccasionFormality> = {
    'Business Meeting': 'Business',
    'Dinner': 'Smart Casual',
    'Wedding': 'Formal',
    'Brunch': 'Smart Casual',
    'Travel': 'Casual',
    'Casual': 'Casual',
    'Formal Event': 'Formal',
    'Family': 'Smart Casual',
    'Date Night': 'Smart Casual',
    'Other': 'Smart Casual',
  };
  return map[type];
}

// ── Item scoring ──────────────────────────────────────────────────────────────

function scoreItem(
  item: WardrobeItem,
  formality: OccasionFormality,
  weather: TravelWeather | undefined,
  styleDNA: StyleDNAProfile | undefined,
): number {
  let score = 40;
  const occLower = item.occasion.toLowerCase();
  const styleLower = item.style.toLowerCase();
  const formalityRank = FORMALITY_RANK[formality];

  // Formality match (most important)
  if (formalityRank >= 5) {
    // Formal / Black Tie — need formal items
    if (occLower.includes('formal') || occLower.includes('black tie')) score += 30;
    else if (occLower.includes('business')) score += 15;
    else if (occLower.includes('casual')) score -= 20;
  } else if (formalityRank === 3) {
    // Business
    if (occLower.includes('business')) score += 25;
    else if (occLower.includes('smart')) score += 15;
    else if (occLower.includes('casual')) score -= 10;
  } else if (formalityRank === 2) {
    // Smart Casual
    if (occLower.includes('smart') || occLower.includes('casual') || occLower.includes('business')) score += 20;
  } else {
    // Casual
    if (occLower.includes('casual')) score += 20;
    else if (occLower.includes('business') || occLower.includes('formal')) score -= 5;
  }

  // Block shorts/swimwear for Business+
  if (formalityRank >= 3) {
    if (item.name.toLowerCase().includes('shorts') || item.name.toLowerCase().includes('swim')) score -= 40;
  }

  // Weather
  if (weather?.available) {
    const cold = weather.temperatureC < 15;
    const hot = weather.temperatureC > 28;
    const rainy = weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('storm');

    if (cold && (item.season === 'Winter' || item.season === 'All')) score += 10;
    if (cold && item.season === 'Summer') score -= 15;
    if (hot && (item.season === 'Summer' || item.season === 'All')) score += 10;
    if (hot && item.season === 'Winter') score -= 10;

    // Avoid suede/open shoes in rain
    if (rainy) {
      const nameLower = item.name.toLowerCase();
      if (nameLower.includes('suede') || nameLower.includes('sandal') || nameLower.includes('open')) score -= 20;
    }
  }

  // Style DNA
  if (styleDNA && styleDNA.confidenceScore >= 30) {
    const prefStyles = styleDNA.preferredStyleTags.map(e => e.value.toLowerCase());
    const avoStyles = styleDNA.avoidedStyleTags.map(e => e.value.toLowerCase());
    const prefColors = styleDNA.preferredColors.map(e => e.value.toLowerCase());

    if (prefStyles.some(s => styleLower.includes(s))) score += 8;
    if (avoStyles.some(s => styleLower.includes(s))) score -= 12;
    if (prefColors.some(c => item.color.toLowerCase().includes(c))) score += 5;
  }

  // Wear frequency bonus (versatile items score higher)
  score += Math.min(item.wears, 15);

  return score;
}

function selectByCategory(
  wardrobe: WardrobeItem[],
  category: string,
  formality: OccasionFormality,
  weather: TravelWeather | undefined,
  styleDNA: StyleDNAProfile | undefined,
  limit: number,
): WardrobeItem[] {
  return wardrobe
    .filter(i => i.category === category)
    .map(i => ({ item: i, score: scoreItem(i, formality, weather, styleDNA) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}

// ── Risk detection ─────────────────────────────────────────────────────────────

export function detectOccasionRisks(
  event: Pick<OccasionEvent, 'formality' | 'eventType'>,
  items: WardrobeItem[],
  weather: TravelWeather | undefined,
): string[] {
  const risks: string[] = [];
  const formalityRank = FORMALITY_RANK[event.formality];
  const hasFormalShoes = items.some(i =>
    i.category === 'Shoes' && (i.occasion.toLowerCase().includes('formal') || i.occasion.toLowerCase().includes('business'))
  );
  const hasFormalTop = items.some(i =>
    i.category === 'Top' && (i.occasion.toLowerCase().includes('formal') || i.occasion.toLowerCase().includes('business'))
  );

  if (formalityRank >= 4 && !hasFormalShoes) {
    risks.push('No formal shoes found — footwear is critical for this occasion');
  }
  if (formalityRank >= 5 && !hasFormalTop) {
    risks.push('No formal top found — consider a dress shirt or blouse');
  }
  if (weather?.available) {
    const rainy = weather.condition.toLowerCase().includes('rain');
    if (rainy) risks.push(`Rain expected (${weather.condition}) — protect formal wear`);
    if (weather.temperatureC > 32 && formalityRank >= 4) {
      risks.push(`Very hot (${weather.temperatureC}°C) — plan for breathable formal options`);
    }
  }
  return risks;
}

// ── Main recommendation ───────────────────────────────────────────────────────

export function recommendOutfitForOccasion(
  event: Pick<OccasionEvent, 'formality' | 'eventType' | 'notes'>,
  wardrobe: WardrobeItem[],
  styleDNA?: StyleDNAProfile,
  weather?: TravelWeather,
): OccasionOutfitRecommendation {
  const validWardrobe = wardrobe.filter(i => isValidItemName(i.name));
  const { formality } = event;
  const formalityRank = FORMALITY_RANK[formality];
  const cold = weather?.available && weather.temperatureC < 15;
  const hot = weather?.available && weather.temperatureC > 28;

  // Select items
  const tops = selectByCategory(validWardrobe, 'Top', formality, weather, styleDNA, 1);
  const bottoms = selectByCategory(validWardrobe, 'Bottom', formality, weather, styleDNA, 1);
  const shoes = selectByCategory(validWardrobe, 'Shoes', formality, weather, styleDNA, 1);
  const outerwear = cold ? selectByCategory(validWardrobe, 'Outerwear', formality, weather, styleDNA, 1) : [];
  const accessories = formalityRank >= 3
    ? validWardrobe.filter(i => i.category === 'Watch' || i.category === 'Accessory').slice(0, 1)
    : [];

  const selectedItems = [...tops, ...bottoms, ...shoes, ...outerwear, ...accessories];
  const itemNames = selectedItems.map(i => i.name);

  const formalityFitScore = Math.min(100, Math.round(
    selectedItems.filter(i => {
      const occ = i.occasion.toLowerCase();
      if (formalityRank >= 4) return occ.includes('formal') || occ.includes('business');
      if (formalityRank === 3) return occ.includes('business') || occ.includes('smart');
      return occ.includes('casual') || occ.includes('smart');
    }).length / Math.max(selectedItems.length, 1) * 100
  ));

  const weatherFitScore = weather?.available
    ? Math.min(100, Math.round(
        selectedItems.filter(i => {
          if (cold) return i.season === 'Winter' || i.season === 'All';
          if (hot) return i.season === 'Summer' || i.season === 'All';
          return true;
        }).length / Math.max(selectedItems.length, 1) * 100
      ))
    : 70;

  const styleDNAFitScore = styleDNA && styleDNA.confidenceScore >= 30
    ? Math.min(100, Math.round(
        selectedItems.filter(i =>
          styleDNA.preferredStyleTags.some(t => i.style.toLowerCase().includes(t.value.toLowerCase()))
        ).length / Math.max(selectedItems.length, 1) * 100
      ))
    : 70;

  const outfitScore = Math.round(
    formalityFitScore * 0.5 + weatherFitScore * 0.3 + styleDNAFitScore * 0.2
  );

  // Missing items
  const missingItems: MissingItem[] = [];
  if (tops.length === 0) {
    missingItems.push({ name: formalityRank >= 4 ? 'Formal shirt or blouse' : 'Smart top', category: 'Top', reason: 'No suitable top in wardrobe', priority: 'essential' });
  }
  if (bottoms.length === 0) {
    missingItems.push({ name: formalityRank >= 4 ? 'Dress trousers or skirt' : 'Smart trousers', category: 'Bottom', reason: 'No suitable bottom in wardrobe', priority: 'essential' });
  }
  if (shoes.length === 0) {
    missingItems.push({ name: formalityRank >= 4 ? 'Formal shoes' : 'Smart shoes', category: 'Shoes', reason: 'No suitable shoes in wardrobe', priority: 'essential' });
  }
  if (formalityRank >= 5 && shoes.length > 0) {
    const formalShoe = shoes[0];
    if (!formalShoe.occasion.toLowerCase().includes('formal')) {
      missingItems.push({ name: 'Formal leather shoes or heels', category: 'Shoes', reason: 'Shoes may not meet formal dress code', priority: 'recommended' });
    }
  }
  if (cold && outerwear.length === 0) {
    missingItems.push({ name: 'Smart jacket or coat', category: 'Outerwear', reason: `Cold weather (${weather!.temperatureC}°C) — layering required`, priority: 'essential' });
  }

  // Reasoning
  const weatherStr = weather?.available ? ` in ${weather.condition.toLowerCase()}, ${Math.round(weather.temperatureC)}°C` : '';
  const reasoning = itemNames.length >= 2
    ? `${tops[0]?.name ?? 'Top'} with ${bottoms[0]?.name ?? 'bottoms'} and ${shoes[0]?.name ?? 'shoes'} — ${formality.toLowerCase()} outfit${weatherStr} for ${event.eventType}`
    : `Limited wardrobe coverage for ${event.eventType} — see missing items`;

  // Alternatives (next-best items not already selected)
  const selectedIds = new Set(selectedItems.map(i => i.id));
  const alternatives = validWardrobe
    .filter(i => !selectedIds.has(i.id) && ['Top', 'Bottom', 'Shoes'].includes(i.category))
    .sort((a, b) => scoreItem(b, formality, weather, styleDNA) - scoreItem(a, formality, weather, styleDNA))
    .slice(0, 3)
    .map(i => i.name);

  const risks = detectOccasionRisks(event, selectedItems, weather);

  return {
    items: itemNames,
    outfitScore,
    formalityFitScore,
    weatherFitScore,
    styleDNAFitScore,
    reasoning,
    risks,
    missingItems,
    alternatives,
    aiEnhanced: false,
  };
}

// ── Weekly brief ──────────────────────────────────────────────────────────────

export function buildWeeklyOccasionBrief(
  events: OccasionEvent[],
  now: Date = new Date(),
): WeeklyOccasionBrief {
  const today = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);

  const upcomingEvents = events
    .filter(e => e.date >= today && e.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  const preparedEvents = upcomingEvents.filter(e =>
    e.outfitStatus === 'accepted' || e.outfitStatus === 'edited'
  );
  const unpreparedEvents = upcomingEvents.filter(e =>
    e.outfitStatus === 'pending' || e.outfitStatus === 'rejected'
  );

  const allMissingItems = upcomingEvents
    .flatMap(e => e.recommendedOutfit?.missingItems ?? [])
    .filter((item, idx, arr) => arr.findIndex(x => x.name === item.name) === idx);

  const weatherRisks = upcomingEvents
    .flatMap(e => e.recommendedOutfit?.risks ?? [])
    .filter((r, idx, arr) => arr.indexOf(r) === idx);

  const summary = upcomingEvents.length === 0
    ? 'No upcoming events this week.'
    : `${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''} this week — ${preparedEvents.length} prepared, ${unpreparedEvents.length} need${unpreparedEvents.length === 1 ? 's' : ''} an outfit.`;

  return { upcomingEvents, preparedEvents, unpreparedEvents, missingItems: allMissingItems, weatherRisks, summary };
}
