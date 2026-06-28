'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { AppState, FeedbackEvent, InspirationItem, OccasionEvent, Order, SavedOutfit, StyleDNAProfile, StylistBooking, TripPlan, UserProfile, WardrobeItem } from '@/lib/types';
import { defaultState } from './default';
import { useAuth } from './auth';
import { useToast } from './toast';
import { LocalRepository, SupabaseRepository } from '@/lib/repository';
import type { IRepository } from '@/lib/repository';

type Action =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'SET_USER'; payload: UserProfile }
  | { type: 'ADD_WARDROBE_ITEM'; payload: WardrobeItem }
  | { type: 'UPDATE_WARDROBE_ITEM'; payload: WardrobeItem }
  | { type: 'DELETE_WARDROBE_ITEM'; id: string }
  | { type: 'SET_WARDROBE'; payload: WardrobeItem[] }
  | { type: 'ADD_INSPIRATION'; payload: InspirationItem }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'ADD_STYLIST_BOOKING'; payload: StylistBooking }
  | { type: 'ADD_FEEDBACK'; payload: FeedbackEvent }
  | { type: 'ADD_SAVED_OUTFIT'; payload: SavedOutfit }
  | { type: 'INCREMENT_WEARS'; itemIds: string[] }
  | { type: 'SET_STYLE_DNA'; payload: StyleDNAProfile }
  | { type: 'SET_TRIP_PLANS'; payload: TripPlan[] }
  | { type: 'ADD_TRIP_PLAN'; payload: TripPlan }
  | { type: 'UPDATE_TRIP_PLAN'; id: string; updates: Partial<TripPlan> }
  | { type: 'DELETE_TRIP_PLAN'; id: string }
  | { type: 'SET_OCCASION_EVENTS'; payload: OccasionEvent[] }
  | { type: 'ADD_OCCASION_EVENT'; payload: OccasionEvent }
  | { type: 'UPDATE_OCCASION_EVENT'; id: string; updates: Partial<OccasionEvent> }
  | { type: 'DELETE_OCCASION_EVENT'; id: string }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_WARDROBE_ITEM':
      return { ...state, wardrobe: [...state.wardrobe, action.payload] };
    case 'UPDATE_WARDROBE_ITEM':
      return { ...state, wardrobe: state.wardrobe.map(w => w.id === action.payload.id ? action.payload : w) };
    case 'DELETE_WARDROBE_ITEM':
      return { ...state, wardrobe: state.wardrobe.filter(w => w.id !== action.id) };
    case 'SET_WARDROBE':
      return { ...state, wardrobe: action.payload };
    case 'ADD_INSPIRATION':
      return { ...state, inspirations: [...state.inspirations, action.payload] };
    case 'ADD_ORDER':
      return { ...state, orders: [...state.orders, action.payload] };
    case 'ADD_STYLIST_BOOKING':
      return { ...state, stylistBookings: [...state.stylistBookings, action.payload] };
    case 'ADD_FEEDBACK':
      return { ...state, feedback: [...state.feedback, action.payload] };
    case 'ADD_SAVED_OUTFIT':
      return { ...state, outfits: [action.payload, ...state.outfits] };
    case 'INCREMENT_WEARS':
      return {
        ...state,
        wardrobe: state.wardrobe.map(item =>
          action.itemIds.includes(item.id) ? { ...item, wears: item.wears + 1 } : item
        ),
      };
    case 'SET_STYLE_DNA':
      return { ...state, styleDNA: action.payload };
    case 'SET_TRIP_PLANS':
      return { ...state, tripPlans: action.payload };
    case 'ADD_TRIP_PLAN':
      return { ...state, tripPlans: [action.payload, ...(state.tripPlans ?? [])] };
    case 'UPDATE_TRIP_PLAN':
      return {
        ...state,
        tripPlans: (state.tripPlans ?? []).map(p =>
          p.id === action.id ? { ...p, ...action.updates } : p
        ),
      };
    case 'DELETE_TRIP_PLAN':
      return { ...state, tripPlans: (state.tripPlans ?? []).filter(p => p.id !== action.id) };
    case 'SET_OCCASION_EVENTS':
      return { ...state, occasionEvents: action.payload };
    case 'ADD_OCCASION_EVENT':
      return { ...state, occasionEvents: [...(state.occasionEvents ?? []), action.payload] };
    case 'UPDATE_OCCASION_EVENT':
      return {
        ...state,
        occasionEvents: (state.occasionEvents ?? []).map(e =>
          e.id === action.id ? { ...e, ...action.updates } : e
        ),
      };
    case 'DELETE_OCCASION_EVENT':
      return { ...state, occasionEvents: (state.occasionEvents ?? []).filter(e => e.id !== action.id) };
    case 'RESET':
      return defaultState();
    default:
      return state;
  }
}

interface AuraContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  uploadImage: (file: File, bucket: 'wardrobe-images' | 'inspiration-images') => Promise<string | null>;
}

const AuraContext = createContext<AuraContextValue | null>(null);

export function AuraProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, isSupabaseConfigured } = useAuth();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(reducer, defaultState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const repo: IRepository = useMemo(
    () => (isSupabaseConfigured ? new SupabaseRepository() : new LocalRepository()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSupabaseConfigured, user?.id]
  );

  useEffect(() => {
    if (loading) return;
    repo.loadState().then(loaded => dispatch({ type: 'HYDRATE', payload: loaded }));
  }, [repo, loading]);

  const syncAction = useCallback((action: Action) => {
    const s = stateRef.current;
    const persist = (p: Promise<void>) =>
      p.catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[AuraStore] persist failed:', msg);
        toast(`Save failed: ${msg}`);
      });

    switch (action.type) {
      case 'SET_USER':
        persist(repo.saveUser(action.payload));
        break;
      case 'ADD_WARDROBE_ITEM':
        persist(repo.addWardrobeItem(action.payload));
        break;
      case 'UPDATE_WARDROBE_ITEM':
        persist(repo.updateWardrobeItem(action.payload));
        break;
      case 'DELETE_WARDROBE_ITEM':
        persist(repo.deleteWardrobeItem(action.id));
        break;
      case 'SET_WARDROBE':
        persist(repo.setWardrobe(action.payload));
        break;
      case 'ADD_INSPIRATION':
        persist(repo.addInspiration(action.payload));
        break;
      case 'ADD_ORDER':
        persist(repo.addOrder(action.payload));
        break;
      case 'ADD_STYLIST_BOOKING':
        persist(repo.addStylistBooking(action.payload));
        break;
      case 'ADD_FEEDBACK':
        persist(repo.addFeedback(action.payload));
        break;
      case 'ADD_SAVED_OUTFIT':
        persist(repo.addSavedOutfit(action.payload));
        break;
      case 'INCREMENT_WEARS':
        persist(repo.incrementWears(action.itemIds, s.wardrobe));
        break;
      case 'SET_STYLE_DNA':
        persist(repo.upsertStyleDNA(action.payload));
        break;
      case 'ADD_TRIP_PLAN':
        persist(repo.saveTripPlan(action.payload));
        break;
      case 'UPDATE_TRIP_PLAN':
        persist(repo.updateTripPlan(action.id, action.updates));
        break;
      case 'DELETE_TRIP_PLAN':
        persist(repo.deleteTripPlan(action.id));
        break;
      case 'ADD_OCCASION_EVENT':
        persist(repo.saveOccasionEvent(action.payload));
        break;
      case 'UPDATE_OCCASION_EVENT':
        persist(repo.updateOccasionEvent(action.id, action.updates));
        break;
      case 'DELETE_OCCASION_EVENT':
        persist(repo.deleteOccasionEvent(action.id));
        break;
      case 'RESET':
        persist(repo.reset());
        break;
    }
  }, [repo, toast]);

  const wrappedDispatch: React.Dispatch<Action> = useCallback((action: Action) => {
    dispatch(action);
    syncAction(action);
  }, [syncAction]);

  const uploadImage = useCallback(
    (file: File, bucket: 'wardrobe-images' | 'inspiration-images') =>
      repo.uploadImage(file, bucket),
    [repo]
  );

  return (
    <AuraContext.Provider value={{ state, dispatch: wrappedDispatch, uploadImage }}>
      {children}
    </AuraContext.Provider>
  );
}

export function useAura(): AuraContextValue {
  const ctx = useContext(AuraContext);
  if (!ctx) throw new Error('useAura must be used inside AuraProvider');
  return ctx;
}
