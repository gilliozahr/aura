'use client';

import React, { useState } from 'react';
import { useAura } from '@/store';
import type { TripPlan, PackingItem } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tripDuration(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

function groupByCategory(items: PackingItem[]): Record<string, PackingItem[]> {
  return items.reduce<Record<string, PackingItem[]>>((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
}

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories', 'Other'];

function sortedCategories(groups: Record<string, PackingItem[]>): string[] {
  const keys = Object.keys(groups);
  return [
    ...CATEGORY_ORDER.filter(c => keys.includes(c)),
    ...keys.filter(c => !CATEGORY_ORDER.includes(c)),
  ];
}

// ── Sub-components ─────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<PackingItem['priority'], React.CSSProperties> = {
  essential: { background: 'rgba(180,160,120,0.15)', color: '#8a7440', border: '1px solid rgba(180,160,120,0.3)' },
  recommended: { background: 'rgba(100,120,160,0.12)', color: '#4a5a7a', border: '1px solid rgba(100,120,160,0.25)' },
  optional: { background: 'rgba(140,140,140,0.1)', color: '#7a7a7a', border: '1px solid rgba(140,140,140,0.2)' },
};

function PriorityChip({ priority }: { priority: PackingItem['priority'] }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: '0.65rem',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      ...PRIORITY_STYLES[priority],
    }}>
      {priority}
    </span>
  );
}

function WeatherCard({ weather }: { weather: TripPlan['weatherSummary'] }) {
  if (!weather || !weather.available) {
    return (
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <p className="eyebrow">Weather</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Weather data unavailable — plan for varied conditions.
        </p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
      <p className="eyebrow">Weather at Destination</p>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--foreground)' }}>
            {Math.round(weather.temperatureC)}°C
          </span>
        </div>
        <div>
          <p style={{ fontWeight: 600, marginBottom: '0.1rem' }}>{weather.condition}</p>
          {weather.feelsLikeC !== undefined && (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Feels like {Math.round(weather.feelsLikeC)}°C</p>
          )}
          {weather.humidity !== undefined && (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Humidity {weather.humidity}%</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PackingChecklist({
  plan,
  onTogglePacked,
}: {
  plan: TripPlan;
  onTogglePacked: (itemId: string) => void;
}) {
  const groups = groupByCategory(plan.packingItems);
  const cats = sortedCategories(groups);
  const packedCount = plan.packingItems.filter(i => i.packed).length;

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p className="eyebrow" style={{ marginBottom: 0 }}>Packing Checklist</p>
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          {packedCount} / {plan.packingItems.length} packed
        </span>
      </div>

      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
            {cat}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {groups[cat].map(item => (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  cursor: 'pointer',
                  padding: '0.5rem 0.625rem',
                  borderRadius: '8px',
                  background: item.packed ? 'rgba(140,140,140,0.06)' : 'transparent',
                  transition: 'background 0.15s',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <input
                  type="checkbox"
                  checked={item.packed}
                  onChange={() => onTogglePacked(item.id)}
                  style={{ accentColor: 'var(--foreground)', flexShrink: 0, width: 15, height: 15 }}
                />
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  textDecoration: item.packed ? 'line-through' : 'none',
                  color: item.packed ? 'var(--muted)' : 'var(--foreground)',
                }}>
                  {item.name}
                  {item.reason && (
                    <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                      — {item.reason}
                    </span>
                  )}
                </span>
                <PriorityChip priority={item.priority} />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MissingItemsCard({ items }: { items: TripPlan['missingItems'] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      <p className="eyebrow">Gaps to Address</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        Consider buying or borrowing these items before your trip.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid rgba(180,140,80,0.3)',
              background: 'rgba(180,140,80,0.08)',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ fontWeight: 600 }}>{item.name}</span>
            <span style={{ color: 'var(--muted)', marginLeft: '0.4rem' }}>· {item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyOutfitsCard({ plan }: { plan: TripPlan }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  if (!plan.dailyOutfits || plan.dailyOutfits.length === 0) return null;

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      <p className="eyebrow">Daily Outfit Plan</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {plan.dailyOutfits.map((outfit, idx) => (
          <div key={idx} style={{ borderBottom: '1px solid rgba(140,140,140,0.1)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatDate(outfit.date)}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>{outfit.occasion}</span>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{openIdx === idx ? '−' : '+'}</span>
            </button>
            {openIdx === idx && (
              <div style={{ paddingTop: '0.5rem', paddingLeft: '0.25rem' }}>
                {outfit.weather && (
                  <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>{outfit.weather}</p>
                )}
                {outfit.items.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {outfit.items.map((item, i) => (
                      <span key={i} style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        background: 'rgba(140,140,140,0.1)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>{outfit.reasoning}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskNotesCard({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div style={{ marginBottom: '1rem', padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(160,120,60,0.06)', border: '1px solid rgba(160,120,60,0.15)' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(160,120,60,0.8)', fontWeight: 600, marginBottom: '0.5rem' }}>
        Heads up
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {notes.map((note, idx) => (
          <span key={idx} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '999px',
            background: 'rgba(160,120,60,0.1)',
            fontSize: '0.78rem',
            color: 'rgba(120,90,40,0.9)',
          }}>
            {note}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Trip List (multiple plans) ─────────────────────────────────────────────

function TripListCard({ plans, selectedId, onSelect, onNew }: {
  plans: TripPlan[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p className="eyebrow" style={{ marginBottom: 0 }}>Your Trips</p>
        <button className="primary" onClick={onNew} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
          + New Trip
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {plans.map(plan => (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            style={{
              background: selectedId === plan.id ? 'rgba(140,140,140,0.1)' : 'transparent',
              border: selectedId === plan.id ? '1px solid rgba(140,140,140,0.3)' : '1px solid transparent',
              borderRadius: '8px',
              padding: '0.6rem 0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{plan.destinationCity}</span>
                {plan.destinationCountry && (
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: '0.4rem' }}>{plan.destinationCountry}</span>
                )}
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                {formatDate(plan.startDate)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{plan.purpose}</span>
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>·</span>
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{tripDuration(plan.startDate, plan.endDate)} days</span>
              {plan.aiEnhanced && (
                <>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>·</span>
                  <span style={{ color: 'rgba(100,140,100,0.8)', fontSize: '0.75rem' }}>AI enhanced</span>
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Plan Detail View ───────────────────────────────────────────────────────

function PlanDetailView({ plan, onDelete, onTogglePacked }: {
  plan: TripPlan;
  onDelete: () => void;
  onTogglePacked: (itemId: string) => void;
}) {
  const days = tripDuration(plan.startDate, plan.endDate);

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="eyebrow">Trip Plan</p>
            <h2 style={{ marginBottom: '0.25rem' }}>{plan.destinationCity}{plan.destinationCountry ? `, ${plan.destinationCountry}` : ''}</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              {formatDate(plan.startDate)} — {formatDate(plan.endDate)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(140,140,140,0.1)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
            }}>
              {days} day{days !== 1 ? 's' : ''}
            </span>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{plan.purpose}</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{plan.luggageType}</p>
          </div>
        </div>
      </div>

      <WeatherCard weather={plan.weatherSummary} />

      {/* Capsule notes */}
      {plan.capsuleNotes && (
        <blockquote style={{
          margin: '0 0 1rem',
          padding: '0.875rem 1.25rem',
          borderLeft: '3px solid rgba(140,140,140,0.3)',
          background: 'rgba(140,140,140,0.04)',
          borderRadius: '0 8px 8px 0',
          color: 'var(--foreground)',
          fontSize: '0.875rem',
          fontStyle: 'italic',
        }}>
          {plan.capsuleNotes}
        </blockquote>
      )}

      <RiskNotesCard notes={plan.riskNotes} />
      <PackingChecklist plan={plan} onTogglePacked={onTogglePacked} />
      <MissingItemsCard items={plan.missingItems} />
      <DailyOutfitsCard plan={plan} />

      {/* AI Summary */}
      {plan.aiEnhanced && plan.aiSummary && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="eyebrow">AURA AI Summary</p>
          <p style={{ color: 'var(--foreground)', fontSize: '0.875rem', lineHeight: 1.6 }}>{plan.aiSummary}</p>
        </div>
      )}

      {/* Delete */}
      <div style={{ borderTop: '1px solid rgba(140,140,140,0.15)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: '1px solid rgba(160,60,60,0.3)',
            color: 'rgba(160,60,60,0.7)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Delete trip plan
        </button>
      </div>
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────

interface FormState {
  destinationCity: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
  purpose: string;
  luggageType: string;
  laundryAvailable: boolean;
}

function TripForm({ onSubmit, loading, error }: {
  onSubmit: (form: FormState) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10);

  const [form, setForm] = useState<FormState>({
    destinationCity: '',
    destinationCountry: '',
    startDate: today,
    endDate: defaultEnd,
    purpose: 'Vacation',
    luggageType: 'Checked bag',
    laundryAvailable: false,
  });

  function handleChange(field: keyof FormState, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  return (
    <div className="card" style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem' }}>
      <p className="eyebrow">New Trip</p>
      <h2 style={{ marginBottom: '1.25rem' }}>Plan your packing</h2>

      {error && (
        <div style={{ background: 'rgba(160,60,60,0.08)', border: '1px solid rgba(160,60,60,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'rgba(140,40,40,0.9)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form
        className="form"
        onSubmit={async e => {
          e.preventDefault();
          await onSubmit(form);
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <label style={{ gridColumn: '1 / -1' }}>
            Destination city *
            <input
              required
              value={form.destinationCity}
              onChange={e => handleChange('destinationCity', e.target.value)}
              placeholder="e.g. Paris"
            />
          </label>
          <label>
            Country
            <input
              value={form.destinationCountry}
              onChange={e => handleChange('destinationCountry', e.target.value)}
              placeholder="e.g. France"
            />
          </label>
          <label>
            Purpose
            <select value={form.purpose} onChange={e => handleChange('purpose', e.target.value)}>
              <option>Business</option>
              <option>Vacation</option>
              <option>Wedding</option>
              <option>Weekend</option>
              <option>Family Trip</option>
              <option>Mixed</option>
            </select>
          </label>
          <label>
            Start date *
            <input
              type="date"
              required
              value={form.startDate}
              onChange={e => handleChange('startDate', e.target.value)}
            />
          </label>
          <label>
            End date *
            <input
              type="date"
              required
              value={form.endDate}
              min={form.startDate}
              onChange={e => handleChange('endDate', e.target.value)}
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Luggage type
            <select value={form.luggageType} onChange={e => handleChange('luggageType', e.target.value)}>
              <option>Carry-on</option>
              <option>Checked bag</option>
              <option>Backpack</option>
              <option>No limit</option>
            </select>
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.25rem' }}>
          <input
            type="checkbox"
            checked={form.laundryAvailable}
            onChange={e => handleChange('laundryAvailable', e.target.checked)}
            style={{ accentColor: 'var(--foreground)', width: '1rem', height: '1rem' }}
          />
          <span style={{ fontSize: '0.875rem' }}>Laundry available at destination</span>
        </label>

        <button className="primary" type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Generating plan…' : 'Generate Packing Plan'}
        </button>
      </form>
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────

type ViewState = 'list' | 'form' | 'detail';

export default function PackingView() {
  const { state, dispatch } = useAura();
  const tripPlans = state.tripPlans ?? [];

  const [viewState, setViewState] = useState<ViewState>(tripPlans.length === 0 ? 'empty' as ViewState : 'list');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    tripPlans.length > 0 ? tripPlans[0].id : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = tripPlans.find(p => p.id === selectedPlanId) ?? null;

  async function handleGeneratePlan(form: FormState) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/packing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCity: form.destinationCity,
          destinationCountry: form.destinationCountry || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          purpose: form.purpose,
          occasions: [],
          luggageType: form.luggageType,
          laundryAvailable: form.laundryAvailable,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const plan = (await res.json()) as TripPlan;
      dispatch({ type: 'ADD_TRIP_PLAN', payload: plan });
      setSelectedPlanId(plan.id);
      setViewState('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleTogglePacked(planId: string, itemId: string) {
    const plan = tripPlans.find(p => p.id === planId);
    if (!plan) return;
    const updatedItems = plan.packingItems.map(item =>
      item.id === itemId ? { ...item, packed: !item.packed } : item
    );
    dispatch({ type: 'UPDATE_TRIP_PLAN', id: planId, updates: { packingItems: updatedItems } });
  }

  function handleDelete(planId: string) {
    dispatch({ type: 'DELETE_TRIP_PLAN', id: planId });
    const remaining = tripPlans.filter(p => p.id !== planId);
    if (remaining.length > 0) {
      setSelectedPlanId(remaining[0].id);
      setViewState('list');
    } else {
      setSelectedPlanId(null);
      setViewState('empty' as ViewState);
    }
  }

  // Empty state
  if (tripPlans.length === 0 && viewState !== 'form') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center', gap: '1rem' }}>
        <p className="eyebrow">Travel Intelligence</p>
        <h2>Plan your next trip</h2>
        <p style={{ color: 'var(--muted)', maxWidth: '380px', lineHeight: 1.6 }}>
          AURA analyses your wardrobe and generates a smart packing plan — outfit combinations, missing items, and daily suggestions.
        </p>
        <button className="primary" onClick={() => setViewState('form')}>
          Create Trip Plan
        </button>
      </div>
    );
  }

  // Form state
  if (viewState === 'form') {
    return (
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setViewState(tripPlans.length > 0 ? 'list' : 'empty' as ViewState)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem 0' }}
          >
            ← Back
          </button>
        </div>
        <TripForm onSubmit={handleGeneratePlan} loading={loading} error={error} />
      </div>
    );
  }

  // List + detail
  return (
    <div style={{ display: 'grid', gridTemplateColumns: tripPlans.length > 1 ? '280px 1fr' : '1fr', gap: '1.5rem' }}>
      {tripPlans.length > 1 && (
        <div>
          <TripListCard
            plans={tripPlans}
            selectedId={selectedPlanId}
            onSelect={id => { setSelectedPlanId(id); setViewState('detail'); }}
            onNew={() => setViewState('form')}
          />
        </div>
      )}

      <div>
        {tripPlans.length === 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <button className="primary" onClick={() => setViewState('form')} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
              + New Trip
            </button>
          </div>
        )}

        {selectedPlan ? (
          <PlanDetailView
            plan={selectedPlan}
            onDelete={() => handleDelete(selectedPlan.id)}
            onTogglePacked={itemId => handleTogglePacked(selectedPlan.id, itemId)}
          />
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)' }}>Select a trip to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
