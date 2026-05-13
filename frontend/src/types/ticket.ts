import { Category } from './index';

export type { Category };

export interface TicketPayload {
  title: string;
  description: string;
  category: number; // Przekazujemy ID wybranej kategorii
  priority: 'NISKI' | 'NORMALNY' | 'WYSOKI';
}
