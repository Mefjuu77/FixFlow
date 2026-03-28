export interface Category {
  id: number;
  name: string;
}

export interface TicketPayload {
  title: string;
  description: string;
  category: number; // Przekazujemy ID wybranej kategorii
  priority: 'NISKI' | 'NORMALNY' | 'WYSOKI';
}
