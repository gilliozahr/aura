import type { OutfitPlan,
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

export interface IRepository {
  loadState(): Promise<AppState>;
  saveUser(user: UserProfile): Promise<void>;
  addWardrobeItem(item: WardrobeItem): Promise<void>;
  updateWardrobeItem(item: WardrobeItem): Promise<void>;
  deleteWardrobeItem(id: string): Promise<void>;
  setWardrobe(items: WardrobeItem[]): Promise<void>;
  addInspiration(item: InspirationItem): Promise<void>;
  addOrder(order: Order): Promise<void>;
  addStylistBooking(booking: StylistBooking): Promise<void>;
  addFeedback(event: FeedbackEvent): Promise<void>;
  addSavedOutfit(outfit: SavedOutfit): Promise<void>;
  incrementWears(itemIds: string[], currentWardrobe: WardrobeItem[]): Promise<void>;
  upsertStyleDNA(profile: StyleDNAProfile): Promise<void>;
  getTripPlans(): Promise<TripPlan[]>;
  saveTripPlan(plan: TripPlan): Promise<void>;
  updateTripPlan(id: string, updates: Partial<TripPlan>): Promise<void>;
  deleteTripPlan(id: string): Promise<void>;
  getOccasionEvents(): Promise<OccasionEvent[]>;
  saveOccasionEvent(event: OccasionEvent): Promise<void>;
  updateOccasionEvent(id: string, updates: Partial<OccasionEvent>): Promise<void>;
  deleteOccasionEvent(id: string): Promise<void>;
  getShoppingProducts(): Promise<ShoppingProduct[]>;
  saveShoppingProduct(product: ShoppingProduct): Promise<void>;
  deleteShoppingProduct(id: string): Promise<void>;
  getShoppingRecommendations(): Promise<ShoppingRecommendation[]>;
  saveShoppingRecommendation(rec: ShoppingRecommendation): Promise<void>;
  getOutfitPlans(): Promise<OutfitPlan[]>;
  saveOutfitPlan(plan: Omit<OutfitPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<OutfitPlan>;
  updateOutfitPlan(planDate: string, updates: Partial<OutfitPlan>): Promise<OutfitPlan>;
  deleteOutfitPlan(planDate: string): Promise<void>;
  reset(): Promise<void>;
  uploadImage(
    file: File,
    bucket: 'wardrobe-images' | 'inspiration-images'
  ): Promise<string | null>;
}

export { LocalRepository } from './local';
export { SupabaseRepository } from './supabase';
