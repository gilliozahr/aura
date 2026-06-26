'use client';

import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, scoreClass } from '@/lib/utils';
import { recommendationAgent } from '@aura/agents';

export default function HomeView() {
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

      <div className="grid four" style={{ marginTop: 18 }}>
        <div className="card kpi"><span>Wardrobe Items</span><strong>{state.wardrobe.length}</strong></div>
        <div className="card kpi"><span>Inspirations</span><strong>{state.inspirations.length}</strong></div>
        <div className="card kpi"><span>Orders</span><strong>{state.orders.length}</strong></div>
        <div className="card kpi"><span className={`score ${scoreClass(avgConf)}`} style={{ fontSize: 34 }}>{avgConf}%</span><span>Style Confidence</span></div>
      </div>
    </>
  );
}
