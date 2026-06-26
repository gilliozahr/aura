'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { AppState, FeedbackEvent, InspirationItem, Order, StylistBooking, UserProfile, WardrobeItem } from '@/lib/types';
import { defaultState } from './default';
import { useAuth } from './auth';
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
  const { user, isSupabaseConfigured } = useAuth();
  const [state, dispatch] = useReducer(reducer, defaultState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const repo: IRepository = useMemo(
    () => (isSupabaseConfigured ? new SupabaseRepository() : new LocalRepository()),
    // re-create repo when auth state changes so we load the right data
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSupabaseConfigured, user?.id]
  );

  // Reload state when repo changes (auth sign-in/out)
  useEffect(() => {
    repo.loadState().then(loaded => dispatch({ type: 'HYDRATE', payload: loaded }));
  }, [repo]);

  // Targeted persistence: sync each action to repo without re-saving everything
  const syncAction = useCallback((action: Action) => {
    const s = stateRef.current;
    switch (action.type) {
      case 'SET_USER':
        void repo.saveUser(action.payload);
        break;
      case 'ADD_WARDROBE_ITEM':
        void repo.addWardrobeItem(action.payload);
        break;
      case 'SET_WARDROBE':
        void repo.setWardrobe(action.payload);
        break;
      case 'ADD_INSPIRATION':
        void repo.addInspiration(action.payload);
        break;
      case 'ADD_ORDER':
        void repo.addOrder(action.payload);
        break;
      case 'ADD_STYLIST_BOOKING':
        void repo.addStylistBooking(action.payload);
        break;
      case 'ADD_FEEDBACK':
        void repo.addFeedback(action.payload);
        break;
      case 'INCREMENT_WEARS':
        void repo.incrementWears(action.itemIds, s.wardrobe);
        break;
      case 'RESET':
        void repo.reset();
        break;
    }
  }, [repo]);

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
