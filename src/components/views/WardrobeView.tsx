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

function ItemCard({ item }: { item: WardrobeItem }) {
  return (
    <article className="item-card">
      {item.image ? (
        <div style={{ position: 'relative', height: 160 }}>
          <Image
            src={item.image}
            alt={item.name}
            fill
            unoptimized={isDataUrl(item.image)}
            style={{ objectFit: 'cover' }}
          />
        </div>
      ) : (
        <div className="image-placeholder">{item.category}</div>
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

function AISuggestionBadge({ label: _label }: { label: string }) {
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

    // Convert unsupported formats (HEIC/HEIF etc.) to JPEG before analysis
    const convResult = await toSupportedImageDataUrl(file);
    if ('error' in convResult) {
      setImageFormatError('Please upload a JPG, PNG, WEBP, or GIF for AI analysis. HEIC/HEIF files are not supported on this browser.');
      // Still show a preview if the browser can render it
      const fallbackUrl = await fileToDataURL(file);
      setImagePreview(fallbackUrl);
      return;
    }

    const dataUrl = convResult.dataUrl;
    setImagePreview(dataUrl);

    // Kick off AI vision analysis
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

          // Prefill only if the user hasn't manually changed the field
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

    // Track which fields were AI-suggested vs user-corrected
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

  return (
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

          {/* Image preview */}
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
            {aiSuggestedFields.has('category') && <AISuggestionBadge label="AI" />}
            <select name="category" value={category} onChange={e => { setCategory(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('category'); return s; }); }}>
              <option>Top</option><option>Bottom</option><option>Shoes</option>
              <option>Outerwear</option><option>Dress</option><option>Bag</option>
              <option>Accessory</option><option>Watch</option><option>Fragrance</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Color
            {aiSuggestedFields.has('color') && <AISuggestionBadge label="AI" />}
            <input name="color" placeholder="Navy" value={color} onChange={e => { setColor(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('color'); return s; }); }} />
          </label>

          <label>
            Season
            {aiSuggestedFields.has('season') && <AISuggestionBadge label="AI" />}
            <select name="season" value={season} onChange={e => { setSeason(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('season'); return s; }); }}>
              <option>All</option><option>Summer</option><option>Winter</option><option>Spring</option><option>Autumn</option>
            </select>
          </label>

          <label>
            Occasion
            {aiSuggestedFields.has('occasion') && <AISuggestionBadge label="AI" />}
            <select name="occasion" value={occasion} onChange={e => { setOccasion(e.target.value); setAiSuggestedFields(prev => { const s = new Set(prev); s.delete('occasion'); return s; }); }}>
              <option>Business</option><option>Smart Casual</option><option>Casual</option>
              <option>Evening</option><option>Travel</option>
            </select>
          </label>

          <label>
            Style
            {aiSuggestedFields.has('style') && <AISuggestionBadge label="AI" />}
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
          ? <div className="item-grid">{state.wardrobe.map(item => <ItemCard key={item.id} item={item} />)}</div>
          : <div className="card flat"><h2>Your wardrobe is empty.</h2><p>Add your first item or load the demo wardrobe.</p></div>}
      </div>
    </div>
  );
}
