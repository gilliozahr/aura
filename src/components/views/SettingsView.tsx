'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAura } from '@/store';
import { AURA_VERSION, AURA_RELEASE_NOTES } from '@/lib/version';
import { useToast } from '@/store/toast';
import type { MeasurementUnit, PreferredFit, StyleDNAProfile, UserSizeProfile, WeatherContext } from '@/lib/types';

// ── Size profile unit config ───────────────────────────────────────────────────

const UNIT_RANGES = {
  cm: { height: [120, 230], chest: [60, 160], waist: [50, 160], hips: [60, 170], shoulder: [30, 70], inseam: [50, 120] },
  in: { height: [48, 90],  chest: [24, 65],  waist: [20, 65],  hips: [24, 70],  shoulder: [12, 30], inseam: [20, 45]  },
} as const;

const UNIT_PLACEHOLDERS = {
  cm: { height: '178', chest: '96', waist: '82', hips: '95', shoulder: '44', inseam: '81' },
  in: { height: '70', chest: '38', waist: '34', hips: '38', shoulder: '17', inseam: '32' },
} as const;

export default function SettingsView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [locLabel, setLocLabel] = useState('');
  const [dnaLoading, setDnaLoading] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>(
    state.user.sizeProfile?.measurementUnit ?? 'cm'
  );

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

      {/* Size Profile */}
      <div style={{ marginTop: 32, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
        <p className="eyebrow">Size Profile</p>
        <h3 style={{ marginBottom: 4 }}>Your Measurements</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Used only to improve fit recommendations in the Shopping Advisor. All fields are optional and never shared.
        </p>
        <form
          className="form"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const num = (key: string) => { const v = (f.get(key) as string).trim(); return v ? parseFloat(v) : undefined; };
            const str = (key: string) => { const v = (f.get(key) as string).trim(); return v || undefined; };
            const sizeProfile: UserSizeProfile = {
              measurementUnit,
              heightCm: num('height'),
              weightKg: num('weightKg'),
              chestCm: num('chest'),
              waistCm: num('waist'),
              hipsCm: num('hips'),
              shoulderCm: num('shoulder'),
              inseamCm: num('inseam'),
              shoeSizeEU: num('shoeSizeEU'),
              preferredFit: (str('preferredFit') as PreferredFit | undefined),
              topSize: str('topSize'),
              bottomSize: str('bottomSize'),
              blazerSize: str('blazerSize'),
              notes: str('sizeNotes'),
            };
            dispatch({ type: 'SET_USER', payload: { ...state.user, sizeProfile } });
            toast('Size profile saved.');
          }}
        >
          {/* Unit selector */}
          <label>
            Measurement unit
            <select
              name="measurementUnit"
              value={measurementUnit}
              onChange={e => setMeasurementUnit(e.target.value as MeasurementUnit)}
            >
              <option value="cm">Centimeters (cm)</option>
              <option value="in">Inches (in)</option>
            </select>
          </label>

          {/* Height + Weight */}
          <div className="grid two">
            <label>
              Height ({measurementUnit})
              <input
                name="height"
                type="number"
                step="0.5"
                min={UNIT_RANGES[measurementUnit].height[0]}
                max={UNIT_RANGES[measurementUnit].height[1]}
                defaultValue={state.user.sizeProfile?.heightCm ?? ''}
                placeholder={`e.g. ${UNIT_PLACEHOLDERS[measurementUnit].height}`}
              />
            </label>
            <label>
              Weight (kg)
              <input name="weightKg" type="number" min="30" max="300" step="0.5" defaultValue={state.user.sizeProfile?.weightKg ?? ''} placeholder="e.g. 75" />
            </label>
          </div>

          {/* Chest + Waist */}
          <div className="grid two">
            <label>
              Chest ({measurementUnit})
              <input
                name="chest"
                type="number"
                step="0.5"
                min={UNIT_RANGES[measurementUnit].chest[0]}
                max={UNIT_RANGES[measurementUnit].chest[1]}
                defaultValue={state.user.sizeProfile?.chestCm ?? ''}
                placeholder={`e.g. ${UNIT_PLACEHOLDERS[measurementUnit].chest}`}
              />
            </label>
            <label>
              Waist ({measurementUnit})
              <input
                name="waist"
                type="number"
                step="0.5"
                min={UNIT_RANGES[measurementUnit].waist[0]}
                max={UNIT_RANGES[measurementUnit].waist[1]}
                defaultValue={state.user.sizeProfile?.waistCm ?? ''}
                placeholder={`e.g. ${UNIT_PLACEHOLDERS[measurementUnit].waist}`}
              />
            </label>
          </div>

          {/* Hips + Shoulder */}
          <div className="grid two">
            <label>
              Hips ({measurementUnit})
              <input
                name="hips"
                type="number"
                step="0.5"
                min={UNIT_RANGES[measurementUnit].hips[0]}
                max={UNIT_RANGES[measurementUnit].hips[1]}
                defaultValue={state.user.sizeProfile?.hipsCm ?? ''}
                placeholder={`e.g. ${UNIT_PLACEHOLDERS[measurementUnit].hips}`}
              />
            </label>
            <label>
              Shoulder ({measurementUnit})
              <input
                name="shoulder"
                type="number"
                step="0.5"
                min={UNIT_RANGES[measurementUnit].shoulder[0]}
                max={UNIT_RANGES[measurementUnit].shoulder[1]}
                defaultValue={state.user.sizeProfile?.shoulderCm ?? ''}
                placeholder={`e.g. ${UNIT_PLACEHOLDERS[measurementUnit].shoulder}`}
              />
            </label>
          </div>

          {/* Inseam + Shoe EU */}
          <div className="grid two">
            <label>
              Inseam ({measurementUnit})
              <input
                name="inseam"
                type="number"
                step="0.5"
                min={UNIT_RANGES[measurementUnit].inseam[0]}
                max={UNIT_RANGES[measurementUnit].inseam[1]}
                defaultValue={state.user.sizeProfile?.inseamCm ?? ''}
                placeholder={`e.g. ${UNIT_PLACEHOLDERS[measurementUnit].inseam}`}
              />
            </label>
            <label>
              Shoe size (EU)
              <input name="shoeSizeEU" type="number" min="30" max="55" step="0.5" defaultValue={state.user.sizeProfile?.shoeSizeEU ?? ''} placeholder="e.g. 43" />
            </label>
          </div>

          {/* Fit + Label sizes */}
          <div className="grid two">
            <label>
              Preferred fit
              <select name="preferredFit" defaultValue={state.user.sizeProfile?.preferredFit ?? ''}>
                <option value="">Select…</option>
                {(['Slim', 'Regular', 'Relaxed', 'Oversized'] as PreferredFit[]).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label>Top size <input name="topSize" placeholder="e.g. M or 38" defaultValue={state.user.sizeProfile?.topSize ?? ''} /></label>
          </div>
          <div className="grid two">
            <label>Bottom size <input name="bottomSize" placeholder="e.g. 32×32" defaultValue={state.user.sizeProfile?.bottomSize ?? ''} /></label>
            <label>Blazer / jacket size <input name="blazerSize" placeholder="e.g. 48 or L" defaultValue={state.user.sizeProfile?.blazerSize ?? ''} /></label>
          </div>
          <label>Notes <textarea name="sizeNotes" placeholder="e.g. Long arms, broad shoulders" defaultValue={state.user.sizeProfile?.notes ?? ''} style={{ minHeight: 60 }} /></label>
          <button className="primary" type="submit">Save Size Profile</button>
        </form>
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
