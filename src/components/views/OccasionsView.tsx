'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid } from '@/lib/utils';
import type {
  DressCode,
  OccasionEvent,
  OccasionFormality,
  OccasionImportance,
  OccasionOutfitRecommendation,
  OccasionType,
  TravelWeather,
} from '@/lib/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const EVENT_TYPES: OccasionType[] = [
  'Business Meeting', 'Dinner', 'Wedding', 'Brunch', 'Travel',
  'Casual', 'Formal Event', 'Family', 'Date Night', 'Other',
];

const FORMALITY_OPTIONS: OccasionFormality[] = [
  'Casual', 'Smart Casual', 'Business', 'Cocktail', 'Formal', 'Black Tie',
];

const DRESS_CODE_OPTIONS: DressCode[] = [
  'Casual', 'Smart Casual', 'Business Casual', 'Business Formal',
  'Cocktail', 'Black Tie', 'White Tie', 'Theme',
];

const IMPORTANCE_OPTIONS: OccasionImportance[] = ['Low', 'Normal', 'High', 'Critical'];

const COUNTRIES = [
  'Australia', 'Austria', 'Bahrain', 'Belgium', 'Brazil', 'Bulgaria',
  'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Cyprus',
  'Czech Republic', 'Denmark', 'Egypt', 'Ethiopia', 'Finland', 'France',
  'Germany', 'Ghana', 'Greece', 'Hong Kong', 'Hungary', 'India',
  'Indonesia', 'Ireland', 'Italy', 'Japan', 'Jordan', 'Kenya',
  'Kuwait', 'Lebanon', 'Malaysia', 'Maldives', 'Malta', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Oman',
  'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Rwanda', 'Saudi Arabia', 'Singapore', 'South Africa',
  'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'UAE', 'Ukraine',
  'United Kingdom', 'United States', 'Vietnam',
].sort();

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status: OccasionEvent['outfitStatus']): { label: string; color: string } {
  switch (status) {
    case 'accepted': return { label: 'Outfit Ready', color: '#3a7a4a' };
    case 'edited': return { label: 'Outfit Edited', color: '#3a7a4a' };
    case 'rejected': return { label: 'Outfit Rejected', color: '#c05050' };
    default: return { label: 'Needs Outfit', color: '#b07030' };
  }
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 75 ? 'var(--accent)' : pct >= 50 ? '#e0a020' : '#e05050';
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 4 }}>
        <div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Recommendation Panel ───────────────────────────────────────────────────────

function RecommendationPanel({
  event,
  onAccept,
  onReject,
  onClose,
}: {
  event: OccasionEvent;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const rec = event.recommendedOutfit;
  if (!rec) return null;

  return (
    <div style={{
      marginTop: 12,
      padding: '1rem 1.25rem',
      background: 'var(--surface)',
      borderRadius: 12,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Outfit Recommendation</p>
        <button className="secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onClose}>Close</button>
      </div>

      {rec.aiEnhanced && (
        <div style={{ marginBottom: 10, padding: '4px 10px', background: 'rgba(180,160,120,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--accent)' }}>
          AI Enhanced
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <ScoreBar label="Overall Score" value={rec.outfitScore} />
        <ScoreBar label="Formality Fit" value={rec.formalityFitScore} />
        <ScoreBar label="Weather Fit" value={rec.weatherFitScore} />
        <ScoreBar label="Style DNA Fit" value={rec.styleDNAFitScore} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Items</p>
        {rec.items.length > 0
          ? rec.items.map((item, i) => (
              <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>{item}</div>
            ))
          : <p style={{ fontSize: 13, color: 'var(--muted)' }}>No items selected — see missing items below.</p>
        }
      </div>

      {rec.reasoning && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10, fontStyle: 'italic' }}>{rec.reasoning}</p>
      )}

      {rec.risks && rec.risks.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Risks</p>
          {rec.risks.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: '#c05050', padding: '2px 0' }}>⚠ {r}</div>
          ))}
        </div>
      )}

      {rec.missingItems && rec.missingItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Missing Items</p>
          {rec.missingItems.map((item, i) => (
            <div key={i} style={{ fontSize: 12, padding: '3px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                padding: '2px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: item.priority === 'essential' ? 'rgba(180,100,100,0.12)' : 'rgba(100,140,180,0.12)',
                color: item.priority === 'essential' ? '#a04040' : '#4060a0',
              }}>{item.priority}</span>
              <span style={{ fontWeight: 600 }}>{item.name}</span>
              <span style={{ color: 'var(--muted)' }}>— {item.reason}</span>
            </div>
          ))}
        </div>
      )}

      {rec.alternatives && rec.alternatives.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Alternatives</p>
          <p style={{ fontSize: 13 }}>{rec.alternatives.join(', ')}</p>
        </div>
      )}

      {event.outfitStatus !== 'accepted' && event.outfitStatus !== 'edited' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onAccept} style={{ flex: 1 }}>Accept Outfit</button>
          <button className="secondary" onClick={onReject} style={{ flex: 1 }}>Reject</button>
        </div>
      )}
    </div>
  );
}

// ── Event Card ─────────────────────────────────────────────────────────────────

function EventCard({
  event,
  onDelete,
  onGetRecommendation,
  onAccept,
  onReject,
}: {
  event: OccasionEvent;
  onDelete: () => void;
  onGetRecommendation: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [showRec, setShowRec] = useState(false);
  const { label: statusText, color: statusColor } = statusLabel(event.outfitStatus);
  const weather = event.weatherContext as TravelWeather | undefined;
  const weatherStr = weather?.available
    ? `${weather.condition}, ${Math.round(weather.temperatureC)}°C`
    : null;

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{event.title}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: 'rgba(180,160,120,0.12)', color: 'var(--accent)',
            }}>{event.formality}</span>
            {event.dressCode && (
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: 'rgba(100,100,200,0.1)', color: '#4060c0',
              }}>{event.dressCode}</span>
            )}
            {event.importance && event.importance !== 'Normal' && (
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: event.importance === 'Critical' ? 'rgba(200,50,50,0.1)' : event.importance === 'High' ? 'rgba(200,120,0,0.1)' : 'rgba(150,150,150,0.1)',
                color: event.importance === 'Critical' ? '#c03030' : event.importance === 'High' ? '#c07000' : 'var(--muted)',
              }}>{event.importance}</span>
            )}
            <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{statusText}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
            {event.eventType} · {formatDate(event.date)}
            {event.startTime && ` · ${event.startTime}`}
            {event.city && ` · ${event.city}${event.country ? `, ${event.country}` : ''}`}
          </div>
          {weatherStr && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Weather: {weatherStr}</div>
          )}
          {event.notes && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{event.notes}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            className="secondary"
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => { onGetRecommendation(); setShowRec(true); }}
          >
            {event.recommendedOutfit ? 'Refresh' : 'Get Outfit'}
          </button>
          {event.recommendedOutfit && (
            <button className="secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowRec(v => !v)}>
              {showRec ? 'Hide' : 'View'}
            </button>
          )}
          <button className="secondary" style={{ padding: '5px 12px', fontSize: 12, color: '#c05050' }} onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      {showRec && event.recommendedOutfit && (
        <RecommendationPanel
          event={event}
          onAccept={() => { onAccept(); }}
          onReject={() => { onReject(); }}
          onClose={() => setShowRec(false)}
        />
      )}
    </div>
  );
}

// ── Weekly Brief ───────────────────────────────────────────────────────────────

function WeeklyBriefPanel({ events }: { events: OccasionEvent[] }) {
  const [brief, setBrief] = useState<{ summary: string; preparedCount: number; unpreparedCount: number } | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const upcoming = events.filter(e => e.date >= today && e.date <= weekEnd);
    const prepared = upcoming.filter(e => e.outfitStatus === 'accepted' || e.outfitStatus === 'edited');
    const unprepared = upcoming.filter(e => e.outfitStatus === 'pending' || e.outfitStatus === 'rejected');
    const summary = upcoming.length === 0
      ? 'No upcoming events this week.'
      : `${upcoming.length} event${upcoming.length > 1 ? 's' : ''} this week — ${prepared.length} prepared, ${unprepared.length} need${unprepared.length === 1 ? 's' : ''} an outfit.`;
    setBrief({ summary, preparedCount: prepared.length, unpreparedCount: unprepared.length });
  }, [events]);

  if (!brief) return null;

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', background: 'rgba(180,160,120,0.06)' }}>
      <p className="eyebrow">This Week</p>
      <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{brief.summary}</p>
      {brief.unpreparedCount > 0 && (
        <p style={{ fontSize: '0.8rem', color: '#b07030', marginTop: 4 }}>
          {brief.unpreparedCount} event{brief.unpreparedCount > 1 ? 's' : ''} still need{brief.unpreparedCount === 1 ? 's' : ''} outfit planning.
        </p>
      )}
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  eventType: OccasionType;
  date: string;
  startTime: string;
  endTime: string;
  city: string;
  country: string;
  formality: OccasionFormality;
  dressCode: DressCode | '';
  importance: OccasionImportance;
  notes: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  eventType: 'Business Meeting',
  date: '',
  startTime: '',
  endTime: '',
  city: '',
  country: '',
  formality: 'Smart Casual',
  dressCode: '',
  importance: 'Normal',
  notes: '',
};

export default function OccasionsView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRecommendation, setLoadingRecommendation] = useState<string | null>(null);

  // City lookup
  const [countryHint, setCountryHint] = useState<string | null>(null);
  const [countryManuallySet, setCountryManuallySet] = useState(false);
  const detectedCoordsRef = useRef<{ lat?: number; lon?: number; countryCode?: string }>({});
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!form.city || form.city.length < 2) {
      setCountryHint(null);
      detectedCoordsRef.current = {};
      return;
    }
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location/lookup?city=${encodeURIComponent(form.city)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { matched: boolean; country?: string; countryCode?: string; latitude?: number; longitude?: number };
        if (data.matched && data.country) {
          detectedCoordsRef.current = {
            lat: data.latitude,
            lon: data.longitude,
            countryCode: data.countryCode,
          };
          if (!countryManuallySet) {
            setForm(f => ({ ...f, country: data.country! }));
            setCountryHint(`Detected: ${data.country}`);
          }
        } else {
          setCountryHint('City not found — select country manually');
          detectedCoordsRef.current = {};
        }
      } catch {
        // ignore lookup errors
      }
    }, 500);
    return () => { if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city]);

  const events = state.occasionEvents ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) { toast('Title and date are required.'); return; }
    setSubmitting(true);
    try {
      const newEvent: OccasionEvent = {
        id: uid(),
        title: form.title.trim(),
        eventType: form.eventType,
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        city: form.city || undefined,
        country: form.country || undefined,
        latitude: detectedCoordsRef.current.lat,
        longitude: detectedCoordsRef.current.lon,
        countryCode: detectedCoordsRef.current.countryCode,
        formality: form.formality,
        dressCode: form.dressCode || undefined,
        importance: form.importance,
        notes: form.notes || undefined,
        outfitStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_OCCASION_EVENT', payload: newEvent });
      setForm(EMPTY_FORM);
      setCountryHint(null);
      setCountryManuallySet(false);
      detectedCoordsRef.current = {};
      setShowForm(false);
      toast('Event added.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetRecommendation = async (event: OccasionEvent) => {
    setLoadingRecommendation(event.id);
    try {
      const res = await fetch('/api/occasions/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          title: event.title,
          eventType: event.eventType,
          date: event.date,
          city: event.city,
          country: event.country,
          countryCode: event.countryCode,
          latitude: event.latitude,
          longitude: event.longitude,
          formality: event.formality,
          notes: event.notes,
        }),
      });
      if (!res.ok) { toast('Failed to get recommendation.'); return; }
      const data = (await res.json()) as {
        recommendation: OccasionOutfitRecommendation;
        weatherContext: TravelWeather | null;
      };
      dispatch({
        type: 'UPDATE_OCCASION_EVENT',
        id: event.id,
        updates: {
          recommendedOutfit: data.recommendation,
          weatherContext: data.weatherContext ?? undefined,
          outfitStatus: 'pending',
          updatedAt: new Date().toISOString(),
        },
      });
      toast('Recommendation ready.');
    } catch {
      toast('Failed to get recommendation.');
    } finally {
      setLoadingRecommendation(null);
    }
  };

  const handleAccept = (event: OccasionEvent) => {
    dispatch({ type: 'UPDATE_OCCASION_EVENT', id: event.id, updates: { outfitStatus: 'accepted', updatedAt: new Date().toISOString() } });
    dispatch({
      type: 'ADD_FEEDBACK',
      payload: {
        id: uid(),
        type: 'occasion_outfit_accepted',
        score: 1,
        payload: { occasionId: event.id, eventType: event.eventType, formality: event.formality },
        at: new Date().toISOString(),
      },
    });
    toast('Outfit accepted.');
  };

  const handleReject = (event: OccasionEvent) => {
    dispatch({ type: 'UPDATE_OCCASION_EVENT', id: event.id, updates: { outfitStatus: 'rejected', updatedAt: new Date().toISOString() } });
    dispatch({
      type: 'ADD_FEEDBACK',
      payload: {
        id: uid(),
        type: 'occasion_outfit_rejected',
        score: -1,
        payload: { occasionId: event.id, eventType: event.eventType, formality: event.formality },
        at: new Date().toISOString(),
      },
    });
    toast('Outfit rejected.');
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_OCCASION_EVENT', id });
    toast('Event deleted.');
  };

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="view-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Occasions</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
            Plan outfits for upcoming events
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {events.length > 0 && <WeeklyBriefPanel events={events} />}

      {showForm && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p className="eyebrow" style={{ marginBottom: '1rem' }}>New Occasion</p>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Team dinner at Nobu"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Event Type</label>
                <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value as OccasionType }))} style={{ width: '100%' }}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Formality</label>
                <select value={form.formality} onChange={e => setForm(f => ({ ...f, formality: e.target.value as OccasionFormality }))} style={{ width: '100%' }}>
                  {FORMALITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Dress Code</label>
                <select value={form.dressCode} onChange={e => setForm(f => ({ ...f, dressCode: e.target.value as DressCode | '' }))} style={{ width: '100%' }}>
                  <option value="">Not specified</option>
                  {DRESS_CODE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Importance</label>
                <select value={form.importance} onChange={e => setForm(f => ({ ...f, importance: e.target.value as OccasionImportance }))} style={{ width: '100%' }}>
                  {IMPORTANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Start Time</label>
                <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>City</label>
                <input
                  type="text"
                  placeholder="e.g. Paris"
                  value={form.city}
                  onChange={e => { setCountryManuallySet(false); setForm(f => ({ ...f, city: e.target.value })); }}
                  style={{ width: '100%' }}
                />
                {countryHint && (
                  <p style={{ fontSize: 11, marginTop: 3, color: countryHint.startsWith('Detected') ? '#3a7a4a' : 'var(--muted)' }}>
                    {countryHint}
                  </p>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Country</label>
                <select
                  value={form.country}
                  onChange={e => { setCountryManuallySet(true); setCountryHint(null); setForm(f => ({ ...f, country: e.target.value })); }}
                  style={{ width: '100%' }}
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea
                  placeholder="Dress code, venue details, etc."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: 8 }}>
              <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save Event'}</button>
              <button type="button" className="secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setCountryHint(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {sorted.length === 0 && !showForm && (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>No occasions yet</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Add upcoming events — AURA will recommend the perfect outfit for each one.
          </p>
          <button onClick={() => setShowForm(true)}>+ Add First Event</button>
        </div>
      )}

      {sorted.map(event => (
        <div key={event.id} style={{ position: 'relative' }}>
          {loadingRecommendation === event.id && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, fontSize: 13, color: 'var(--muted)',
            }}>
              Getting recommendation…
            </div>
          )}
          <EventCard
            event={event}
            onDelete={() => handleDelete(event.id)}
            onGetRecommendation={() => handleGetRecommendation(event)}
            onAccept={() => handleAccept(event)}
            onReject={() => handleReject(event)}
          />
        </div>
      ))}
    </div>
  );
}
