'use client';

import type { View } from '@/lib/types';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { makeDemoItems } from '@/store/default';

const VIEW_TITLES: Record<View, string> = {
  home: 'Daily Briefing',
  wardrobe: 'Wardrobe',
  inspiration: 'AI Inspiration',
  packing: 'Packing',
  stylist: 'Stylist Network',
  analytics: 'Analytics',
  settings: 'Settings',
};

export default function Topbar({ activeView }: { activeView: View }) {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  const profileName = state.user.name?.trim();
  const eyebrow = profileName ? `Welcome back, ${profileName}` : 'AURA STYLE INTELLIGENCE';

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
        <p className="eyebrow">{eyebrow}</p>
        <h1>{VIEW_TITLES[activeView]}</h1>
      </div>
      <div className="top-actions">
        <button className="ghost" onClick={handleSeed}>Load Demo Wardrobe</button>
        <button className="danger" onClick={handleReset}>Reset</button>
      </div>
    </header>
  );
}
