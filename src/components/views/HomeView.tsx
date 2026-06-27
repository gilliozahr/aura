'use client';

import { useEffect, useRef, useState } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, scoreClass, isValidItemName } from '@/lib/utils';
import { recommendationAgent } from '@aura/agents';
import type { OutfitReport, SavedOutfit, WardrobeItem } from '@/lib/types';

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 75 ? 'var(--accent)' : pct >= 50 ? '#e0a020' : '#e05050';
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 5 }}>
        <div style={{ width: `${pct}%`, height: 5, borderRadius: 4, background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Edit outfit panel ─────────────────────────────────────────────────────────

function EditOutfitPanel({
  outfitItems,
  wardrobe,
  onSwap,
  onClose,
}: {
  outfitItems: WardrobeItem[];
  wardrobe: WardrobeItem[];
  onSwap: (oldId: string, newItem: WardrobeItem) => void;
  onClose: () => void;
}) {
  const { state } = useAura();
  return (
    <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Edit Outfit</p>
        <button className="secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onClose}>Done</button>
      </div>
      {outfitItems.map(item => {
        const alts = recommendationAgent.getAlternativesForCategory(item.category, outfitItems, wardrobe, state.user);
        return (
          <div key={item.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>{item.category}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{item.name}</span>
              {alts.length > 0 && (
                <select
                  style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
                  defaultValue=""
                  onChange={e => {
                    const alt = alts.find(a => a.id === e.target.value);
                    if (alt) onSwap(item.id, alt);
                  }}
                >
                  <option value="" disabled>Swap with…</option>
                  {alts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
              {alts.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>No alternatives</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function HomeView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  const profileName = state.user.name?.trim();
  const greeting = profileName ? `Good day, ${profileName}.` : 'Good day.';

  const [outfitItems, setOutfitItems] = useState<WardrobeItem[]>([]);
  const [report, setReport] = useState<OutfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [editing, setEditing] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'accepted' | 'rejected' | null>(null);

  const wardrobeLength = state.wardrobe.length;
  const validWardrobe = state.wardrobe.filter(i => isValidItemName(i.name));
  const hasFetched = useRef(false);

  async function fetchOutfit(items?: WardrobeItem[]) {
    if (validWardrobe.length < 2) return;
    setLoading(true);
    setAiError('');
    setFeedbackGiven(null);
    setEditing(false);

    const wardrobeToUse = items ?? validWardrobe;

    try {
      const res = await fetch('/api/ai/recommend-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardrobe: wardrobeToUse, user: state.user }),
      });
      const data = (await res.json()) as { items?: WardrobeItem[]; report?: OutfitReport; error?: string };
      if (!res.ok || !data.items || !data.report) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setOutfitItems(data.items);
      setReport(data.report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setAiError(`Could not generate outfit: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const validCount = validWardrobe.length;

  // Fetch once when enough valid items exist
  useEffect(() => {
    if (validCount >= 2 && !hasFetched.current) {
      hasFetched.current = true;
      fetchOutfit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validCount]);

  function handleAccept() {
    if (!report || outfitItems.length === 0) return;
    const outfit: SavedOutfit = {
      id: uid(),
      outfitItems,
      report,
      feedback: 'accepted',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SAVED_OUTFIT', payload: outfit });
    dispatch({
      type: 'ADD_FEEDBACK',
      payload: {
        id: uid(),
        type: 'daily_outfit_accept',
        score: report.compatibilityScore,
        payload: { outfitItemIds: outfitItems.map(i => i.id) },
        at: new Date().toISOString(),
      },
    });
    dispatch({ type: 'INCREMENT_WEARS', itemIds: outfitItems.map(i => i.id) });
    setFeedbackGiven('accepted');
    toast('Outfit accepted. AURA learned from this.');
  }

  function handleReject() {
    if (!report || outfitItems.length === 0) return;
    const outfit: SavedOutfit = {
      id: uid(),
      outfitItems,
      report,
      feedback: 'rejected',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SAVED_OUTFIT', payload: outfit });
    dispatch({
      type: 'ADD_FEEDBACK',
      payload: {
        id: uid(),
        type: 'daily_outfit_reject',
        score: report.compatibilityScore,
        payload: { outfitItemIds: outfitItems.map(i => i.id) },
        at: new Date().toISOString(),
      },
    });
    setFeedbackGiven('rejected');
    toast('Outfit rejected. AURA will suggest something different next time.');
    // Refresh with a new recommendation
    hasFetched.current = true;
    fetchOutfit();
  }

  function handleSwap(oldId: string, newItem: WardrobeItem) {
    const updated = outfitItems.map(i => (i.id === oldId ? newItem : i));
    setOutfitItems(updated);
    // Re-score the edited outfit
    fetchOutfit(updated);
    setEditing(false);
  }

  const hasItems = wardrobeLength > 0;
  const hasValidItems = validCount >= 2;
  const avgConf = hasItems
    ? Math.round(state.wardrobe.reduce((s, i) => s + (i.confidence || 75), 0) / wardrobeLength)
    : 0;

  return (
    <>
      <div className="hero">
        {/* Left: daily briefing + outfit items */}
        <div className="briefing">
          <p className="eyebrow">AURA Daily Briefing</p>
          <h2>{greeting}</h2>
          <p>{state.user.city || '—'} · {state.user.temperature}°C · {state.user.occasion || '—'}</p>

          {hasValidItems ? (
            <div className="recommendation">
              <div>
                <span className="pill">Style goal: {state.user.styleGoal || 'Not set'}</span>
                {report && (
                  <span className="pill">Outfit score: {report.compatibilityScore}%</span>
                )}
              </div>

              {loading && (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Analyzing your wardrobe…</p>
              )}

              {!loading && outfitItems.length > 0 && (
                <div>
                  {outfitItems.map(i => (
                    <span key={i.id} className="pill">{i.name}</span>
                  ))}
                </div>
              )}

              {aiError && (
                <p style={{ color: '#c0392b', fontSize: 12, marginTop: 6 }}>{aiError}</p>
              )}

              {report && !loading && (
                <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6 }}>
                  {report.reasoningSummary}
                </p>
              )}
            </div>
          ) : (
            <div className="recommendation">
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                {hasItems
                  ? 'Your wardrobe items need valid clothing names before AURA can recommend outfits.'
                  : 'Your wardrobe is empty. Add a few items and AURA will recommend real outfits with full intelligence scoring.'}
              </p>
              <span className="pill">{hasItems ? `${wardrobeLength} item${wardrobeLength !== 1 ? 's' : ''} · needs valid names` : 'No items yet'}</span>
            </div>
          )}

          {/* Edit panel */}
          {editing && report && (
            <EditOutfitPanel
              outfitItems={outfitItems}
              wardrobe={validWardrobe}
              onSwap={handleSwap}
              onClose={() => setEditing(false)}
            />
          )}

          {/* Feedback actions */}
          {report && !loading && !feedbackGiven && (
            <div className="top-actions" style={{ marginTop: 14 }}>
              <button className="primary" onClick={handleAccept}>Accept Outfit</button>
              <button className="secondary" onClick={() => setEditing(e => !e)}>
                {editing ? 'Cancel Edit' : 'Edit Outfit'}
              </button>
              <button className="secondary" onClick={handleReject} style={{ borderColor: '#cc3333', color: '#cc3333' }}>
                Reject
              </button>
            </div>
          )}

          {feedbackGiven && (
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 13, color: feedbackGiven === 'accepted' ? '#1a9e50' : '#cc8800', fontWeight: 600 }}>
                {feedbackGiven === 'accepted' ? '✓ Outfit accepted' : '✗ Outfit rejected — refreshing…'}
              </span>
              {feedbackGiven === 'accepted' && (
                <button
                  className="secondary"
                  style={{ marginLeft: 12, fontSize: 12, padding: '4px 10px' }}
                  onClick={() => { hasFetched.current = true; fetchOutfit(); }}
                >
                  New Outfit
                </button>
              )}
            </div>
          )}

          {hasValidItems && !loading && (
            <button
              className="secondary"
              style={{ marginTop: 10, fontSize: 12, padding: '4px 12px' }}
              onClick={() => { hasFetched.current = true; fetchOutfit(); }}
            >
              ↻ Refresh Outfit
            </button>
          )}
        </div>

        {/* Right: outfit analysis card */}
        <div className="card">
          {!hasValidItems ? (
            <>
              <p className="eyebrow">AI Outfit Analysis</p>
              <h2>Add real wardrobe items first.</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
                AURA needs a few valid clothing items — like a blazer, shirt, trousers, or shoes — before it can recommend an outfit.
                {hasItems && wardrobeLength - validCount > 0 && (
                  <> {wardrobeLength - validCount} item{wardrobeLength - validCount !== 1 ? 's' : ''} in your wardrobe {wardrobeLength - validCount !== 1 ? 'have' : 'has'} unrecognised names.</>
                )}
              </p>
            </>
          ) : loading ? (
            <>
              <p className="eyebrow">AI Outfit Analysis</p>
              <h2>Analyzing…</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                AURA is selecting the best combination from your wardrobe.
              </p>
            </>
          ) : report ? (
            <>
              <p className="eyebrow">AI Outfit Analysis</p>
              <h2>
                <span className={`score ${scoreClass(report.compatibilityScore)}`} style={{ fontSize: 28, marginRight: 10 }}>
                  {report.compatibilityScore}%
                </span>
                Compatibility
              </h2>

              <div style={{ marginTop: 12, marginBottom: 14 }}>
                <ScoreBar label="Occasion Fit" value={report.occasionFitScore} />
                <ScoreBar label="Weather Fit" value={report.weatherFitScore} />
                <ScoreBar label="Style Match" value={report.styleMatchScore} />
                <ScoreBar label="Color Harmony" value={report.colorHarmonyScore} />
              </div>

              {report.whyItWorks && (
                <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{report.whyItWorks}</p>
              )}

              {report.risks.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>Risks</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                    {report.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {report.missingItems.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>Missing Pieces</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                    {report.missingItems.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}

              {report.alternatives.length > 0 && (
                <div>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>Alternatives to Consider</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                    {report.alternatives.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}

              {report._meta && (
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  {report._meta.provider} · {report._meta.model} · {report._meta.latencyMs}ms
                  {report._meta.fallbackUsed && ' · mock fallback'}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">AI Outfit Analysis</p>
              <h2>No outfit yet.</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Add items to your wardrobe and AURA will recommend an outfit with full compatibility scoring.
              </p>
            </>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid four" style={{ marginTop: 18 }}>
        <div className="card kpi"><span>Wardrobe Items</span><strong>{wardrobeLength}</strong></div>
        <div className="card kpi"><span>Inspirations</span><strong>{state.inspirations.length}</strong></div>
        <div className="card kpi"><span>Saved Outfits</span><strong>{state.outfits.length}</strong></div>
        <div className="card kpi">
          <span className={`score ${scoreClass(avgConf)}`} style={{ fontSize: 34 }}>{avgConf}%</span>
          <span>Style Confidence</span>
        </div>
      </div>

      {/* Recent outfit history */}
      {state.outfits.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="eyebrow">Outfit History</p>
          <h2>Recent Recommendations</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Items</th>
                <th>Score</th>
                <th>Feedback</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {state.outfits.slice(0, 5).map(o => (
                <tr key={o.id}>
                  <td style={{ fontSize: 12 }}>{o.outfitItems.map(i => i.name).join(', ')}</td>
                  <td>
                    <span className={`score ${scoreClass(o.report.compatibilityScore)}`} style={{ fontSize: 13 }}>
                      {o.report.compatibilityScore}%
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: o.feedback === 'accepted' ? '#1a9e50' : o.feedback === 'rejected' ? '#cc3333' : '#888',
                    }}>
                      {o.feedback ?? 'pending'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
