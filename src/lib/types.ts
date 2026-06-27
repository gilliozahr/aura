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

export interface FeedbackEvent {
  id: string;
  type: string;
  score: number;
  at: string;
}

export interface AppState {
  user: UserProfile;
  wardrobe: WardrobeItem[];
  inspirations: InspirationItem[];
  outfits: unknown[];
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
