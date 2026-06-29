'use client';

import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, scoreClass } from '@/lib/utils';
import { recommendationAgent } from '@aura/agents';
import type { View } from '@/lib/types';

export default function HomeView({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  const hasItems = state.wardrobe.length > 0;
  const outfit = recommendationAgent.pickBestOutfit(state.wardrobe, state.user);

  function handleAccept() {
    dispatch({
      type: 'ADD_FEEDBACK',
      payload: { id: uid(), type: 'daily_outfit_accept', score: outfit.score, at: new Date().toISOString() },
    });
    dispatch({ type: 'INCREMENT_WEARS', itemIds: outfit.items.map(i => i.id) });
    toast('Outfit accepted. AURA learned from this.');
  }

  const avgConf = hasItems
    ? Math.round(state.wardrobe.reduce((s, i) => s + (i.confidence || 75), 0) / state.wardrobe.length)
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayPlan = (state.outfitPlans ?? []).find(p => p.planDate === today);

  return (
    <>
      <div className="hero">
        <div className="briefing">
          <p className="eyebrow">AURA Daily Briefing</p>
          <h2>Good day, {state.user.name}.</h2>
          <p>{state.user.city} · {state.user.temperature}°C · {state.user.occasion}</p>
          <div className="recommendation">
            <div>
              <span className="pill">Recommendation confidence: {hasItems ? outfit.score : 0}%</span>
              <span className="pill">Style goal: {state.user.styleGoal}</span>
            </div>
            <div>
              {hasItems
                ? outfit.items.map(i => <span key={i.id} className="pill">{i.name}</span>)
                : <span className="pill">Load demo wardrobe or add clothes</span>}
            </div>
            <p>{outfit.explanation}</p>
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">Today&apos;s AI Reasoning</p>
          <h2>Why this works</h2>
          <ul className="report-list">
            <li>Weather and occasion are weighted before style aesthetics.</li>
            <li>Items with strong confidence history are prioritized.</li>
            <li>Recently overused items are slightly penalized to avoid repetition.</li>
            <li>User can accept, edit, or reject to train Style DNA.</li>
          </ul>
          <button className="primary full" onClick={handleAccept}>Accept Recommendation</button>
        </div>
      </div>

      {/* Today's Planned Outfit */}
      <div className="card" style={{ marginTop: 18, padding: '1rem 1.25rem' }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Today&apos;s Planned Outfit</p>
        {todayPlan ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: todayPlan.status === 'worn' ? '#16a34a20' : '#2563eb20',
                color: todayPlan.status === 'worn' ? '#16a34a' : '#2563eb',
                textTransform: 'uppercase',
              }}>{todayPlan.status}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{todayPlan.outfitItems.length} items planned</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {todayPlan.outfitItems.map(item => (
                <span key={item.id} className="pill" style={{ fontSize: 11 }}>{item.name}</span>
              ))}
            </div>
            {onNavigate && (
              <button className="secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => onNavigate('planner')}>
                Open Planner
              </button>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>No outfit planned for today.</p>
            {onNavigate && (
              <button className="secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => onNavigate('planner')}>
                Generate this week
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid four" style={{ marginTop: 18 }}>
        <div className="card kpi"><span>Wardrobe Items</span><strong>{state.wardrobe.length}</strong></div>
        <div className="card kpi"><span>Inspirations</span><strong>{state.inspirations.length}</strong></div>
        <div className="card kpi"><span>Orders</span><strong>{state.orders.length}</strong></div>
        <div className="card kpi"><span className={`score ${scoreClass(avgConf)}`} style={{ fontSize: 34 }}>{avgConf}%</span><span>Style Confidence</span></div>
      </div>
    </>
  );
}
