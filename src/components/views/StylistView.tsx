'use client';

import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, scoreClass } from '@/lib/utils';
import { stylistAgent } from '@aura/agents';

function wardrobeGap(wardrobe: { category: string }[]): string {
  const required = ['Top', 'Bottom', 'Shoes', 'Outerwear'];
  const missing = required.find(cat => !wardrobe.some(i => i.category === cat));
  return missing || 'Balanced';
}

export default function StylistView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  const match = stylistAgent.match(state);
  const sc = scoreClass(match.score);

  const avgConf = state.wardrobe.length
    ? Math.round(state.wardrobe.reduce((s, i) => s + (i.confidence || 75), 0) / state.wardrobe.length)
    : 0;

  function handleBook() {
    dispatch({
      type: 'ADD_STYLIST_BOOKING',
      payload: {
        id: uid(),
        stylist: match.name,
        at: new Date().toISOString(),
        status: 'Mock booking requested',
      },
    });
    toast('Mock stylist session booked.');
  }

  return (
    <div className="grid two">
      <div className="card">
        <p className="eyebrow">Human Expertise</p>
        <h2>Recommended Stylist</h2>
        <div className={`score ${sc}`}>{match.score}%</div>
        <h3>{match.name}</h3>
        <p>{match.reason}</p>
        <ul className="report-list">
          <li>Specialty: {match.specialty}</li>
          <li>Budget fit: {match.budgetFit}%</li>
          <li>Trust score: {match.trust}%</li>
          <li>Best for: {state.user.styleGoal} evolution</li>
        </ul>
        <button className="primary" onClick={handleBook}>Book Mock Session</button>
      </div>

      <div className="card">
        <p className="eyebrow">AI Brief</p>
        <h2>Prepared for stylist</h2>
        <p>AURA prepares your Style DNA, goals, wardrobe gaps, and current recommendations so the stylist starts with context.</p>
        <ul className="report-list">
          <li>Goal: {state.user.styleGoal}</li>
          <li>Wardrobe items: {state.wardrobe.length}</li>
          <li>Average confidence: {avgConf}%</li>
          <li>Known gap: {wardrobeGap(state.wardrobe)}</li>
        </ul>
      </div>
    </div>
  );
}
