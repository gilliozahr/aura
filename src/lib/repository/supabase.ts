import type {
  AppState,
  FeedbackEvent,
  InspirationItem,
  InspirationReport,
  OccasionEvent,
  OccasionFormality,
  OccasionOutfitRecommendation,
  OccasionType,
  Order,
  OutfitReport,
  SavedOutfit,
  StyleDNAProfile,
  StylistBooking,
  TripPlan,
  TravelWeather,
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
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  ai_metadata?: Record<string, unknown> | null;
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
  payload: Record<string, unknown> | null;
  created_at: string;
}
interface SavedOutfitRow {
  id: string;
  outfit_items: WardrobeItem[];
  report: OutfitReport;
  feedback: string | null;
  created_at: string;
}

interface OccasionEventRow {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  country_code: string | null;
  formality: string;
  notes: string | null;
  weather_context: Record<string, unknown> | null;
  recommended_outfit: OccasionOutfitRecommendation | null;
  outfit_status: string;
  created_at: string;
  updated_at: string;
}

function rowToOccasionEvent(r: OccasionEventRow): OccasionEvent {
  const wc = r.weather_context;
  const weatherContext: TravelWeather | undefined =
    wc && typeof wc === 'object' && 'available' in wc && (wc as { available: unknown }).available
      ? (wc as unknown as TravelWeather)
      : undefined;
  return {
    id: r.id,
    title: r.title,
    eventType: r.event_type as OccasionType,
    date: r.event_date,
    startTime: r.start_time ?? undefined,
    endTime: r.end_time ?? undefined,
    city: r.city ?? undefined,
    country: r.country ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    countryCode: r.country_code ?? undefined,
    formality: r.formality as OccasionFormality,
    notes: r.notes ?? undefined,
    weatherContext,
    recommendedOutfit: r.recommended_outfit ?? undefined,
    outfitStatus: (r.outfit_status as OccasionEvent['outfitStatus']) ?? 'pending',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class SupabaseRepository implements IRepository {
  private get client() {
    return createAuraClient();
  }

  private async getAuthUser() {
    const { data: { user } } = await this.client.auth.getUser();
    return user;
  }

  private async userId(): Promise<string | null> {
    return (await this.getAuthUser())?.id ?? null;
  }

  async loadState(): Promise<AppState> {
    const authUser = await this.getAuthUser();
    if (!authUser) return defaultState();
    const uid = authUser.id;

    const [profileRes, wardrobeRes, inspirationsRes, ordersRes, bookingsRes, feedbackRes, outfitsRes, dnaRes, tripPlansRes, occasionEventsRes] =
      await Promise.all([
        this.client.from('user_profiles').select('*').eq('id', uid).single(),
        this.client.from('wardrobe_items').select('*').eq('user_id', uid),
        this.client.from('inspiration_items').select('*').eq('user_id', uid),
        this.client.from('orders').select('*').eq('user_id', uid),
        this.client.from('stylist_bookings').select('*').eq('user_id', uid),
        this.client.from('feedback_events').select('*').eq('user_id', uid),
        this.client.from('saved_outfits').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
        this.client.from('style_dna_profiles').select('*').eq('user_id', uid).maybeSingle(),
        this.client.from('trip_plans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        this.client.from('occasion_events').select('*').eq('user_id', uid).order('event_date', { ascending: true }),
      ]);

    if (wardrobeRes.error) console.error('[SupabaseRepository] loadState/wardrobe:', wardrobeRes.error.message);
    if (inspirationsRes.error) console.error('[SupabaseRepository] loadState/inspirations:', inspirationsRes.error.message);
    if (ordersRes.error) console.error('[SupabaseRepository] loadState/orders:', ordersRes.error.message);
    if (outfitsRes.error) console.error('[SupabaseRepository] loadState/outfits:', outfitsRes.error.message);

    const def = defaultState();

    let profileRow = profileRes.data as unknown as UserProfileRow | null;

    // No profile row yet — seed from auth metadata and upsert so next load finds it
    if (!profileRow) {
      const meta = authUser.user_metadata as Record<string, unknown> | undefined;
      const seedName = (
        (meta?.full_name as string | undefined) ||
        (meta?.name as string | undefined) ||
        (meta?.display_name as string | undefined) ||
        ''
      ).trim();
      const seed: UserProfileRow = {
        id: uid,
        name: seedName,
        city: def.user.city,
        temperature: def.user.temperature,
        occasion: def.user.occasion,
        style_goal: def.user.styleGoal,
        budget: def.user.budget,
      };
      const { error: upsertErr } = await this.client.from('user_profiles').upsert(seed);
      if (upsertErr) {
        console.error('[SupabaseRepository] loadState/upsert-profile:', upsertErr.message);
      } else {
        profileRow = seed;
      }
    }

    const user: UserProfile = profileRow
      ? {
          name: profileRow.name,
          city: profileRow.city,
          country: profileRow.country ?? undefined,
          latitude: profileRow.latitude ?? undefined,
          longitude: profileRow.longitude ?? undefined,
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
      aiMetadata: r.ai_metadata as WardrobeItem['aiMetadata'] ?? undefined,
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
      payload: r.payload ?? undefined,
      at: r.created_at,
    }));

    const outfits: SavedOutfit[] = (
      (outfitsRes.data ?? []) as unknown as SavedOutfitRow[]
    ).map(r => ({
      id: r.id,
      outfitItems: r.outfit_items,
      report: r.report,
      feedback: (r.feedback as SavedOutfit['feedback']) ?? undefined,
      createdAt: r.created_at,
    }));

    const dnaRow = dnaRes.data as Record<string, unknown> | null;
    const styleDNA: StyleDNAProfile | undefined = dnaRow
      ? {
          preferredColors: (dnaRow.preferred_colors as StyleDNAProfile['preferredColors']) ?? [],
          avoidedColors: (dnaRow.avoided_colors as StyleDNAProfile['avoidedColors']) ?? [],
          preferredCategories: (dnaRow.preferred_categories as StyleDNAProfile['preferredCategories']) ?? [],
          preferredStyleTags: (dnaRow.preferred_style_tags as StyleDNAProfile['preferredStyleTags']) ?? [],
          avoidedStyleTags: (dnaRow.avoided_style_tags as StyleDNAProfile['avoidedStyleTags']) ?? [],
          preferredOccasions: (dnaRow.preferred_occasions as StyleDNAProfile['preferredOccasions']) ?? [],
          wardrobeGaps: (dnaRow.wardrobe_gaps as string[]) ?? [],
          favoriteOutfitPatterns: (dnaRow.favorite_outfit_patterns as string[]) ?? [],
          rejectedOutfitPatterns: (dnaRow.rejected_outfit_patterns as string[]) ?? [],
          confidenceScore: (dnaRow.confidence_score as number) ?? 0,
          signalCount: (dnaRow.signal_count as number) ?? 0,
          lastComputedAt: (dnaRow.last_computed_at as string) ?? new Date().toISOString(),
        }
      : undefined;

    interface TripPlanRow {
      id: string;
      destination_city: string;
      destination_country?: string | null;
      start_date: string;
      end_date: string;
      purpose: string;
      occasions: TripPlan['occasions'];
      luggage_type: string;
      laundry_available: boolean;
      weather_summary?: TripPlan['weatherSummary'] | null;
      daily_outfits: TripPlan['dailyOutfits'];
      packing_items: TripPlan['packingItems'];
      missing_items: TripPlan['missingItems'];
      risk_notes: string[];
      capsule_notes?: string | null;
      ai_summary?: string | null;
      ai_enhanced: boolean;
      created_at: string;
    }

    const tripPlans: TripPlan[] = ((tripPlansRes.data ?? []) as unknown as TripPlanRow[]).map(r => ({
      id: r.id,
      destinationCity: r.destination_city,
      destinationCountry: r.destination_country ?? undefined,
      startDate: r.start_date,
      endDate: r.end_date,
      purpose: r.purpose,
      occasions: r.occasions ?? [],
      luggageType: r.luggage_type,
      laundryAvailable: r.laundry_available,
      weatherSummary: r.weather_summary ?? undefined,
      dailyOutfits: r.daily_outfits ?? [],
      packingItems: r.packing_items ?? [],
      missingItems: r.missing_items ?? [],
      riskNotes: r.risk_notes ?? [],
      capsuleNotes: r.capsule_notes ?? undefined,
      aiSummary: r.ai_summary ?? undefined,
      aiEnhanced: r.ai_enhanced,
      createdAt: r.created_at,
    }));

    const occasionEvents: OccasionEvent[] = ((occasionEventsRes.data ?? []) as unknown as OccasionEventRow[]).map(rowToOccasionEvent);

    return { user, wardrobe, inspirations, outfits, orders, stylistBookings, feedback, styleDNA, tripPlans, occasionEvents };
  }

  private assertNoError(error: { message: string } | null, ctx: string): void {
    if (error) {
      console.error(`[SupabaseRepository] ${ctx}:`, error.message);
      throw new Error(`DB error (${ctx}): ${error.message}`);
    }
  }

  async saveUser(user: UserProfile): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('user_profiles').upsert({
      id: uid,
      name: user.name,
      city: user.city,
      country: user.country ?? null,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      temperature: user.temperature,
      occasion: user.occasion,
      style_goal: user.styleGoal,
      budget: user.budget,
    });
    this.assertNoError(error, 'saveUser');
  }

  async addWardrobeItem(item: WardrobeItem): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('wardrobe_items').insert({
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
      ai_metadata: item.aiMetadata ?? null,
    });
    this.assertNoError(error, 'addWardrobeItem');
  }

  async setWardrobe(items: WardrobeItem[]): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error: delErr } = await this.client.from('wardrobe_items').delete().eq('user_id', uid);
    this.assertNoError(delErr, 'setWardrobe/delete');
    if (items.length === 0) return;
    const { error: insErr } = await this.client.from('wardrobe_items').insert(
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
        ai_metadata: item.aiMetadata ?? null,
      }))
    );
    this.assertNoError(insErr, 'setWardrobe/insert');
  }

  async addInspiration(item: InspirationItem): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('inspiration_items').insert({
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
    this.assertNoError(error, 'addInspiration');
  }

  async addOrder(order: Order): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('orders').insert({
      id: order.id,
      user_id: uid,
      item_name: order.itemName,
      price: order.price,
      status: order.status,
    });
    this.assertNoError(error, 'addOrder');
  }

  async addStylistBooking(booking: StylistBooking): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('stylist_bookings').insert({
      id: booking.id,
      user_id: uid,
      stylist: booking.stylist,
      status: booking.status,
    });
    this.assertNoError(error, 'addStylistBooking');
  }

  async addFeedback(event: FeedbackEvent): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('feedback_events').insert({
      id: event.id,
      user_id: uid,
      type: event.type,
      score: event.score,
      payload: event.payload ?? null,
    });
    this.assertNoError(error, 'addFeedback');
  }

  async addSavedOutfit(outfit: SavedOutfit): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('saved_outfits').insert({
      id: outfit.id,
      user_id: uid,
      outfit_items: outfit.outfitItems,
      report: outfit.report,
      feedback: outfit.feedback ?? null,
    });
    this.assertNoError(error, 'addSavedOutfit');
  }

  async incrementWears(itemIds: string[], currentWardrobe: WardrobeItem[]): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const results = await Promise.all(
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
    for (const { error } of results) {
      this.assertNoError(error, 'incrementWears');
    }
  }

  async upsertStyleDNA(profile: StyleDNAProfile): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('style_dna_profiles').upsert({
      user_id: uid,
      preferred_colors: profile.preferredColors,
      avoided_colors: profile.avoidedColors,
      preferred_categories: profile.preferredCategories,
      preferred_style_tags: profile.preferredStyleTags,
      avoided_style_tags: profile.avoidedStyleTags,
      preferred_occasions: profile.preferredOccasions,
      wardrobe_gaps: profile.wardrobeGaps,
      favorite_outfit_patterns: profile.favoriteOutfitPatterns,
      rejected_outfit_patterns: profile.rejectedOutfitPatterns,
      confidence_score: profile.confidenceScore,
      signal_count: profile.signalCount,
      last_computed_at: profile.lastComputedAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    this.assertNoError(error, 'upsertStyleDNA');
  }

  async getTripPlans(): Promise<TripPlan[]> {
    const uid = await this.userId();
    if (!uid) return [];
    const { data } = await this.client
      .from('trip_plans')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (!data) return [];
    return (data as unknown as Array<Record<string, unknown>>).map(r => ({
      id: r.id as string,
      destinationCity: r.destination_city as string,
      destinationCountry: (r.destination_country as string | null) ?? undefined,
      startDate: r.start_date as string,
      endDate: r.end_date as string,
      purpose: r.purpose as string,
      occasions: (r.occasions as TripPlan['occasions']) ?? [],
      luggageType: r.luggage_type as string,
      laundryAvailable: r.laundry_available as boolean,
      weatherSummary: (r.weather_summary as TripPlan['weatherSummary']) ?? undefined,
      dailyOutfits: (r.daily_outfits as TripPlan['dailyOutfits']) ?? [],
      packingItems: (r.packing_items as TripPlan['packingItems']) ?? [],
      missingItems: (r.missing_items as TripPlan['missingItems']) ?? [],
      riskNotes: (r.risk_notes as string[]) ?? [],
      capsuleNotes: (r.capsule_notes as string | null) ?? undefined,
      aiSummary: (r.ai_summary as string | null) ?? undefined,
      aiEnhanced: r.ai_enhanced as boolean,
      createdAt: r.created_at as string,
    }));
  }

  async saveTripPlan(plan: TripPlan): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('trip_plans').upsert({
      id: plan.id,
      user_id: uid,
      destination_city: plan.destinationCity,
      destination_country: plan.destinationCountry ?? null,
      start_date: plan.startDate,
      end_date: plan.endDate,
      purpose: plan.purpose,
      occasions: plan.occasions,
      luggage_type: plan.luggageType,
      laundry_available: plan.laundryAvailable,
      weather_summary: plan.weatherSummary ?? null,
      daily_outfits: plan.dailyOutfits,
      packing_items: plan.packingItems,
      missing_items: plan.missingItems,
      risk_notes: plan.riskNotes,
      capsule_notes: plan.capsuleNotes ?? null,
      ai_summary: plan.aiSummary ?? null,
      ai_enhanced: plan.aiEnhanced,
      created_at: plan.createdAt,
      updated_at: new Date().toISOString(),
    });
    this.assertNoError(error, 'saveTripPlan');
  }

  async updateTripPlan(id: string, updates: Partial<TripPlan>): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.packingItems !== undefined) row.packing_items = updates.packingItems;
    if (updates.dailyOutfits !== undefined) row.daily_outfits = updates.dailyOutfits;
    if (updates.missingItems !== undefined) row.missing_items = updates.missingItems;
    if (updates.riskNotes !== undefined) row.risk_notes = updates.riskNotes;
    if (updates.capsuleNotes !== undefined) row.capsule_notes = updates.capsuleNotes;
    if (updates.aiSummary !== undefined) row.ai_summary = updates.aiSummary;
    const { error } = await this.client
      .from('trip_plans')
      .update(row)
      .eq('id', id)
      .eq('user_id', uid);
    this.assertNoError(error, 'updateTripPlan');
  }

  async deleteTripPlan(id: string): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client
      .from('trip_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);
    this.assertNoError(error, 'deleteTripPlan');
  }

  async getOccasionEvents(): Promise<OccasionEvent[]> {
    const uid = await this.userId();
    if (!uid) return [];
    const { data } = await this.client
      .from('occasion_events')
      .select('*')
      .eq('user_id', uid)
      .order('event_date', { ascending: true });
    if (!data) return [];
    return (data as unknown as OccasionEventRow[]).map(rowToOccasionEvent);
  }

  async saveOccasionEvent(event: OccasionEvent): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client.from('occasion_events').insert({
      id: event.id,
      user_id: uid,
      title: event.title,
      event_type: event.eventType,
      event_date: event.date,
      start_time: event.startTime ?? null,
      end_time: event.endTime ?? null,
      city: event.city ?? null,
      country: event.country ?? null,
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      country_code: event.countryCode ?? null,
      formality: event.formality,
      notes: event.notes ?? null,
      weather_context: event.weatherContext ?? {},
      recommended_outfit: event.recommendedOutfit ?? null,
      outfit_status: event.outfitStatus,
    });
    this.assertNoError(error, 'saveOccasionEvent');
  }

  async updateOccasionEvent(id: string, updates: Partial<OccasionEvent>): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.eventType !== undefined) row.event_type = updates.eventType;
    if (updates.date !== undefined) row.event_date = updates.date;
    if (updates.startTime !== undefined) row.start_time = updates.startTime;
    if (updates.endTime !== undefined) row.end_time = updates.endTime;
    if (updates.city !== undefined) row.city = updates.city;
    if (updates.country !== undefined) row.country = updates.country;
    if (updates.latitude !== undefined) row.latitude = updates.latitude;
    if (updates.longitude !== undefined) row.longitude = updates.longitude;
    if (updates.countryCode !== undefined) row.country_code = updates.countryCode;
    if (updates.formality !== undefined) row.formality = updates.formality;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.weatherContext !== undefined) row.weather_context = updates.weatherContext;
    if (updates.recommendedOutfit !== undefined) row.recommended_outfit = updates.recommendedOutfit;
    if (updates.outfitStatus !== undefined) row.outfit_status = updates.outfitStatus;
    const { error } = await this.client
      .from('occasion_events')
      .update(row)
      .eq('id', id)
      .eq('user_id', uid);
    this.assertNoError(error, 'updateOccasionEvent');
  }

  async deleteOccasionEvent(id: string): Promise<void> {
    const uid = await this.userId();
    if (!uid) return;
    const { error } = await this.client
      .from('occasion_events')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);
    this.assertNoError(error, 'deleteOccasionEvent');
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
      this.client.from('saved_outfits').delete().eq('user_id', uid),
      this.client.from('style_dna_profiles').delete().eq('user_id', uid),
      this.client.from('trip_plans').delete().eq('user_id', uid),
      this.client.from('occasion_events').delete().eq('user_id', uid),
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
