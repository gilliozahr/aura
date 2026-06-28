'use client';

import type { View } from '@/lib/types';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { makeDemoItems, makeDemoInspirations, makeDemoOccasionEvents, makeDemoTripPlan, makeDemoSavedOutfit } from '@/store/default';

const VIEW_TITLES: Record<View, string> = {
  home: 'Daily Briefing',
  wardrobe: 'Wardrobe',
  inspiration: 'AI Inspiration',
  packing: 'Packing',
  occasions: 'Occasions',
  stylist: 'Stylist Concierge',
  analytics: 'Analytics',
  settings: 'Settings',
};

export default function Topbar({ activeView }: { activeView: View }) {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  const profileName = state.user.name?.trim();
  const eyebrow = profileName ? `Welcome back, ${profileName}` : 'AURA STYLE INTELLIGENCE';
  const showDemoTools = process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS === 'true';

  function handleSeed() {
    const wardrobe = makeDemoItems();
    dispatch({ type: 'SET_WARDROBE', payload: wardrobe });

    for (const item of makeDemoInspirations()) {
      dispatch({ type: 'ADD_INSPIRATION', payload: item });
    }

    for (const event of makeDemoOccasionEvents()) {
      dispatch({ type: 'ADD_OCCASION_EVENT', payload: event });
    }

    dispatch({ type: 'ADD_TRIP_PLAN', payload: makeDemoTripPlan() });

    const savedOutfit = makeDemoSavedOutfit(wardrobe);
    if (savedOutfit) dispatch({ type: 'ADD_SAVED_OUTFIT', payload: savedOutfit });

    toast('Demo data loaded — wardrobe, occasions, trip, inspirations, and saved outfit.');
  }

  function handleReset() {
    if (!confirm('Clear all AURA demo data?')) return;
    dispatch({ type: 'RESET' });
    toast('AURA data cleared.');
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{VIEW_TITLES[activeView]}</h1>
      </div>
      {showDemoTools && (
        <div className="top-actions">
          <button className="ghost" onClick={handleSeed}>Load Demo Data</button>
          <button className="danger" onClick={handleReset}>Clear Data</button>
        </div>
      )}
    </header>
  );
}
