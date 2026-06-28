'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import type { WeatherContext } from '@/lib/types';

export default function SettingsView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();
  const [locating, setLocating] = useState(false);
  const [locLabel, setLocLabel] = useState('');

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
    </div>
  );
}
