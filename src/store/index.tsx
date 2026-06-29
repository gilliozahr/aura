'use client';

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { AppState, FeedbackEvent, InspirationItem, Order, OutfitPlan, StylistBooking, UserProfile, WardrobeItem } from '@/lib/types';
import { defaultState } from './default';
import { getRepository } from '@/lib/repository';

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
  | { type: 'SET_OUTFIT_PLANS'; payload: OutfitPlan[] }
  | { type: 'UPSERT_OUTFIT_PLAN'; payload: OutfitPlan }
  | { type: 'DELETE_OUTFIT_PLAN'; planDate: string }
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
    case 'SET_OUTFIT_PLANS':
      return { ...state, outfitPlans: action.payload };
    case 'UPSERT_OUTFIT_PLAN':
      return {
        ...state,
        outfitPlans: [
          action.payload,
          ...(state.outfitPlans ?? []).filter(p => p.planDate !== action.payload.planDate),
        ],
      };
    case 'DELETE_OUTFIT_PLAN':
      return {
        ...state,
        outfitPlans: (state.outfitPlans ?? []).filter(p => p.planDate !== action.planDate),
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
}

const AuraContext = createContext<AuraContextValue | null>(null);

export function AuraProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState());

  useEffect(() => {
    getRepository()
      .loadState()
      .then(loaded => dispatch({ type: 'HYDRATE', payload: loaded }));
  }, []);

  useEffect(() => {
    getRepository().saveState(state);
  }, [state]);

  return <AuraContext.Provider value={{ state, dispatch }}>{children}</AuraContext.Provider>;
}

export function useAura(): AuraContextValue {
  const ctx = useContext(AuraContext);
  if (!ctx) throw new Error('useAura must be used inside AuraProvider');
  return ctx;
}
