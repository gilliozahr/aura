'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, fileToDataURL, scoreClass } from '@/lib/utils';
import type { InspirationItem } from '@/lib/types';
import { inspirationAgent, explanationAgent } from '@aura/agents';

function InspirationReport({ item }: { item: InspirationItem }) {
  const { dispatch } = useAura();
  const { toast } = useToast();
  const sc = scoreClass(item.report.score);

  function handleOrder() {
    dispatch({
      type: 'ADD_ORDER',
      payload: {
        id: uid(),
        itemName: item.name,
        price: item.price,
        status: 'Mock order created',
        createdAt: new Date().toISOString(),
      },
    });
    toast('Mock order created. Real checkout connects in production.');
  }

  function handleSaveToWardrobe() {
    dispatch({
      type: 'ADD_WARDROBE_ITEM',
      payload: {
        id: uid(),
        name: item.name,
        category: item.category,
        color: item.color,
        season: 'All',
        occasion: 'Smart Casual',
        style: item.style,
        wears: 0,
        confidence: item.report.score,
        image: item.image,
      },
    });
    toast('Inspiration item added to wardrobe.');
  }

  return (
    <>
      <p className="eyebrow">Compatibility Report</p>
      <h2>{item.name}</h2>
      {item.image && (
        <div style={{ position: 'relative', height: 260, borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
          <Image src={item.image} alt={item.name} fill unoptimized style={{ objectFit: 'cover' }} />
        </div>
      )}
      <div className={`score ${sc}`}>{item.report.score}%</div>
      <h3>Decision: {item.report.decision}</h3>
      <ul className="report-list">
        <li>Style match: {item.report.styleMatch}%</li>
        <li>Wardrobe impact: {item.report.wardrobeImpact}%</li>
        <li>Budget fit: {item.report.budgetFit}%</li>
        <li>Similar owned items: {item.report.duplicateCount}</li>
        <li>Why: {explanationAgent.explainInspiration(item.report)}</li>
      </ul>
      <div className="top-actions" style={{ marginTop: 14 }}>
        <button className="primary" onClick={handleOrder}>Order Mock</button>
        <button className="secondary" onClick={handleSaveToWardrobe}>Add to Wardrobe</button>
      </div>
    </>
  );
}

export default function InspirationView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const lastInspiration = state.inspirations.at(-1);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const imageFile = form.get('image') as File | null;
    const image = await fileToDataURL(imageFile);

    const input = {
      name: form.get('name') as string,
      category: form.get('category') as string,
      color: (form.get('color') as string) || 'Neutral',
      style: (form.get('style') as string) || state.user.styleGoal,
      price: Number(form.get('price') || 0),
    };

    try {
      const report = await inspirationAgent.analyze(input, {
        wardrobe: state.wardrobe,
        user: state.user,
      });
      dispatch({
        type: 'ADD_INSPIRATION',
        payload: { id: uid(), ...input, image, report, createdAt: new Date().toISOString() },
      });
      toast('AURA analysis complete.');
    } catch (err) {
      toast(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid two">
      <div className="card">
        <p className="eyebrow">AI Inspiration</p>
        <h2>I found this. Should I buy it?</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label>Item name <input name="name" required placeholder="Camel suede jacket" /></label>
          <label>Category
            <select name="category">
              <option>Outerwear</option><option>Top</option><option>Bottom</option>
              <option>Shoes</option><option>Accessory</option><option>Watch</option><option>Fragrance</option>
            </select>
          </label>
          <label>Color <input name="color" placeholder="Camel" /></label>
          <label>Style <input name="style" placeholder="Quiet Luxury" /></label>
          <label>Estimated price <input name="price" type="number" min="0" placeholder="320" /></label>
          <label>Upload inspiration image <input name="image" type="file" accept="image/*" /></label>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze Compatibility'}
          </button>
        </form>
      </div>

      <div className="card">
        {lastInspiration
          ? <InspirationReport item={lastInspiration} />
          : (
            <>
              <p className="eyebrow">Decision Engine</p>
              <h2>No inspiration analyzed yet.</h2>
              <p>Upload a clothing item, screenshot, or outfit idea. AURA will return a compatibility score, wardrobe impact, and Buy / Wait / Skip guidance.</p>
            </>
          )}
      </div>
    </div>
  );
}
