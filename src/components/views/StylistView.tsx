'use client';

import { useAura } from '@/store';
import { scoreClass } from '@/lib/utils';

const CAPABILITIES = [
  'Personal styling brief built from your Style DNA and wardrobe history',
  'Expert review of outfit combinations before important occasions',
  'Human-in-the-loop recommendations for wardrobe gaps',
  'Video sessions with vetted stylists specialising in your aesthetic',
  'Priority access to curated wardrobe edits',
];

export default function StylistView() {
  const { state } = useAura();
  const hasStyleDNA = !!state.styleDNA && state.styleDNA.confidenceScore > 0;
  const wardrobeItems = state.wardrobe.length;
  const avgConf = wardrobeItems
    ? Math.round(state.wardrobe.reduce((s, i) => s + (i.confidence || 75), 0) / wardrobeItems)
    : 0;

  return (
    <div className="view-content">
      <div className="card" style={{ maxWidth: 680, padding: '2rem 2.5rem', marginBottom: '1.5rem' }}>
        <p className="eyebrow">Coming Next</p>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Stylist Concierge</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          AURA is building a human-in-the-loop styling layer — expert review, personal styling briefs, and curated wardrobe guidance, all grounded in your Style DNA and occasion intelligence.
        </p>

        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>What&apos;s coming</p>
        <ul style={{ margin: '0 0 1.5rem', padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
          {CAPABILITIES.map((c, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.55,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)', flexShrink: 0, marginTop: 6,
              }} />
              {c}
            </li>
          ))}
        </ul>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
            Interested in early access? This feature is in active development for the next AURA release.
          </p>
        </div>
      </div>

      {(wardrobeItems > 0 || hasStyleDNA) && (
        <div className="card" style={{ maxWidth: 680, padding: '1.25rem 1.5rem' }}>
          <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Your Style Profile — Ready for Handoff</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            When Stylist Concierge launches, AURA will automatically prepare a brief from your data so the stylist starts with full context &mdash; no intake form needed.
          </p>
          <ul className="report-list" style={{ marginTop: 0 }}>
            <li>Style goal: <strong>{state.user.styleGoal || 'Not set'}</strong></li>
            <li>Wardrobe items: <strong>{wardrobeItems}</strong></li>
            <li>Average confidence: <strong className={`score ${scoreClass(avgConf)}`} style={{ fontSize: 14 }}>{avgConf}%</strong></li>
            <li>Style DNA: <strong>{hasStyleDNA ? `${state.styleDNA!.confidenceScore}% confidence` : 'Not yet computed'}</strong></li>
          </ul>
        </div>
      )}
    </div>
  );
}
