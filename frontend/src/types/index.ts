export interface User {
  id: number;
  email: string;
  role: 'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN';
  first_name: string;
  last_name: string;
  avatar?: string | null;
  is_active?: boolean;
  notify_new_ticket?: boolean;
  notify_ticket_comment?: boolean;
  notify_ticket_status_change?: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface Attachment {
  id: number;
  ticket: number;
  comment: number | null;
  file: string;
  filename: string;
  url: string;
  uploaded_by: number;
  uploaded_by_details?: User;
  created_at: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'NOWE' | 'W_TOKU' | 'ROZWIAZANE' | 'ZAMKNIETE';
  priority: 'NISKI' | 'NORMALNY' | 'WYSOKI';
  category: number;
  category_name?: string;
  creator: number;
  creator_details?: User;
  technician: number | null;
  technician_details?: User;
  attachments?: Attachment[];
  resolved_at?: string | null;
  first_response_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  ticket: number;
  author: number;
  author_details?: User;
  content: string;
  comment_type: 'REPLY' | 'INTERNAL';
  attachments?: Attachment[];
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
}

export interface TicketLog {
  id: number;
  ticket: number;
  user: number | null;
  user_details?: User;
  action: 'CREATED' | 'STATUS_CHANGED' | 'TECHNICIAN_ASSIGNED' | 'TECHNICIAN_REMOVED' | 'PRIORITY_CHANGED' | 'CATEGORY_CHANGED' | 'CREATOR_CHANGED' | 'ATTACHMENT_ADDED' | 'TITLE_CHANGED' | 'DESCRIPTION_CHANGED' | 'ATTACHMENT_DELETED' | 'AUTO_CLOSED' | 'REOPENED' | 'COMMENT_ADDED' | 'WORK_LOGGED';
  action_display: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface WorkLog {
  id: number;
  ticket: number;
  author: number;
  author_details?: User;
  description: string;
  duration_minutes: number;
  created_at: string;
}


export interface Notification {
  id: number;
  ticket: number | null;
  type: 'NEW_TICKET' | 'COMMENT' | 'STATUS_CHANGE' | 'ASSIGNMENT';
  type_display: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ReplyTemplate {
  id: number;
  title: string;
  content: string;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}
