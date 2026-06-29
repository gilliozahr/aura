export interface UserProfile {
  name: string;
  city: string;
  temperature: number;
  occasion: string;
  styleGoal: string;
  budget: number;
}

export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  occasion: string;
  style: string;
  wears: number;
  confidence: number;
  image: string;
}

export interface InspirationReport {
  duplicateCount: number;
  styleMatch: number;
  wardrobeImpact: number;
  budgetFit: number;
  score: number;
  decision: 'BUY' | 'WAIT' | 'SKIP';
}

export interface InspirationItem {
  id: string;
  name: string;
  category: string;
  color: string;
  style: string;
  price: number;
  image: string;
  report: InspirationReport;
  createdAt: string;
}

export interface Order {
  id: string;
  itemName: string;
  price: number;
  status: string;
  createdAt: string;
}

export interface StylistBooking {
  id: string;
  stylist: string;
  at: string;
  status: string;
}

export interface FeedbackEvent {
  id: string;
  type: string;
  score: number;
  at: string;
}

export type OccasionFormality = 'Casual' | 'Smart Casual' | 'Business' | 'Cocktail' | 'Formal' | 'Black Tie';
export type OccasionType = 'work' | 'social' | 'travel' | 'sport' | 'formal' | 'other';

export interface OccasionEvent {
  id: string;
  title: string;
  eventType: OccasionType;
  date: string;
  startTime?: string;
  endTime?: string;
  city?: string;
  country?: string;
  formality: OccasionFormality;
  notes?: string;
  outfitStatus: 'pending' | 'planned' | 'worn';
  createdAt: string;
  updatedAt: string;
}

export interface StyleTagEntry {
  value: string;
  weight: number;
}

export interface StyleDNAProfile {
  preferredColors: Array<{ value: string; weight: number }>;
  avoidedColors: Array<{ value: string; weight: number }>;
  preferredCategories: Array<{ value: string; weight: number }>;
  preferredStyleTags: StyleTagEntry[];
  avoidedStyleTags: StyleTagEntry[];
  preferredOccasions: Array<{ value: string; weight: number }>;
  wardrobeGaps: string[];
  favoriteOutfitPatterns: string[];
  rejectedOutfitPatterns: string[];
  confidenceScore: number;
  signalCount: number;
  lastComputedAt: string;
}

export interface SavedOutfit {
  id: string;
  outfitItems: WardrobeItem[];
  report: {
    score: number;
    explanation: string;
  };
  feedback?: 'liked' | 'disliked';
  createdAt: string;
}

export interface TripPlan {
  id: string;
  destinationCity: string;
  destinationCountry?: string;
  startDate: string;
  endDate: string;
  purpose: string;
  occasions: OccasionEvent[];
  luggageType: string;
  laundryAvailable: boolean;
  dailyOutfits: Array<{ date: string; items: WardrobeItem[] }>;
  packingItems: WardrobeItem[];
  missingItems: Array<{ name: string; category: string }>;
  riskNotes: string[];
  aiEnhanced: boolean;
  createdAt: string;
}

export interface AppState {
  user: UserProfile;
  wardrobe: WardrobeItem[];
  inspirations: InspirationItem[];
  outfits: unknown[];
  orders: Order[];
  stylistBookings: StylistBooking[];
  feedback: FeedbackEvent[];
  styleDNA?: StyleDNAProfile;
  tripPlans?: TripPlan[];
  occasionEvents?: OccasionEvent[];
  shoppingProducts?: unknown[];
  shoppingRecommendations?: unknown[];
  outfitPlans: OutfitPlan[];
}

export type View =
  | 'home'
  | 'wardrobe'
  | 'inspiration'
  | 'shopping'
  | 'packing'
  | 'occasions'
  | 'planner'
  | 'stylist'
  | 'analytics'
  | 'settings';

export type PlannerStatus = 'planned' | 'worn' | 'skipped' | 'changed';
export type PlannerSource = 'planner' | 'manual' | 'occasion' | 'trip' | 'daily';

export interface PlannerRecommendation {
  outfitItems: WardrobeItem[];
  score: number;
  reason: string;
  warnings: string[];
  missingCategories: string[];
  aiEnhanced: boolean;
}

export interface OutfitPlan {
  id: string;
  userId: string;
  planDate: string;
  occasionEventId?: string;
  tripPlanId?: string;
  outfitItems: WardrobeItem[];
  recommendation: PlannerRecommendation;
  status: PlannerStatus;
  source: PlannerSource;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerDayWeather {
  tempHigh?: number;
  tempLow?: number;
  condition?: string;
  icon?: string;
}

export interface PlannerDay {
  date: string;
  dayLabel: string;
  weather?: PlannerDayWeather;
  occasionEvents: OccasionEvent[];
  tripPlans: TripPlan[];
  plannedOutfit?: OutfitPlan;
  suggestedOutfit?: PlannerRecommendation;
  wardrobeWarnings: string[];
  repeatWarnings: string[];
  missingItems: string[];
}

export interface PlannerWeek {
  weekStart: string;
  days: PlannerDay[];
  globalWarnings: string[];
  generatedAt: string;
  aiEnhanced: boolean;
}
