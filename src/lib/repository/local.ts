import type {
  AppState,
  FeedbackEvent,
  InspirationItem,
  OccasionEvent,
  Order,
  SavedOutfit,
  ShoppingProduct,
  ShoppingRecommendation,
  StyleDNAProfile,
  StylistBooking,
  TripPlan,
  UserProfile,
  WardrobeItem,
} from '@/lib/types';
import { defaultState } from '@/store/default';
import type { IRepository } from './index';

const STORE_KEY = 'aura.v0.2.state';

export class LocalRepository implements IRepository {
  private read(): AppState {
    if (typeof window === 'undefined') return defaultState();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) as AppState) : defaultState();
    } catch {
      return defaultState();
    }
  }

  private write(state: AppState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      console.warn('[LocalRepository] failed to persist state');
    }
  }

  async loadState(): Promise<AppState> {
    return this.read();
  }

  async saveUser(user: UserProfile): Promise<void> {
    this.write({ ...this.read(), user });
  }

  async addWardrobeItem(item: WardrobeItem): Promise<void> {
    const s = this.read();
    this.write({ ...s, wardrobe: [...s.wardrobe, item] });
  }

  async updateWardrobeItem(item: WardrobeItem): Promise<void> {
    const s = this.read();
    this.write({ ...s, wardrobe: s.wardrobe.map(w => w.id === item.id ? item : w) });
  }

  async deleteWardrobeItem(id: string): Promise<void> {
    const s = this.read();
    this.write({ ...s, wardrobe: s.wardrobe.filter(w => w.id !== id) });
  }

  async setWardrobe(items: WardrobeItem[]): Promise<void> {
    this.write({ ...this.read(), wardrobe: items });
  }

  async addInspiration(item: InspirationItem): Promise<void> {
    const s = this.read();
    this.write({ ...s, inspirations: [...s.inspirations, item] });
  }

  async addOrder(order: Order): Promise<void> {
    const s = this.read();
    this.write({ ...s, orders: [...s.orders, order] });
  }

  async addStylistBooking(booking: StylistBooking): Promise<void> {
    const s = this.read();
    this.write({ ...s, stylistBookings: [...s.stylistBookings, booking] });
  }

  async addFeedback(event: FeedbackEvent): Promise<void> {
    const s = this.read();
    this.write({ ...s, feedback: [...s.feedback, event] });
  }

  async addSavedOutfit(outfit: SavedOutfit): Promise<void> {
    const s = this.read();
    this.write({ ...s, outfits: [...s.outfits, outfit] });
  }

  async incrementWears(itemIds: string[], currentWardrobe: WardrobeItem[]): Promise<void> {
    const updated = currentWardrobe.map(item =>
      itemIds.includes(item.id) ? { ...item, wears: item.wears + 1 } : item
    );
    this.write({ ...this.read(), wardrobe: updated });
  }

  async upsertStyleDNA(profile: StyleDNAProfile): Promise<void> {
    this.write({ ...this.read(), styleDNA: profile });
  }

  async getTripPlans(): Promise<TripPlan[]> {
    return this.read().tripPlans ?? [];
  }

  async saveTripPlan(plan: TripPlan): Promise<void> {
    const s = this.read();
    this.write({ ...s, tripPlans: [plan, ...(s.tripPlans ?? [])] });
  }

  async updateTripPlan(id: string, updates: Partial<TripPlan>): Promise<void> {
    const s = this.read();
    this.write({
      ...s,
      tripPlans: (s.tripPlans ?? []).map(p => (p.id === id ? { ...p, ...updates } : p)),
    });
  }

  async deleteTripPlan(id: string): Promise<void> {
    const s = this.read();
    this.write({ ...s, tripPlans: (s.tripPlans ?? []).filter(p => p.id !== id) });
  }

  async getOccasionEvents(): Promise<OccasionEvent[]> {
    return this.read().occasionEvents ?? [];
  }

  async saveOccasionEvent(event: OccasionEvent): Promise<void> {
    const s = this.read();
    this.write({ ...s, occasionEvents: [...(s.occasionEvents ?? []), event] });
  }

  async updateOccasionEvent(id: string, updates: Partial<OccasionEvent>): Promise<void> {
    const s = this.read();
    this.write({
      ...s,
      occasionEvents: (s.occasionEvents ?? []).map(e => (e.id === id ? { ...e, ...updates } : e)),
    });
  }

  async deleteOccasionEvent(id: string): Promise<void> {
    const s = this.read();
    this.write({ ...s, occasionEvents: (s.occasionEvents ?? []).filter(e => e.id !== id) });
  }

  async getShoppingProducts(): Promise<ShoppingProduct[]> {
    return this.read().shoppingProducts ?? [];
  }

  async saveShoppingProduct(product: ShoppingProduct): Promise<void> {
    const s = this.read();
    const existing = s.shoppingProducts ?? [];
    this.write({ ...s, shoppingProducts: [product, ...existing.filter(p => p.id !== product.id)] });
  }

  async deleteShoppingProduct(id: string): Promise<void> {
    const s = this.read();
    this.write({ ...s, shoppingProducts: (s.shoppingProducts ?? []).filter(p => p.id !== id) });
  }

  async getShoppingRecommendations(): Promise<ShoppingRecommendation[]> {
    return this.read().shoppingRecommendations ?? [];
  }

  async saveShoppingRecommendation(rec: ShoppingRecommendation): Promise<void> {
    const s = this.read();
    const existing = s.shoppingRecommendations ?? [];
    this.write({ ...s, shoppingRecommendations: [rec, ...existing.filter(r => r.id !== rec.id)] });
  }

  async reset(): Promise<void> {
    if (typeof window !== 'undefined') localStorage.removeItem(STORE_KEY);
  }

  async uploadImage(
    _file: File,
    _bucket: 'wardrobe-images' | 'inspiration-images'
  ): Promise<string | null> {
    return null; // signals caller to use base64 fallback
  }
}
