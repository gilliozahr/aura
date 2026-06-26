import type { AppState } from '@aura/types';

export interface StylistMatch {
  name: string;
  score: number;
  specialty: string;
  budgetFit: number;
  trust: number;
  reason: string;
}

export class StylistAgent {
  match(state: Pick<AppState, 'user' | 'wardrobe'>): StylistMatch {
    const { user } = state;
    const goal = user.styleGoal || 'Quiet Luxury';
    const base = goal.toLowerCase().includes('luxury') ? 96 : 88;
    return {
      name: 'Sarah M. — Executive Style Specialist',
      score: base,
      specialty: 'Quiet Luxury, Business Executive, Travel Capsule',
      budgetFit: (user.budget || 0) >= 500 ? 92 : 72,
      trust: 97,
      reason: `Sarah is recommended because your Style DNA is moving toward ${goal}, and her strongest client outcomes are in that exact area.`,
    };
  }
}

export const stylistAgent = new StylistAgent();
