import type { AppState, InspirationItem, OccasionEvent, SavedOutfit, TripPlan, WardrobeItem } from '@/lib/types';
import { uid } from '@/lib/utils';

export function makeDemoItems(): WardrobeItem[] {
  return [
    { id: uid(), name: 'Navy Blazer', category: 'Outerwear', color: 'Navy', season: 'All', occasion: 'Business', style: 'Quiet Luxury', wears: 18, confidence: 95, image: '' },
    { id: uid(), name: 'White Oxford Shirt', category: 'Top', color: 'White', season: 'All', occasion: 'Business', style: 'Classic', wears: 24, confidence: 92, image: '' },
    { id: uid(), name: 'Navy Dress Shirt', category: 'Top', color: 'Navy', season: 'All', occasion: 'Business', style: 'Classic', wears: 11, confidence: 91, image: '' },
    { id: uid(), name: 'Beige Chinos', category: 'Bottom', color: 'Beige', season: 'Summer', occasion: 'Smart Casual', style: 'Minimal', wears: 16, confidence: 88, image: '' },
    { id: uid(), name: 'Charcoal Trousers', category: 'Bottom', color: 'Charcoal', season: 'All', occasion: 'Business', style: 'Classic', wears: 14, confidence: 93, image: '' },
    { id: uid(), name: 'Brown Loafers', category: 'Shoes', color: 'Brown', season: 'All', occasion: 'Business', style: 'Timeless', wears: 21, confidence: 94, image: '' },
    { id: uid(), name: 'Black Dress Shoes', category: 'Shoes', color: 'Black', season: 'All', occasion: 'Formal', style: 'Classic', wears: 9, confidence: 96, image: '' },
    { id: uid(), name: 'White Sneakers', category: 'Shoes', color: 'White', season: 'All', occasion: 'Casual', style: 'Clean', wears: 30, confidence: 82, image: '' },
    { id: uid(), name: 'Camel Overcoat', category: 'Outerwear', color: 'Camel', season: 'Winter', occasion: 'Smart Casual', style: 'Quiet Luxury', wears: 7, confidence: 91, image: '' },
    { id: uid(), name: 'Leather Belt', category: 'Accessory', color: 'Brown', season: 'All', occasion: 'Business', style: 'Classic', wears: 28, confidence: 89, image: '' },
    { id: uid(), name: 'Rolex GMT', category: 'Watch', color: 'Steel', season: 'All', occasion: 'Business', style: 'Luxury', wears: 44, confidence: 96, image: '' },
  ];
}

export function makeDemoInspirations(): InspirationItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: uid(),
      name: 'Loro Piana Cashmere Turtleneck',
      category: 'Top',
      color: 'Oatmeal',
      style: 'Quiet Luxury',
      price: 1200,
      image: '',
      report: {
        compatibilityScore: 88,
        styleMatchScore: 95,
        wardrobeImpactScore: 82,
        budgetFitScore: 60,
        duplicateRisk: 15,
        confidence: 90,
        decision: 'BUY',
        reasoningSummary: 'Excellent style alignment with your Quiet Luxury aesthetic and wardrobe.',
        whyItWorks: 'Elevates your existing business-casual pieces and fills a premium knitwear gap.',
        risks: ['Higher price point than typical budget'],
        suggestedOutfits: ['Cashmere turtleneck + Charcoal Trousers + Brown Loafers'],
        betterAlternatives: [],
        missingWardrobeOpportunities: [],
      },
      createdAt: now,
    },
    {
      id: uid(),
      name: 'Brunello Cucinelli Linen Shirt',
      category: 'Top',
      color: 'Sand',
      style: 'Minimal',
      price: 650,
      image: '',
      report: {
        compatibilityScore: 82,
        styleMatchScore: 88,
        wardrobeImpactScore: 78,
        budgetFitScore: 72,
        duplicateRisk: 30,
        confidence: 85,
        decision: 'WAIT',
        reasoningSummary: 'Good fit but some overlap with existing tops. Wait for occasion need.',
        whyItWorks: 'Works well for warm-weather business and smart casual.',
        risks: ['Overlaps with White Oxford Shirt in function'],
        suggestedOutfits: ['Linen Shirt + Beige Chinos + White Sneakers'],
        betterAlternatives: [],
        missingWardrobeOpportunities: [],
      },
      createdAt: now,
    },
  ];
}

export function makeDemoOccasionEvents(): OccasionEvent[] {
  const now = new Date().toISOString();
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 5 * 86_400_000);
  const inTwoWeeks = new Date(today.getTime() + 12 * 86_400_000);

  return [
    {
      id: uid(),
      title: 'Business Dinner — Beirut',
      eventType: 'Dinner',
      date: nextWeek.toISOString().slice(0, 10),
      startTime: '19:30',
      city: 'Beirut',
      country: 'Lebanon',
      countryCode: 'LB',
      formality: 'Smart Casual',
      notes: 'Client dinner at Albergo rooftop. Business smart dress code.',
      outfitStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      title: 'Weekend Brunch',
      eventType: 'Brunch',
      date: inTwoWeeks.toISOString().slice(0, 10),
      startTime: '11:00',
      city: 'Dubai',
      country: 'UAE',
      countryCode: 'AE',
      formality: 'Smart Casual',
      notes: 'Casual brunch with friends at Souk Madinat.',
      outfitStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function makeDemoTripPlan(): TripPlan {
  const now = new Date().toISOString();
  const startDate = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 24 * 86_400_000).toISOString().slice(0, 10);
  return {
    id: uid(),
    destinationCity: 'Paris',
    destinationCountry: 'France',
    startDate,
    endDate,
    purpose: 'Business + Leisure',
    occasions: [
      { date: startDate, label: 'Business Meeting', formality: 'business' as const },
      { date: endDate, label: 'Dinner', formality: 'smart-casual' as const },
    ],
    luggageType: 'Carry-on',
    laundryAvailable: false,
    packingItems: [
      { id: uid(), name: 'Navy Blazer', category: 'Tops', source: 'wardrobe' as const, quantity: 1, packed: false, priority: 'essential' as const, reason: 'Anchors both business and smart casual looks' },
      { id: uid(), name: 'White Oxford Shirt', category: 'Tops', source: 'wardrobe' as const, quantity: 1, packed: false, priority: 'essential' as const, reason: 'Core business top' },
      { id: uid(), name: 'Navy Dress Shirt', category: 'Tops', source: 'wardrobe' as const, quantity: 1, packed: false, priority: 'recommended' as const, reason: 'Dinner alternative' },
      { id: uid(), name: 'Charcoal Trousers', category: 'Bottoms', source: 'wardrobe' as const, quantity: 1, packed: false, priority: 'essential' as const, reason: 'Business bottoms' },
      { id: uid(), name: 'Beige Chinos', category: 'Bottoms', source: 'wardrobe' as const, quantity: 1, packed: false, priority: 'recommended' as const, reason: 'Leisure days' },
      { id: uid(), name: 'Brown Loafers', category: 'Shoes', source: 'wardrobe' as const, quantity: 1, packed: false, priority: 'essential' as const, reason: 'Works business and smart casual' },
      { id: uid(), name: 'White Sneakers', category: 'Shoes', source: 'wardrobe' as const, quantity: 1, packed: false, priority: 'recommended' as const, reason: 'Walking days' },
    ],
    dailyOutfits: [
      { date: startDate, occasion: 'Business Arrival', items: ['Navy Blazer', 'White Oxford Shirt', 'Charcoal Trousers', 'Brown Loafers'], reasoning: 'Classic arrival look — professional and versatile.' },
    ],
    missingItems: [
      { name: 'Compact umbrella', category: 'Accessories', reason: 'Paris weather is unpredictable', priority: 'recommended' as const },
    ],
    riskNotes: ['Check weather forecast closer to departure — Paris in this season can be cool and wet.'],
    capsuleNotes: 'Navy blazer anchors all looks. Charcoal trousers handle business; chinos handle leisure. Loafers work across both.',
    aiEnhanced: false,
    createdAt: now,
  };
}

export function makeDemoSavedOutfit(wardrobe: WardrobeItem[]): SavedOutfit | null {
  const blazer = wardrobe.find(i => i.name === 'Navy Blazer');
  const shirt = wardrobe.find(i => i.name === 'White Oxford Shirt');
  const trousers = wardrobe.find(i => i.name === 'Charcoal Trousers');
  const shoes = wardrobe.find(i => i.name === 'Brown Loafers');
  const items = [blazer, shirt, trousers, shoes].filter(Boolean) as WardrobeItem[];
  if (items.length < 3) return null;
  return {
    id: uid(),
    outfitItems: items,
    report: {
      outfitItems: items.map(i => i.id),
      compatibilityScore: 91,
      occasionFitScore: 95,
      weatherFitScore: 78,
      styleMatchScore: 93,
      colorHarmonyScore: 88,
      confidence: 91,
      reasoningSummary: 'A classic Quiet Luxury business combination. Navy and charcoal create a refined contrast; brown leather grounds the look.',
      whyItWorks: 'Timeless colour pairing with excellent formality range — appropriate for business meetings through smart dinners.',
      risks: [],
      missingItems: [],
      alternatives: ['Navy Dress Shirt as a shirt alternative'],
    },
    feedback: 'accepted',
    createdAt: new Date().toISOString(),
  };
}

export function defaultState(): AppState {
  return {
    user: {
      name: '',
      city: 'Dubai',
      temperature: 34,
      occasion: 'Business Meeting',
      styleGoal: 'Quiet Luxury',
      budget: 1000,
    },
    wardrobe: [],
    inspirations: [],
    outfits: [],
    orders: [],
    stylistBookings: [],
    feedback: [],
    tripPlans: [],
    occasionEvents: [],
    shoppingProducts: [],
    shoppingRecommendations: [],
    outfitPlans: [],
  };
}
