export interface User {
  id: number;
  email: string;
  role: 'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN';
  first_name: string;
  last_name: string;
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
}