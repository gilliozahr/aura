import type { InspirationItem } from '@aura/types';

export interface MockOrder {
  id: string;
  itemName: string;
  price: number;
  status: string;
  createdAt: string;
}

export class ShoppingAgent {
  async createOrder(item: InspirationItem): Promise<MockOrder> {
    // TODO v0.3: integrate real checkout via Stripe
    return {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      itemName: item.name,
      price: item.price,
      status: 'Mock order created',
      createdAt: new Date().toISOString(),
    };
  }
}

export const shoppingAgent = new ShoppingAgent();
