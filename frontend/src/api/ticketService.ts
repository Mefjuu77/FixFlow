import api from './axiosConfig';
import { Category, TicketPayload } from '../types/ticket';
import { Ticket, User, Comment, Attachment, TicketLog, WorkLog, Notification, ReplyTemplate } from '../types';

export const ticketService = {
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('categories/');
    return response.data;
  },

  // Tworzy nową kategorię (tylko admin)
  createCategory: async (name: string): Promise<Category> => {
    const response = await api.post<Category>('categories/', { name });
    return response.data;
  },

  // Aktualizuje nazwę kategorii (tylko admin)
  updateCategory: async (id: number, name: string): Promise<Category> => {
    const response = await api.patch<Category>(`categories/${id}/`, { name });
    return response.data;
  },

  // Usuwa kategorię (tylko admin)
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`categories/${id}/`);
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

  // Pobiera stronę zgłoszeń z filtrowaniem/sortowaniem po stronie serwera.
  // Zwraca { count, results }. Parametry zgodne z backendem (status, priority,
  // category, assignment, dateFrom, dateTo, search, ordering, page, page_size).
  getTicketsPage: async (params: Record<string, string | number | undefined>): Promise<{ count: number; results: Ticket[] }> => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v));
    });
    const response = await api.get<{ count: number; results: Ticket[] }>(`tickets/?${qs.toString()}`);
    return response.data;
  },

  // Zwraca ID wszystkich zgłoszeń pasujących do filtrów (do "zaznacz wszystkie").
  getTicketIds: async (params: Record<string, string | number | undefined>): Promise<number[]> => {
    const qs = new URLSearchParams({ ids_only: '1' });
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v));
    });
    const response = await api.get<{ ids: number[] }>(`tickets/?${qs.toString()}`);
    return response.data.ids;
  },

  // Globalne liczniki statusów (etykiety filtra, niezależne od paginacji).
  getStatusCounts: async (): Promise<Record<string, number>> => {
    const response = await api.get<Record<string, number>>('tickets/status-counts/');
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

  // Edytuje komentarz (tylko autor lub admin)
  updateComment: async (ticketId: string | number, commentId: number, content: string): Promise<Comment> => {
    const response = await api.patch<Comment>(`tickets/${ticketId}/comments/${commentId}/`, { content });
    return response.data;
  },

  // Usuwa komentarz (tylko autor lub admin)
  deleteComment: async (ticketId: string | number, commentId: number): Promise<void> => {
    await api.delete(`tickets/${ticketId}/comments/${commentId}/`);
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

  // Aktualizuje wpis rejestru prac
  updateWorkLog: async (ticketId: string | number, wlId: number, data: { description?: string; duration_minutes?: number }): Promise<WorkLog> => {
    const response = await api.patch<WorkLog>(`tickets/${ticketId}/work-logs/${wlId}/`, data);
    return response.data;
  },

  // Usuwa wpis rejestru prac
  deleteWorkLog: async (ticketId: string | number, wlId: number): Promise<void> => {
    await api.delete(`tickets/${ticketId}/work-logs/${wlId}/`);
  },

  // Usuwanie załącznika
  deleteAttachment: async (ticketId: string | number, attachmentId: number): Promise<void> => {
    await api.delete(`tickets/${ticketId}/attachments/${attachmentId}/`);
  },

  // Usuwanie zgłoszenia
  deleteTicket: async (ticketId: string | number): Promise<void> => {
    await api.delete(`tickets/${ticketId}/`);
  },

  // ===== Łączenie i powiązywanie zgłoszeń =====

  // Wyszukiwanie zgłoszeń do scalenia/powiązania (po tytule lub ID)
  searchTickets: async (query: string): Promise<Ticket[]> => {
    const res = await ticketService.getTicketsPage({ search: query, page: 1, page_size: 8, ordering: '-created_at' });
    return res.results;
  },

  // Oznacza bieżące zgłoszenie jako duplikat zgłoszenia docelowego
  mergeTicket: async (ticketId: string | number, targetId: number, moveContent: boolean): Promise<Ticket> => {
    const res = await api.post<Ticket>(`tickets/${ticketId}/merge/`, { target: targetId, move_content: moveContent });
    return res.data;
  },

  // Cofa oznaczenie duplikatu
  unmergeTicket: async (ticketId: string | number): Promise<Ticket> => {
    const res = await api.post<Ticket>(`tickets/${ticketId}/unmerge/`, {});
    return res.data;
  },

  // Tworzy powiązanie z innym zgłoszeniem
  linkTicket: async (ticketId: string | number, targetId: number): Promise<Ticket> => {
    const res = await api.post<Ticket>(`tickets/${ticketId}/link/`, { target: targetId });
    return res.data;
  },

  // Usuwa powiązanie z innym zgłoszeniem
  unlinkTicket: async (ticketId: string | number, targetId: number): Promise<Ticket> => {
    const res = await api.post<Ticket>(`tickets/${ticketId}/unlink/`, { target: targetId });
    return res.data;
  },

  // ===== Powiadomienia in-app =====
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('notifications/', {
      params: { _ts: Date.now() },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ unread: number }>('notifications/actions/', {
      params: { _ts: Date.now() },
    });
    return response.data.unread;
  },

  markNotificationRead: async (id: number): Promise<void> => {
    await api.post('notifications/actions/', { action: 'mark_read', id });
  },

  markAllNotificationsRead: async (): Promise<void> => {
    await api.post('notifications/actions/', { action: 'mark_all_read' });
  },

  // ===== Szablony szybkich odpowiedzi =====
  getReplyTemplates: async (): Promise<ReplyTemplate[]> => {
    const response = await api.get<ReplyTemplate[]>('reply-templates/');
    return response.data;
  },

  createReplyTemplate: async (data: { title: string; content: string }): Promise<ReplyTemplate> => {
    const response = await api.post<ReplyTemplate>('reply-templates/', data);
    return response.data;
  },

  updateReplyTemplate: async (id: number, data: { title: string; content: string }): Promise<ReplyTemplate> => {
    const response = await api.patch<ReplyTemplate>(`reply-templates/${id}/`, data);
    return response.data;
  },

  deleteReplyTemplate: async (id: number): Promise<void> => {
    await api.delete(`reply-templates/${id}/`);
  },
};
