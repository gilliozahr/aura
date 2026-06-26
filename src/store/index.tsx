'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { AppState, FeedbackEvent, InspirationItem, Order, StylistBooking, UserProfile, WardrobeItem } from '@/lib/types';
import { defaultState } from './default';
import { useAuth } from './auth';
import { useToast } from './toast';
import { LocalRepository, SupabaseRepository } from '@/lib/repository';
import type { IRepository } from '@/lib/repository';

type Action =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'SET_USER'; payload: UserProfile }
  | { type: 'ADD_WARDROBE_ITEM'; payload: WardrobeItem }
  | { type: 'SET_WARDROBE'; payload: WardrobeItem[] }
  | { type: 'ADD_INSPIRATION'; payload: InspirationItem }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'ADD_STYLIST_BOOKING'; payload: StylistBooking }
  | { type: 'ADD_FEEDBACK'; payload: FeedbackEvent }
  | { type: 'INCREMENT_WEARS'; itemIds: string[] }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_WARDROBE_ITEM':
      return { ...state, wardrobe: [...state.wardrobe, action.payload] };
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
    case 'INCREMENT_WEARS':
      return {
        ...state,
        wardrobe: state.wardrobe.map(item =>
          action.itemIds.includes(item.id) ? { ...item, wears: item.wears + 1 } : item
        ),
      };
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

  // Recreate repo when the authenticated user changes (sign in / sign out).
  // isSupabaseConfigured is a module-level constant so it only changes once.
  const repo: IRepository = useMemo(
    () => (isSupabaseConfigured ? new SupabaseRepository() : new LocalRepository()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSupabaseConfigured, user?.id]
  );

  // Wait for auth to fully resolve before loading state.
  // Without this guard, the first loadState() call races against AuthProvider's
  // getUser() call. If the first call's getUser() returns null (stale context)
  // and completes after the second call has already hydrated with real data,
  // it overwrites the real data with defaultState().
  useEffect(() => {
    if (loading) return;
    repo.loadState().then(loaded => dispatch({ type: 'HYDRATE', payload: loaded }));
  }, [repo, loading]);

  // Targeted persistence: each dispatch syncs only the affected record.
  // Errors are both logged and surfaced as toasts so the user knows a save failed.
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
      case 'INCREMENT_WEARS':
        persist(repo.incrementWears(action.itemIds, s.wardrobe));
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
