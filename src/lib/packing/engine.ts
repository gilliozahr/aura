import type {
  WardrobeItem,
  StyleDNAProfile,
  TravelWeather,
  TripOccasion,
  TripDailyOutfit,
  PackingItem,
  MissingItem,
} from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function simpleId(): string {
  return crypto.randomUUID();
}

function tripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

function dateRange(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function isCold(weather?: TravelWeather): boolean {
  if (!weather || !weather.available) return false;
  return weather.temperatureC < 15;
}

function isRainy(weather?: TravelWeather): boolean {
  if (!weather || !weather.available) return false;
  const cond = weather.condition.toLowerCase();
  return cond.includes('rain') || cond.includes('drizzle') || cond.includes('storm');
}

function hasFormality(occasions: TripOccasion[], level: TripOccasion['formality']): boolean {
  return occasions.some(o => o.formality === level);
}

/** Score a wardrobe item's suitability for the trip */
function scoreItem(
  item: WardrobeItem,
  purpose: string,
  occasions: TripOccasion[],
  weather: TravelWeather | undefined,
  styleDNA: StyleDNAProfile | undefined,
): number {
  let score = 50;

  // Season match
  const cold = isCold(weather);
  if (cold && (item.season === 'Winter' || item.season === 'All')) score += 15;
  if (!cold && (item.season === 'Summer' || item.season === 'All')) score += 15;
  if (cold && item.season === 'Summer') score -= 20;

  // Occasion match
  const purposeLower = purpose.toLowerCase();
  const itemOccLower = item.occasion.toLowerCase();
  if (purposeLower.includes('business') && itemOccLower.includes('business')) score += 20;
  if (purposeLower.includes('wedding') && (itemOccLower.includes('formal') || itemOccLower.includes('smart'))) score += 20;
  if (purposeLower.includes('vacation') && (itemOccLower.includes('casual') || itemOccLower.includes('smart'))) score += 15;

  // Formal occasions need formal items
  if (hasFormality(occasions, 'formal') && (itemOccLower.includes('formal') || itemOccLower.includes('business'))) score += 10;
  if (hasFormality(occasions, 'business') && itemOccLower.includes('business')) score += 10;

  // Style DNA boost
  if (styleDNA && styleDNA.confidenceScore >= 30) {
    const preferredStyles = styleDNA.preferredStyleTags.map(e => e.value.toLowerCase());
    if (preferredStyles.some(s => item.style.toLowerCase().includes(s))) score += 10;

    const preferredColors = styleDNA.preferredColors.map(e => e.value.toLowerCase());
    if (preferredColors.some(c => item.color.toLowerCase().includes(c))) score += 5;

    const avoidedStyles = styleDNA.avoidedStyleTags.map(e => e.value.toLowerCase());
    if (avoidedStyles.some(s => item.style.toLowerCase().includes(s))) score -= 15;
  }

  // Versatility / wears bonus
  score += Math.min(item.wears, 20);

  return score;
}

function itemsByCategory(
  wardrobe: WardrobeItem[],
  category: string,
  purpose: string,
  occasions: TripOccasion[],
  weather: TravelWeather | undefined,
  styleDNA: StyleDNAProfile | undefined,
  limit: number,
): WardrobeItem[] {
  return wardrobe
    .filter(i => i.category === category)
    .map(i => ({ item: i, score: scoreItem(i, purpose, occasions, weather, styleDNA) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}

// ── Main export ────────────────────────────────────────────────────────────

export function generatePackingPlan(
  trip: {
    destinationCity: string;
    destinationCountry?: string;
    startDate: string;
    endDate: string;
    purpose: string;
    occasions: TripOccasion[];
    luggageType: string;
    laundryAvailable: boolean;
  },
  wardrobe: WardrobeItem[],
  styleDNA?: StyleDNAProfile,
  weather?: TravelWeather,
): {
  dailyOutfits: TripDailyOutfit[];
  packingItems: PackingItem[];
  missingItems: MissingItem[];
  riskNotes: string[];
  capsuleNotes: string;
} {
  const days = tripDays(trip.startDate, trip.endDate);
  const dates = dateRange(trip.startDate, days);
  const { laundryAvailable, occasions, purpose, luggageType } = trip;

  // ── Item counts ──────────────────────────────────────────────────────────
  const topCount = laundryAvailable ? Math.ceil(days / 2) : days;
  const bottomCount = laundryAvailable ? Math.ceil(days / 3) : Math.ceil(days / 2);
  const shoeCount = 2;
  const needsOuterwear = isCold(weather) || isRainy(weather);

  // ── Select wardrobe items ────────────────────────────────────────────────
  const selectedTops = itemsByCategory(wardrobe, 'Top', purpose, occasions, weather, styleDNA, topCount);
  const selectedBottoms = itemsByCategory(wardrobe, 'Bottom', purpose, occasions, weather, styleDNA, bottomCount);
  const selectedShoes = itemsByCategory(wardrobe, 'Shoes', purpose, occasions, weather, styleDNA, shoeCount);
  const selectedOuterwear = needsOuterwear
    ? itemsByCategory(wardrobe, 'Outerwear', purpose, occasions, weather, styleDNA, 1)
    : [];

  // ── Build packing items ──────────────────────────────────────────────────
  const packingItems: PackingItem[] = [];

  function addItems(items: WardrobeItem[], cat: string, priority: PackingItem['priority'], reason: string) {
    for (const item of items) {
      packingItems.push({
        id: simpleId(),
        name: item.name,
        category: cat,
        source: 'wardrobe',
        wardrobeItemId: item.id,
        quantity: 1,
        packed: false,
        reason,
        priority,
      });
    }
  }

  addItems(selectedTops, 'Tops', 'essential', `${days}-day trip${laundryAvailable ? ' with laundry' : ''}`);
  addItems(selectedBottoms, 'Bottoms', 'essential', 'Can be re-worn across outfits');
  addItems(selectedShoes, 'Shoes', 'essential', 'Versatile footwear');
  addItems(selectedOuterwear, 'Outerwear', 'essential', needsOuterwear ? 'Cold/rainy destination' : 'Layering option');

  // Accessories (optional — first 2 from wardrobe)
  const accessories = wardrobe
    .filter(i => i.category === 'Watch' || i.category === 'Accessory')
    .slice(0, 2);
  addItems(accessories, 'Accessories', 'optional', 'Finishing touch');

  // ── Missing items ────────────────────────────────────────────────────────
  const missingItems: MissingItem[] = [];

  if (selectedTops.length === 0) {
    missingItems.push({ name: 'Versatile tops', category: 'Top', reason: 'No tops in wardrobe', priority: 'essential' });
  }
  if (selectedBottoms.length === 0) {
    missingItems.push({ name: 'Versatile trousers or jeans', category: 'Bottom', reason: 'No bottoms in wardrobe', priority: 'essential' });
  }
  if (selectedShoes.length === 0) {
    missingItems.push({ name: 'Versatile shoes', category: 'Shoes', reason: 'No shoes in wardrobe', priority: 'essential' });
  }
  if (needsOuterwear && selectedOuterwear.length === 0) {
    missingItems.push({ name: 'Lightweight jacket or coat', category: 'Outerwear', reason: `Cold/rainy destination (${weather?.temperatureC ?? '?'}°C)`, priority: 'essential' });
  }

  const hasFormalOccasion = hasFormality(occasions, 'formal') || hasFormality(occasions, 'business');
  const hasFormalItems = wardrobe.some(i =>
    i.occasion.toLowerCase().includes('formal') || i.occasion.toLowerCase().includes('business')
  );
  if (hasFormalOccasion && !hasFormalItems) {
    missingItems.push({ name: 'Formal shirt or blouse', category: 'Top', reason: 'Formal/business occasion with no formal items', priority: 'essential' });
    missingItems.push({ name: 'Smart trousers', category: 'Bottom', reason: 'Formal/business occasion with no formal items', priority: 'recommended' });
  }

  if (luggageType === 'Carry-on' && packingItems.length > 20) {
    missingItems.push({ name: 'Travel compression bags', category: 'Accessory', reason: 'Carry-on limit — optimise packing space', priority: 'recommended' });
  }

  // ── Daily outfits ────────────────────────────────────────────────────────
  const allSelectedItems = [...selectedTops, ...selectedBottoms, ...selectedShoes, ...selectedOuterwear];
  const dailyOutfits: TripDailyOutfit[] = dates.map((date, idx) => {
    const top = selectedTops[idx % Math.max(selectedTops.length, 1)];
    const bottom = selectedBottoms[idx % Math.max(selectedBottoms.length, 1)];
    const shoe = selectedShoes[idx % Math.max(selectedShoes.length, 1)];
    const outerwear = needsOuterwear && selectedOuterwear.length > 0 ? selectedOuterwear[0] : null;

    const items = [top?.name, bottom?.name, shoe?.name, outerwear?.name].filter(Boolean) as string[];
    const occasion = occasions[idx] ? occasions[idx].label : purpose;

    const weatherStr = weather?.available
      ? `${weather.condition}, ${Math.round(weather.temperatureC)}°C`
      : undefined;

    return {
      date,
      occasion,
      weather: weatherStr,
      items,
      reasoning: items.length >= 2
        ? `${top?.name ?? 'Top'} with ${bottom?.name ?? 'bottoms'} — versatile combination for ${occasion}`
        : 'Add more wardrobe items for complete outfit suggestions',
      risks: allSelectedItems.length < 3 ? ['Limited wardrobe — consider adding more items'] : undefined,
    };
  });

  // ── Risk notes ────────────────────────────────────────────────────────────
  const riskNotes: string[] = [];

  if (needsOuterwear && selectedOuterwear.length === 0) {
    riskNotes.push('No outerwear for a cold/rainy destination — pack a jacket');
  }
  if (hasFormalOccasion && !hasFormalItems) {
    riskNotes.push('No formal items for a formal/business occasion');
  }
  if (luggageType === 'Carry-on') {
    riskNotes.push('Carry-on only — pack light and prioritise versatile items');
  }
  if (selectedTops.length < days && !laundryAvailable) {
    riskNotes.push('Fewer tops than trip days — consider laundry or extra items');
  }

  // ── Capsule notes ─────────────────────────────────────────────────────────
  const combos = Math.max(1, selectedTops.length) * Math.max(1, selectedBottoms.length);
  const capsuleNotes = [
    `${selectedTops.length} top${selectedTops.length !== 1 ? 's' : ''}`,
    `${selectedBottoms.length} bottom${selectedBottoms.length !== 1 ? 's' : ''}`,
    `${selectedShoes.length} pair${selectedShoes.length !== 1 ? 's' : ''} of shoes`,
    selectedOuterwear.length > 0 ? `${selectedOuterwear.length} outer layer` : null,
  ]
    .filter(Boolean)
    .join(' + ') + ` = ${combos} outfit combination${combos !== 1 ? 's' : ''}`;

  return { dailyOutfits, packingItems, missingItems, riskNotes, capsuleNotes };
}
