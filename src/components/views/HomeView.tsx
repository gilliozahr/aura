'use client';

import { useEffect, useRef, useState } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, scoreClass, isValidItemName } from '@/lib/utils';
import { recommendationAgent } from '@aura/agents';
import type { OutfitReport, SavedOutfit, WardrobeItem, WeatherContext, LocationContext, View } from '@/lib/types';

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

const DEMO_JOURNEY = [
  { step: 1, label: 'Inspect the demo wardrobe', view: 'wardrobe' as View },
  { step: 2, label: 'Add an item with Vision AI', view: 'wardrobe' as View },
  { step: 3, label: 'Generate and accept today\'s outfit', view: null },
  { step: 4, label: 'Recompute your Style DNA', view: 'settings' as View },
  { step: 5, label: 'Review the Paris trip plan', view: 'packing' as View },
  { step: 6, label: 'Check the Business Dinner occasion', view: 'occasions' as View },
  { step: 7, label: 'Explore wardrobe analytics', view: 'analytics' as View },
];

export default function HomeView({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  const profileName = state.user.name?.trim();
  const firstName = profileName ? profileName.split(/\s+/)[0] : '';

  function timeGreeting(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    if (h >= 17 && h < 22) return 'Good evening';
    return 'Good night';
  }
  const greeting = firstName ? `${timeGreeting()}, ${firstName}.` : `${timeGreeting()}.`;

  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [locationCtx, setLocationCtx] = useState<LocationContext | null>(null);
  const [outfitItems, setOutfitItems] = useState<WardrobeItem[]>([]);
  const [report, setReport] = useState<OutfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [editing, setEditing] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'accepted' | 'rejected' | null>(null);

  const wardrobeLength = state.wardrobe.length;
  const validWardrobe = state.wardrobe.filter(i => isValidItemName(i.name));
  const hasFetched = useRef(false);
  const weatherFetched = useRef(false);

  // Fetch weather once on mount using location priority: browser → saved lat/lon → saved city → fallback
  useEffect(() => {
    if (weatherFetched.current) return;
    weatherFetched.current = true;

    const savedCity = state.user.city || 'Dubai';
    const savedLat = state.user.latitude;
    const savedLon = state.user.longitude;
    const now = new Date().toISOString();

    function applyWeather(w: WeatherContext, loc: LocationContext) {
      setWeather(w);
      setLocationCtx(loc);
    }

    async function fetchWeatherAndSet(lat: number | undefined, lon: number | undefined, loc: LocationContext) {
      const query = lat != null && lon != null
        ? `lat=${lat}&lon=${lon}`
        : `city=${encodeURIComponent(loc.city)}`;
      try {
        const r = await fetch(`/api/weather/current?${query}`);
        const w = (await r.json()) as WeatherContext;
        applyWeather(w, { ...loc, city: w.city || loc.city });
      } catch {
        applyWeather(
          { city: loc.city, temperatureC: 0, condition: 'Unavailable', available: false, timestamp: now },
          loc
        );
      }
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          fetchWeatherAndSet(latitude, longitude, {
            city: savedCity, latitude, longitude,
            source: 'browser', label: 'Using current location', timestamp: now,
          });
        },
        () => {
          // Denied — fall to saved lat/lon or city
          if (savedLat != null && savedLon != null) {
            fetchWeatherAndSet(savedLat, savedLon, {
              city: savedCity, latitude: savedLat, longitude: savedLon,
              source: 'profile', label: 'Using saved location', timestamp: now,
            });
          } else {
            fetchWeatherAndSet(undefined, undefined, {
              city: savedCity, source: savedCity !== 'Dubai' ? 'profile' : 'fallback',
              label: savedCity !== 'Dubai' ? 'Using saved location' : 'Using default location', timestamp: now,
            });
          }
        },
        { timeout: 5000 }
      );
    } else if (savedLat != null && savedLon != null) {
      fetchWeatherAndSet(savedLat, savedLon, {
        city: savedCity, latitude: savedLat, longitude: savedLon,
        source: 'profile', label: 'Using saved location', timestamp: now,
      });
    } else {
      fetchWeatherAndSet(undefined, undefined, {
        city: savedCity, source: savedCity !== 'Dubai' ? 'profile' : 'fallback',
        label: savedCity !== 'Dubai' ? 'Using saved location' : 'Using default location', timestamp: now,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        body: JSON.stringify({ wardrobe: wardrobeToUse, user: state.user, weather, styleDNA: state.styleDNA ? {
          preferredColors: state.styleDNA.preferredColors.slice(0, 5).map(e => e.value),
          preferredStyleTags: state.styleDNA.preferredStyleTags.slice(0, 5).map(e => e.value),
          avoidedStyleTags: state.styleDNA.avoidedStyleTags.slice(0, 3).map(e => e.value),
          preferredOccasions: state.styleDNA.preferredOccasions.slice(0, 3).map(e => e.value),
          wardrobeGaps: state.styleDNA.wardrobeGaps,
          confidenceScore: state.styleDNA.confidenceScore,
        } : undefined }),
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

  // Onboarding checklist state
  const hasWardrobeItem = wardrobeLength > 0;
  const hasVisionItem = state.wardrobe.some(i => i.aiMetadata && Object.keys(i.aiMetadata).length > 0);
  const hasSavedOutfit = state.outfits.length > 0;
  const hasStyleDNA = !!state.styleDNA && state.styleDNA.confidenceScore > 0;
  const hasTripPlan = (state.tripPlans ?? []).length > 0;
  const hasOccasionEvent = (state.occasionEvents ?? []).length > 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPlan = (state.outfitPlans ?? []).find(p => p.planDate === todayStr);

  const checklistItems = [
    { label: 'Add your first wardrobe item', done: hasWardrobeItem },
    { label: 'Analyze an item with Vision AI', done: hasVisionItem },
    { label: 'Accept a daily outfit recommendation', done: hasSavedOutfit },
    { label: 'Build your Style DNA profile', done: hasStyleDNA },
    { label: 'Plan a trip with packing intelligence', done: hasTripPlan },
    { label: 'Add an upcoming occasion', done: hasOccasionEvent },
  ];
  const doneCount = checklistItems.filter(i => i.done).length;
  const allDone = doneCount === checklistItems.length;

  return (
    <>
      <div className="hero">
        {/* Left: daily briefing + outfit items */}
        <div className="briefing">
          <p className="eyebrow">AURA Daily Briefing</p>
          <h2>{greeting}</h2>
          <p>
            {weather?.city || state.user.city || '—'}
            {' · '}
            {weather == null
              ? '…'
              : weather.available
              ? `${weather.temperatureC}°C · ${weather.condition}`
              : 'Weather unavailable'}
            {' · '}
            {state.user.occasion || '—'}
          </p>
          {locationCtx && (
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: -8, marginBottom: 8 }}>
              {locationCtx.label}
            </p>
          )}

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
                Add a few clothing items to your wardrobe and AURA will recommend a complete outfit with full intelligence scoring.
              </p>
              <span className="pill">Style goal: {state.user.styleGoal || 'Not set'}</span>
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
              <h2>Build a stronger wardrobe foundation.</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
                AURA needs a few clear clothing items — like a blazer, shirt, trousers, or shoes — before it can recommend a complete outfit.
              </p>
              {hasItems && wardrobeLength - validCount > 0 && (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  Some older wardrobe items may need review and can be edited later.
                </p>
              )}
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

      {/* Upcoming occasions strip — today, tomorrow, or Critical/High within 7 days */}
      {(() => {
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
        const week = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
        const upcoming = (state.occasionEvents ?? [])
          .filter(e =>
            e.date >= today && (
              e.date <= tomorrow ||
              (e.date <= week && (e.importance === 'Critical' || e.importance === 'High'))
            )
          )
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 3);
        if (upcoming.length === 0) return null;
        return (
          <div style={{ marginTop: 18 }}>
            {upcoming.map(e => {
              const isToday = e.date === today;
              const isTomorrow = e.date === tomorrow;
              const daysAway = Math.round((new Date(e.date).getTime() - new Date(today).getTime()) / 86_400_000);
              const whenLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `In ${daysAway} days`;
              const needsOutfit = e.outfitStatus === 'pending' || e.outfitStatus === 'rejected';
              const importanceColor = e.importance === 'Critical' ? '#c03030' : e.importance === 'High' ? '#c07000' : undefined;
              return (
                <div key={e.id} className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: 8, borderLeft: `3px solid ${needsOutfit ? '#b07030' : '#3a7a4a'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <p className="eyebrow" style={{ margin: 0, marginBottom: 2 }}>{whenLabel} · {e.eventType}</p>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{e.title}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{e.dressCode ?? e.formality}</span>
                      {importanceColor && (
                        <span style={{ fontSize: 11, color: importanceColor, fontWeight: 600, marginLeft: 8 }}>{e.importance}</span>
                      )}
                    </div>
                    {needsOutfit && (
                      <span style={{ fontSize: 12, color: '#b07030', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Outfit needed
                      </span>
                    )}
                    {!needsOutfit && (
                      <span style={{ fontSize: 12, color: '#3a7a4a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

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

      {/* Onboarding checklist */}
      {!allDone && (
        <div className="card" style={{ marginTop: 18, padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <p className="eyebrow" style={{ margin: 0 }}>Getting Started</p>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{doneCount} / {checklistItems.length}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Complete these steps to unlock AURA&apos;s full intelligence.
          </p>
          {/* Progress bar */}
          <div style={{ height: 4, borderRadius: 4, background: 'var(--line)', marginBottom: 12 }}>
            <div style={{
              height: 4, borderRadius: 4, background: 'var(--accent)',
              width: `${Math.round((doneCount / checklistItems.length) * 100)}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {checklistItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: item.done ? 'var(--muted)' : 'var(--ink)' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                  background: item.done ? 'var(--good)' : 'transparent',
                  color: item.done ? 'white' : 'var(--muted)',
                  border: item.done ? 'none' : '1.5px solid var(--line)',
                }}>{item.done ? '✓' : ''}</span>
                <span style={{ textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.55 : 1 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {allDone && (
        <div className="card" style={{ marginTop: 18, padding: '1rem 1.5rem', background: 'rgba(36,107,69,0.06)', borderColor: 'rgba(36,107,69,0.18)' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--good)', fontWeight: 600 }}>
            AURA is ready for daily use. All features active.
          </p>
        </div>
      )}

      {/* Today's Planned Outfit (v1.3 Planner) */}
      <div className="card" style={{ marginTop: 18, padding: '1.25rem 1.5rem' }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>Today&apos;s Planned Outfit</p>
        {todayPlan ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {todayPlan.outfitItems.map(item => (
                <span key={item.id} className="pill">{item.name}</span>
              ))}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: todayPlan.status === 'worn' ? '#16a34a20' : '#2563eb20',
              color: todayPlan.status === 'worn' ? '#16a34a' : '#2563eb',
              textTransform: 'uppercase', marginRight: 8,
            }}>{todayPlan.status}</span>
            {onNavigate && (
              <button className="secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => onNavigate('planner')}>
                Open Planner
              </button>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>No outfit planned for today.</p>
        )}
        {!todayPlan && onNavigate && (
          <button className="secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => onNavigate('planner')}>
            Generate this week
          </button>
        )}
      </div>

      {/* Demo Journey card — visible only in demo mode */}
      {process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS === 'true' && (
        <div className="card" style={{ marginTop: 18, padding: '1.25rem 1.5rem', borderColor: 'rgba(139,111,71,0.3)', background: 'rgba(139,111,71,0.04)' }}>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Investor Demo Journey</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Follow this sequence to showcase AURA&apos;s full capabilities.
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {DEMO_JOURNEY.map(({ step, label, view }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800,
                  background: 'var(--accent)', color: 'white',
                }}>{step}</span>
                {view && onNavigate ? (
                  <button
                    style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--accent-dark)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'underline', textDecorationColor: 'transparent' }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.textDecorationColor = 'var(--accent-dark)')}
                    onMouseLeave={e => ((e.target as HTMLElement).style.textDecorationColor = 'transparent')}
                    onClick={() => onNavigate(view)}
                  >{label}</button>
                ) : (
                  <span style={{ color: 'var(--ink)' }}>{label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent outfit history */}
      {(() => {
        const validOutfits = state.outfits.filter(o =>
          o.outfitItems.every(i => isValidItemName(i.name))
        );
        const hiddenCount = state.outfits.length - validOutfits.length;
        if (state.outfits.length === 0) return null;
        return (
          <div className="card" style={{ marginTop: 18 }}>
            <p className="eyebrow">Outfit History</p>
            <h2>Recent Recommendations</h2>
            {validOutfits.length > 0 ? (
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
                  {validOutfits.slice(0, 5).map(o => (
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
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>No valid outfit history yet.</p>
            )}
            {hiddenCount > 0 && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                {hiddenCount} older recommendation{hiddenCount !== 1 ? 's were' : ' was'} hidden because {hiddenCount !== 1 ? 'they used' : 'it used'} unrecognised item names.
              </p>
            )}
          </div>
        );
      })()}
    </>
  );
}
