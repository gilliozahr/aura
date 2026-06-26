import type {
  AppState,
  FeedbackEvent,
  InspirationItem,
  InspirationReport,
  Order,
  StylistBooking,
  UserProfile,
  WardrobeItem,
} from '@/lib/types';
import { defaultState } from '@/store/default';
import { createAuraClient } from '@/lib/supabase/client';
import type { IRepository } from './index';

// ── DB row shapes matching supabase/schema.sql ─────────────────────────────
interface UserProfileRow {
  id: string;
  name: string;
  city: string;
  temperature: number;
  occasion: string;
  style_goal: string;
  budget: number;
}
interface WardrobeRow {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  occasion: string;
  style: string;
  wears: number;
  confidence: number;
  image_url: string;
}
interface InspirationRow {
  id: string;
  name: string;
  category: string;
  color: string;
  style: string;
  price: number;
  image_url: string;
  report: InspirationReport;
  created_at: string;
}
interface OrderRow {
  id: string;
  item_name: string;
  price: number;
  status: string;
  created_at: string;
}
interface StylistBookingRow {
  id: string;
  stylist: string;
  status: string;
  booked_at: string;
}
interface FeedbackRow {
  id: string;
  type: string;
  score: number;
  created_at: string;
}

export class SupabaseRepository implements IRepository {
  private get client() {
    return createAuraClient();
  }

  private async userId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user?.id ?? null;
  }

  async loadState(): Promise<AppState> {
    const uid = await this.userId();
    if (!uid) return defaultState();

    const [profileRes, wardrobeRes, inspirationsRes, ordersRes, bookingsRes, feedbackRes] =
      await Promise.all([
        this.client.from('user_profiles').select('*').eq('id', uid).single(),
        this.client.from('wardrobe_items').select('*').eq('user_id', uid),
        this.client.from('inspiration_items').select('*').eq('user_id', uid),
        this.client.from('orders').select('*').eq('user_id', uid),
        this.client.from('stylist_bookings').select('*').eq('user_id', uid),
        this.client.from('feedback_events').select('*').eq('user_id', uid),
      ]);

    const def = defaultState();

    const profileRow = profileRes.data as unknown as UserProfileRow | null;
    const user: UserProfile = profileRow
      ? {
          name: profileRow.name,
          city: profileRow.city,
          temperature: profileRow.temperature,
          occasion: profileRow.occasion,
          styleGoal: profileRow.style_goal,
          budget: profileRow.budget,
        }
      : def.user;

    const wardrobe: WardrobeItem[] = (
      (wardrobeRes.data ?? []) as unknown as WardrobeRow[]
    ).map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      color: r.color,
      season: r.season,
      occasion: r.occasion,
      style: r.style,
      wears: r.wears,
      confidence: r.confidence,
      image: r.image_url,
    }));

    const inspirations: InspirationItem[] = (
      (inspirationsRes.data ?? []) as unknown as InspirationRow[]
    ).map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      color: r.color,
      style: r.style,
      price: r.price,
      image: r.image_url,
      report: r.report,
      createdAt: r.created_at,
    }));

    const orders: Order[] = ((ordersRes.data ?? []) as unknown as OrderRow[]).map(r => ({
      id: r.id,
      itemName: r.item_name,
      price: r.price,
      status: r.status,
      createdAt: r.created_at,
    }));

    const stylistBookings: StylistBooking[] = (
      (bookingsRes.data ?? []) as unknown as StylistBookingRow[]
    ).map(r => ({
      id: r.id,
      stylist: r.stylist,
      at: r.booked_at,
      status: r.status,
    }));

    const feedback: FeedbackEvent[] = (
      (feedbackRes.data ?? []) as unknown as FeedbackRow[]
    ).map(r => ({
      id: r.id,
      type: r.type,
      score: r.score,
      at: r.created_at,
    }));

    return { user, wardrobe, inspirations, outfits: [], orders, stylistBookings, feedback };
  }

  async saveUser(user: UserProfile): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await this.client.from('user_profiles').upsert({
      id: uid,
      name: user.name,
      city: user.city,
      temperature: user.temperature,
      occasion: user.occasion,
      style_goal: user.styleGoal,
      budget: user.budget,
    });
  }

  async addWardrobeItem(item: WardrobeItem): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await this.client.from('wardrobe_items').insert({
      id: item.id,
      user_id: uid,
      name: item.name,
      category: item.category,
      color: item.color,
      season: item.season,
      occasion: item.occasion,
      style: item.style,
      wears: item.wears,
      confidence: item.confidence,
      image_url: item.image,
    });
  }

  async setWardrobe(items: WardrobeItem[]): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await this.client.from('wardrobe_items').delete().eq('user_id', uid);
    if (items.length === 0) return;
    await this.client.from('wardrobe_items').insert(
      items.map(item => ({
        id: item.id,
        user_id: uid,
        name: item.name,
        category: item.category,
        color: item.color,
        season: item.season,
        occasion: item.occasion,
        style: item.style,
        wears: item.wears,
        confidence: item.confidence,
        image_url: item.image,
      }))
    );
  }

  async addInspiration(item: InspirationItem): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await this.client.from('inspiration_items').insert({
      id: item.id,
      user_id: uid,
      name: item.name,
      category: item.category,
      color: item.color,
      style: item.style,
      price: item.price,
      image_url: item.image,
      report: item.report,
    });
  }

  async addOrder(order: Order): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await this.client.from('orders').insert({
      id: order.id,
      user_id: uid,
      item_name: order.itemName,
      price: order.price,
      status: order.status,
    });
  }

  async addStylistBooking(booking: StylistBooking): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await this.client.from('stylist_bookings').insert({
      id: booking.id,
      user_id: uid,
      stylist: booking.stylist,
      status: booking.status,
    });
  }

  async addFeedback(event: FeedbackEvent): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await this.client.from('feedback_events').insert({
      id: event.id,
      user_id: uid,
      type: event.type,
      score: event.score,
    });
  }

  async incrementWears(itemIds: string[], currentWardrobe: WardrobeItem[]): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await Promise.all(
      currentWardrobe
        .filter(item => itemIds.includes(item.id))
        .map(item =>
          this.client
            .from('wardrobe_items')
            .update({ wears: item.wears + 1 })
            .eq('id', item.id)
            .eq('user_id', uid)
        )
    );
  }

  async reset(): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    await Promise.all([
      this.client.from('wardrobe_items').delete().eq('user_id', uid),
      this.client.from('inspiration_items').delete().eq('user_id', uid),
      this.client.from('orders').delete().eq('user_id', uid),
      this.client.from('stylist_bookings').delete().eq('user_id', uid),
      this.client.from('feedback_events').delete().eq('user_id', uid),
    ]);
  }

  async uploadImage(
    file: File,
    bucket: 'wardrobe-images' | 'inspiration-images'
  ): Promise<string | null> {
    const uid = await this.userId();
    if (!uid) return null;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error } = await this.client.storage.from(bucket).upload(path, file);
    if (error) {
      console.error('[SupabaseRepository] uploadImage:', error.message);
      return null;
    }
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
