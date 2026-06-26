'use client';

import { useAura } from '@/store';

function wardrobeGap(wardrobe: { category: string }[]): string {
  const required = ['Top', 'Bottom', 'Shoes', 'Outerwear'];
  const missing = required.find(cat => !wardrobe.some(i => i.category === cat));
  return missing || 'Balanced';
}

export default function AnalyticsView() {
  const { state } = useAura();
  const { wardrobe } = state;

  const avgConf = wardrobe.length
    ? Math.round(wardrobe.reduce((s, i) => s + (i.confidence || 75), 0) / wardrobe.length)
    : 0;

  const mostWorn = wardrobe.length
    ? [...wardrobe].sort((a, b) => (b.wears || 0) - (a.wears || 0))[0].name
    : 'None';

  const categories: Record<string, number> = {};
  wardrobe.forEach(i => { categories[i.category] = (categories[i.category] || 0) + 1; });

  return (
    <>
      <div className="grid three">
        <div className="card kpi"><span>Average Confidence</span><strong>{avgConf}%</strong></div>
        <div className="card kpi"><span>Most Worn</span><strong>{mostWorn}</strong></div>
        <div className="card kpi"><span>Main Gap</span><strong>{wardrobeGap(wardrobe)}</strong></div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="eyebrow">Wardrobe Health</p>
        <h2>Category Coverage</h2>
        <table className="table">
          <thead><tr><th>Category</th><th>Count</th></tr></thead>
          <tbody>
            {Object.keys(categories).length > 0
              ? Object.entries(categories).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))
              : <tr><td>No items</td><td>0</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
