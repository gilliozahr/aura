export interface WeatherContext {
  city: string;
  temperatureC: number;
  condition: string;
  humidity?: number;
  feelsLikeC?: number;
  available: boolean;
  timestamp: string;
}

// ── Size profile ──────────────────────────────────────────────────────────────

export type PreferredFit = 'Slim' | 'Regular' | 'Relaxed' | 'Oversized';

export type MeasurementUnit = 'cm' | 'in';

export interface UserSizeProfile {
  measurementUnit?: MeasurementUnit;
  // Numeric measurements are stored in the unit indicated by measurementUnit (default: cm)
  heightCm?: number;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  shoulderCm?: number;
  inseamCm?: number;
  neckCm?: number;
  sleeveCm?: number;
  shoeSizeEU?: number;
  shoeSizeUK?: number;
  shoeSizeUS?: number;
  preferredFit?: PreferredFit;
  topSize?: string;
  bottomSize?: string;
  blazerSize?: string;
  notes?: string;
}

export interface UserProfile {
  name: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  temperature: number;
  occasion: string;
  styleGoal: string;
  budget: number;
  sizeProfile?: UserSizeProfile;
}

export type LocationSource = 'browser' | 'profile' | 'fallback';

export interface LocationContext {
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  source: LocationSource;
  label: string;
  timestamp: string;
}

export type VisionFallbackReason =
  | 'missing_openai_key'
  | 'missing_anthropic_key'
  | 'openai_http_401'
  | 'openai_http_429'
  | 'openai_http_error'
  | 'openai_parse_error'
  | 'openai_vision_error'
  | 'anthropic_http_401'
  | 'anthropic_http_429'
  | 'anthropic_http_error'
  | 'anthropic_parse_error'
  | 'anthropic_vision_error'
  | 'invalid_image_url'
  | 'unsupported_image_format';

export interface WardrobeAIMetadata {
  detectedCategory: string;
  detectedColor: string;
  detectedStyle: string;
  detectedSeason: string;
  detectedOccasion: string;
  confidence: number;
  tags: string[];
  analysisNote: string;
  correctedFields?: string[];
  /** The provider that was configured (e.g. 'openai', 'mock') */
  providerRequested: string;
  /** The provider that actually ran the analysis (may differ if fallback used) */
  provider: string;
  model: string;
  fallbackUsed: boolean;
  fallbackReason?: VisionFallbackReason;
  analyzedAt: string;
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
  aiMetadata?: WardrobeAIMetadata;
}

export interface ReportDebugMeta {
  provider: string;
  mode: 'real' | 'mock';
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

export interface InspirationReport {
  // Core scores 0–100
  compatibilityScore: number;
  styleMatchScore: number;
  wardrobeImpactScore: number;
  budgetFitScore: number;
  /** 0 = no duplicates, higher = more redundancy */
  duplicateRisk: number;
  /** Model confidence in its own analysis */
  confidence: number;
  decision: 'BUY' | 'WAIT' | 'SKIP';
  // Qualitative fields
  reasoningSummary: string;
  whyItWorks: string;
  risks: string[];
  suggestedOutfits: string[];
  betterAlternatives: string[];
  missingWardrobeOpportunities: string[];
  /** Safe debug metadata — never contains API keys */
  _meta?: ReportDebugMeta;
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

export interface OutfitReport {
  outfitItems: string[]; // WardrobeItem IDs
  compatibilityScore: number;
  occasionFitScore: number;
  weatherFitScore: number;
  styleMatchScore: number;
  colorHarmonyScore: number;
  confidence: number;
  reasoningSummary: string;
  whyItWorks: string;
  risks: string[];
  missingItems: string[];
  alternatives: string[];
  _meta?: ReportDebugMeta;
}

export interface SavedOutfit {
  id: string;
  outfitItems: WardrobeItem[];
  report: OutfitReport;
  feedback?: 'accepted' | 'rejected';
  createdAt: string;
}

export interface FeedbackEvent {
  id: string;
  type: string;
  score: number;
  payload?: Record<string, unknown>;
  at: string;
}

// ── Style DNA ─────────────────────────────────────────────────────────────────

export interface StyleDNAEntry {
  value: string;
  score: number;
}

export interface StyleDNAProfile {
  preferredColors: StyleDNAEntry[];
  avoidedColors: StyleDNAEntry[];
  preferredCategories: StyleDNAEntry[];
  preferredStyleTags: StyleDNAEntry[];
  avoidedStyleTags: StyleDNAEntry[];
  preferredOccasions: StyleDNAEntry[];
  wardrobeGaps: string[];
  favoriteOutfitPatterns: string[];
  rejectedOutfitPatterns: string[];
  confidenceScore: number;
  signalCount: number;
  lastComputedAt: string;
}

export interface StyleDNASummary {
  preferredColors: string[];
  preferredStyleTags: string[];
  avoidedStyleTags: string[];
  preferredOccasions: string[];
  wardrobeGaps: string[];
  confidenceScore: number;
}

// ── Packing + Trip Intelligence ──────────────────────────────────────────────

export interface TravelWeather {
  date?: string;
  temperatureC: number;
  condition: string;
  humidity?: number;
  feelsLikeC?: number;
  available: boolean;
  city: string;
  source: string;
}

export interface TripOccasion {
  date: string;
  label: string;
  formality: 'casual' | 'smart-casual' | 'business' | 'formal';
  notes?: string;
}

export interface TripDailyOutfit {
  date: string;
  occasion: string;
  weather?: string;
  items: string[]; // wardrobe item names
  outfitScore?: number;
  reasoning: string;
  risks?: string[];
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  source: 'wardrobe' | 'suggested' | 'missing';
  wardrobeItemId?: string;
  quantity: number;
  packed: boolean;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface MissingItem {
  name: string;
  category: string;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface TripPlan {
  id: string;
  destinationCity: string;
  destinationCountry?: string;
  startDate: string;
  endDate: string;
  purpose: string;
  occasions: TripOccasion[];
  luggageType: string;
  laundryAvailable: boolean;
  weatherSummary?: TravelWeather;
  dailyOutfits: TripDailyOutfit[];
  packingItems: PackingItem[];
  missingItems: MissingItem[];
  riskNotes: string[];
  capsuleNotes?: string;
  aiSummary?: string;
  aiEnhanced: boolean;
  createdAt: string;
}

// ── Occasion / Calendar Intelligence (v0.9) ───────────────────────────────

export type OccasionType =
  | 'Business Meeting'
  | 'Dinner'
  | 'Wedding'
  | 'Brunch'
  | 'Travel'
  | 'Casual'
  | 'Formal Event'
  | 'Family'
  | 'Date Night'
  | 'Other';

export type OccasionFormality =
  | 'Casual'
  | 'Smart Casual'
  | 'Business'
  | 'Cocktail'
  | 'Formal'
  | 'Black Tie';

export interface OccasionOutfitRecommendation {
  items: string[];
  outfitScore: number;
  formalityFitScore: number;
  weatherFitScore: number;
  styleDNAFitScore: number;
  reasoning: string;
  risks: string[];
  missingItems: MissingItem[];
  alternatives: string[];
  aiEnhanced?: boolean;
}

export interface OccasionEvent {
  id: string;
  title: string;
  eventType: OccasionType;
  date: string;
  startTime?: string;
  endTime?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  countryCode?: string;
  formality: OccasionFormality;
  notes?: string;
  weatherContext?: TravelWeather;
  recommendedOutfit?: OccasionOutfitRecommendation;
  outfitStatus: 'pending' | 'accepted' | 'rejected' | 'edited';
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyOccasionBrief {
  upcomingEvents: OccasionEvent[];
  preparedEvents: OccasionEvent[];
  unpreparedEvents: OccasionEvent[];
  missingItems: MissingItem[];
  weatherRisks: string[];
  summary: string;
}

// ── Shopping Link Intelligence (v1.2) ─────────────────────────────────────

export type ShoppingDecision = 'Buy' | 'Wait' | 'Skip';

export type ShoppingExtractionSource =
  | 'metadata'
  | 'open_graph'
  | 'json_ld'
  | 'manual'
  | 'screenshot';

export type ShoppingExtractionStatus =
  | 'success'
  | 'partial'
  | 'manual_required'
  | 'blocked'
  | 'error';

export interface ShoppingProduct {
  id: string;
  url: string;
  title?: string;
  brand?: string;
  price?: number;
  currency?: string;
  category?: string;
  color?: string;
  material?: string;
  description?: string;
  imageUrls: string[];
  availableSizes: string[];
  sizeGuide: Record<string, unknown>;
  extractedAt?: string;
  extractionSource?: ShoppingExtractionSource;
  extractionStatus?: ShoppingExtractionStatus;
  createdAt: string;
}

export interface ShoppingRecommendation {
  id: string;
  productId: string;
  decision: ShoppingDecision;
  confidenceScore: number;
  wardrobeMatchScore: number;
  styleDNAFitScore: number;
  sizeFitScore: number;
  duplicateRiskScore: number;
  occasionUsefulnessScore: number;
  tripUsefulnessScore: number;
  reasoning: string;
  risks: string[];
  sizeNotes?: string;
  wardrobeMatches: string[];
  outfitIdeas: string[];
  missingGapMatch: { gap?: string; relevant?: boolean };
  alternatives: string[];
  aiEnhanced?: boolean;
  createdAt: string;
}

// ── App State ─────────────────────────────────────────────────────────────────

export interface AppState {
  user: UserProfile;
  wardrobe: WardrobeItem[];
  inspirations: InspirationItem[];
  outfits: SavedOutfit[];
  orders: Order[];
  stylistBookings: StylistBooking[];
  feedback: FeedbackEvent[];
  styleDNA?: StyleDNAProfile;
  tripPlans: TripPlan[];
  occasionEvents: OccasionEvent[];
  shoppingProducts: ShoppingProduct[];
  shoppingRecommendations: ShoppingRecommendation[];
}

export type View =
  | 'home'
  | 'wardrobe'
  | 'inspiration'
  | 'shopping'
  | 'packing'
  | 'occasions'
  | 'stylist'
  | 'analytics'
  | 'settings';
