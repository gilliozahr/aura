import type {
  AppState,
  FeedbackEvent,
  InspirationItem,
  Order,
  StylistBooking,
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

  async incrementWears(itemIds: string[], currentWardrobe: WardrobeItem[]): Promise<void> {
    const updated = currentWardrobe.map(item =>
      itemIds.includes(item.id) ? { ...item, wears: item.wears + 1 } : item
    );
    this.write({ ...this.read(), wardrobe: updated });
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
