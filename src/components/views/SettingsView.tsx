'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAura } from '@/store';
import { AURA_VERSION, AURA_RELEASE_NOTES } from '@/lib/version';
import { useToast } from '@/store/toast';
import type { StyleDNAProfile, WeatherContext } from '@/lib/types';

export default function SettingsView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [locLabel, setLocLabel] = useState('');
  const [dnaLoading, setDnaLoading] = useState(false);

  async function handleRecomputeDNA() {
    setDnaLoading(true);
    try {
      const res = await fetch('/api/style-dna/recompute', { method: 'POST' });
      const data = (await res.json()) as { profile?: StyleDNAProfile; error?: string };
      if (!res.ok || !data.profile) throw new Error(data.error ?? 'Recompute failed');
      dispatch({ type: 'SET_STYLE_DNA', payload: data.profile });
      toast('Style DNA updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Recompute failed';
      toast(`Style DNA error: ${msg}`);
    } finally {
      setDnaLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    dispatch({
      type: 'SET_USER',
      payload: {
        ...state.user,
        name: form.get('name') as string,
        city: form.get('city') as string,
        country: (form.get('country') as string) || undefined,
        temperature: Number(form.get('temperature')),
        occasion: form.get('occasion') as string,
        styleGoal: form.get('styleGoal') as string,
        budget: Number(form.get('budget')),
      },
    });
    toast('Settings saved.');
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocLabel('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        // Use the weather API to resolve city name from coordinates
        try {
          const res = await fetch(`/api/weather/current?lat=${latitude}&lon=${longitude}`);
          const w = (await res.json()) as WeatherContext;
          const city = w.available && w.city ? w.city : state.user.city;
          dispatch({
            type: 'SET_USER',
            payload: { ...state.user, latitude, longitude, city },
          });
          setLocLabel(`Location set to ${city}`);
          toast(`Location updated to ${city}.`);
        } catch {
          dispatch({ type: 'SET_USER', payload: { ...state.user, latitude, longitude } });
          setLocLabel('Coordinates saved — reload to apply.');
          toast('Coordinates saved.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast('Location access denied. Set your city manually below.');
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="card">
      <p className="eyebrow">Settings</p>
      <h2>Style Context</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Display Name
          <input name="name" defaultValue={state.user.name} placeholder="e.g. Gillio" />
          <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
            Shown in the Daily Briefing greeting
          </span>
        </label>

        <label>
          City
          <input name="city" defaultValue={state.user.city} placeholder="Dubai" />
        </label>

        <label>
          Country
          <input name="country" defaultValue={state.user.country ?? ''} placeholder="UAE" />
        </label>

        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={handleUseCurrentLocation}
            disabled={locating}
          >
            {locating ? 'Locating…' : 'Use my current location'}
          </button>
          {state.user.latitude != null && !locLabel && (
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>
              Coordinates saved · updates weather automatically
            </span>
          )}
          {locLabel && (
            <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 10 }}>{locLabel}</span>
          )}
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            Use current location for better outfit recommendations. You can also set your default city manually.
          </p>
        </div>

        <label>Temperature °C <input name="temperature" type="number" defaultValue={state.user.temperature} /></label>
        <label>Today&apos;s occasion <input name="occasion" defaultValue={state.user.occasion} /></label>
        <label>Style goal <input name="styleGoal" defaultValue={state.user.styleGoal} /></label>
        <label>Monthly style budget <input name="budget" type="number" defaultValue={state.user.budget} /></label>
        <button className="primary" type="submit">Save Settings</button>
      </form>

      <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
        <p className="eyebrow">Style DNA</p>
        <h3 style={{ marginBottom: 8 }}>Your Personal Style Memory</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          AURA learns from your wardrobe, outfit feedback, and style decisions. Confidence increases as you use AURA.
        </p>
        {state.styleDNA ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Confidence: <strong style={{ color: 'var(--foreground)' }}>{state.styleDNA.confidenceScore}/100</strong></span>
            <span>Signals processed: <strong style={{ color: 'var(--foreground)' }}>{state.styleDNA.signalCount}</strong></span>
            <span>Last computed: <strong style={{ color: 'var(--foreground)' }}>{new Date(state.styleDNA.lastComputedAt).toLocaleDateString()}</strong></span>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            No Style DNA computed yet. Add wardrobe items and provide outfit feedback to build your profile.
          </p>
        )}
        <button
          type="button"
          className="secondary"
          onClick={handleRecomputeDNA}
          disabled={dnaLoading}
          style={{ fontSize: 13, padding: '6px 14px' }}
        >
          {dnaLoading ? 'Computing…' : 'Recompute Style DNA'}
        </button>
      </div>

      {/* Release */}
      <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <p className="eyebrow" style={{ marginBottom: 0 }}>Release</p>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.03em' }}>
            {AURA_VERSION}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {AURA_RELEASE_NOTES.map(note => (
            <span
              key={note}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(140,140,140,0.08)',
                border: '1px solid rgba(140,140,140,0.15)',
                fontSize: '0.75rem',
                color: 'var(--muted)',
              }}
            >
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
