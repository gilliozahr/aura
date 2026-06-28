import type { InspirationReport, OutfitReport, WardrobeAIMetadata } from '@aura/types';

function clamp(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.max(0, Math.min(100, v)));
}

function toStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : fallback;
}

function toStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map(s => s.trim());
}

/**
 * Validates and normalises an AI response into a well-typed InspirationReport.
 * Accepts both v0.3 field names (score, styleMatch, …) and v0.4 names for
 * backward compatibility with reports already stored in Supabase.
 * Never throws — always returns a usable report.
 */
export function validateReport(raw: unknown): InspirationReport {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  // Hard cap at 95 — 100 is never warranted without overwhelming real-world evidence
  const compatibilityScore = Math.min(95, clamp(r.compatibilityScore ?? r.score));
  const styleMatchScore = clamp(r.styleMatchScore ?? r.styleMatch);
  const wardrobeImpactScore = clamp(r.wardrobeImpactScore ?? r.wardrobeImpact);
  const budgetFitScore = clamp(r.budgetFitScore ?? r.budgetFit);
  const duplicateRisk = clamp(r.duplicateRisk ?? r.duplicateCount);
  const confidence = clamp(r.confidence ?? 75);

  const decisionRaw = String(r.decision ?? '').toUpperCase().trim();
  const decision: InspirationReport['decision'] =
    decisionRaw === 'BUY' || decisionRaw === 'WAIT' || decisionRaw === 'SKIP'
      ? decisionRaw
      : compatibilityScore >= 82
      ? 'BUY'
      : compatibilityScore >= 62
      ? 'WAIT'
      : 'SKIP';

  const defaultReason =
    decision === 'BUY'
      ? 'A strong fit for your wardrobe and style goals.'
      : decision === 'WAIT'
      ? 'Worth considering, but check alternatives or timing.'
      : 'Low wardrobe value — better options exist.';

  return {
    compatibilityScore,
    styleMatchScore,
    wardrobeImpactScore,
    budgetFitScore,
    duplicateRisk,
    confidence,
    decision,
    reasoningSummary: toStr(r.reasoningSummary, defaultReason),
    whyItWorks: toStr(r.whyItWorks, ''),
    risks: toStrArray(r.risks),
    suggestedOutfits: toStrArray(r.suggestedOutfits),
    betterAlternatives: toStrArray(r.betterAlternatives),
    missingWardrobeOpportunities: toStrArray(r.missingWardrobeOpportunities),
    _meta: r._meta as InspirationReport['_meta'],
  };
}

/**
 * Validates and normalises an AI outfit recommendation response.
 * Never throws — always returns a usable OutfitReport.
 */
export function validateOutfitReport(raw: unknown): OutfitReport {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const compatibilityScore = Math.min(95, clamp(r.compatibilityScore));
  const occasionFitScore = clamp(r.occasionFitScore);
  const weatherFitScore = clamp(r.weatherFitScore);
  const styleMatchScore = clamp(r.styleMatchScore);
  const colorHarmonyScore = clamp(r.colorHarmonyScore);
  const confidence = clamp(r.confidence ?? 72);

  return {
    outfitItems: toStrArray(r.outfitItems),
    compatibilityScore,
    occasionFitScore,
    weatherFitScore,
    styleMatchScore,
    colorHarmonyScore,
    confidence,
    reasoningSummary: toStr(r.reasoningSummary, 'A well-composed outfit for your context.'),
    whyItWorks: toStr(r.whyItWorks, ''),
    risks: toStrArray(r.risks),
    missingItems: toStrArray(r.missingItems),
    alternatives: toStrArray(r.alternatives),
    _meta: r._meta as OutfitReport['_meta'],
  };
}

const CATEGORIES = ['Top', 'Bottom', 'Shoes', 'Outerwear', 'Accessory', 'Watch', 'Fragrance'];
const SEASONS = ['All', 'Summer', 'Winter', 'Spring', 'Autumn'];
const OCCASIONS = ['Business', 'Smart Casual', 'Casual', 'Evening', 'Travel'];

/**
 * Validates and normalises an AI wardrobe vision response.
 * Never throws — always returns a usable WardrobeAIMetadata.
 */
export function validateVisionReport(raw: unknown, provider: string, model: string): WardrobeAIMetadata {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const detectedCategory = CATEGORIES.includes(String(r.detectedCategory ?? ''))
    ? String(r.detectedCategory)
    : 'Top';
  const detectedColor = toStr(r.detectedColor, 'Neutral');
  const detectedStyle = toStr(r.detectedStyle, 'Smart Casual');
  const detectedSeason = SEASONS.includes(String(r.detectedSeason ?? ''))
    ? String(r.detectedSeason)
    : 'All';
  const detectedOccasion = OCCASIONS.includes(String(r.detectedOccasion ?? ''))
    ? String(r.detectedOccasion)
    : 'Smart Casual';
  const confidence = clamp(r.confidence ?? 70);
  const tags = toStrArray(r.tags);
  const analysisNote = toStr(r.analysisNote, 'Analyzed by AURA Vision AI.');

  return {
    detectedCategory,
    detectedColor,
    detectedStyle,
    detectedSeason,
    detectedOccasion,
    confidence,
    tags,
    analysisNote,
    provider,
    model,
    analyzedAt: new Date().toISOString(),
  };
}
