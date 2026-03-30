import api from './axiosConfig';
import { Category, TicketPayload } from '../types/ticket';
import { Ticket, User } from '../types';

export const ticketService = {
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('categories/');
    return response.data;
  },

  createTicket: async (data: TicketPayload) => {
    const response = await api.post('tickets/', data);
    return response.data;
  },

  // Pobranie listy wykwalifikowanych do zgłoszeń użytkowników
  getTechnicians: async (): Promise<User[]> => {
    const response = await api.get<User[]>('users/technicians/');
    return response.data;
  },

  // Pobiera jedno konkretne zgłoszenie
  getTicket: async (id: string | number): Promise<Ticket> => {
    const response = await api.get<Ticket>(`tickets/${id}/`);
    return response.data;
  },

  // Aktualizuje zgłoszenie (np. zmiania statusu lub technika)
  updateTicket: async (id: string | number, data: Partial<Ticket>): Promise<Ticket> => {
    const response = await api.patch<Ticket>(`tickets/${id}/`, data);
    return response.data;
  }
};
