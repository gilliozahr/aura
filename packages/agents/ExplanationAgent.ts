import type { InspirationReport } from '@aura/types';

export class ExplanationAgent {
  explainInspiration(report: InspirationReport): string {
    if (report.decision === 'BUY') return 'It fits your Style DNA and adds meaningful wardrobe value.';
    if (report.decision === 'WAIT') return 'It may work, but AURA suggests checking alternatives or price timing.';
    return 'It overlaps too much or adds low wardrobe value.';
  }

  explainOutfit(styleGoal: string, occasion: string): string {
    return `Weather and occasion are weighted before style aesthetics. Your ${styleGoal} goal and ${occasion} context drove this selection.`;
  }
}

export const explanationAgent = new ExplanationAgent();
