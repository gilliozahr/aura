'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, fileToDataURL, scoreClass, isDataUrl } from '@/lib/utils';
import type { InspirationItem, InspirationReport } from '@/lib/types';

// ── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 75 ? 'var(--accent)' : pct >= 50 ? '#e0a020' : '#e05050';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 5 }}>
        <div style={{ width: `${pct}%`, height: 5, borderRadius: 4, background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Section list ─────────────────────────────────────────────────────────────

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <p className="eyebrow" style={{ marginBottom: 4 }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}

// ── Debug meta ───────────────────────────────────────────────────────────────

function DebugMeta({ meta }: { meta: InspirationReport['_meta'] }) {
  if (!meta) return null;
  const fb = meta.fallbackUsed ? ' · fallback' : '';
  return (
    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
      {meta.provider} · {meta.model} · {meta.latencyMs}ms · {meta.mode}{fb}
    </p>
  );
}

// ── Report card ──────────────────────────────────────────────────────────────

function InspirationReportCard({ item }: { item: InspirationItem }) {
  const { dispatch } = useAura();
  const { toast } = useToast();
  const r = item.report;

  // Backward compat: old reports stored with field name `score`
  const score = r.compatibilityScore ?? (r as unknown as { score?: number }).score ?? 0;
  const sc = scoreClass(score);

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
        confidence: score,
        image: item.image,
      },
    });
    toast('Inspiration item added to wardrobe.');
  }

  const decisionColors: Record<string, string> = {
    BUY: '#1a9e50',
    WAIT: '#cc8800',
    SKIP: '#cc3333',
  };
  const decisionColor = decisionColors[r.decision] ?? '#888';

  return (
    <>
      <p className="eyebrow">Compatibility Report</p>
      <h2 style={{ marginBottom: 8 }}>{item.name}</h2>

      {item.image && (
        <div style={{ position: 'relative', height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
          <Image
            src={item.image}
            alt={item.name}
            fill
            unoptimized={isDataUrl(item.image)}
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Decision + score header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div className={`score ${sc}`} style={{ flexShrink: 0 }}>{score}%</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: decisionColor }}>{r.decision}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Confidence {r.confidence ?? 75}%
            {r._meta?.fallbackUsed && (
              <span style={{ marginLeft: 6, color: '#cc8800' }}>· mock fallback</span>
            )}
          </div>
        </div>
      </div>

      {/* Reasoning summary */}
      {r.reasoningSummary && (
        <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
          {r.reasoningSummary}
        </p>
      )}

      {/* Score breakdown */}
      <p className="eyebrow" style={{ marginBottom: 6 }}>Score Breakdown</p>
      <ScoreBar label="Style Match" value={r.styleMatchScore ?? (r as unknown as { styleMatch?: number }).styleMatch ?? 0} />
      <ScoreBar label="Wardrobe Impact" value={r.wardrobeImpactScore ?? (r as unknown as { wardrobeImpact?: number }).wardrobeImpact ?? 0} />
      <ScoreBar label="Budget Fit" value={r.budgetFitScore ?? (r as unknown as { budgetFit?: number }).budgetFit ?? 0} />
      <ScoreBar label="Uniqueness" value={100 - (r.duplicateRisk ?? (r as unknown as { duplicateCount?: number }).duplicateCount ?? 0)} />

      {/* Why it works */}
      {r.whyItWorks && (
        <div style={{ marginTop: 12 }}>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Why It Works</p>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>{r.whyItWorks}</p>
        </div>
      )}

      {/* Qualitative sections */}
      <Section title="Risks" items={r.risks ?? []} />
      <Section title="Outfit Ideas" items={r.suggestedOutfits ?? []} />
      <Section title="Better Alternatives" items={r.betterAlternatives ?? []} />
      <Section title="Missing Pieces" items={r.missingWardrobeOpportunities ?? []} />

      {/* Actions */}
      <div className="top-actions" style={{ marginTop: 16 }}>
        <button className="primary" onClick={handleOrder}>Order Mock</button>
        <button className="secondary" onClick={handleSaveToWardrobe}>Add to Wardrobe</button>
      </div>

      <DebugMeta meta={r._meta} />
    </>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export default function InspirationView() {
  const { state, dispatch, uploadImage } = useAura();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const lastInspiration = state.inspirations.at(-1);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAiError('');

    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string).trim();
    const price = Number(form.get('price'));

    // Client-side validation — mirrors server validation for instant feedback
    if ((name.match(/[a-zA-Z]/g) ?? []).length < 2) {
      setAiError('Item name must contain at least 2 letters. Enter a real item name (e.g. "Navy blazer").');
      return;
    }
    if (!price || price < 1) {
      setAiError('Please enter the item\'s price (minimum $1) for an accurate analysis.');
      return;
    }

    setLoading(true);
    const imageFile = form.get('image') as File | null;

    let image = '';
    if (imageFile && imageFile.size > 0) {
      const uploaded = await uploadImage(imageFile, 'inspiration-images');
      image = uploaded ?? await fileToDataURL(imageFile);
    }

    const input = {
      name,
      category: form.get('category') as string,
      color: (form.get('color') as string) || 'Neutral',
      style: (form.get('style') as string) || state.user.styleGoal,
      price,
    };

    try {
      const res = await fetch('/api/ai/analyze-inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: input, context: { wardrobe: state.wardrobe, user: state.user } }),
      });

      const data = (await res.json()) as { report?: InspirationReport; error?: string };

      if (!res.ok || !data.report) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      dispatch({
        type: 'ADD_INSPIRATION',
        payload: { id: uid(), ...input, image, report: data.report, createdAt: new Date().toISOString() },
      });
      toast(data.report._meta?.fallbackUsed ? 'Analysis complete (mock fallback used).' : 'AURA analysis complete.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setAiError(`Analysis failed: ${msg}`);
      toast(`Analysis failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid two">
      {/* Left: form */}
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
          <label>Estimated price <input name="price" type="number" min="1" required placeholder="320" /></label>
          <label>Upload inspiration image <input name="image" type="file" accept="image/*" /></label>
          {aiError && (
            <p style={{ color: '#c0392b', fontSize: 13, background: '#fdf2f2', padding: '8px 12px', borderRadius: 8 }}>
              {aiError}
            </p>
          )}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze Compatibility'}
          </button>
        </form>
      </div>

      {/* Right: report */}
      <div className="card" style={{ overflowY: 'auto', maxHeight: '85vh' }}>
        {lastInspiration ? (
          <InspirationReportCard item={lastInspiration} />
        ) : (
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
