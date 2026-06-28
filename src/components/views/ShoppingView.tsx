'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid } from '@/lib/utils';
import type { ShoppingProduct, ShoppingRecommendation } from '@/lib/types';

// ── Score helpers ─────────────────────────────────────────────────────────────

function decisionColor(decision: string): string {
  if (decision === 'Buy') return 'var(--good)';
  if (decision === 'Skip') return 'var(--bad)';
  return 'var(--warn)';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', width: 180, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--panel-2)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            borderRadius: 999,
            background: score >= 65 ? 'var(--good)' : score >= 40 ? 'var(--warn)' : 'var(--bad)',
            transition: 'width .4s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, width: 32, textAlign: 'right' }}>{score}</span>
    </div>
  );
}

interface RecommendationCardProps {
  product: ShoppingProduct;
  rec: ShoppingRecommendation;
}

function RecommendationCard({ product, rec }: RecommendationCardProps) {
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p className="eyebrow">Shopping Recommendation</p>
          <h2 style={{ margin: '4px 0 6px', fontSize: 22 }}>{product.title ?? 'Product'}</h2>
          {product.brand && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{product.brand}</span>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.04em', color: decisionColor(rec.decision) }}>
            {rec.decision}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rec.confidenceScore}% confidence</div>
        </div>
      </div>

      {product.imageUrls.length > 0 && (
        <img
          src={product.imageUrls[0]}
          alt={product.title ?? 'Product'}
          style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 14, marginBottom: 16 }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
        {product.price != null && (
          <span className="pill">{product.currency ?? ''}{product.price.toLocaleString()}</span>
        )}
        {product.color && <span className="pill">{product.color}</span>}
        {product.category && <span className="pill">{product.category}</span>}
        {product.material && <span className="pill">{product.material}</span>}
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{rec.reasoning}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <ScoreBar label="Wardrobe compatibility" score={rec.wardrobeMatchScore} />
        <ScoreBar label="Style DNA alignment" score={rec.styleDNAFitScore} />
        <ScoreBar label="Fit confidence" score={rec.sizeFitScore} />
        <ScoreBar label="Occasion usefulness" score={rec.occasionUsefulnessScore} />
        <ScoreBar label="Trip usefulness" score={rec.tripUsefulnessScore} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', width: 180, flexShrink: 0 }}>Duplicate risk</span>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--panel-2)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${rec.duplicateRiskScore}%`,
                borderRadius: 999,
                background: rec.duplicateRiskScore >= 65 ? 'var(--bad)' : rec.duplicateRiskScore >= 35 ? 'var(--warn)' : 'var(--good)',
                transition: 'width .4s ease',
              }}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, width: 32, textAlign: 'right' }}>{rec.duplicateRiskScore}</span>
        </div>
      </div>

      {rec.sizeNotes && (
        <p style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--panel-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          {rec.sizeNotes}
        </p>
      )}

      {rec.wardrobeMatches.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pairs with</p>
          <div className="tags">
            {rec.wardrobeMatches.map(m => <span key={m} className="tag">{m}</span>)}
          </div>
        </div>
      )}

      {rec.outfitIdeas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Outfit ideas</p>
          {rec.outfitIdeas.map(idea => (
            <p key={idea} style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0' }}>• {idea}</p>
          ))}
        </div>
      )}

      {rec.risks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--bad)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Risks</p>
          {rec.risks.map(r => (
            <p key={r} style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0' }}>• {r}</p>
          ))}
        </div>
      )}

      {rec.missingGapMatch?.relevant && rec.missingGapMatch.gap && (
        <p style={{ fontSize: 13, color: 'var(--good)', fontWeight: 700 }}>Fills a wardrobe gap: {rec.missingGapMatch.gap}</p>
      )}

      {rec.alternatives.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {rec.alternatives.map(a => (
            <p key={a} style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0' }}>• {a}</p>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {rec.aiEnhanced && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(139,111,71,.1)', borderRadius: 999, padding: '3px 10px' }}>
            AI Enhanced
          </span>
        )}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}
        >
          View product
        </a>
      </div>
    </div>
  );
}

// ── Manual product form ───────────────────────────────────────────────────────

interface ManualFormProps {
  url: string;
  onSubmit: (product: ShoppingProduct) => void;
  onCancel: () => void;
}

function ManualProductForm({ url, onSubmit, onCancel }: ManualFormProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const priceRaw = (form.get('price') as string).trim();
    const product: ShoppingProduct = {
      id: uid(),
      url,
      title: (form.get('title') as string).trim() || undefined,
      brand: (form.get('brand') as string).trim() || undefined,
      price: priceRaw ? parseFloat(priceRaw) : undefined,
      currency: (form.get('currency') as string).trim() || undefined,
      category: (form.get('category') as string) || undefined,
      color: (form.get('color') as string).trim() || undefined,
      material: (form.get('material') as string).trim() || undefined,
      imageUrls: [],
      availableSizes: [],
      sizeGuide: {},
      extractionSource: 'manual',
      extractionStatus: 'success',
      createdAt: new Date().toISOString(),
    };
    onSubmit(product);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <p className="eyebrow">Manual Entry</p>
      <h3 style={{ marginBottom: 4 }}>Enter product details</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        AURA could not automatically extract product details from this URL. Please enter what you know — all fields are optional.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label>Product title <input name="title" placeholder="e.g. Slim Fit Merino Sweater" /></label>
        <label>Brand <input name="brand" placeholder="e.g. Loro Piana" /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
          <label>Price <input name="price" type="number" min="0" step="0.01" placeholder="e.g. 495" /></label>
          <label>Currency <input name="currency" placeholder="USD" defaultValue="USD" /></label>
        </div>
        <label>
          Category
          <select name="category">
            <option value="">Select…</option>
            {['Top', 'Bottom', 'Shoes', 'Outerwear', 'Dress', 'Bag', 'Accessory', 'Watch'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>Color <input name="color" placeholder="e.g. Navy" /></label>
        <label>Material <input name="material" placeholder="e.g. Merino wool" /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="primary" style={{ flex: 1 }}>Analyse Product</button>
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── History list ──────────────────────────────────────────────────────────────

interface HistoryItemProps {
  product: ShoppingProduct;
  rec?: ShoppingRecommendation;
  onSelect: () => void;
  onDelete: () => void;
}

function HistoryItem({ product, rec, onSelect, onDelete }: HistoryItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        border: '1px solid var(--line)',
        borderRadius: 14,
        background: 'rgba(255,253,249,.72)',
        cursor: 'pointer',
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      {product.imageUrls[0] && (
        <img
          src={product.imageUrls[0]}
          alt=""
          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.title ?? product.url}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          {product.brand ?? ''}
          {product.price != null ? ` · ${product.currency ?? ''}${product.price.toLocaleString()}` : ''}
        </p>
      </div>
      {rec && (
        <span style={{ fontSize: 13, fontWeight: 800, color: decisionColor(rec.decision), flexShrink: 0 }}>
          {rec.decision}
        </span>
      )}
      <button
        type="button"
        className="ghost"
        style={{ fontSize: 12, padding: '4px 10px', flexShrink: 0 }}
        onClick={e => { e.stopPropagation(); onDelete(); }}
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function ShoppingView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();

  const [urlInput, setUrlInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'manual' | 'analysing' | 'done'>('idle');
  const [currentProduct, setCurrentProduct] = useState<ShoppingProduct | null>(null);
  const [currentRec, setCurrentRec] = useState<ShoppingRecommendation | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const products = state.shoppingProducts ?? [];
  const recs = state.shoppingRecommendations ?? [];

  async function handleExtract(e: FormEvent) {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    setPhase('extracting');
    setCurrentProduct(null);
    setCurrentRec(null);
    setWarnings([]);

    try {
      const res = await fetch('/api/shopping/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as {
        product?: ShoppingProduct;
        extractionStatus?: string;
        warnings?: string[];
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? 'Extraction failed');

      const product = data.product;
      if (!product) throw new Error('No product returned');

      setWarnings(data.warnings ?? []);

      if (data.extractionStatus === 'manual_required') {
        setCurrentProduct(product);
        setPhase('manual');
      } else {
        await runAnalysis(product);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extraction failed';
      toast(`Error: ${msg}`);
      setPhase('idle');
    }
  }

  async function runAnalysis(product: ShoppingProduct) {
    setPhase('analysing');
    setCurrentProduct(product);

    try {
      const res = await fetch('/api/shopping/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const data = await res.json() as { recommendation?: ShoppingRecommendation; error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');
      if (!data.recommendation) throw new Error('No recommendation returned');

      const rec = data.recommendation;
      setCurrentRec(rec);
      setPhase('done');

      dispatch({ type: 'ADD_SHOPPING_PRODUCT', payload: product });
      dispatch({ type: 'ADD_SHOPPING_RECOMMENDATION', payload: rec });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      toast(`Error: ${msg}`);
      setPhase('idle');
    }
  }

  function handleManualSubmit(product: ShoppingProduct) {
    void runAnalysis(product);
  }

  function handleSelectHistory(product: ShoppingProduct) {
    const rec = recs.find(r => r.productId === product.id);
    setCurrentProduct(product);
    setCurrentRec(rec ?? null);
    setUrlInput(product.url);
    setPhase(rec ? 'done' : 'idle');
    setWarnings([]);
  }

  function handleDeleteProduct(id: string) {
    dispatch({ type: 'DELETE_SHOPPING_PRODUCT', id });
    if (currentProduct?.id === id) {
      setCurrentProduct(null);
      setCurrentRec(null);
      setPhase('idle');
    }
  }

  function handleNew() {
    setUrlInput('');
    setCurrentProduct(null);
    setCurrentRec(null);
    setPhase('idle');
    setWarnings([]);
  }

  const isLoading = phase === 'extracting' || phase === 'analysing';

  return (
    <div className="view-content">
      <div className="card">
        <p className="eyebrow">Shopping Advisor</p>
        <h2 style={{ marginBottom: 6 }}>Should you buy it?</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
          Paste a product URL. AURA analyses compatibility with your wardrobe, style, size profile, trips, and occasions.
        </p>

        <form style={{ display: 'flex', gap: 10 }} onSubmit={handleExtract}>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://www.zara.com/…"
            style={{ flex: 1 }}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="primary"
            disabled={isLoading || !urlInput.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {phase === 'extracting' ? 'Reading page…' : phase === 'analysing' ? 'Analysing…' : 'Analyse'}
          </button>
          {phase !== 'idle' && (
            <button type="button" className="ghost" onClick={handleNew}>New</button>
          )}
        </form>

        {warnings.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {warnings.map(w => (
              <p key={w} style={{ fontSize: 13, color: 'var(--warn)', margin: '4px 0' }}>{w}</p>
            ))}
          </div>
        )}
      </div>

      {phase === 'manual' && currentProduct && (
        <ManualProductForm
          url={currentProduct.url}
          onSubmit={handleManualSubmit}
          onCancel={() => setPhase('idle')}
        />
      )}

      {phase === 'done' && currentProduct && currentRec && (
        <RecommendationCard product={currentProduct} rec={currentRec} />
      )}

      {products.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>History</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map(p => (
              <HistoryItem
                key={p.id}
                product={p}
                rec={recs.find(r => r.productId === p.id)}
                onSelect={() => handleSelectHistory(p)}
                onDelete={() => handleDeleteProduct(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && phase === 'idle' && (
        <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 36 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🛍️</p>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>No analyses yet</p>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Paste any product URL above to get a personalised buy/skip recommendation.
          </p>
        </div>
      )}
    </div>
  );
}
