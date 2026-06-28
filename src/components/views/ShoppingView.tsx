'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid } from '@/lib/utils';
import type { ShoppingProduct, ShoppingRecommendation } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function decisionColor(decision: string): string {
  if (decision === 'Buy') return 'var(--good)';
  if (decision === 'Skip') return 'var(--bad)';
  return 'var(--warn)';
}

function decisionBg(decision: string): string {
  if (decision === 'Buy') return 'rgba(36,107,69,.08)';
  if (decision === 'Skip') return 'rgba(156,47,47,.08)';
  return 'rgba(154,106,0,.08)';
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function sourceLabel(src: string | undefined): string {
  if (src === 'json_ld') return 'JSON-LD';
  if (src === 'open_graph') return 'Open Graph';
  if (src === 'metadata') return 'HTML meta';
  if (src === 'manual') return 'Manual entry';
  return 'Unknown';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── ProductImage ──────────────────────────────────────────────────────────────

function ProductImage({
  urls,
  title,
  size = 'full',
}: {
  urls: string[];
  title?: string;
  size?: 'full' | 'thumb';
}) {
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const src = urls[active];

  if (size === 'thumb') {
    return urls[0] && !failed ? (
      <img
        src={urls[0]}
        alt=""
        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    ) : (
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 10,
          background: 'var(--panel-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        🛍️
      </div>
    );
  }

  // Full size
  return (
    <div style={{ marginBottom: 16 }}>
      {src && !failed ? (
        <img
          src={src}
          alt={title ?? 'Product'}
          style={{
            width: '100%',
            maxHeight: 320,
            objectFit: 'cover',
            borderRadius: 16,
            display: 'block',
          }}
          onError={() => {
            if (active + 1 < urls.length) setActive(a => a + 1);
            else setFailed(true);
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: 180,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #eee5d8, #fffaf2)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            fontSize: 14,
          }}
        >
          No product image available
        </div>
      )}

      {/* Thumbnails strip */}
      {urls.length > 1 && !failed && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setActive(i)}
              style={{
                width: 44,
                height: 44,
                border: `2px solid ${i === active ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 8,
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'none',
              }}
              aria-label={`Image ${i + 1}`}
            >
              <img
                src={u}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: ShoppingProduct }) {
  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        border: '1.5px solid var(--line)',
        background: 'rgba(255,253,249,.95)',
      }}
    >
      <p className="eyebrow" style={{ marginBottom: 10 }}>Product Detected</p>

      <ProductImage urls={product.imageUrls} title={product.title} size="full" />

      {/* Title + brand row */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, lineHeight: 1.3 }}>
          {product.title ?? <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Title not found</span>}
        </h2>
        {product.brand && (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>
            {product.brand}
          </p>
        )}
      </div>

      {/* Pills row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {product.price != null && (
          <span className="pill" style={{ fontWeight: 800 }}>
            {product.currency ? `${product.currency} ` : ''}{product.price.toLocaleString()}
          </span>
        )}
        {product.category && <span className="pill">{product.category}</span>}
        {product.color && <span className="pill">{product.color}</span>}
        {product.material && <span className="pill">{product.material}</span>}
      </div>

      {/* Sizes */}
      {product.availableSizes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Available sizes
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {product.availableSizes.map(s => (
              <span
                key={s}
                style={{
                  padding: '3px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'rgba(255,255,255,.7)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {product.description && (
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>
          {product.description.length > 280
            ? product.description.slice(0, 280) + '…'
            : product.description}
        </p>
      )}

      {/* Footer: source + link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--line)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--muted)',
              background: 'var(--panel-2)',
              borderRadius: 6,
              padding: '2px 8px',
              letterSpacing: '.04em',
            }}
          >
            {sourceLabel(product.extractionSource)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{hostOf(product.url)}</span>
        </div>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent)',
            textDecoration: 'none',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '5px 12px',
          }}
        >
          Open product page ↗
        </a>
      </div>
    </div>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, invert = false }: { label: string; score: number; invert?: boolean }) {
  const color = invert
    ? (score >= 65 ? 'var(--bad)' : score >= 35 ? 'var(--warn)' : 'var(--good)')
    : (score >= 65 ? 'var(--good)' : score >= 40 ? 'var(--warn)' : 'var(--bad)');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 170, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--panel-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, borderRadius: 999, background: color, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, width: 28, textAlign: 'right' }}>{score}</span>
    </div>
  );
}

// ── RecommendationCard ────────────────────────────────────────────────────────

function RecommendationCard({
  product: _product,
  rec,
}: {
  product: ShoppingProduct;
  rec: ShoppingRecommendation;
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      {/* Decision header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
          padding: '16px 20px',
          borderRadius: 16,
          background: decisionBg(rec.decision),
          border: `1.5px solid ${decisionColor(rec.decision)}22`,
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>AURA Recommendation</p>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)', maxWidth: 420, lineHeight: 1.5 }}>
            {rec.reasoning}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: '-.04em',
              color: decisionColor(rec.decision),
              lineHeight: 1,
            }}
          >
            {rec.decision}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {rec.confidenceScore}% confidence
          </div>
        </div>
      </div>

      {/* Scores */}
      <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        Score breakdown
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <ScoreBar label="Wardrobe compatibility" score={rec.wardrobeMatchScore} />
        <ScoreBar label="Style DNA alignment" score={rec.styleDNAFitScore} />
        <ScoreBar label="Fit confidence" score={rec.sizeFitScore} />
        <ScoreBar label="Occasion usefulness" score={rec.occasionUsefulnessScore} />
        <ScoreBar label="Trip usefulness" score={rec.tripUsefulnessScore} />
        <ScoreBar label="Duplicate risk" score={rec.duplicateRiskScore} invert />
      </div>

      {/* Size notes */}
      {rec.sizeNotes && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--muted)',
            background: 'var(--panel-2)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {rec.sizeNotes}
        </div>
      )}

      {/* Gap match */}
      {rec.missingGapMatch?.relevant && rec.missingGapMatch.gap && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--good)',
            fontWeight: 700,
            background: 'rgba(36,107,69,.07)',
            borderRadius: 10,
            padding: '8px 14px',
            marginBottom: 16,
          }}
        >
          Fills a wardrobe gap: {rec.missingGapMatch.gap}
        </div>
      )}

      {/* Pairs with */}
      {rec.wardrobeMatches.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Pairs with your wardrobe
          </p>
          <div className="tags">
            {rec.wardrobeMatches.map(m => <span key={m} className="tag">{m}</span>)}
          </div>
        </div>
      )}

      {/* Outfit ideas */}
      {rec.outfitIdeas.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Outfit ideas
          </p>
          {rec.outfitIdeas.map(idea => (
            <p key={idea} style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0', lineHeight: 1.45 }}>
              · {idea}
            </p>
          ))}
        </div>
      )}

      {/* Risks */}
      {rec.risks.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--bad)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Risks
          </p>
          {rec.risks.map(r => (
            <p key={r} style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0', lineHeight: 1.45 }}>
              · {r}
            </p>
          ))}
        </div>
      )}

      {/* Alternatives */}
      {rec.alternatives.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {rec.alternatives.map(a => (
            <p key={a} style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0' }}>· {a}</p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {rec.aiEnhanced && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'rgba(139,111,71,.1)',
              borderRadius: 999,
              padding: '3px 10px',
            }}
          >
            AI Enhanced
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Analysed against your wardrobe, Style DNA, and size profile
        </span>
      </div>
    </div>
  );
}

// ── ManualProductForm ─────────────────────────────────────────────────────────

interface ManualFormProps {
  url: string;
  onSubmit: (product: ShoppingProduct) => void;
  onCancel: () => void;
}

function ManualProductForm({ url, onSubmit, onCancel }: ManualFormProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const str = (k: string) => (form.get(k) as string).trim() || undefined;
    const priceRaw = str('price');
    const sizesRaw = str('sizes');
    const imageUrlRaw = str('imageUrl');

    const product: ShoppingProduct = {
      id: uid(),
      url,
      title: str('title'),
      brand: str('brand'),
      price: priceRaw ? parseFloat(priceRaw) : undefined,
      currency: str('currency') ?? 'USD',
      category: str('category'),
      color: str('color'),
      material: str('material'),
      description: str('notes'),
      imageUrls: imageUrlRaw ? [imageUrlRaw] : [],
      availableSizes: sizesRaw
        ? sizesRaw.split(/[,/|]/).map(s => s.trim()).filter(Boolean)
        : [],
      sizeGuide: {},
      extractionSource: 'manual',
      extractionStatus: 'success',
      createdAt: new Date().toISOString(),
    };
    onSubmit(product);
  }

  return (
    <div className="card" style={{ marginTop: 16, border: '1.5px solid var(--line)' }}>
      <p className="eyebrow">Manual Entry</p>
      <h3 style={{ marginBottom: 4 }}>Enter product details</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
        Product details could not be read automatically. Add what you know — all fields are optional.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Product image URL
          <input name="imageUrl" type="url" placeholder="https://…/product-image.jpg" />
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, display: 'block' }}>
            Paste the direct image URL if you have it
          </span>
        </label>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>Color <input name="color" placeholder="e.g. Navy" /></label>
          <label>Material <input name="material" placeholder="e.g. Merino wool" /></label>
        </div>
        <label>
          Available sizes
          <input name="sizes" placeholder="e.g. S, M, L, XL or 30, 32, 34" />
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, display: 'block' }}>
            Comma-separated
          </span>
        </label>
        <label>Notes / description <textarea name="notes" placeholder="Any additional details…" style={{ minHeight: 60 }} /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="primary" style={{ flex: 1 }}>Analyse Product</button>
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── HistoryItem ───────────────────────────────────────────────────────────────

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
        transition: 'background .15s',
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      <ProductImage urls={product.imageUrls} title={product.title} size="thumb" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 2px',
            fontWeight: 700,
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.title ?? product.url}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.35 }}>
          {[
            product.brand,
            product.price != null
              ? `${product.currency ? product.currency + ' ' : ''}${product.price.toLocaleString()}`
              : null,
            hostOf(product.url),
            product.createdAt ? formatDate(product.createdAt) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {rec && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: decisionColor(rec.decision) }}>
            {rec.decision}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{rec.confidenceScore}%</div>
        </div>
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

      {/* ── Area 1: Product Link Analyzer ── */}
      <div className="card">
        <p className="eyebrow">Shopping Advisor</p>
        <h2 style={{ marginBottom: 6 }}>Should you buy it?</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.55 }}>
          Paste a product URL. AURA reads the product page, then checks compatibility against your wardrobe, Style DNA, size profile, trips, and upcoming occasions.
        </p>

        <form style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} onSubmit={handleExtract}>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://www.zara.com/…"
            style={{ flex: 1, minWidth: 220 }}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="primary"
            disabled={isLoading || !urlInput.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {phase === 'extracting'
              ? 'Reading page…'
              : phase === 'analysing'
              ? 'Analysing…'
              : 'Analyse'}
          </button>
          {phase !== 'idle' && (
            <button type="button" className="ghost" onClick={handleNew}>
              New
            </button>
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

      {/* ── Area 2: Product Card ── */}
      {phase === 'manual' && currentProduct && (
        <ManualProductForm
          url={currentProduct.url}
          onSubmit={handleManualSubmit}
          onCancel={() => { setPhase('idle'); setCurrentProduct(null); }}
        />
      )}

      {(phase === 'analysing' || phase === 'done') && currentProduct && (
        <ProductCard product={currentProduct} />
      )}

      {/* ── Area 3: AURA Recommendation ── */}
      {phase === 'done' && currentProduct && currentRec && (
        <RecommendationCard product={currentProduct} rec={currentRec} />
      )}

      {/* Loading state under product card */}
      {phase === 'analysing' && (
        <div
          className="card"
          style={{ marginTop: 16, textAlign: 'center', padding: 28, color: 'var(--muted)', fontSize: 14 }}
        >
          Running AURA analysis — wardrobe, Style DNA, size profile, occasions, trips…
        </div>
      )}

      {/* ── History ── */}
      {products.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Analysis History</p>
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

      {/* Empty state */}
      {products.length === 0 && phase === 'idle' && (
        <div
          className="card"
          style={{ marginTop: 20, textAlign: 'center', padding: '40px 24px' }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛍️</div>
          <p style={{ fontWeight: 700, margin: '0 0 6px' }}>No analyses yet</p>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Paste any product URL above to get a personalised Buy / Wait / Skip recommendation.
          </p>
        </div>
      )}
    </div>
  );
}
