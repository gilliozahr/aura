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
