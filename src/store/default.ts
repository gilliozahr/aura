import type { AppState, WardrobeItem } from '@/lib/types';
import { uid } from '@/lib/utils';

function makeDemoItems(): WardrobeItem[] {
  return [
    { id: uid(), name: 'Navy Blazer', category: 'Outerwear', color: 'Navy', season: 'All', occasion: 'Business', style: 'Quiet Luxury', wears: 18, confidence: 95, image: '' },
    { id: uid(), name: 'White Oxford Shirt', category: 'Top', color: 'White', season: 'All', occasion: 'Business', style: 'Classic', wears: 24, confidence: 92, image: '' },
    { id: uid(), name: 'Beige Chinos', category: 'Bottom', color: 'Beige', season: 'Summer', occasion: 'Smart Casual', style: 'Minimal', wears: 16, confidence: 88, image: '' },
    { id: uid(), name: 'Brown Loafers', category: 'Shoes', color: 'Brown', season: 'All', occasion: 'Business', style: 'Timeless', wears: 21, confidence: 94, image: '' },
    { id: uid(), name: 'White Sneakers', category: 'Shoes', color: 'White', season: 'All', occasion: 'Casual', style: 'Clean', wears: 30, confidence: 82, image: '' },
    { id: uid(), name: 'Camel Overshirt', category: 'Outerwear', color: 'Camel', season: 'Winter', occasion: 'Casual', style: 'Quiet Luxury', wears: 7, confidence: 89, image: '' },
    { id: uid(), name: 'Grey Wool Trousers', category: 'Bottom', color: 'Grey', season: 'Winter', occasion: 'Business', style: 'Classic', wears: 12, confidence: 90, image: '' },
    { id: uid(), name: 'Rolex GMT', category: 'Watch', color: 'Steel', season: 'All', occasion: 'Business', style: 'Luxury', wears: 44, confidence: 96, image: '' },
    { id: uid(), name: 'Oud Wood', category: 'Fragrance', color: 'Amber', season: 'Winter', occasion: 'Evening', style: 'Luxury', wears: 14, confidence: 93, image: '' },
  ];
}

export function defaultState(): AppState {
  return {
    user: {
      name: 'Gillio',
      city: 'Dubai',
      temperature: 34,
      occasion: 'Business Meeting',
      styleGoal: 'Quiet Luxury',
      budget: 1000,
    },
    wardrobe: [],
    inspirations: [],
    outfits: [],
    orders: [],
    stylistBookings: [],
    feedback: [],
    outfitPlans: [],
  };
}

export { makeDemoItems };
