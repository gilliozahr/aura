'use client';

import { useAura } from '@/store';
import { scoreClass } from '@/lib/utils';

const REQUIRED_CATEGORIES = ['Top', 'Bottom', 'Shoes', 'Outerwear'];

function wardrobeGaps(wardrobe: { category: string }[]): string[] {
  return REQUIRED_CATEGORIES.filter(cat => !wardrobe.some(i => i.category === cat));
}

function mostWornCategory(wardrobe: { category: string; wears: number }[]): string {
  const totals: Record<string, number> = {};
  wardrobe.forEach(i => { totals[i.category] = (totals[i.category] || 0) + (i.wears || 0); });
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'None';
}

function duplicateRiskItems(wardrobe: { category: string; color: string; name: string }[]): { category: string; color: string; count: number }[] {
  const groups: Record<string, number> = {};
  wardrobe.forEach(i => {
    const key = `${i.category}|${i.color.toLowerCase()}`;
    groups[key] = (groups[key] || 0) + 1;
  });
  return Object.entries(groups)
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => {
      const [category, color] = key.split('|');
      return { category, color, count };
    });
}

export default function AnalyticsView() {
  const { state } = useAura();
  const { wardrobe, feedback, outfits } = state;

  const avgConf = wardrobe.length
    ? Math.round(wardrobe.reduce((s, i) => s + (i.confidence || 75), 0) / wardrobe.length)
    : 0;

  const mostWorn = wardrobe.length
    ? [...wardrobe].sort((a, b) => (b.wears || 0) - (a.wears || 0))[0].name
    : 'None';

  const gaps = wardrobeGaps(wardrobe);
  const topCategory = mostWornCategory(wardrobe);
  const duplicates = duplicateRiskItems(wardrobe);

  const categories: Record<string, number> = {};
  wardrobe.forEach(i => { categories[i.category] = (categories[i.category] || 0) + 1; });

  const covered = REQUIRED_CATEGORIES.filter(c => categories[c] > 0).length;
  const coveragePct = Math.round((covered / REQUIRED_CATEGORIES.length) * 100);

  const acceptedCount = feedback.filter(f => f.type === 'daily_outfit_accept').length;
  const rejectedCount = feedback.filter(f => f.type === 'daily_outfit_reject').length;
  const totalOutfitFeedback = acceptedCount + rejectedCount;
  const acceptRate = totalOutfitFeedback > 0 ? Math.round((acceptedCount / totalOutfitFeedback) * 100) : null;

  const avgOutfitScore = outfits.length
    ? Math.round(outfits.reduce((s, o) => s + o.report.compatibilityScore, 0) / outfits.length)
    : null;

  if (wardrobe.length === 0) {
    return (
      <div className="card" style={{ maxWidth: 520, padding: '3rem 2rem', textAlign: 'center' }}>
        <p className="eyebrow">Analytics</p>
        <h2 style={{ marginBottom: '0.75rem' }}>Your style intelligence will sharpen over time.</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>
          Add wardrobe items and give feedback on daily outfit recommendations to unlock deeper insights — category coverage, duplicate risk, Style DNA confidence, and outfit acceptance trends.
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Start in Wardrobe to add your first item.</p>
      </div>
    );
  }

  return (
    <>
      {/* KPI row */}
      <div className="grid four">
        <div className="card kpi">
          <span>Avg Confidence</span>
          <strong className={`score ${scoreClass(avgConf)}`}>{avgConf}%</strong>
        </div>
        <div className="card kpi">
          <span>Category Coverage</span>
          <strong className={`score ${scoreClass(coveragePct)}`}>{coveragePct}%</strong>
        </div>
        <div className="card kpi">
          <span>Most Worn Item</span>
          <strong style={{ fontSize: 13 }}>{mostWorn}</strong>
        </div>
        <div className="card kpi">
          <span>Most Worn Category</span>
          <strong style={{ fontSize: 13 }}>{topCategory}</strong>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        {/* Category Coverage */}
        <div className="card">
          <p className="eyebrow">Wardrobe Health</p>
          <h2>Category Coverage</h2>
          <table className="table">
            <thead>
              <tr><th>Category</th><th>Count</th><th>Status</th></tr>
            </thead>
            <tbody>
              {REQUIRED_CATEGORIES.map(cat => (
                <tr key={cat}>
                  <td>{cat}</td>
                  <td>{categories[cat] ?? 0}</td>
                  <td>
                    {categories[cat] > 0
                      ? <span style={{ color: '#1a9e50', fontWeight: 600, fontSize: 12 }}>✓ Covered</span>
                      : <span style={{ color: '#cc3333', fontWeight: 600, fontSize: 12 }}>✗ Missing</span>}
                  </td>
                </tr>
              ))}
              {Object.keys(categories)
                .filter(c => !REQUIRED_CATEGORIES.includes(c))
                .map(cat => (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td>{categories[cat]}</td>
                    <td><span style={{ color: 'var(--muted)', fontSize: 12 }}>Optional</span></td>
                  </tr>
                ))}
            </tbody>
          </table>

          {gaps.length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#fdf2f2', borderRadius: 8 }}>
              <p className="eyebrow" style={{ marginBottom: 4, color: '#cc3333' }}>Wardrobe Gaps</p>
              <p style={{ fontSize: 13, margin: 0 }}>
                Missing: {gaps.join(', ')}. Consider adding these to unlock full outfit recommendations.
              </p>
            </div>
          )}
        </div>

        {/* Outfit intelligence */}
        <div className="card">
          <p className="eyebrow">Outfit Intelligence</p>
          <h2>Recommendation Stats</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Saved Outfits</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{outfits.length}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Accept Rate</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {acceptRate !== null ? `${acceptRate}%` : '—'}
              </div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Avg Outfit Score</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {avgOutfitScore !== null ? `${avgOutfitScore}%` : '—'}
              </div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Feedback Given</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{totalOutfitFeedback}</div>
            </div>
          </div>

          {/* Duplicate risk */}
          {duplicates.length > 0 ? (
            <>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Duplicate Risk</p>
              <table className="table">
                <thead><tr><th>Category</th><th>Color</th><th>Count</th></tr></thead>
                <tbody>
                  {duplicates.map((d, i) => (
                    <tr key={i}>
                      <td>{d.category}</td>
                      <td style={{ textTransform: 'capitalize' }}>{d.color}</td>
                      <td>
                        <span style={{ color: '#cc8800', fontWeight: 600 }}>{d.count}×</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No duplicate risk detected in current wardrobe.</p>
          )}
        </div>
      </div>

      {/* Style DNA building state */}
      {(!state.styleDNA || state.styleDNA.confidenceScore === 0) && (
        <div className="card" style={{ marginTop: 0, padding: '1.25rem 1.5rem' }}>
          <p className="eyebrow">Style DNA</p>
          <h2 style={{ marginBottom: 6 }}>Building Your Style Memory</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
            AURA learns from your wardrobe, outfit feedback, and inspiration decisions. Go to Settings → Recompute Style DNA to start building your personal style profile.
          </p>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '0%', background: 'var(--accent)', borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6, marginBottom: 0 }}>0% — no signals yet</p>
        </div>
      )}

      {/* Style DNA panel */}
      {state.styleDNA && state.styleDNA.confidenceScore > 0 && (
        <div className="card" style={{ marginTop: 0 }}>
          <p className="eyebrow">Style DNA</p>
          <h2 style={{ marginBottom: 6 }}>Your Personal Style Memory</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
            AURA learns from your wardrobe, outfit feedback, and inspiration decisions.
          </p>

          {/* Confidence bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Confidence</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{state.styleDNA.confidenceScore}/100 · {state.styleDNA.signalCount} signals</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${state.styleDNA.confidenceScore}%`,
                background: 'var(--accent)',
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Chip groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {state.styleDNA.preferredColors.slice(0, 5).length > 0 && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Preferred Colors</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {state.styleDNA.preferredColors.slice(0, 5).map(e => (
                    <span key={e.value} style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                    }}>{e.value}</span>
                  ))}
                </div>
              </div>
            )}

            {state.styleDNA.preferredStyleTags.slice(0, 5).length > 0 && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Style Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {state.styleDNA.preferredStyleTags.slice(0, 5).map(e => (
                    <span key={e.value} style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                    }}>{e.value}</span>
                  ))}
                </div>
              </div>
            )}

            {state.styleDNA.preferredOccasions.slice(0, 3).length > 0 && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Occasions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {state.styleDNA.preferredOccasions.slice(0, 3).map(e => (
                    <span key={e.value} style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                    }}>{e.value}</span>
                  ))}
                </div>
              </div>
            )}

            {state.styleDNA.avoidedStyleTags.slice(0, 3).length > 0 && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Styles to Avoid</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {state.styleDNA.avoidedStyleTags.slice(0, 3).map(e => (
                    <span key={e.value} style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      background: 'transparent',
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                    }}>{e.value}</span>
                  ))}
                </div>
              </div>
            )}

            {state.styleDNA.wardrobeGaps.length > 0 && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Wardrobe Gaps</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {state.styleDNA.wardrobeGaps.map(g => (
                    <span key={g} style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      background: 'transparent',
                      color: 'var(--muted)',
                      border: '1px dashed var(--border)',
                    }}>{g}</span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                  Consider adding these categories to unlock richer outfit recommendations.
                </p>
              </div>
            )}

            {state.styleDNA.favoriteOutfitPatterns.slice(0, 3).length > 0 && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Favorite Outfit Patterns</div>
                {state.styleDNA.favoriteOutfitPatterns.slice(0, 3).map(p => (
                  <div key={p} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, paddingLeft: 2 }}>· {p}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
