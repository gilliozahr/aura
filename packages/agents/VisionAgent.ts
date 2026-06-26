import type { WardrobeItem } from '@aura/types';

export interface VisionAnalysisResult {
  detectedCategory: string;
  detectedColor: string;
  detectedStyle: string;
  confidence: number;
  tags: string[];
}

export class VisionAgent {
  async analyzeImage(_imageDataUrl: string): Promise<VisionAnalysisResult> {
    // TODO v0.3: call vision model via /api/ai to extract item metadata from image
    return {
      detectedCategory: 'Top',
      detectedColor: 'Unknown',
      detectedStyle: 'Classic',
      confidence: 70,
      tags: [],
    };
  }

  async tagWardrobeItem(item: WardrobeItem): Promise<WardrobeItem> {
    // TODO v0.3: auto-tag uploaded wardrobe items using vision model
    return item;
  }
}

export const visionAgent = new VisionAgent();
