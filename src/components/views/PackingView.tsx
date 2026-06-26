'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAura } from '@/store';
import type { WardrobeItem } from '@/lib/types';

interface PackingResult {
  destination: string;
  days: number;
  type: string;
  items: WardrobeItem[];
}

export default function PackingView() {
  const { state } = useAura();
  const [result, setResult] = useState<PackingResult | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const destination = form.get('destination') as string;
    const days = Number(form.get('days') || 4);
    const type = form.get('type') as string;

    const byCategory = (cat: string) => state.wardrobe.filter(i => i.category === cat);
    const tops = byCategory('Top').slice(0, Math.min(days, 4));
    const bottoms = byCategory('Bottom').slice(0, Math.min(Math.ceil(days / 2), 3));
    const shoes = byCategory('Shoes').slice(0, 2);
    const outer = byCategory('Outerwear').slice(0, 1);

    setResult({ destination, days, type, items: [...tops, ...bottoms, ...shoes, ...outer] });
  }

  return (
    <div className="grid two">
      <div className="card">
        <p className="eyebrow">Travel Intelligence</p>
        <h2>Generate Packing Plan</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label>Destination <input name="destination" defaultValue="Beirut" /></label>
          <label>Days <input name="days" type="number" min="1" max="30" defaultValue="4" /></label>
          <label>Trip type
            <select name="type">
              <option>Business</option><option>Vacation</option><option>Wedding</option><option>Family</option>
            </select>
          </label>
          <button className="primary" type="submit">Create Packing Plan</button>
        </form>
      </div>

      <div className="card">
        {result ? (
          <>
            <p className="eyebrow">Packing Plan</p>
            <h2>{result.days} days in {result.destination}</h2>
            <p>Trip type: {result.type}. AURA recommends {result.items.length} wardrobe items and {Math.max(result.days, 3)} outfit combinations.</p>
            <ul className="report-list">
              {result.items.length > 0
                ? result.items.map(i => <li key={i.id}>{i.name} · {i.category}</li>)
                : <li>Add wardrobe items first.</li>}
            </ul>
          </>
        ) : (
          <>
            <p className="eyebrow">Packing Confidence</p>
            <h2>Ready when you are.</h2>
            <p>AURA will reuse wardrobe items intelligently instead of overpacking.</p>
          </>
        )}
      </div>
    </div>
  );
}
