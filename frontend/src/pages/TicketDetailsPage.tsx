import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pl';
dayjs.extend(relativeTime);
dayjs.locale('pl');
import { ticketService } from '../api/ticketService';
import { Ticket, User as UserType, Comment, Category, TicketLog, WorkLog } from '../types';
import { AuthContext } from '../context/AuthContext';
import useTitle from '../hooks/useTitle';
import {
  ArrowLeft,
  User,
  ChevronDown,
  AlertTriangle,
  Lock,
  ChevronsUp,
  Equal,
  ChevronsDown,
  X,
  Paperclip,
  FileText,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserMinus,
  Clock,
  Plus,
  Activity,
  ArrowRightLeft,
  UserPlus,
  UserX,
  Pencil,
  Check,
  FolderOpen,
  FileClock,
  Trash2,
  MoreHorizontal,
  Link2,
  Loader2
} from 'lucide-react';
import { getCategoryIcon } from '../utils/ticketConstants';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownRenderer from '../components/MarkdownRenderer';

const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<'REPLY' | 'INTERNAL'>('REPLY');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'work_log'>('comments');
  const [ticketLogs, setTicketLogs] = useState<TicketLog[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [newWorkLogDesc, setNewWorkLogDesc] = useState('');
  const [newWorkLogMinutes, setNewWorkLogMinutes] = useState('');
  const [isSubmittingWorkLog, setIsSubmittingWorkLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [newCommentFiles, setNewCommentFiles] = useState<File[]>([]);
  const newCommentFileRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [transitionModalConfig, setTransitionModalConfig] = useState<{ isOpen: boolean; targetStatus: Ticket['status'] | null }>({ isOpen: false, targetStatus: null });
  const [transitionAssignee, setTransitionAssignee] = useState<number | null>(null);
  const [isTransitionAssigneeDropdownOpen, setIsTransitionAssigneeDropdownOpen] = useState(false);
  const [transitionCommentType, setTransitionCommentType] = useState<'reply' | 'internal'>('reply');
  const [transitionCommentText, setTransitionCommentText] = useState('');
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);
  const [isTransitionSuccess, setIsTransitionSuccess] = useState(false);
  const [availableTechnicians, setAvailableTechnicians] = useState<UserType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [isEditingCreator, setIsEditingCreator] = useState(false);
  const [isEditingTechnician, setIsEditingTechnician] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: number; filename: string } | null>(null);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [isAcceptingResolution, setIsAcceptingResolution] = useState(false);
  const [resolutionAccepted, setResolutionAccepted] = useState(false);
  const [isRejectingResolution, setIsRejectingResolution] = useState(false);
  const [resolutionRejected, setResolutionRejected] = useState(false);

  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const creatorDropdownRef = useRef<HTMLDivElement>(null);
  const technicianDropdownRef = useRef<HTMLDivElement>(null);
  const transitionAssigneeDropdownRef = useRef<HTMLDivElement>(null);

  const targetStatusLabel = transitionModalConfig.targetStatus === 'W_TOKU' ? 'W toku' :
    transitionModalConfig.targetStatus === 'NOWE' ? 'Nowe' :
      transitionModalConfig.targetStatus === 'ROZWIAZANE' ? 'Rozwiązane' :
        transitionModalConfig.targetStatus === 'ZAMKNIETE' ? 'Zamknięte' :
          transitionModalConfig.targetStatus;

  const currentTitle = transitionModalConfig.isOpen && targetStatusLabel
    ? targetStatusLabel
    : (ticket ? `Zgłoszenie #${ticket.id}` : 'Szczegóły zgłoszenia');

  useTitle(currentTitle);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setIsStatusMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(target)) {
        setIsEditingPriority(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsEditingCategory(false);
      }
      if (creatorDropdownRef.current && !creatorDropdownRef.current.contains(target)) {
        setIsEditingCreator(false);
      }
      if (technicianDropdownRef.current && !technicianDropdownRef.current.contains(target)) {
        setIsEditingTechnician(false);
      }
      if (transitionAssigneeDropdownRef.current && !transitionAssigneeDropdownRef.current.contains(target)) {
        setIsTransitionAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTicket = useCallback(async () => {
    try {
      const data = await ticketService.getTicket(id!);
      setTicket(data);
    } catch (err) {
      setError('Nie udało się pobrać szczegółów zgłoszenia.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    try {
      const data = await ticketService.getComments(id!);
      setComments(data);
    } catch (err) {
      console.error('Błąd pobierania komentarzy:', err);
    }
  }, [id]);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await ticketService.getLogs(id!);
      setTicketLogs(data);
    } catch (err) {
      console.error('Błąd pobierania logów:', err);
    }
  }, [id]);

  const fetchWorkLogs = useCallback(async () => {
    try {
      const data = await ticketService.getWorkLogs(id!);
      setWorkLogs(data);
    } catch (err) {
      console.error('Błąd pobierania rejestru prac:', err);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchComments();
      fetchLogs();
      fetchWorkLogs();
    }
    fetchTechnicians();
    fetchAllUsers();
    fetchCategories();
  }, [id, fetchTicket, fetchComments, fetchLogs, fetchWorkLogs]);

  const handleAddWorkLog = async () => {
    const trimmed = newWorkLogDesc.trim();
    const minutes = parseInt(newWorkLogMinutes);
    if (!trimmed || isNaN(minutes) || minutes <= 0) return;
    setIsSubmittingWorkLog(true);
    try {
      await ticketService.addWorkLog(id!, trimmed, minutes);
      setNewWorkLogDesc('');
      setNewWorkLogMinutes('');
      fetchWorkLogs();
    } catch (err) {
      console.error('Błąd dodawania wpisu:', err);
    } finally {
      setIsSubmittingWorkLog(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const techs = await ticketService.getTechnicians();
      setAvailableTechnicians(techs);
    } catch (err) {
      console.error('Błąd pobierania techników:', err);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const users = await ticketService.getUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Błąd pobierania użytkowników:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await ticketService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Błąd pobierania kategorii:', err);
    }
  };

  const updateTicketField = async (updates: Partial<Ticket>) => {
    if (!ticket) return;
    try {
      const updated = await ticketService.updateTicket(ticket.id, updates);
      setTicket(updated);
      fetchLogs();
    } catch (err) {
      console.error('Błąd aktualizacji', err);
      alert('Błąd podczas aktualizacji.');
    }
  };

  const handleDeleteAttachment = (attachmentId: number, filename: string) => {
    setAttachmentToDelete({ id: attachmentId, filename });
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    setIsDeletingAttachment(true);
    try {
      await ticketService.deleteAttachment(id!, attachmentToDelete.id);
      await fetchTicket();
      fetchLogs();
      setAttachmentToDelete(null);
    } catch (err) {
      console.error('Błąd usuwania załącznika:', err);
      alert('Błąd podczas usuwania załącznika.');
    } finally {
      setIsDeletingAttachment(false);
    }
  };

  const handleAddComment = async () => {
    setCommentError('');
    const trimmed = newCommentText.trim();
    if (!trimmed) {
      setCommentError('Treść komentarza nie może być pusta.');
      return;
    }
    if (trimmed.length > 5000) {
      setCommentError('Treść komentarza nie może przekraczać 5000 znaków.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const createdComment = await ticketService.addComment(id!, trimmed, newCommentType);

      // Upload załączników do komentarza
      if (newCommentFiles.length > 0) {
        try {
          await ticketService.uploadCommentAttachments(id!, createdComment.id, newCommentFiles);
        } catch (uploadErr) {
          console.error("Błąd podczas wgrywania załączników do komentarza:", uploadErr);
        }
      }

      setNewCommentText('');
      setNewCommentFiles([]);
      await fetchTicket();
      await fetchComments();
      fetchLogs();
    } catch (err: any) {
      console.error('Błąd dodawania komentarza:', err);
      if (err.response?.data?.content) {
        setCommentError(err.response.data.content[0]);
      } else {
        setCommentError('Wystąpił błąd podczas dodawania komentarza. Spróbuj ponownie.');
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const openTransitionModal = (newStatus: Ticket['status']) => {
    setTransitionModalConfig({ isOpen: true, targetStatus: newStatus });
    setTransitionAssignee(ticket?.technician || null);
    setTransitionCommentType('reply');
    setTransitionCommentText('');
    setIsStatusMenuOpen(false);
    setIsTransitionSuccess(false);
  };

  const handleSubmitTransition = async () => {
    if (!ticket || !transitionModalConfig.targetStatus) return;
    setIsSubmittingTransition(true);
    setIsTransitionSuccess(false);
    try {
      const updates: Record<string, any> = {
        status: transitionModalConfig.targetStatus,
        technician: transitionAssignee
      };

      // Dołącz komentarz do PATCH — backend utworzy go razem ze zmianą statusu
      // i wyśle jeden skonsolidowany e-mail
      if (transitionCommentText.trim()) {
        updates.transition_comment = transitionCommentText.trim();
        updates.transition_comment_type = transitionCommentType === 'internal' ? 'INTERNAL' : 'REPLY';
      }

      const updated = await ticketService.updateTicket(ticket.id, updates);
      setTicket(updated);

      if (transitionCommentText.trim()) {
        await fetchComments();
      }

      fetchLogs();
      setIsTransitionSuccess(true);
      setTimeout(() => {
        setTransitionModalConfig({ isOpen: false, targetStatus: null });
        setIsTransitionSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Błąd podczas zmiany statusu/tworzenia komentarza', err);
      alert('Błąd podczas aktualizacji zgłoszenia.');
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket) return;
    setIsDeletingTicket(true);
    try {
      await ticketService.deleteTicket(ticket.id);
      navigate('/tickets');
    } catch (err) {
      console.error('Błąd usuwania zgłoszenia:', err);
      alert('Nie udało się usunąć zgłoszenia.');
    } finally {
      setIsDeletingTicket(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  if (error || !ticket) return <div className="p-4 bg-red-50 text-red-700 rounded-xl m-6">{error || 'Zgłoszenie nie istnieje.'}</div>;

  const statusColors = {
    NOWE: 'bg-blue-100 text-blue-700 border-blue-200',
    W_TOKU: 'bg-amber-100 text-amber-700 border-amber-200',
    ROZWIAZANE: 'bg-green-100 text-green-700 border-green-200',
    ZAMKNIETE: 'bg-teal-100 text-teal-700 border-teal-200',
  };

  const isTechnicianOrAdmin = authContext?.user?.role === 'TECHNICIAN' || authContext?.user?.role === 'ADMIN';
  const isAdmin = authContext?.user?.role === 'ADMIN';



  return (
    <div className="w-full pb-12 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 dark:text-gray-400 hover:!text-blue-600 dark:hover:!text-blue-400 font-semibold mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Wstecz
      </button>

      {/* Baner weryfikacji rozwiązania dla klienta */}
      {ticket.status === 'ROZWIAZANE' && authContext?.user?.role === 'EMPLOYEE' && ticket.resolved_at && (() => {
        const resolvedDate = new Date(ticket.resolved_at);
        const autoCloseDate = new Date(resolvedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((autoCloseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return (
          <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-900/30 rounded-2xl shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-green-800 dark:text-green-400 mb-1">Zgłoszenie oznaczone jako rozwiązane</h3>
                <p className="text-sm text-green-700 dark:text-green-300/80 mb-3">
                  Technik oznaczył Twoje zgłoszenie jako rozwiązane. Sprawdź, czy problem został naprawiony.
                  {daysLeft > 0 && (
                    <span className="font-semibold text-green-800 dark:text-green-300"> Masz jeszcze {daysLeft} {daysLeft === 1 ? 'dzień' : daysLeft < 5 ? 'dni' : 'dni'} na weryfikację.</span>
                  )}
                  {daysLeft === 0 && (
                    <span className="font-semibold text-amber-600 dark:text-amber-500"> Czas weryfikacji upływa dzisiaj!</span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (isAcceptingResolution || isRejectingResolution) return;
                      setIsAcceptingResolution(true);
                      try {
                        await ticketService.updateTicket(ticket.id, { status: 'ZAMKNIETE' as any });
                        setIsAcceptingResolution(false);
                        setResolutionAccepted(true);
                        setTimeout(() => {
                          fetchTicket();
                          fetchLogs();
                          setResolutionAccepted(false);
                        }, 1500);
                      } catch (err) {
                        console.error('Błąd akceptacji rozwiązania:', err);
                        setIsAcceptingResolution(false);
                      }
                    }}
                    disabled={isAcceptingResolution || isRejectingResolution || resolutionAccepted || resolutionRejected}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${resolutionAccepted
                        ? 'bg-green-700 text-white shadow-sm pointer-events-none'
                        : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                      }`}
                  >
                    {isAcceptingResolution ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : resolutionAccepted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {isAcceptingResolution ? 'Przetwarzanie...' : resolutionAccepted ? 'Zaakceptowano!' : 'Akceptuję rozwiązanie'}
                  </button>
                  <button
                    onClick={async () => {
                      if (isAcceptingResolution || isRejectingResolution) return;
                      setIsRejectingResolution(true);
                      try {
                        await ticketService.updateTicket(ticket.id, { status: 'W_TOKU' as any });
                        setIsRejectingResolution(false);
                        setResolutionRejected(true);
                        setTimeout(() => {
                          fetchTicket();
                          fetchLogs();
                          setResolutionRejected(false);
                        }, 1500);
                      } catch (err) {
                        console.error('Błąd ponownego otwarcia zgłoszenia:', err);
                        setIsRejectingResolution(false);
                      }
                    }}
                    disabled={isAcceptingResolution || isRejectingResolution || resolutionAccepted || resolutionRejected}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${resolutionRejected
                        ? 'bg-red-500 text-white shadow-sm border-transparent pointer-events-none'
                        : 'bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 shadow-sm'
                      }`}
                  >
                    {isRejectingResolution ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : resolutionRejected ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {isRejectingResolution ? 'Przetwarzanie...' : resolutionRejected ? 'Sukces!' : 'To nie rozwiązuje problemu'}
                  </button>
                </div>
              </div>
            </div>
            {/* Pasek postępu czasu */}
            <div className="mt-4 ml-[52px] max-w-sm">
              <div className="flex items-center justify-between text-[11px] text-green-700 dark:text-green-500/80 mb-1.5">
                <span className="font-medium">Czas na weryfikację</span>
                <span className="font-bold">{daysLeft} z 7 dni</span>
              </div>
              <div className="w-full bg-green-200 dark:bg-green-900/40 rounded-full h-1.5">
                <div
                  className="bg-green-500 dark:bg-green-500/80 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, (daysLeft / 7) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_410px] gap-8">
        {/* Lewa kolumna: Treść zgłoszenia */}
        <div className="space-y-6 min-w-0 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:pl-1 lg:pr-3" style={{ scrollbarWidth: 'auto', scrollbarColor: '#94a3b8 transparent' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-500 hover:text-blue-600 hover:underline cursor-pointer transition-colors">Zgłoszenie #{ticket.id}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${statusColors[ticket.status]}`}>
                {ticket.status === 'W_TOKU' ? 'W toku' :
                  ticket.status === 'NOWE' ? 'Nowe' :
                    ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' :
                      ticket.status === 'ZAMKNIETE' ? 'Zamknięte' : ticket.status}
              </span>
            </div>
          </div>
          {isEditingTitle ? (
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  className="flex-1 text-2xl font-semibold text-gray-900 border border-blue-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-600"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const t = editTitle.trim();
                      if (t.length >= 5 && t.length <= 200) {
                        updateTicketField({ title: t });
                        setIsEditingTitle(false);
                      }
                    } else if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const t = editTitle.trim();
                    if (t.length >= 5 && t.length <= 200) {
                      updateTicketField({ title: t });
                      setIsEditingTitle(false);
                    }
                  }}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Zapisz"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Anuluj"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1 px-1">
                {editTitle.trim().length < 5 ? (
                  <span className="text-xs text-red-500">Min. 5 znaków (obecnie {editTitle.trim().length})</span>
                ) : <span />}
                <span className={`text-xs ${editTitle.length > 180 ? 'text-amber-500' : 'text-gray-400'}`}>{editTitle.length}/200</span>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-start gap-2 mb-6 group min-w-0 ${isTechnicianOrAdmin ? 'cursor-text p-2.5 -my-2 rounded-xl hover:bg-blue-50/50 dark:hover:bg-gray-800/40 transition-colors border border-transparent hover:border-blue-100 dark:hover:border-gray-700' : ''}`}
              onClick={() => {
                if (isTechnicianOrAdmin) {
                  setEditTitle(ticket.title);
                  setIsEditingTitle(true);
                }
              }}
              title={isTechnicianOrAdmin ? "Kliknij, aby edytować tytuł" : undefined}
            >
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 break-words">{ticket.title}</h1>
              {isTechnicianOrAdmin && (
                <div className="mt-1.5 p-1 text-gray-400 group-hover:text-blue-600 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
              )}
            </div>
          )}

          {/* Prominent status banner for employees */}
          {!isTechnicianOrAdmin && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border mb-2 ${ticket.status === 'NOWE' ? 'bg-blue-50 border-blue-200' :
              ticket.status === 'W_TOKU' ? 'bg-amber-50 border-amber-200' :
                ticket.status === 'ROZWIAZANE' ? 'bg-green-50 border-green-200' :
                  'bg-teal-50 border-teal-200'
              }`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ticket.status === 'NOWE' ? 'bg-blue-500' :
                ticket.status === 'W_TOKU' ? 'bg-amber-500 animate-pulse' :
                  ticket.status === 'ROZWIAZANE' ? 'bg-green-500' :
                    'bg-teal-500'
                }`} />
              <div>
                <p className={`text-sm font-bold ${ticket.status === 'NOWE' ? 'text-blue-800' :
                  ticket.status === 'W_TOKU' ? 'text-amber-800' :
                    ticket.status === 'ROZWIAZANE' ? 'text-green-800' :
                      'text-teal-800'
                  }`}>
                  Status: {ticket.status === 'W_TOKU' ? 'W toku' :
                    ticket.status === 'NOWE' ? 'Nowe' :
                      ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' :
                        ticket.status === 'ZAMKNIETE' ? 'Zamknięte' : ticket.status}
                </p>
                <p className={`text-xs mt-0.5 ${ticket.status === 'NOWE' ? 'text-blue-600' :
                  ticket.status === 'W_TOKU' ? 'text-amber-600' :
                    ticket.status === 'ROZWIAZANE' ? 'text-green-600' :
                      'text-teal-600'
                  }`}>
                  {ticket.status === 'NOWE' ? 'Twoje zgłoszenie oczekuje na rozpatrzenie.' :
                    ticket.status === 'W_TOKU' ? 'Twoje zgłoszenie jest w trakcie realizacji.' :
                      ticket.status === 'ROZWIAZANE' ? 'Zgłoszenie zostało rozwiązane.' :
                        'Zgłoszenie zostało zamknięte.'}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden outline outline-1 outline-gray-200">
                  {ticket.creator_details?.avatar ? (
                    <img src={ticket.creator_details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-xs uppercase">
                      {ticket.creator_details?.first_name ? ticket.creator_details.first_name.charAt(0) : 'U'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800">
                  <span className="font-semibold">
                    {ticket.creator_details?.first_name
                      ? `${ticket.creator_details.first_name} ${ticket.creator_details.last_name || ''}`.trim()
                      : 'Użytkownik'}
                  </span> przesłał(a) zgłoszenie
                </p>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Opis</h3>
              {isEditingDescription ? (
                <div>
                  <MarkdownEditor
                    value={editDescription}
                    onChange={setEditDescription}
                    placeholder="Edytuj opis zgłoszenia..."
                    className="border-blue-300 dark:border-gray-600"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={() => {
                        if (editDescription.trim().length >= 10) {
                          updateTicketField({ description: editDescription.trim() });
                          setIsEditingDescription(false);
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Zapisz
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`group relative ${isTechnicianOrAdmin ? 'cursor-text p-3 -my-1 rounded-xl hover:bg-gray-50/80 dark:hover:bg-[#1a1d24] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700' : ''}`}
                  onClick={() => {
                    if (isTechnicianOrAdmin) {
                      setEditDescription(ticket.description);
                      setIsEditingDescription(true);
                    }
                  }}
                  title={isTechnicianOrAdmin ? "Kliknij, aby edytować opis" : undefined}
                >
                  <MarkdownRenderer content={ticket.description} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed" />
                  {isTechnicianOrAdmin && (
                    <div className="absolute top-3 right-3 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Załączniki do zgłoszenia</h3>
                  {/* Image attachments - horizontal carousel */}
                  {(() => {
                    const imageAtts = ticket.attachments.filter(att => att.url?.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/));
                    if (imageAtts.length === 0) return null;
                    const scrollId = 'ticket-img-scroll';
                    const scroll = (dir: 'left' | 'right') => {
                      const el = document.getElementById(scrollId);
                      if (el) el.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
                    };
                    return (
                      <div className="relative group/carousel mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs font-semibold text-gray-500">{imageAtts.length} {imageAtts.length === 1 ? 'zdjęcie' : imageAtts.length < 5 ? 'zdjęcia' : 'zdjęć'}</span>
                        </div>
                        {imageAtts.length > 3 && (
                          <>
                            <button
                              onClick={() => scroll('left')}
                              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 hover:bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 -ml-3"
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={() => scroll('right')}
                              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 hover:bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 -mr-3"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-700" />
                            </button>
                          </>
                        )}
                        <div
                          id={scrollId}
                          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
                        >
                          {imageAtts.map(att => (
                            <div
                              key={att.id}
                              className="group relative flex-shrink-0 w-[220px] rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 bg-gray-50 cursor-pointer transition-all hover:shadow-lg"
                              onClick={() => setLightboxUrl(att.url)}
                            >
                              {isTechnicianOrAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id, att.filename); }}
                                  className="absolute top-2 right-2 z-10 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-md opacity-60 group-hover:opacity-100 transition-all shadow-md scale-95 group-hover:scale-100"
                                  title="Usuń załącznik"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <div className="aspect-[4/3] overflow-hidden">
                                <img
                                  src={att.url}
                                  alt={att.filename}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              </div>
                              <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                                <p className="text-[11px] text-gray-600 truncate font-medium">{att.filename}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Non-image attachments */}
                  {ticket.attachments.filter(att => !att.url?.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ticket.attachments.filter(att => !att.url?.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/)).map(att => (
                        <div key={att.id} className="flex items-center gap-2 p-2 pr-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors group">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate max-w-[200px]">{att.filename}</a>
                          <Download className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                          {isTechnicianOrAdmin && (
                            <button
                              onClick={() => handleDeleteAttachment(att.id, att.filename)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 ml-auto"
                              title="Usuń załącznik"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Activity Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{isTechnicianOrAdmin ? 'Aktywność' : 'Aktywność'}</h3>

            {isTechnicianOrAdmin && (
              <div className="flex border-b border-gray-200 mb-4 custom-scrollbar overflow-x-auto">
                <button onClick={() => setActiveTab('comments')} className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${activeTab === 'comments' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Komentarze</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Historia</button>
                <button onClick={() => setActiveTab('work_log')} className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${activeTab === 'work_log' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Rejestr prac</button>
              </div>
            )}

            {(activeTab === 'comments' || !isTechnicianOrAdmin) && (
              <div className={`flex ${isTechnicianOrAdmin ? 'flex-col-reverse' : 'flex-col'}`}>
                {/* Lista Komentarzy */}
                <div className={`space-y-4 ${isTechnicianOrAdmin ? 'pt-4' : 'mb-2'}`}>
                  {comments.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-2 italic">Brak komentarzy.</div>
                  ) : (
                    (isTechnicianOrAdmin ? [...comments].reverse() : comments).map(comment => {
                      const isInternal = comment.comment_type === 'INTERNAL';
                      return (
                        <div key={comment.id} className="flex gap-4 items-start">
                          <div className="w-8 h-8 mt-3 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden outline outline-1 outline-gray-200">
                            {comment.author_details?.avatar ? (
                              <img src={comment.author_details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-xs uppercase">
                                {comment.author_details?.first_name ? comment.author_details.first_name.charAt(0) : 'U'}
                              </span>
                            )}
                          </div>
                          <div className={`p-4 rounded-xl flex-1 min-w-0 ${isInternal ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-gray-900 text-sm">{comment.author_details?.first_name} {comment.author_details?.last_name}</span>
                              <span className="text-xs text-gray-500">
                                {dayjs(comment.created_at).format('DD MMM YYYY, HH:mm')}
                              </span>
                            </div>
                            {isInternal && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100/50 px-2 py-1 rounded w-max mb-2">
                                <Lock className="w-3 h-3" />
                                <span className="font-medium uppercase tracking-wide">Notatka Wewnętrzna</span>
                              </div>
                            )}
                            <MarkdownRenderer content={comment.content} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed" />

                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100/70">
                                {/* Comment image attachments - horizontal carousel */}
                                {(() => {
                                  const commentImageAtts = comment.attachments.filter(att => att.url?.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/));
                                  if (commentImageAtts.length === 0) return null;
                                  const scrollId = `comment-img-scroll-${comment.id}`;
                                  const scroll = (dir: 'left' | 'right') => {
                                    const el = document.getElementById(scrollId);
                                    if (el) el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
                                  };
                                  return (
                                    <div className="relative group/carousel mb-2">
                                      {commentImageAtts.length > 2 && (
                                        <>
                                          <button
                                            onClick={() => scroll('left')}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 hover:bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 -ml-2.5"
                                          >
                                            <ChevronLeft className="w-3.5 h-3.5 text-gray-700" />
                                          </button>
                                          <button
                                            onClick={() => scroll('right')}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 hover:bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 -mr-2.5"
                                          >
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
                                          </button>
                                        </>
                                      )}
                                      <div
                                        id={scrollId}
                                        className="flex gap-2 overflow-x-auto pb-1.5 scroll-smooth"
                                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
                                      >
                                        {commentImageAtts.map(att => (
                                          <div
                                            key={att.id}
                                            className="group relative flex-shrink-0 w-[180px] rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 bg-gray-50 cursor-pointer transition-all hover:shadow-md"
                                            onClick={() => setLightboxUrl(att.url)}
                                          >
                                            <div className="aspect-[4/3] overflow-hidden">
                                              <img
                                                src={att.url}
                                                alt={att.filename}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                              />
                                            </div>
                                            <div className="px-1.5 py-1 bg-white border-t border-gray-100">
                                              <p className="text-[10px] text-gray-600 truncate font-medium">{att.filename}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                                {/* Comment non-image attachments */}
                                {comment.attachments.filter(att => !att.url?.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/)).length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {comment.attachments.filter(att => !att.url?.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/)).map(att => (
                                      <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs hover:border-blue-400 hover:bg-blue-50 transition-colors group text-gray-700">
                                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="truncate max-w-[150px]">{att.filename}</span>
                                        <Download className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 ml-1 transition-opacity" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Formularz Nowego Komentarza */}
                <div className={`flex gap-4 items-start ${isTechnicianOrAdmin ? 'mb-6 pb-6 border-b border-gray-100/70' : 'pt-4 border-t border-gray-100'}`}>
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden outline outline-1 outline-gray-200">
                    {authContext?.user?.avatar ? (
                      <img src={authContext.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xs uppercase">
                        {authContext?.user?.first_name ? authContext.user.first_name.charAt(0) : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setNewCommentType('REPLY')}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${newCommentType === 'REPLY' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        Odpowiedz
                      </button>
                      {isTechnicianOrAdmin && (
                        <button
                          onClick={() => setNewCommentType('INTERNAL')}
                          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${newCommentType === 'INTERNAL' ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          <Lock className="w-3 h-3" /> Notatka wewnętrzna
                        </button>
                      )}
                    </div>

                    <MarkdownEditor
                      value={newCommentText}
                      onChange={(v) => {
                        setNewCommentText(v);
                        if (commentError) setCommentError('');
                      }}
                      placeholder={newCommentType === 'INTERNAL' ? "Dodaj notatkę wewnętrzną (widoczna tylko dla techników)..." : "Napisz odpowiedź..."}
                      className={`${commentError ? 'border-red-300 bg-red-50' : newCommentType === 'INTERNAL' ? 'border-amber-200' : 'border-gray-200'}`}
                      onAttachFile={() => newCommentFileRef.current?.click()}
                    />

                    <div className="flex justify-between items-center mt-1">
                      <div className="flex-1">
                        {commentError && (
                          <div className="text-red-500 text-xs font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {commentError}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs ${newCommentText.length > 5000 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {newCommentText.length} / 5000
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      {/* Podgląd wybranych plików */}
                      {newCommentFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-1">
                          {newCommentFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs">
                              <Paperclip className="w-3 h-3" />
                              <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                              <button type="button" onClick={() => setNewCommentFiles(prev => prev.filter((_, i) => i !== idx))} className="ml-1 text-blue-400 hover:text-red-500 rounded-full transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <input
                            type="file"
                            multiple
                            ref={newCommentFileRef}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                const MAX_FILE_SIZE = 5 * 1024 * 1024;
                                const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
                                const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'];
                                const validFiles: File[] = [];
                                const invalidFiles: string[] = [];

                                let currentTotal = newCommentFiles.reduce((sum, f) => sum + f.size, 0);

                                Array.from(e.target.files).forEach(f => {
                                  const extIndex = f.name.lastIndexOf('.');
                                  const ext = extIndex >= 0 ? f.name.substring(extIndex).toLowerCase() : '';
                                  if (!ALLOWED_EXTENSIONS.includes(ext)) {
                                    invalidFiles.push(`${f.name} (niedozwolony format)`);
                                  } else if (f.size > MAX_FILE_SIZE) {
                                    invalidFiles.push(`${f.name} (powyżej 5MB)`);
                                  } else if (currentTotal + f.size > MAX_TOTAL_SIZE) {
                                    invalidFiles.push(`${f.name} (przekracza łączny limit 15MB)`);
                                  } else {
                                    validFiles.push(f);
                                    currentTotal += f.size;
                                  }
                                });
                                if (invalidFiles.length > 0) {
                                  alert(`Odrzucono niektóre pliki:\n- ${invalidFiles.join('\n- ')}`);
                                }
                                setNewCommentFiles(prev => [...prev, ...validFiles]);
                              }
                              e.target.value = '';
                            }}
                          />
                        </div>
                        <button
                          onClick={handleAddComment}
                          disabled={isSubmittingComment || (!newCommentText.trim() && newCommentFiles.length === 0)}
                          className={`px-5 py-2.5 text-white text-sm font-bold rounded-lg transition-all shadow-sm flex items-center disabled:opacity-50 ${newCommentType === 'INTERNAL' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                        >
                          {isSubmittingComment ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : null}
                          Wyślij
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-1">
                {(() => {
                  type HistoryItem = { type: 'log'; data: TicketLog; date: string } | { type: 'comment'; data: Comment; date: string } | { type: 'worklog'; data: WorkLog; date: string };
                  const items: HistoryItem[] = [
                    ...ticketLogs.map(l => ({ type: 'log' as const, data: l, date: l.created_at })),
                    ...comments.map(c => ({ type: 'comment' as const, data: c, date: c.created_at })),
                    ...workLogs.map(w => ({ type: 'worklog' as const, data: w, date: w.created_at })),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (items.length === 0) {
                    return (
                      <div className="text-center text-gray-500 text-sm py-8 italic border border-gray-100 rounded-xl bg-gray-50/50">
                        Brak historii.
                      </div>
                    );
                  }

                  return (
                    <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-600 space-y-4">
                      {items.map((item) => {
                        if (item.type === 'log') {
                          const log = item.data;
                          const statusLabels: Record<string, string> = {
                            NOWE: 'Nowe', W_TOKU: 'W toku', ROZWIAZANE: 'Rozwiązane', ZAMKNIETE: 'Zamknięte',
                            NISKI: 'Niski', NORMALNY: 'Normalny', WYSOKI: 'Wysoki',
                          };
                          const displayOld = statusLabels[log.old_value] || log.old_value;
                          const displayNew = statusLabels[log.new_value] || log.new_value;
                          const userName = log.user_details ? `${log.user_details.first_name} ${log.user_details.last_name}` : 'System';

                          const historyIconMap: Record<string, React.ReactNode> = {
                            CREATED: <Plus className="w-3.5 h-3.5 text-green-600" />,
                            STATUS_CHANGED: <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />,
                            TECHNICIAN_ASSIGNED: <UserPlus className="w-3.5 h-3.5 text-indigo-600" />,
                            TECHNICIAN_REMOVED: <UserX className="w-3.5 h-3.5 text-red-500" />,
                            PRIORITY_CHANGED: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
                            CATEGORY_CHANGED: <FolderOpen className="w-3.5 h-3.5 text-purple-500" />,
                            CREATOR_CHANGED: <User className="w-3.5 h-3.5 text-cyan-600" />,
                            ATTACHMENT_ADDED: <Paperclip className="w-3.5 h-3.5 text-teal-600" />,
                            TITLE_CHANGED: <Pencil className="w-3.5 h-3.5 text-orange-500" />,
                            DESCRIPTION_CHANGED: <Pencil className="w-3.5 h-3.5 text-rose-500" />,
                            ATTACHMENT_DELETED: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
                          };
                          const historyBgMap: Record<string, string> = {
                            CREATED: 'bg-green-100 dark:bg-green-900/40',
                            STATUS_CHANGED: 'bg-blue-100 dark:bg-blue-900/40',
                            TECHNICIAN_ASSIGNED: 'bg-indigo-100 dark:bg-indigo-900/40',
                            TECHNICIAN_REMOVED: 'bg-red-100 dark:bg-red-900/40',
                            PRIORITY_CHANGED: 'bg-amber-100 dark:bg-amber-900/40',
                            CATEGORY_CHANGED: 'bg-purple-100 dark:bg-purple-900/40',
                            CREATOR_CHANGED: 'bg-cyan-100 dark:bg-cyan-900/40',
                            ATTACHMENT_ADDED: 'bg-teal-100 dark:bg-teal-900/40',
                            TITLE_CHANGED: 'bg-orange-100 dark:bg-orange-900/40',
                            DESCRIPTION_CHANGED: 'bg-rose-100 dark:bg-rose-900/40',
                            ATTACHMENT_DELETED: 'bg-red-100 dark:bg-red-900/40',
                          };

                          return (
                            <div key={`log-${log.id}`} className="relative">
                              <div className={`absolute -left-[calc(0.75rem+5px)] top-1 w-6 h-6 rounded-full flex items-center justify-center ${historyBgMap[log.action] || 'bg-gray-100'}`}>
                                {historyIconMap[log.action] || <Activity className="w-3.5 h-3.5 text-gray-500" />}
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg p-3 ml-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action_display}</span>
                                  <span className="text-xs text-gray-400">{dayjs(log.created_at).format('DD MMM YYYY, HH:mm')}</span>
                                </div>

                                {/* Szczegóły zmian */}
                                {log.action === 'CREATED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> utworzył(a) zgłoszenie
                                    {log.new_value && <> „<span className="italic">{log.new_value}</span>"</>}
                                  </p>
                                )}
                                {log.action === 'STATUS_CHANGED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> zmienił(a) status:{' '}
                                    <span className={statusColors[log.old_value as keyof typeof statusColors] ? `${statusColors[log.old_value as keyof typeof statusColors]} px-1.5 py-0.5 rounded border` : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded"}>{displayOld}</span>
                                    {' → '}
                                    <span className={statusColors[log.new_value as keyof typeof statusColors] ? `${statusColors[log.new_value as keyof typeof statusColors]} px-1.5 py-0.5 rounded border` : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded"}>{displayNew}</span>
                                  </p>
                                )}
                                {log.action === 'TECHNICIAN_ASSIGNED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> przypisał(a) technika:{' '}
                                    {displayOld && <><span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{displayOld}</span>{' → '}</>}
                                    <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">{displayNew}</span>
                                  </p>
                                )}
                                {log.action === 'TECHNICIAN_REMOVED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> usunął(a) technika:{' '}
                                    <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{displayOld}</span>
                                  </p>
                                )}
                                {log.action === 'PRIORITY_CHANGED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> zmienił(a) priorytet:{' '}
                                    <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{displayOld}</span>
                                    {' → '}
                                    <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">{displayNew}</span>
                                  </p>
                                )}
                                {log.action === 'CATEGORY_CHANGED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> zmienił(a) kategorię:{' '}
                                    <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{displayOld}</span>
                                    {' → '}
                                    <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">{displayNew}</span>
                                  </p>
                                )}
                                {log.action === 'CREATOR_CHANGED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> zmienił(a) zgłaszającego:{' '}
                                    <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{displayOld}</span>
                                    {' → '}
                                    <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">{displayNew}</span>
                                  </p>
                                )}
                                {log.action === 'ATTACHMENT_ADDED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> dodał(a) załącznik:{' '}
                                    <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded font-medium">{log.new_value}</span>
                                  </p>
                                )}
                                {log.action === 'TITLE_CHANGED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> zmienił(a) tytuł:{' '}
                                    <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{displayOld}</span>
                                    {' → '}
                                    <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">{displayNew}</span>
                                  </p>
                                )}
                                {log.action === 'DESCRIPTION_CHANGED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> zmienił(a) opis zgłoszenia
                                  </p>
                                )}
                                {log.action === 'ATTACHMENT_DELETED' && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span> usunął(a) załącznik:{' '}
                                    <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium line-through">{log.old_value}</span>
                                  </p>
                                )}

                                {/* Avatar użytkownika */}
                                {log.user_details && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                                    {log.user_details.avatar ? (
                                      <img src={log.user_details.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-blue-600">{log.user_details.first_name?.charAt(0)}</span>
                                      </div>
                                    )}
                                    <span>{userName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (item.type === 'comment') {
                          const comment = item.data;
                          const isInternal = comment.comment_type === 'INTERNAL';
                          const commentAuthor = comment.author_details ? `${comment.author_details.first_name} ${comment.author_details.last_name}` : '';
                          return (
                            <div key={`comment-${comment.id}`} className="relative">
                              <div className={`absolute -left-[calc(0.75rem+5px)] top-1 w-6 h-6 rounded-full flex items-center justify-center ${isInternal ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
                                {isInternal ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <FileText className="w-3.5 h-3.5 text-green-600" />}
                              </div>
                              <div className={`border rounded-lg p-3 ml-2 ${isInternal ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {isInternal ? 'Notatka wewnętrzna' : 'Komentarz'}
                                  </span>
                                  <span className="text-xs text-gray-400">{dayjs(comment.created_at).format('DD MMM YYYY, HH:mm')}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{comment.content}</p>
                                {comment.author_details && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                                    {comment.author_details.avatar ? (
                                      <img src={comment.author_details.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-blue-600">{comment.author_details.first_name?.charAt(0)}</span>
                                      </div>
                                    )}
                                    <span>{commentAuthor}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (item.type === 'worklog') {
                          const wl = item.data;
                          const wlAuthor = wl.author_details ? `${wl.author_details.first_name} ${wl.author_details.last_name}` : 'Nieznany';
                          const hours = Math.floor(wl.duration_minutes / 60);
                          const mins = wl.duration_minutes % 60;
                          const durationStr = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
                          return (
                            <div key={`worklog-${wl.id}`} className="relative">
                              <div className="absolute -left-[calc(0.75rem+5px)] top-1 w-6 h-6 rounded-full flex items-center justify-center bg-violet-100 dark:bg-violet-900/40">
                                <Clock className="w-3.5 h-3.5 text-violet-600" />
                              </div>
                              <div className="bg-violet-50/50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3 ml-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Rejestr prac</span>
                                  <span className="text-xs text-gray-400">{dayjs(wl.created_at).format('DD MMM YYYY, HH:mm')}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{wl.description}</p>
                                <div className="mt-1.5 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    {wl.author_details?.avatar ? (
                                      <img src={wl.author_details.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-violet-100 flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-violet-600">{wl.author_details?.first_name?.charAt(0)}</span>
                                      </div>
                                    )}
                                    <span>{wlAuthor}</span>
                                  </div>
                                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full">
                                    ⏱ {durationStr}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'work_log' && (
              <div className="space-y-4">
                {/* Formularz dodawania */}
                {isTechnicianOrAdmin && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <FileClock className="w-4 h-4 text-blue-500" />
                      Dodaj wpis
                    </h4>
                    <textarea
                      value={newWorkLogDesc}
                      onChange={(e) => setNewWorkLogDesc(e.target.value)}
                      placeholder="Opis wykonanej pracy..."
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none bg-white dark:bg-gray-900 dark:border-gray-600"
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={newWorkLogMinutes}
                          onChange={(e) => setNewWorkLogMinutes(e.target.value)}
                          placeholder="Minuty"
                          className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-600"
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                      <button
                        onClick={handleAddWorkLog}
                        disabled={isSubmittingWorkLog || !newWorkLogDesc.trim() || !newWorkLogMinutes || parseInt(newWorkLogMinutes) <= 0}
                        className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSubmittingWorkLog ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Plus className="w-4 h-4" />}
                        Dodaj
                      </button>
                    </div>
                  </div>
                )}

                {/* Podsumowanie czasu */}
                {workLogs.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Łączny czas: {(() => {
                        const total = workLogs.reduce((sum, wl) => sum + wl.duration_minutes, 0);
                        const h = Math.floor(total / 60);
                        const m = total % 60;
                        return h > 0 ? `${h}h ${m}min` : `${m}min`;
                      })()}
                    </span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">({workLogs.length} {workLogs.length === 1 ? 'wpis' : workLogs.length < 5 ? 'wpisy' : 'wpisów'})</span>
                  </div>
                )}

                {/* Lista wpisów */}
                {workLogs.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8 italic border border-gray-100 rounded-xl bg-gray-50/50">
                    Brak wpisów w rejestrze prac.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workLogs.map(wl => (
                      <div key={wl.id} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">{wl.description}</p>
                          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md flex-shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">
                              {wl.duration_minutes >= 60 ? `${Math.floor(wl.duration_minutes / 60)}h ${wl.duration_minutes % 60}min` : `${wl.duration_minutes}min`}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                          {wl.author_details?.avatar ? (
                            <img src={wl.author_details.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-blue-600">{wl.author_details?.first_name?.charAt(0)}</span>
                            </div>
                          )}
                          <span>{wl.author_details?.first_name} {wl.author_details?.last_name}</span>
                          <span>•</span>
                          <span>{dayjs(wl.created_at).format('DD MMM YYYY, HH:mm')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Prawa kolumna: Metadane i Status */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Akcje u góry */}
          <div className="flex items-center gap-2">
            {isTechnicianOrAdmin && (
              <div className="relative" ref={statusMenuRef}>
                <button
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                  className="inline-flex items-center pl-4 pr-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200 transition-all border-none focus:outline-none"
                >
                  Zmień status
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isStatusMenuOpen && (
                  <div className="absolute left-0 z-50 w-48 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 rounded-xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    <button
                      onClick={() => openTransitionModal('NOWE')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    >
                      Nowe
                    </button>
                    <button
                      onClick={() => openTransitionModal('W_TOKU')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    >
                      W toku
                    </button>
                    <button
                      onClick={() => openTransitionModal('ROZWIAZANE')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    >
                      Rozwiązane
                    </button>
                    <button
                      onClick={() => openTransitionModal('ZAMKNIETE')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    >
                      Zamknięte
                    </button>
                  </div>
                )}
              </div>
            )}
            {isTechnicianOrAdmin && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="inline-flex items-center justify-center w-9 h-9 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 rounded-xl shadow-sm transition-all focus:outline-none"
                  title="Więcej akcji"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {isMoreMenuOpen && (
                  <div className="absolute right-0 z-50 w-48 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 rounded-xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        navigator.clipboard.writeText(window.location.href);
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium flex items-center gap-2 border-b border-gray-100 dark:border-gray-700"
                    >
                      <Link2 className="w-4 h-4" />
                      Skopiuj link
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setShowDeleteModal(true);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Usuń zgłoszenie
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stała zakładka: Szczegóły */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center">
              <h3 className="font-semibold text-gray-800 text-sm">Szczegóły</h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Row 1: Osoba zgłaszająca */}
              <div className="grid grid-cols-[160px_1fr] items-start">
                <span className="text-sm text-gray-500 font-medium pt-0.5">Osoba zgłaszająca</span>
                <div className="relative" ref={creatorDropdownRef}>
                  <div
                    className={`flex items-center gap-2 text-sm text-gray-900 ${isTechnicianOrAdmin ? 'cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded transition-colors' : ''}`}
                    onClick={() => isTechnicianOrAdmin && setIsEditingCreator(!isEditingCreator)}
                    title={isTechnicianOrAdmin ? "Kliknij, aby zmienić zgłaszającego" : ""}
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white overflow-hidden">
                      {ticket.creator_details?.avatar ? (
                        <img src={ticket.creator_details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase">{ticket.creator_details?.first_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    {ticket.creator_details?.first_name} {ticket.creator_details?.last_name}
                  </div>
                  {isEditingCreator && isTechnicianOrAdmin && (
                    <div className="absolute z-50 left-0 -ml-1 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] w-[calc(100%+8px)] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {allUsers.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={async (e) => {
                            e.preventDefault();
                            if (u.id !== ticket.creator) {
                              await updateTicketField({ creator: u.id });
                            }
                            setIsEditingCreator(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${ticket.creator === u.id ? 'bg-blue-50/50 dark:bg-blue-900/40 font-semibold' : ''}`}
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {u.avatar ? (
                              <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold uppercase">{u.first_name?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{u.first_name} {u.last_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Priorytet */}
              <div className="grid grid-cols-[160px_1fr] items-start">
                <span className="text-sm text-gray-500 font-medium pt-0.5">Priorytet</span>
                <div className="relative" ref={priorityDropdownRef}>
                  <div
                    className={`flex items-center gap-2 text-sm text-gray-900 ${isTechnicianOrAdmin ? 'cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded transition-colors' : ''}`}
                    onClick={() => isTechnicianOrAdmin && setIsEditingPriority(!isEditingPriority)}
                    title={isTechnicianOrAdmin ? 'Kliknij, aby zmienić priorytet' : ''}
                  >
                    {ticket.priority === 'WYSOKI' ? <ChevronsUp className="w-3.5 h-3.5 text-red-500" /> :
                      ticket.priority === 'NORMALNY' ? <Equal className="w-3.5 h-3.5 text-blue-500" /> :
                        <ChevronsDown className="w-3.5 h-3.5 text-gray-400" />}
                    <span className={`font-medium ${ticket.priority === 'WYSOKI' ? 'text-red-600' : ticket.priority === 'NORMALNY' ? 'text-blue-600' : 'text-gray-600'}`}>
                      {ticket.priority === 'WYSOKI' ? 'Wysoki' : ticket.priority === 'NORMALNY' ? 'Normalny' : 'Niski'}
                    </span>
                  </div>
                  {isEditingPriority && isTechnicianOrAdmin && (
                    <div className="absolute z-50 left-0 -ml-1 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] w-[calc(100%+8px)] animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                      {[
                        { value: 'NISKI', label: 'Niski', icon: <ChevronsDown className="w-3.5 h-3.5 text-gray-400" />, color: 'text-gray-600' },
                        { value: 'NORMALNY', label: 'Normalny', icon: <Equal className="w-3.5 h-3.5 text-blue-500" />, color: 'text-blue-600' },
                        { value: 'WYSOKI', label: 'Wysoki', icon: <ChevronsUp className="w-3.5 h-3.5 text-red-500" />, color: 'text-red-600' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onMouseDown={async (e) => {
                            e.preventDefault();
                            if (opt.value !== ticket.priority) {
                              await updateTicketField({ priority: opt.value as Ticket['priority'] });
                            }
                            setIsEditingPriority(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${ticket.priority === opt.value ? 'bg-blue-50/50 dark:bg-blue-900/40 font-semibold' : ''}`}
                        >
                          {opt.icon}
                          <span className={`font-medium ${opt.color}`}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Kategoria */}
              <div className="grid grid-cols-[160px_1fr] items-start">
                <span className="text-sm text-gray-500 font-medium">Kategoria</span>
                <div className="relative" ref={categoryDropdownRef}>
                  <div
                    className={`flex items-center gap-2 text-sm text-gray-900 ${isTechnicianOrAdmin ? 'cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded transition-colors' : ''}`}
                    onClick={() => isTechnicianOrAdmin && setIsEditingCategory(!isEditingCategory)}
                    title={isTechnicianOrAdmin ? 'Kliknij, aby zmienić kategorię' : ''}
                  >
                    <span className="w-5 flex justify-center text-gray-500">
                      {getCategoryIcon(ticket.category_name || '')}
                    </span>
                    {ticket.category_name}
                  </div>
                  {isEditingCategory && isTechnicianOrAdmin && (
                    <div className="absolute z-50 left-0 -ml-1 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] w-[calc(100%+8px)] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onMouseDown={async (e) => {
                            e.preventDefault();
                            if (cat.id !== ticket.category) {
                              await updateTicketField({ category: cat.id } as any);
                            }
                            setIsEditingCategory(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${ticket.category === cat.id ? 'bg-blue-50/50 dark:bg-blue-900/40 font-semibold' : ''}`}
                        >
                          <span className="w-4 flex justify-center text-gray-500">{getCategoryIcon(cat.name)}</span>
                          <span className="font-medium text-gray-700">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Osoba przypisana */}
              <div className="grid grid-cols-[160px_1fr] items-start mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500 font-medium pt-0.5">Osoba przypisana</span>
                <div className="space-y-1 relative" ref={technicianDropdownRef}>
                  <div
                    className={`flex items-center gap-2 text-sm text-gray-900 ${isTechnicianOrAdmin ? 'cursor-pointer hover:bg-gray-50 p-1 -ml-1 rounded transition-colors' : ''}`}
                    onClick={() => isTechnicianOrAdmin && setIsEditingTechnician(!isEditingTechnician)}
                    title={isTechnicianOrAdmin ? "Kliknij, aby przypisać zgłoszenie" : ""}
                  >
                    {ticket.technician_details ? (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white overflow-hidden">
                        {ticket.technician_details.avatar ? (
                          <img src={ticket.technician_details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold uppercase">{ticket.technician_details.first_name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                    {ticket.technician_details ? (
                      `${ticket.technician_details.first_name} ${ticket.technician_details.last_name}`
                    ) : (
                      <span className="italic text-gray-500">Nie przypisano</span>
                    )}
                  </div>
                  {isEditingTechnician && isTechnicianOrAdmin && (
                    <div className="absolute z-50 left-0 -ml-1 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] w-[calc(100%+8px)] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onMouseDown={async (e) => {
                          e.preventDefault();
                          if (ticket.technician !== null) {
                            await updateTicketField({ technician: null });
                          }
                          setIsEditingTechnician(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${ticket.technician === null ? 'bg-blue-50/50 dark:bg-blue-900/40 font-semibold' : ''}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center flex-shrink-0">
                          <UserMinus className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-200 italic">Brak (nie przypisano)</span>
                      </button>
                      {availableTechnicians.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={async (e) => {
                            e.preventDefault();
                            if (t.id !== ticket.technician) {
                              await updateTicketField({ technician: t.id });
                            }
                            setIsEditingTechnician(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${ticket.technician === t.id ? 'bg-blue-50/50 dark:bg-blue-900/40 font-semibold' : ''}`}
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {t.avatar ? (
                              <img src={t.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold uppercase">{t.first_name?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{t.first_name} {t.last_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {isTechnicianOrAdmin && !ticket.technician_details && !isEditingTechnician && (
                    <button
                      onClick={() => {
                        if (authContext?.user?.id) {
                          updateTicketField({ technician: authContext.user.id });
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline block pl-7"
                    >
                      Przypisz do mnie
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[160px_1fr] items-start mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500 font-medium">Utworzono</span>
                <div className="relative group/tooltip inline-block w-fit">
                  <div className="text-sm text-gray-900 cursor-pointer">
                    {dayjs().diff(dayjs(ticket.created_at), 'day') > 7
                      ? dayjs(ticket.created_at).format('D MMMM YYYY HH:mm')
                      : dayjs(ticket.created_at).fromNow()}
                  </div>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-200 z-50 px-2.5 py-1.5 bg-gray-800 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-md whitespace-nowrap">
                    {dayjs().diff(dayjs(ticket.created_at), 'day') > 7
                      ? dayjs(ticket.created_at).fromNow()
                      : dayjs(ticket.created_at).format('D MMMM YYYY HH:mm')}
                    {/* Mały trójkącik (strzałka) na dole dymku */}
                    <div className="absolute top-full -mt-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 dark:bg-gray-700 rotate-45"></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[160px_1fr] items-start mt-4">
                <span className="text-sm text-gray-500 font-medium">Zaktualizowano</span>
                <div className="relative group/tooltip inline-block w-fit">
                  <div className="text-sm text-gray-900 cursor-pointer">
                    {dayjs().diff(dayjs(ticket.updated_at), 'day') > 7
                      ? dayjs(ticket.updated_at).format('D MMMM YYYY HH:mm')
                      : dayjs(ticket.updated_at).fromNow()}
                  </div>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-200 z-50 px-2.5 py-1.5 bg-gray-800 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-md whitespace-nowrap">
                    {dayjs().diff(dayjs(ticket.updated_at), 'day') > 7
                      ? dayjs(ticket.updated_at).fromNow()
                      : dayjs(ticket.updated_at).format('D MMMM YYYY HH:mm')}
                    {/* Mały trójkącik (strzałka) na dole dymku */}
                    <div className="absolute top-full -mt-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 dark:bg-gray-700 rotate-45"></div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Modal Zmiany Statusu */}
      {transitionModalConfig.isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={() => {
            if (!isSubmittingTransition) {
              setTransitionModalConfig({ isOpen: false, targetStatus: null });
              setIsTransitionSuccess(false);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {transitionModalConfig.targetStatus === 'W_TOKU' ? 'W toku' :
                  transitionModalConfig.targetStatus === 'NOWE' ? 'Nowe' :
                    transitionModalConfig.targetStatus === 'ROZWIAZANE' ? 'Rozwiązane' :
                      transitionModalConfig.targetStatus === 'ZAMKNIETE' ? 'Zamknięte' : transitionModalConfig.targetStatus}
              </h2>
              <button
                onClick={() => { setTransitionModalConfig({ isOpen: false, targetStatus: null }); setIsTransitionSuccess(false); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Sekcja: Osoba przypisana */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Osoba przypisana</label>
                <div className="relative w-full md:w-1/2" ref={transitionAssigneeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTransitionAssigneeDropdownOpen(!isTransitionAssigneeDropdownOpen)}
                    className="w-full text-left bg-white dark:bg-gray-800 border border-blue-500 rounded-md py-2 pl-10 pr-8 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {(() => {
                        if (!transitionAssignee) return <span>Nie przypisano</span>;
                        const t = availableTechnicians.find(tech => tech.id === transitionAssignee);
                        if (!t) return <span>Nie przypisano</span>;
                        return (
                          <>
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {t.avatar ? (
                                <img src={t.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold uppercase">{t.first_name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            <span className="truncate">{t.first_name} {t.last_name}</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isTransitionAssigneeDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isTransitionAssigneeDropdownOpen && (
                    <div className="absolute z-50 left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] py-1 w-full max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTransitionAssignee(null);
                          setIsTransitionAssigneeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${transitionAssignee === null ? 'bg-blue-50/50 dark:bg-blue-900/40 font-semibold' : ''}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center flex-shrink-0">
                          <UserMinus className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-200 italic">Nie przypisano</span>
                      </button>
                      {availableTechnicians.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTransitionAssignee(t.id);
                            setIsTransitionAssigneeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${transitionAssignee === t.id ? 'bg-blue-50/50 dark:bg-blue-900/40 font-semibold' : ''}`}
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {t.avatar ? (
                              <img src={t.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold uppercase">{t.first_name?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{t.first_name} {t.last_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {authContext?.user && transitionAssignee !== authContext.user.id && (
                  <button
                    onClick={() => setTransitionAssignee(authContext.user!.id)}
                    className="text-blue-600 hover:underline text-sm font-medium mt-1.5 inline-block"
                  >
                    Przypisz do mnie
                  </button>
                )}
              </div>

              {/* Sekcja: Komentarz */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Komentarz</label>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setTransitionCommentType('reply')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${transitionCommentType === 'reply' ? 'border-gray-800 text-gray-900 bg-white' : 'border-transparent text-gray-500 bg-gray-50/50 hover:bg-gray-50'}`}
                  >
                    Odpowiedz klientowi
                  </button>
                  <button
                    onClick={() => setTransitionCommentType('internal')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${transitionCommentType === 'internal' ? 'border-gray-800 text-gray-900 bg-white' : 'border-transparent text-gray-500 bg-gray-50/50 hover:bg-gray-50'}`}
                  >
                    Dodaj komentarz wewnętrzny
                  </button>
                </div>

                <div className="mt-4">
                  {transitionCommentType === 'internal' && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md mb-2">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-medium">Twoje komentarze nie będą widoczne dla klientów w portalu.</span>
                    </div>
                  )}

                  <div className={`border rounded-md bg-white overflow-hidden transition-colors ${transitionCommentType === 'internal' ? 'border-amber-200 shadow-sm shadow-amber-50' : 'border-gray-200'}`}>
                    <MarkdownEditor
                      value={transitionCommentText}
                      onChange={setTransitionCommentText}
                      placeholder={transitionCommentType === 'internal' ? "Dodaj notatkę wewnętrzną..." : "Odpowiedz klientowi..."}
                      className={transitionCommentType === 'internal' ? 'bg-amber-50/10' : ''}
                      minHeight="120px"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => { setTransitionModalConfig({ isOpen: false, targetStatus: null }); setIsTransitionSuccess(false); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isSubmittingTransition || isTransitionSuccess}
              >
                Anuluj
              </button>
              <button
                onClick={handleSubmitTransition}
                disabled={isSubmittingTransition || isTransitionSuccess}
                className={`px-5 py-2 text-white text-sm font-bold rounded-md shadow-sm transition-all disabled:opacity-70 flex items-center gap-2 ${isTransitionSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isSubmittingTransition && !isTransitionSuccess && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isTransitionSuccess && <Check className="w-4 h-4" />}

                {isTransitionSuccess ? 'Sukces' : (
                  transitionModalConfig.targetStatus === 'W_TOKU' ? 'W toku' :
                    transitionModalConfig.targetStatus === 'NOWE' ? 'Nowe' :
                      transitionModalConfig.targetStatus === 'ROZWIAZANE' ? 'Rozwiązane' :
                        transitionModalConfig.targetStatus === 'ZAMKNIETE' ? 'Zamknięte' : transitionModalConfig.targetStatus
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for full-size image viewing */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative w-[98vw] h-[98vh] flex items-center justify-center animate-in zoom-in-95 duration-200">
            <img
              src={lightboxUrl}
              alt="Podgląd załącznika"
              className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-black/60 hover:bg-black/80 shadow-md backdrop-blur-md rounded-lg transition-all text-white border border-white/10"
                title="Otwórz w nowej karcie"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <a
                href={lightboxUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-black/60 hover:bg-black/80 shadow-md backdrop-blur-md rounded-lg transition-all text-white border border-white/10"
                title="Pobierz"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setLightboxUrl(null)}
                className="p-2 bg-black/60 hover:bg-black/80 shadow-md backdrop-blur-md rounded-lg transition-all text-white border border-white/10"
                title="Zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Attachment Modal */}
      {attachmentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => !isDeletingAttachment && setAttachmentToDelete(null)}
        >
          <div
            className="bg-[#2A2B2D] border border-gray-700 rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-red-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L22 19H2L12 2ZM11 15V17H13V15H11ZM11 10V14H13V10H11Z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Czy usunąć ten załącznik?</h3>
                </div>
                <button
                  onClick={() => setAttachmentToDelete(null)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors bg-[#3A3B3D] hover:bg-[#4A4B4D] border border-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-4 text-[15px] text-gray-300">
                Po usunięciu nie będzie można go przywrócić.
              </p>
            </div>
            <div className="p-4 flex justify-end gap-3 items-center">
              <button
                onClick={confirmDeleteAttachment}
                disabled={isDeletingAttachment}
                className="px-4 py-1.5 bg-[#FF7369] hover:bg-[#FF6359] text-[#2A2B2D] font-medium rounded-sm transition-colors flex items-center disabled:opacity-50 min-w-[60px] justify-center"
              >
                {isDeletingAttachment ? <div className="w-4 h-4 border-2 border-[#2A2B2D] border-t-transparent rounded-full animate-spin"></div> : 'OK'}
              </button>
              <button
                onClick={() => setAttachmentToDelete(null)}
                disabled={isDeletingAttachment}
                className="px-4 py-1.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-sm transition-colors font-medium cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Modal: Potwierdzenie usunięcia zgłoszenia ========== */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={() => !isDeletingTicket && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Usunąć zgłoszenie?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Czy na pewno chcesz usunąć zgłoszenie <span className="font-semibold text-gray-700">#{ticket.id}</span>?
              <br />Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDeleteTicket}
                disabled={isDeletingTicket}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center"
              >
                {isDeletingTicket && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-8 zoom-in-95 duration-500 ease-out">
          <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-gray-700 px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold">Link do zgłoszenia został skopiowany</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailsPage;
