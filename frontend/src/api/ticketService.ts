import api from './axiosConfig';
import { Category, TicketPayload } from '../types/ticket';
import { Ticket, User, Comment, Attachment, TicketLog, WorkLog } from '../types';

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

  // Pobranie listy wszystkich użytkowników
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('users/list/');
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
  },

  // Pobiera komentarze dla zgłoszenia
  getComments: async (ticketId: string | number): Promise<Comment[]> => {
    const response = await api.get<Comment[]>(`tickets/${ticketId}/comments/`);
    return response.data;
  },

  // Dodaje nowy komentarz do zgłoszenia
  addComment: async (ticketId: string | number, content: string, comment_type: 'REPLY' | 'INTERNAL'): Promise<Comment> => {
    const response = await api.post<Comment>(`tickets/${ticketId}/comments/`, {
      content,
      comment_type
    });
    return response.data;
  },

  // Upload załączników do zgłoszenia
  uploadAttachments: async (ticketId: string | number, files: File[]): Promise<Attachment[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const response = await api.post<Attachment[]>(`tickets/${ticketId}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Upload załączników do komentarza
  uploadCommentAttachments: async (ticketId: string | number, commentId: number, files: File[]): Promise<Attachment[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const response = await api.post<Attachment[]>(`tickets/${ticketId}/comments/${commentId}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Pobiera logi systemowe dla zgłoszenia
  getLogs: async (ticketId: string | number): Promise<TicketLog[]> => {
    const response = await api.get<TicketLog[]>(`tickets/${ticketId}/logs/`);
    return response.data;
  },

  // Pobiera wpisy rejestru prac
  getWorkLogs: async (ticketId: string | number): Promise<WorkLog[]> => {
    const response = await api.get<WorkLog[]>(`tickets/${ticketId}/work-logs/`);
    return response.data;
  },

  // Dodaje wpis rejestru prac
  addWorkLog: async (ticketId: string | number, description: string, duration_minutes: number): Promise<WorkLog> => {
    const response = await api.post<WorkLog>(`tickets/${ticketId}/work-logs/`, {
      description,
      duration_minutes
    });
    return response.data;
  },
};
