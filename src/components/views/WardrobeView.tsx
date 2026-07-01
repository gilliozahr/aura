'use client';

import { useRef, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, fileToDataURL, isDataUrl, isValidItemName } from '@/lib/utils';
import type { WardrobeItem, WardrobeAIMetadata } from '@/lib/types';

const SUPPORTED_VISION_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

async function toSupportedImageDataUrl(file: File): Promise<{ dataUrl: string; converted: boolean } | { error: string }> {
  const mimeType = file.type.toLowerCase();

  if (SUPPORTED_VISION_TYPES.has(mimeType)) {
    return { dataUrl: await fileToDataURL(file), converted: false };
  }

  // Attempt canvas conversion — works for HEIC/HEIF on Safari; img.onerror fires on Chrome
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve({ error: 'Canvas unavailable.' }); return; }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        resolve({ dataUrl, converted: true });
      } catch {
        URL.revokeObjectURL(url);
        resolve({ error: 'Conversion failed.' });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ error: 'unsupported_format' });
    };
    img.src = url;
  });
}

function AISuggestionBadge() {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
      color: 'var(--accent)',
      background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
      borderRadius: 4,
      padding: '1px 5px',
      marginLeft: 6,
      verticalAlign: 'middle',
    }}>AI</span>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  item: WardrobeItem;
  onClose: () => void;
  onSave: (updated: WardrobeItem) => void;
  onDelete: (id: string) => void;
}

function EditModal({ item, onClose, onSave, onDelete }: EditModalProps) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [color, setColor] = useState(item.color);
  const [season, setSeason] = useState(item.season);
  const [occasion, setOccasion] = useState(item.occasion);
  const [style, setStyle] = useState(item.style);
  const [nameError, setNameError] = useState('');

  function handleSave(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!isValidItemName(trimmed)) {
      setNameError("Please enter a real clothing item name, like 'Navy blazer' or 'White linen shirt'.");
      return;
    }

    const correctedFields: string[] = [];
    if (item.aiMetadata) {
      const ai = item.aiMetadata;
      if (category !== ai.detectedCategory) correctedFields.push('category');
      if (color !== ai.detectedColor) correctedFields.push('color');
      if (season !== ai.detectedSeason) correctedFields.push('season');
      if (occasion !== ai.detectedOccasion) correctedFields.push('occasion');
      if (style !== ai.detectedStyle) correctedFields.push('style');
    }

    onSave({
      ...item,
      name: trimmed,
      category,
      color: color || 'Neutral',
      season,
      occasion,
      style: style || item.style,
      aiMetadata: item.aiMetadata
        ? { ...item.aiMetadata, correctedFields: correctedFields.length > 0 ? correctedFields : undefined }
        : undefined,
    });
  }

  function handleDelete() {
    if (window.confirm(`Remove "${item.name}" from your wardrobe?`)) {
      onDelete(item.id);
    }
  }

  const ai = item.aiMetadata;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${item.name}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(23,21,18,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <p className="eyebrow" style={{ margin: 0 }}>Edit Item</p>
          <button
            className="ghost"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: 13 }}
            aria-label="Close"
          >✕</button>
        </div>

        {item.image && (
          <div style={{ position: 'relative', height: 160, borderRadius: 14, overflow: 'hidden', marginBottom: '1rem' }}>
            <Image src={item.image} alt={item.name} fill unoptimized={isDataUrl(item.image)} style={{ objectFit: 'cover' }} />
          </div>
        )}

        <form className="form" onSubmit={handleSave}>
          <label>
            Name
            <input
              value={name}
              onChange={e => { setName(e.target.value); setNameError(''); }}
              placeholder="Navy blazer"
              required
            />
            {nameError && (
              <span style={{ color: 'var(--bad)', fontSize: 12, marginTop: 4, display: 'block', lineHeight: 1.4 }}>
                {nameError}
              </span>
            )}
          </label>

          <label>
            Category
            {ai && category !== ai.detectedCategory && <AISuggestionBadge />}
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option>Top</option><option>Bottom</option><option>Shoes</option>
              <option>Outerwear</option><option>Dress</option><option>Bag</option>
              <option>Accessory</option><option>Watch</option><option>Fragrance</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Color
            <input value={color} onChange={e => setColor(e.target.value)} placeholder="Navy" />
          </label>

          <label>
            Season
            <select value={season} onChange={e => setSeason(e.target.value)}>
              <option>All</option><option>Summer</option><option>Winter</option><option>Spring</option><option>Autumn</option>
            </select>
          </label>

          <label>
            Occasion
            <select value={occasion} onChange={e => setOccasion(e.target.value)}>
              <option>Business</option><option>Smart Casual</option><option>Casual</option>
              <option>Evening</option><option>Travel</option>
            </select>
          </label>

          <label>
            Style
            <input value={style} onChange={e => setStyle(e.target.value)} placeholder="Quiet Luxury" />
          </label>

          {ai && (
            <div style={{
              background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              borderRadius: 12, padding: '10px 12px',
            }}>
              <p className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>AI Analysis — Read Only</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                Provider: <strong>{ai.provider}/{ai.model}</strong> · Confidence: <strong>{ai.confidence}%</strong>
                {ai.fallbackUsed && <span style={{ color: 'var(--warn)' }}> · Fallback ({ai.fallbackReason})</span>}
                {ai.tags && ai.tags.length > 0 && (
                  <> · Tags: <strong>{ai.tags.join(', ')}</strong></>
                )}
                {ai.correctedFields && ai.correctedFields.length > 0 && (
                  <> · Corrected: <strong>{ai.correctedFields.join(', ')}</strong></>
                )}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="primary" type="submit" style={{ flex: 1 }}>Save Changes</button>
            <button className="ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="danger" type="button" onClick={handleDelete} aria-label="Delete item">Delete</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, onEdit }: { item: WardrobeItem; onEdit: (item: WardrobeItem) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      className="item-card"
      style={{ cursor: 'pointer', position: 'relative' }}
      onClick={() => onEdit(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(item); } }}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${item.name}`}
    >
      {item.image ? (
        <div style={{ position: 'relative', height: 160 }}>
          <Image
            src={item.image}
            alt={item.name}
            fill
            unoptimized={isDataUrl(item.image)}
            style={{ objectFit: 'cover' }}
          />
          {hovered && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(23,21,18,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.15s ease',
            }}>
              <span style={{
                color: '#fff', fontSize: 12, fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 8, padding: '5px 12px',
              }}>Edit</span>
            </div>
          )}
        </div>
      ) : (
        <div className="image-placeholder" style={{ position: 'relative' }}>
          {hovered ? (
            <span style={{
              fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--accent)',
            }}>Edit</span>
          ) : item.category}
        </div>
      )}
      <div className="body">
        <h3>{item.name}</h3>
        <div className="meta">{item.color} · {item.category}<br />{item.occasion} · {item.style}</div>
        <div className="tags">
          <span className="tag">{item.season}</span>
          <span className="tag">{item.confidence}% confidence</span>
          {item.aiMetadata && <span className="tag" style={{ background: 'var(--accent)', color: '#fff' }}>AI tagged</span>}
        </div>
      </div>
    </article>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function WardrobeView() {
  const { state, dispatch, uploadImage } = useAura();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [nameError, setNameError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFormatError, setImageFormatError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<WardrobeAIMetadata | null>(null);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);

  // Controlled values for AI-prefilled fields
  const [category, setCategory] = useState('Top');
  const [color, setColor] = useState('');
  const [season, setSeason] = useState('All');
  const [occasion, setOccasion] = useState('Business');
  const [style, setStyle] = useState('');

  function resetForm() {
    formRef.current?.reset();
    setNameError('');
    setImageFormatError('');
    setImagePreview(null);
    setAiSuggestions(null);
    setAiSuggestedFields(new Set());
    setCategory('Top');
    setColor('');
    setSeason('All');
    setOccasion('Business');
    setStyle('');
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFormatError('');
    setAiSuggestions(null);
    setAiSuggestedFields(new Set());

    const convResult = await toSupportedImageDataUrl(file);
    if ('error' in convResult) {
      setImageFormatError('Please upload a JPG, PNG, WEBP, or GIF for AI analysis. HEIC/HEIF files are not supported on this browser.');
      const fallbackUrl = await fileToDataURL(file);
      setImagePreview(fallbackUrl);
      return;
    }

    const dataUrl = convResult.dataUrl;
    setImagePreview(dataUrl);

    setAnalyzing(true);
    try {
      const nameHint = (formRef.current?.querySelector('input[name="name"]') as HTMLInputElement | null)?.value?.trim();
      const res = await fetch('/api/ai/analyze-wardrobe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, nameHint: nameHint || undefined }),
      });

      if (res.ok) {
        const data = (await res.json()) as { metadata?: WardrobeAIMetadata };
        if (data.metadata) {
          const m = data.metadata;
          const suggested = new Set<string>();

          setCategory(prev => { if (prev === 'Top') { suggested.add('category'); return m.detectedCategory; } return prev; });
          setColor(prev => { if (!prev) { suggested.add('color'); return m.detectedColor; } return prev; });
          setSeason(prev => { if (prev === 'All') { suggested.add('season'); return m.detectedSeason; } return prev; });
          setOccasion(prev => { if (prev === 'Business') { suggested.add('occasion'); return m.detectedOccasion; } return prev; });
          setStyle(prev => { if (!prev) { suggested.add('style'); return m.detectedStyle; } return prev; });

          setAiSuggestions(m);
          setAiSuggestedFields(suggested);
        }
      } else if (res.status !== 401) {
        const errData = await res.json().catch(() => ({})) as { _debug?: { fallbackReason?: string } };
        const fallbackReason = (errData._debug?.fallbackReason as WardrobeAIMetadata['fallbackReason']) ?? 'openai_vision_error';
        setAiSuggestions({
          detectedCategory: 'Top', detectedColor: '', detectedStyle: '', detectedSeason: 'All',
          detectedOccasion: 'Business', confidence: 0, tags: [], analysisNote: '',
          providerRequested: 'unknown', provider: 'mock', model: 'mock',
          fallbackUsed: true, fallbackReason, analyzedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Vision analysis is optional; silent fail is fine
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string).trim();

    if (!isValidItemName(name)) {
      setNameError("Please enter a real clothing item name, like 'Navy blazer' or 'White linen shirt'.");
      return;
    }
    setNameError('');

    const imageFile = form.get('image') as File | null;

    let image = '';
    if (imageFile && imageFile.size > 0) {
      const uploaded = await uploadImage(imageFile, 'wardrobe-images');
      image = uploaded ?? await fileToDataURL(imageFile);
    }

    const correctedFields: string[] = [];
    for (const field of aiSuggestedFields) {
      const formValue = (form.get(field) as string | null)?.trim();
      const aiValue = field === 'category' ? aiSuggestions?.detectedCategory
        : field === 'color' ? aiSuggestions?.detectedColor
        : field === 'season' ? aiSuggestions?.detectedSeason
        : field === 'occasion' ? aiSuggestions?.detectedOccasion
        : field === 'style' ? aiSuggestions?.detectedStyle
        : undefined;
      if (formValue && aiValue && formValue !== aiValue) {
        correctedFields.push(field);
      }
    }

    const aiMetadata: WardrobeAIMetadata | undefined = aiSuggestions
      ? { ...aiSuggestions, correctedFields: correctedFields.length > 0 ? correctedFields : undefined }
      : undefined;

    const item: WardrobeItem = {
      id: uid(),
      name,
      category: form.get('category') as string,
      color: (form.get('color') as string) || 'Neutral',
      season: form.get('season') as string,
      occasion: form.get('occasion') as string,
      style: (form.get('style') as string) || state.user.styleGoal,
      wears: 0,
      confidence: aiMetadata ? Math.round((aiMetadata.confidence + 78) / 2) : 78,
      image,
      aiMetadata,
    };
    dispatch({ type: 'ADD_WARDROBE_ITEM', payload: item });
    toast('Item added to wardrobe.');
    resetForm();
  }

  function handleSaveEdit(updated: WardrobeItem) {
    try {
      dispatch({ type: 'UPDATE_WARDROBE_ITEM', payload: updated });
      setEditingItem(null);
      toast('Item updated.');
    } catch {
      toast('Failed to save changes.');
    }
  }

  function handleDeleteItem(id: string) {
    dispatch({ type: 'DELETE_WARDROBE_ITEM', id });
    setEditingItem(null);
    toast('Item removed from wardrobe.');
  }

  return (
    <>
      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
          onDelete={handleDeleteItem}
        />
      )}

      <div className="grid two">
        <div className="card">
          <p className="eyebrow">Add Item</p>
          <h2>Build your digital wardrobe</h2>
          <form className="form" ref={formRef} onSubmit={handleSubmit}>
            <label>
              Name
              <input
                name="name"
                required
                placeholder="Navy blazer"
                onChange={() => nameError && setNameError('')}
              />
              {nameError && (
                <span style={{ color: 'var(--bad)', fontSize: 12, marginTop: 4, display: 'block', lineHeight: 1.4 }}>
                  {nameError}
                </span>
              )}
            </label>

            <label>
              Image
              <input name="image" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif" onChange={handleImageChange} />
            </label>

            {imageFormatError && (
              <span style={{ color: 'var(--bad)', fontSize: 12, marginTop: -4, marginBottom: 4, display: 'block', lineHeight: 1.4 }}>
                {imageFormatError}
              </span>
            )}

            {imagePreview && (
              <div style={{ position: 'relative', height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
                <Image src={imagePreview} alt="Preview" fill unoptimized style={{ objectFit: 'cover' }} />
                {analyzing && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 600, letterSpacing: '0.03em',
                  }}>
                    Analyzing with AURA Vision…
                  </div>
                )}
              </div>
            )}

            {aiSuggestions && !analyzing && (
              aiSuggestions.fallbackUsed ? (
                <p style={{ fontSize: 11, color: '#cc8800', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>
                  Vision fallback: {aiSuggestions.fallbackReason ?? 'unknown'} · provider requested: {aiSuggestions.providerRequested} — fields below are not AI-detected
                </p>
              ) : (
                <p style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>
                  AI tagged · {aiSuggestions.confidence}% confidence · {aiSuggestions.provider}/{aiSuggestions.model} — {aiSuggestions.analysisNote}
                </p>
              )
            )}

            <label>
              Category
              {aiSuggestedFields.has('category') && <AISuggestionBadge />}
              <select name="category" value={category} onChange={e => { setCategory(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('category'); return s; }); }}>
                <option>Top</option><option>Bottom</option><option>Shoes</option>
                <option>Outerwear</option><option>Dress</option><option>Bag</option>
                <option>Accessory</option><option>Watch</option><option>Fragrance</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Color
              {aiSuggestedFields.has('color') && <AISuggestionBadge />}
              <input name="color" placeholder="Navy" value={color} onChange={e => { setColor(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('color'); return s; }); }} />
            </label>

            <label>
              Season
              {aiSuggestedFields.has('season') && <AISuggestionBadge />}
              <select name="season" value={season} onChange={e => { setSeason(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('season'); return s; }); }}>
                <option>All</option><option>Summer</option><option>Winter</option><option>Spring</option><option>Autumn</option>
              </select>
            </label>

            <label>
              Occasion
              {aiSuggestedFields.has('occasion') && <AISuggestionBadge />}
              <select name="occasion" value={occasion} onChange={e => { setOccasion(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('occasion'); return s; }); }}>
                <option>Business</option><option>Smart Casual</option><option>Casual</option>
                <option>Evening</option><option>Travel</option>
              </select>
            </label>

            <label>
              Style
              {aiSuggestedFields.has('style') && <AISuggestionBadge />}
              <input name="style" placeholder="Quiet Luxury" value={style} onChange={e => { setStyle(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('style'); return s; }); }} />
            </label>

            <button className="primary" type="submit" disabled={analyzing}>
              {analyzing ? 'Analyzing image…' : 'Add to Wardrobe'}
            </button>
          </form>
        </div>

        <div className="card">
          <p className="eyebrow">Closet Intelligence</p>
          <h2>Wardrobe</h2>
          {state.wardrobe.length > 0
            ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '0.75rem' }}>
                  Tap any item to edit.
                </p>
                <div className="item-grid">
                  {state.wardrobe.map(item => (
                    <ItemCard key={item.id} item={item} onEdit={setEditingItem} />
                  ))}
                </div>
              </>
            )
            : <div className="card flat"><h2>Your wardrobe is empty.</h2><p>Add your first item or load the demo wardrobe.</p></div>}
        </div>
      </div>
    </>
  );
}
