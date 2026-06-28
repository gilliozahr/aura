export interface WeatherContext {
  city: string;
  temperatureC: number;
  condition: string;
  humidity?: number;
  feelsLikeC?: number;
  available: boolean;
  timestamp: string;
}

export interface UserProfile {
  name: string;
  city: string;
  temperature: number;
  occasion: string;
  styleGoal: string;
  budget: number;
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

export interface AppState {
  user: UserProfile;
  wardrobe: WardrobeItem[];
  inspirations: InspirationItem[];
  outfits: SavedOutfit[];
  orders: Order[];
  stylistBookings: StylistBooking[];
  feedback: FeedbackEvent[];
}

export type View =
  | 'home'
  | 'wardrobe'
  | 'inspiration'
  | 'packing'
  | 'stylist'
  | 'analytics'
  | 'settings';
