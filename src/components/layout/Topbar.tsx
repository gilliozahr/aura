'use client';

import type { View } from '@/lib/types';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { makeDemoItems } from '@/store/default';

const VIEW_TITLES: Record<View, string> = {
  home: 'Daily Briefing',
  wardrobe: 'Wardrobe',
  inspiration: 'AI Inspiration',
  shopping: 'Shopping Advisor',
  occasions: 'Occasions',
  planner: 'Outfit Planner',
  packing: 'Packing',
  stylist: 'Stylist Network',
  analytics: 'Analytics',
  settings: 'Settings',
};

export default function Topbar({ activeView }: { activeView: View }) {
  const { dispatch } = useAura();
  const { toast } = useToast();

  function handleSeed() {
    dispatch({ type: 'SET_WARDROBE', payload: makeDemoItems() });
    toast('Demo wardrobe loaded.');
  }

  function handleReset() {
    if (!confirm('Reset AURA local data?')) return;
    dispatch({ type: 'RESET' });
    toast('AURA reset.');
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Welcome back, Founder</p>
        <h1>{VIEW_TITLES[activeView]}</h1>
      </div>
      <div className="top-actions">
        <button className="ghost" onClick={handleSeed}>Load Demo Wardrobe</button>
        <button className="danger" onClick={handleReset}>Reset</button>
      </div>
    </header>
  );
}
