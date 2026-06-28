'use client';

import type { FormEvent } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';

export default function SettingsView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    dispatch({
      type: 'SET_USER',
      payload: {
        name: form.get('name') as string,
        city: form.get('city') as string,
        temperature: Number(form.get('temperature')),
        occasion: form.get('occasion') as string,
        styleGoal: form.get('styleGoal') as string,
        budget: Number(form.get('budget')),
      },
    });
    toast('Settings saved.');
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
        <label>City <input name="city" defaultValue={state.user.city} /></label>
        <label>Temperature °C <input name="temperature" type="number" defaultValue={state.user.temperature} /></label>
        <label>Today&apos;s occasion <input name="occasion" defaultValue={state.user.occasion} /></label>
        <label>Style goal <input name="styleGoal" defaultValue={state.user.styleGoal} /></label>
        <label>Monthly style budget <input name="budget" type="number" defaultValue={state.user.budget} /></label>
        <button className="primary" type="submit">Save Settings</button>
      </form>
    </div>
  );
}
