'use client';

import { useRef } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { uid, fileToDataURL } from '@/lib/utils';
import type { WardrobeItem } from '@/lib/types';

function ItemCard({ item }: { item: WardrobeItem }) {
  return (
    <article className="item-card">
      {item.image ? (
        <div style={{ position: 'relative', height: 160 }}>
          <Image src={item.image} alt={item.name} fill unoptimized style={{ objectFit: 'cover' }} />
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
        </div>
      </div>
    </article>
  );
}

export default function WardrobeView() {
  const { state, dispatch } = useAura();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const imageFile = form.get('image') as File | null;
    const image = await fileToDataURL(imageFile);
    const item: WardrobeItem = {
      id: uid(),
      name: form.get('name') as string,
      category: form.get('category') as string,
      color: (form.get('color') as string) || 'Neutral',
      season: form.get('season') as string,
      occasion: form.get('occasion') as string,
      style: (form.get('style') as string) || state.user.styleGoal,
      wears: 0,
      confidence: 78,
      image,
    };
    dispatch({ type: 'ADD_WARDROBE_ITEM', payload: item });
    toast('Item added. AI tagging simulated locally.');
    formRef.current?.reset();
  }

  return (
    <div className="grid two">
      <div className="card">
        <p className="eyebrow">Add Item</p>
        <h2>Build your digital wardrobe</h2>
        <form className="form" ref={formRef} onSubmit={handleSubmit}>
          <label>Name <input name="name" required placeholder="Navy blazer" /></label>
          <label>Category
            <select name="category">
              <option>Top</option><option>Bottom</option><option>Shoes</option>
              <option>Outerwear</option><option>Accessory</option><option>Watch</option>
              <option>Fragrance</option>
            </select>
          </label>
          <label>Color <input name="color" placeholder="Navy" /></label>
          <label>Season
            <select name="season"><option>All</option><option>Summer</option><option>Winter</option></select>
          </label>
          <label>Occasion
            <select name="occasion">
              <option>Business</option><option>Smart Casual</option><option>Casual</option>
              <option>Evening</option><option>Travel</option>
            </select>
          </label>
          <label>Style <input name="style" placeholder="Quiet Luxury" /></label>
          <label>Image <input name="image" type="file" accept="image/*" /></label>
          <button className="primary" type="submit">Add to Wardrobe</button>
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
