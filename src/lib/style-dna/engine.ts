import type {
  WardrobeItem,
  SavedOutfit,
  FeedbackEvent,
  InspirationItem,
  StyleDNAEntry,
  StyleDNAProfile,
  StyleDNASummary,
} from '@/lib/types';

// ── Signal weights ────────────────────────────────────────────────────────────

const W = {
  wardrobePresence: 1,
  aiMetadata: 0.5,
  outfitAccepted: 3,
  outfitRejected: -2,
  inspirationBuy: 1.5,
  inspirationSkip: -1,
} as const;

const REQUIRED_CATEGORIES = ['Top', 'Bottom', 'Shoes', 'Outerwear'];
const TOP_N = 8;

// ── Utilities ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function add(map: Map<string, number>, key: string, weight: number): void {
  if (!key || key === 'neutral' || key === 'unknown') return;
  const k = normalize(key);
  if (!k) return;
  map.set(k, (map.get(k) ?? 0) + weight);
}

function toEntries(map: Map<string, number>, positive: boolean): StyleDNAEntry[] {
  return Array.from(map.entries())
    .filter(([, s]) => positive ? s > 0 : s < 0)
    .sort((a, b) => positive ? b[1] - a[1] : a[1] - b[1])
    .slice(0, TOP_N)
    .map(([value, score]) => ({ value, score: Math.round(score * 10) / 10 }));
}

function outfitPattern(items: WardrobeItem[]): string {
  return items.map(i => i.category).sort().join(' + ');
}

// ── Main computation ──────────────────────────────────────────────────────────

export function computeStyleDNA(
  wardrobe: WardrobeItem[],
  outfits: SavedOutfit[],
  feedback: FeedbackEvent[],
  inspirations: InspirationItem[],
): StyleDNAProfile {
  const colorMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const styleMap = new Map<string, number>();
  const occasionMap = new Map<string, number>();

  const favoritePatterns = new Map<string, number>();
  const rejectedPatterns = new Map<string, number>();

  let signalCount = 0;

  // ── 1. Wardrobe items (medium signal) ─────────────────────────────────────
  for (const item of wardrobe) {
    add(colorMap, item.color, W.wardrobePresence);
    add(categoryMap, item.category, W.wardrobePresence);
    add(styleMap, item.style, W.wardrobePresence);
    add(occasionMap, item.occasion, W.wardrobePresence);
    signalCount++;

    // AI-detected metadata (lower trust)
    if (item.aiMetadata) {
      add(colorMap, item.aiMetadata.detectedColor, W.aiMetadata);
      add(styleMap, item.aiMetadata.detectedStyle, W.aiMetadata);
      add(occasionMap, item.aiMetadata.detectedOccasion, W.aiMetadata);
      for (const tag of item.aiMetadata.tags ?? []) {
        add(styleMap, tag, W.aiMetadata);
      }
    }
  }

  // ── 2. Saved outfits (strong signal) ──────────────────────────────────────
  for (const outfit of outfits) {
    const isAccepted = outfit.feedback === 'accepted';
    const isRejected = outfit.feedback === 'rejected';
    if (!isAccepted && !isRejected) continue;

    const weight = isAccepted ? W.outfitAccepted : W.outfitRejected;

    for (const item of outfit.outfitItems) {
      add(colorMap, item.color, weight);
      add(categoryMap, item.category, weight);
      add(styleMap, item.style, weight);
      add(occasionMap, item.occasion, weight);
    }

    const pattern = outfitPattern(outfit.outfitItems);
    if (pattern) {
      if (isAccepted) favoritePatterns.set(pattern, (favoritePatterns.get(pattern) ?? 0) + 1);
      else rejectedPatterns.set(pattern, (rejectedPatterns.get(pattern) ?? 0) + 1);
    }

    signalCount++;
  }

  // ── 3. Inspiration decisions ───────────────────────────────────────────────
  for (const item of inspirations) {
    const decision = item.report?.decision;
    if (!decision) continue;

    const weight =
      decision === 'BUY' ? W.inspirationBuy :
      decision === 'SKIP' ? W.inspirationSkip : 0;

    if (weight !== 0) {
      add(colorMap, item.color, weight);
      add(categoryMap, item.category, weight);
      add(styleMap, item.style, weight);
      signalCount++;
    }
  }

  // ── 4. Wardrobe gaps ───────────────────────────────────────────────────────
  const coveredCategories = new Set(wardrobe.map(i => i.category));
  const wardrobeGaps = REQUIRED_CATEGORIES.filter(c => !coveredCategories.has(c));

  // ── 5. Outfit patterns ────────────────────────────────────────────────────
  const favoriteOutfitPatterns = Array.from(favoritePatterns.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p);
  const rejectedOutfitPatterns = Array.from(rejectedPatterns.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p);

  // ── 6. Confidence ─────────────────────────────────────────────────────────
  const acceptedCount = outfits.filter(o => o.feedback === 'accepted').length;
  const rejectedCount = outfits.filter(o => o.feedback === 'rejected').length;
  const inspirationDecisions = inspirations.filter(i => i.report?.decision === 'BUY' || i.report?.decision === 'SKIP').length;

  const baseConf = Math.min(20, wardrobe.length * 2);
  const outfitConf = Math.min(30, acceptedCount * 5) + Math.min(20, rejectedCount * 4);
  const inspirationConf = Math.min(10, inspirationDecisions * 2);
  const confidenceScore = Math.min(95, baseConf + outfitConf + inspirationConf);

  return {
    preferredColors: toEntries(colorMap, true),
    avoidedColors: toEntries(colorMap, false),
    preferredCategories: toEntries(categoryMap, true),
    preferredStyleTags: toEntries(styleMap, true),
    avoidedStyleTags: toEntries(styleMap, false),
    preferredOccasions: toEntries(occasionMap, true),
    wardrobeGaps,
    favoriteOutfitPatterns,
    rejectedOutfitPatterns,
    confidenceScore,
    signalCount,
    lastComputedAt: new Date().toISOString(),
  };
}

export function toStyleDNASummary(dna: StyleDNAProfile): StyleDNASummary {
  return {
    preferredColors: dna.preferredColors.slice(0, 5).map(e => e.value),
    preferredStyleTags: dna.preferredStyleTags.slice(0, 5).map(e => e.value),
    avoidedStyleTags: dna.avoidedStyleTags.slice(0, 3).map(e => e.value),
    preferredOccasions: dna.preferredOccasions.slice(0, 3).map(e => e.value),
    wardrobeGaps: dna.wardrobeGaps,
    confidenceScore: dna.confidenceScore,
  };
}
