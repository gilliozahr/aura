import type {
  AppState,
  FeedbackEvent,
  InspirationItem,
  Order,
  SavedOutfit,
  StylistBooking,
  UserProfile,
  WardrobeItem,
} from '@/lib/types';

export interface IRepository {
  loadState(): Promise<AppState>;
  saveUser(user: UserProfile): Promise<void>;
  addWardrobeItem(item: WardrobeItem): Promise<void>;
  setWardrobe(items: WardrobeItem[]): Promise<void>;
  addInspiration(item: InspirationItem): Promise<void>;
  addOrder(order: Order): Promise<void>;
  addStylistBooking(booking: StylistBooking): Promise<void>;
  addFeedback(event: FeedbackEvent): Promise<void>;
  addSavedOutfit(outfit: SavedOutfit): Promise<void>;
  incrementWears(itemIds: string[], currentWardrobe: WardrobeItem[]): Promise<void>;
  reset(): Promise<void>;
  uploadImage(
    file: File,
    bucket: 'wardrobe-images' | 'inspiration-images'
  ): Promise<string | null>;
}

export { LocalRepository } from './local';
export { SupabaseRepository } from './supabase';
