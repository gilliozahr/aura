'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAura } from '@/store';
import { useToast } from '@/store/toast';
import { getRepository } from '@/lib/repository';
import { generatePlannerWeek } from '@/lib/planner/engine';
import { useSupabaseSession } from '@/lib/hooks/useSupabaseSession';
import type { PlannerWeek, PlannerDay, OutfitPlan, PlannerStatus, View } from '@/lib/types';

type Phase = 'idle' | 'generating' | 'ready' | 'error' | 'auth-required';

const IS_LOCAL_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00Z');
  const end = new Date(weekStart + 'T12:00:00Z');
  end.setUTCDate(end.getUTCDate() + 6);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sDay = start.getUTCDate();
  const sMon = months[start.getUTCMonth()];
  const eDay = end.getUTCDate();
  const eMon = months[end.getUTCMonth()];
  const sYear = start.getUTCFullYear();
  const eYear = end.getUTCFullYear();
  if (sMon === eMon && sYear === eYear) return `${sDay}–${eDay} ${sMon} ${sYear}`;
  if (sYear === eYear) return `${sDay} ${sMon} – ${eDay} ${eMon} ${sYear}`;
  return `${sDay} ${sMon} ${sYear} – ${eDay} ${eMon} ${eYear}`;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 75 ? 'var(--accent)' : pct >= 55 ? '#e0a020' : '#e05050';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--border)' }}>
        <div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PlannerStatus }) {
  const colors: Record<PlannerStatus, string> = {
    planned: '#2563eb',
    worn: '#16a34a',
    skipped: '#9ca3af',
    changed: '#d97706',
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: colors[status] + '20', color: colors[status], textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}

function DayCard({
  day,
  isToday,
  onAccept,
  onMarkWorn,
  onClear,
  onReplace,
  loading,
}: {
  day: PlannerDay;
  isToday: boolean;
  onAccept: (day: PlannerDay) => void;
  onMarkWorn: (day: PlannerDay) => void;
  onClear: (day: PlannerDay) => void;
  onReplace: (day: PlannerDay) => void;
  loading: boolean;
}) {
  const rec = day.plannedOutfit?.recommendation ?? day.suggestedOutfit;
  const isPlanned = !!day.plannedOutfit;
  const hasOccasion = day.occasionEvents.length > 0;
  const hasTrip = day.tripPlans.length > 0;

  return (
    <div className="card" style={{
      minWidth: 220, flex: '0 0 220px', padding: '14px 16px',
      borderTop: isToday ? '2px solid var(--accent)' : undefined,
      opacity: loading ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <p className="eyebrow" style={{ margin: 0, fontSize: 11 }}>{day.dayLabel}</p>
          {isToday && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>TODAY</span>}
        </div>
        {day.plannedOutfit && <StatusBadge status={day.plannedOutfit.status} />}
      </div>

      {day.weather && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
          {day.weather.icon && <span style={{ marginRight: 4 }}>{day.weather.icon}</span>}
          {day.weather.condition}
          {day.weather.tempHigh !== undefined && ` · ${day.weather.tempHigh}°C`}
        </div>
      )}

      {hasOccasion && day.occasionEvents.map(e => (
        <div key={e.id} style={{ marginBottom: 4 }}>
          <span className="pill" style={{ fontSize: 10, background: 'rgba(139,111,71,0.12)', color: '#8b6f47', borderColor: 'rgba(139,111,71,0.25)' }}>
            {e.title}
          </span>
        </div>
      ))}
      {hasTrip && day.tripPlans.map(t => (
        <div key={t.id} style={{ marginBottom: 4 }}>
          <span className="pill" style={{ fontSize: 10, background: 'rgba(37,99,235,0.1)', color: '#2563eb', borderColor: 'rgba(37,99,235,0.2)' }}>
            ✈ {t.destinationCity}
          </span>
        </div>
      ))}

      {rec && rec.outfitItems.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          {rec.outfitItems.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{item.name}</span>
              <span className="pill" style={{ fontSize: 9, padding: '1px 5px' }}>{item.category}</span>
            </div>
          ))}
          {rec.reason && (
            <p style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 5, lineHeight: 1.4 }}>
              {rec.reason}
            </p>
          )}
          <ScoreBar score={rec.score} />
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>No outfit suggested.</p>
      )}

      {(day.repeatWarnings.length > 0 || day.wardrobeWarnings.length > 0 || day.missingItems.length > 0) && (
        <div style={{ marginBottom: 8 }}>
          {[...day.repeatWarnings, ...day.wardrobeWarnings].map((w, i) => (
            <div key={i} style={{ fontSize: 10, color: '#b45309', marginBottom: 2 }}>⚠ {w}</div>
          ))}
          {day.missingItems.length > 0 && (
            <div style={{ fontSize: 10, color: '#dc2626' }}>
              Missing: {day.missingItems.join(', ')}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {!isPlanned && rec && rec.outfitItems.length > 0 && (
          <button
            className="primary"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => onAccept(day)}
            disabled={loading}
          >
            Accept
          </button>
        )}
        {isPlanned && day.plannedOutfit?.status !== 'worn' && (
          <button
            className="secondary"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => onMarkWorn(day)}
            disabled={loading}
          >
            Mark Worn
          </button>
        )}
        {rec && (
          <button
            className="secondary"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => onReplace(day)}
            disabled={loading}
          >
            Replace
          </button>
        )}
        {isPlanned && (
          <button
            className="secondary"
            style={{ fontSize: 11, padding: '4px 10px', borderColor: '#dc2626', color: '#dc2626' }}
            onClick={() => onClear(day)}
            disabled={loading}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlannerView({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { state, dispatch } = useAura();
  const { toast } = useToast();
  const { session, loading: sessionLoading } = useSupabaseSession();

  const today = new Date().toISOString().slice(0, 10);
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [phase, setPhase] = useState<Phase>('idle');
  const [week, setWeek] = useState<PlannerWeek | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // When a Supabase session arrives (e.g. after sign-in in Settings), clear auth-required.
  useEffect(() => {
    if (!IS_LOCAL_MODE && session && phase === 'auth-required') {
      setPhase('idle');
    }
  }, [session, phase]);

  const handleGenerate = useCallback(async () => {
    setPhase('generating');
    setErrorMsg('');
    try {
      if (IS_LOCAL_MODE) {
        const week = generatePlannerWeek({
          weekStart,
          wardrobe: state.wardrobe,
          styleDNA: state.styleDNA,
          savedOutfits: [],
          existingPlans: state.outfitPlans ?? [],
          occasionEvents: state.occasionEvents ?? [],
          tripPlans: state.tripPlans ?? [],
        });
        setWeek(week);
        setPhase('ready');
      } else {
        const res = await fetch('/api/planner/generate-week', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekStart }),
        });
        if (res.status === 401) { setPhase('auth-required'); return; }
        const data = (await res.json()) as { week?: PlannerWeek; error?: string };
        if (!res.ok || !data.week) throw new Error(data.error ?? `HTTP ${res.status}`);
        setWeek(data.week);
        setPhase('ready');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [weekStart, state]);

  const handleAccept = useCallback(async (day: PlannerDay) => {
    if (!day.suggestedOutfit) return;
    setActionLoading(true);
    try {
      let saved: OutfitPlan;
      if (IS_LOCAL_MODE) {
        saved = await getRepository().saveOutfitPlan({
          userId: 'local',
          planDate: day.date,
          outfitItems: day.suggestedOutfit.outfitItems,
          recommendation: day.suggestedOutfit,
          status: 'planned',
          source: 'planner',
          occasionEventId: day.occasionEvents[0]?.id,
        });
      } else {
        const res = await fetch('/api/planner/save-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planDate: day.date,
            outfitItems: day.suggestedOutfit.outfitItems,
            occasionEventId: day.occasionEvents[0]?.id,
          }),
        });
        const data = (await res.json()) as { plan?: OutfitPlan; error?: string };
        if (!res.ok || !data.plan) throw new Error(data.error ?? 'Failed');
        saved = data.plan;
      }
      dispatch({ type: 'UPSERT_OUTFIT_PLAN', payload: saved });
      setWeek(prev => prev ? {
        ...prev,
        days: prev.days.map(d => d.date === day.date ? { ...d, plannedOutfit: saved } : d),
      } : prev);
      toast(`Outfit planned for ${day.dayLabel}`);
    } catch (err) {
      toast(`Failed to save plan: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setActionLoading(false);
    }
  }, [dispatch, toast]);

  const handleMarkWorn = useCallback(async (day: PlannerDay) => {
    if (!day.plannedOutfit) return;
    setActionLoading(true);
    try {
      let updated: OutfitPlan;
      if (IS_LOCAL_MODE) {
        updated = await getRepository().updateOutfitPlan(day.date, { status: 'worn' });
      } else {
        const res = await fetch('/api/planner/update-day', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planDate: day.date, status: 'worn' as PlannerStatus }),
        });
        const data = (await res.json()) as { plan?: OutfitPlan; error?: string };
        if (!res.ok || !data.plan) throw new Error(data.error ?? 'Failed');
        updated = data.plan;
      }
      dispatch({ type: 'UPSERT_OUTFIT_PLAN', payload: updated });
      setWeek(prev => prev ? {
        ...prev,
        days: prev.days.map(d => d.date === day.date ? { ...d, plannedOutfit: updated } : d),
      } : prev);
      toast(`Marked worn for ${day.dayLabel}`);
    } catch (err) {
      toast(`Failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setActionLoading(false);
    }
  }, [dispatch, toast]);

  const handleClear = useCallback(async (day: PlannerDay) => {
    setActionLoading(true);
    try {
      if (IS_LOCAL_MODE) {
        await getRepository().deleteOutfitPlan(day.date);
      } else {
        const res = await fetch('/api/planner/clear-day', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planDate: day.date }),
        });
        if (!res.ok) throw new Error('Failed');
      }
      dispatch({ type: 'DELETE_OUTFIT_PLAN', planDate: day.date });
      setWeek(prev => prev ? {
        ...prev,
        days: prev.days.map(d => d.date === day.date ? { ...d, plannedOutfit: undefined } : d),
      } : prev);
      toast(`Cleared plan for ${day.dayLabel}`);
    } catch (err) {
      toast(`Failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setActionLoading(false);
    }
  }, [dispatch, toast]);

  const handleReplace = useCallback(async (day: PlannerDay) => {
    setActionLoading(true);
    try {
      let newDay: PlannerDay | undefined;
      if (IS_LOCAL_MODE) {
        const freshWeek = generatePlannerWeek({
          weekStart,
          wardrobe: state.wardrobe,
          styleDNA: state.styleDNA,
          savedOutfits: [],
          existingPlans: state.outfitPlans ?? [],
          occasionEvents: state.occasionEvents ?? [],
          tripPlans: state.tripPlans ?? [],
        });
        newDay = freshWeek.days.find(d => d.date === day.date);
      } else {
        const res = await fetch('/api/planner/generate-week', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekStart }),
        });
        const data = (await res.json()) as { week?: PlannerWeek; error?: string };
        if (!res.ok || !data.week) throw new Error(data.error ?? 'Failed');
        newDay = data.week.days.find(d => d.date === day.date);
      }
      if (newDay) {
        setWeek(prev => prev ? {
          ...prev,
          days: prev.days.map(d => d.date === day.date ? newDay! : d),
        } : prev);
      }
      toast(`Replaced suggestion for ${day.dayLabel}`);
    } catch (err) {
      toast(`Failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setActionLoading(false);
    }
  }, [weekStart, state, toast]);

  const hasMinWardrobe = state.wardrobe.length >= 4;

  if (!hasMinWardrobe) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="eyebrow">Outfit Planner</p>
        <h2>Add more items first</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 16px' }}>
          The Outfit Planner needs at least 4 wardrobe items to generate a week of outfit suggestions.
          Head to your Wardrobe to add more items.
        </p>
        {onNavigate && (
          <button className="primary" onClick={() => onNavigate('wardrobe')}>
            Go to Wardrobe
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Smart Closet Calendar</p>
          <h2 style={{ margin: 0 }}>Outfit Planner</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Plan your outfits for the week ahead, powered by your wardrobe and calendar.
          </p>
        </div>
        <button
          className="primary"
          onClick={handleGenerate}
          disabled={phase === 'generating' || (!IS_LOCAL_MODE && sessionLoading)}
          style={{ flexShrink: 0 }}
        >
          {phase === 'generating' ? 'Generating…' : '✦ Generate Week'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          className="secondary"
          style={{ padding: '6px 12px', fontSize: 13 }}
          onClick={() => { setWeekStart(prev => addWeeks(prev, -1)); setWeek(null); setPhase('idle'); }}
        >
          ← Prev
        </button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Week of {formatWeekRange(weekStart)}</span>
        <button
          className="secondary"
          style={{ padding: '6px 12px', fontSize: 13 }}
          onClick={() => { setWeekStart(prev => addWeeks(prev, 1)); setWeek(null); setPhase('idle'); }}
        >
          Next →
        </button>
      </div>

      {phase === 'auth-required' && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: 16, textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Sign in required</p>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            The Outfit Planner syncs across your devices using your AURA account.<br />
            Sign in to generate and save outfit plans.
          </p>
          <button className="primary" onClick={() => onNavigate?.('settings')}>
            Go to Settings to sign in
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: 16, borderColor: '#dc2626', background: 'rgba(220,38,38,0.05)' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>Failed to generate: {errorMsg}</p>
        </div>
      )}

      {week && week.globalWarnings.length > 0 && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: 16, borderColor: '#d97706', background: 'rgba(217,119,6,0.05)' }}>
          <p className="eyebrow" style={{ margin: '0 0 4px', color: '#d97706' }}>Weekly Alerts</p>
          {week.globalWarnings.map((w, i) => (
            <p key={i} style={{ margin: '0 0 2px', fontSize: 12, color: '#92400e' }}>⚠ {w}</p>
          ))}
        </div>
      )}

      {phase === 'generating' && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
          Generating your week…
        </div>
      )}

      {phase === 'idle' && !week && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
            Click <strong>Generate Week</strong> to create outfit suggestions for the week of {formatWeekRange(weekStart)}.
          </p>
        </div>
      )}

      {week && phase === 'ready' && (
        <>
          <div style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 8,
          }}>
            {week.days.map(day => (
              <DayCard
                key={day.date}
                day={day}
                isToday={day.date === today}
                onAccept={handleAccept}
                onMarkWorn={handleMarkWorn}
                onClear={handleClear}
                onReplace={handleReplace}
                loading={actionLoading}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
            Generated {new Date(week.generatedAt).toLocaleString()}
            {week.aiEnhanced && ' · AI enhanced'}
            {' · '}{state.wardrobe.length} wardrobe items
          </p>
        </>
      )}
    </>
  );
}
