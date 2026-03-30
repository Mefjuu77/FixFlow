import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '../api/ticketService';
import { Ticket } from '../types';
import { AuthContext } from '../context/AuthContext';
import useTitle from '../hooks/useTitle';
import {
  ArrowLeft,
  User,
  ChevronDown,
  Monitor,
  Terminal,
  Wifi,
  Lock,
  HelpCircle,
  AlertTriangle,
  Minus,
  ArrowDown,
  X,
  Bold,
  Italic,
  Underline,
  Type,
  Link as LinkIcon,
  List,
  ListOrdered,
  Smile,
  Plus
} from 'lucide-react';

const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [transitionModalConfig, setTransitionModalConfig] = useState<{ isOpen: boolean; targetStatus: Ticket['status'] | null }>({ isOpen: false, targetStatus: null });
  const [transitionAssignee, setTransitionAssignee] = useState<number | null>(null);
  const [transitionCommentType, setTransitionCommentType] = useState<'reply' | 'internal'>('reply');
  const [transitionCommentText, setTransitionCommentText] = useState('');
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

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
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const data = await ticketService.getTicket(id!);
      setTicket(data);
    } catch (err) {
      setError('Nie udało się pobrać szczegółów zgłoszenia.');
    } finally {
      setLoading(false);
    }
  };

  const openTransitionModal = (newStatus: Ticket['status']) => {
    setTransitionModalConfig({ isOpen: true, targetStatus: newStatus });
    setTransitionAssignee(ticket?.technician || null);
    setTransitionCommentType('reply');
    setTransitionCommentText('');
    setIsStatusMenuOpen(false);
  };

  const handleSubmitTransition = async () => {
    if (!ticket || !transitionModalConfig.targetStatus) return;
    setIsSubmittingTransition(true);
    try {
      const updates: Partial<Ticket> = { status: transitionModalConfig.targetStatus };
      if (transitionAssignee !== null) {
        updates.technician = transitionAssignee;
      }
      const updated = await ticketService.updateTicket(ticket.id, updates);
      setTicket(updated);
      setTransitionModalConfig({ isOpen: false, targetStatus: null });
    } catch (err) {
      alert('Błąd podczas aktualizacji zgłoszenia.');
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  if (error || !ticket) return <div className="p-4 bg-red-50 text-red-700 rounded-xl m-6">{error || 'Zgłoszenie nie istnieje.'}</div>;

  const statusColors = {
    NOWE: 'bg-blue-100 text-blue-700 border-blue-200',
    W_TOKU: 'bg-amber-100 text-amber-700 border-amber-200',
    ROZWIAZANE: 'bg-green-100 text-green-700 border-green-200',
    ZAMKNIETE: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const isTechnicianOrAdmin = authContext?.user?.role === 'TECHNICIAN' || authContext?.user?.role === 'ADMIN';

  const getCategoryIcon = (name: string) => {
    if (!name) return <HelpCircle className="w-3.5 h-3.5" />;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('sprzęt')) return <Monitor className="w-3.5 h-3.5" />;
    if (lowerName.includes('oprogramowanie')) return <Terminal className="w-3.5 h-3.5" />;
    if (lowerName.includes('sieć')) return <Wifi className="w-3.5 h-3.5" />;
    if (lowerName.includes('dostęp')) return <Lock className="w-3.5 h-3.5" />;
    return <HelpCircle className="w-3.5 h-3.5" />;
  };

  return (
    <div className="w-full pb-12 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-blue-600 font-semibold mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Wstecz
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Lewa kolumna: Treść zgłoszenia */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-gray-500 hover:text-blue-600 hover:underline cursor-pointer transition-colors">Zgłoszenie #{ticket.id}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${statusColors[ticket.status]}`}>
              {ticket.status === 'W_TOKU' ? 'W toku' : 
               ticket.status === 'NOWE' ? 'Nowe' :
               ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' :
               ticket.status === 'ZAMKNIETE' ? 'Zamknięte' : ticket.status}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">{ticket.title}</h1>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <p className="text-sm text-gray-800">
                  <span className="font-semibold">{ticket.creator_details?.first_name || 'Użytkownik'}</span> przesłał(a) zgłoszenie
                </p>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Opis</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Activity Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktywność</h3>
            
            <div className="flex border-b border-gray-200 mb-4 custom-scrollbar overflow-x-auto">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">Logi</button>
              <button className="px-4 py-2 text-sm text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium whitespace-nowrap">Komentarze</button>
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">Historia</button>
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">Rejestr prac</button>
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">Zatwierdzenia</button>
            </div>

            <div className="flex gap-4 items-start mt-6">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs uppercase">
                {authContext?.user?.first_name ? authContext.user.first_name.charAt(0) : 'U'}
              </div>
              <div className="flex-1">
                <div className="border border-gray-300 rounded-xl hover:border-gray-400 transition-colors p-3 bg-white cursor-text text-gray-500 text-sm shadow-sm">
                  <span className="text-blue-600 font-medium">Dodaj notatkę wewnętrzną</span> <span className="mx-1">/</span> <span className="text-blue-600 font-medium">Odpowiedź klientowi</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Prawa kolumna: Metadane i Status */}
        <div className="space-y-4">
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
                  <div className="absolute left-0 z-50 w-48 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => openTransitionModal('NOWE')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      Nowe
                    </button>
                    <button
                      onClick={() => openTransitionModal('W_TOKU')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      W toku
                    </button>
                    <button
                      onClick={() => openTransitionModal('ROZWIAZANE')}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      Rozwiązane
                    </button>
                    <button
                      onClick={() => openTransitionModal('ZAMKNIETE')}
                      className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors text-sm font-medium"
                    >
                      Zamknięte
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Akordeon: Szczegóły */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
               <ChevronDown className="w-4 h-4 text-gray-500" />
               <h3 className="font-semibold text-gray-800 text-sm">Szczegóły</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Row 1: Osoba zgłaszająca */}
              <div className="grid grid-cols-[130px_1fr] items-start">
                <span className="text-sm text-gray-500 font-medium pt-0.5">Osoba zgłaszająca</span>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500">
                    <User className="w-3 h-3" />
                  </div>
                  {ticket.creator_details?.first_name} {ticket.creator_details?.last_name}
                </div>
              </div>

              {/* Row 2: Priorytet */}
              <div className="grid grid-cols-[130px_1fr] items-start">
                <span className="text-sm text-gray-500 font-medium pt-0.5">Priorytet</span>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  {ticket.priority === 'WYSOKI' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> : 
                   ticket.priority === 'NORMALNY' ? <Minus className="w-3.5 h-3.5 text-blue-500" /> : 
                   <ArrowDown className="w-3.5 h-3.5 text-gray-400" />}
                  <span className={`font-medium ${ticket.priority === 'WYSOKI' ? 'text-red-600' : ticket.priority === 'NORMALNY' ? 'text-blue-600' : 'text-gray-600'}`}>
                    {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Row 3: Kategoria */}
              <div className="grid grid-cols-[130px_1fr] items-start">
                <span className="text-sm text-gray-500 font-medium">Kategoria</span>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <span className="w-5 flex justify-center text-gray-500">
                    {getCategoryIcon(ticket.category_name || '')}
                  </span>
                  {ticket.category_name}
                </div>
              </div>

              {/* Row 4: Osoba przypisana */}
              <div className="grid grid-cols-[130px_1fr] items-start mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500 font-medium pt-0.5">Osoba przypisana</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500">
                      <User className="w-3 h-3" />
                    </div>
                    {ticket.technician_details ? (
                      `${ticket.technician_details.first_name} ${ticket.technician_details.last_name}`
                    ) : (
                      'Nie przypisano'
                    )}
                  </div>
                  {isTechnicianOrAdmin && !ticket.technician_details && (
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline block pl-7">
                      Przypisz do mnie
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Modal Zmiany Statusu */}
      {transitionModalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {transitionModalConfig.targetStatus === 'W_TOKU' ? 'W toku' : 
                 transitionModalConfig.targetStatus === 'NOWE' ? 'Nowe' :
                 transitionModalConfig.targetStatus === 'ROZWIAZANE' ? 'Rozwiązane' :
                 transitionModalConfig.targetStatus === 'ZAMKNIETE' ? 'Zamknięte' : transitionModalConfig.targetStatus}
              </h2>
              <button 
                onClick={() => setTransitionModalConfig({ isOpen: false, targetStatus: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Sekcja: Osoba przypisana */}
              <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Osoba przypisana</label>
                 <div className="relative">
                   <select 
                     value={transitionAssignee || ''} 
                     onChange={(e) => setTransitionAssignee(e.target.value ? Number(e.target.value) : null)}
                     className="w-full md:w-1/2 appearance-none bg-white border border-blue-500 rounded-md py-2 pl-10 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium"
                   >
                     <option value="">Nie przypisano</option>
                     {authContext?.user && (
                       <option value={authContext.user.id}>{authContext.user.first_name} {authContext.user.last_name}</option>
                     )}
                   </select>
                   <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                     <User className="w-4 h-4" />
                   </div>
                   <div className="absolute inset-y-0 right-0 md:right-1/2 flex items-center pr-2 pointer-events-none text-gray-500">
                     <ChevronDown className="w-4 h-4" />
                   </div>
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
                    Odpowiedź klientowi
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
                  
                  {/* Edytor tekstowy - Atrappa */}
                  <div className={`border rounded-md bg-white overflow-hidden transition-colors ${transitionCommentType === 'internal' ? 'border-amber-200 shadow-sm shadow-amber-50' : 'border-gray-200'}`}>
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 p-1 border-b border-gray-200 bg-gray-50/50 text-gray-500">
                      <button className="p-1.5 hover:bg-gray-200 rounded text-sm flex items-center gap-1 font-medium">Styl <ChevronDown className="w-3 h-3"/></button>
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      <button className="p-1.5 hover:bg-gray-200 rounded"><Bold className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-gray-200 rounded"><Italic className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-gray-200 rounded"><Underline className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-gray-200 rounded flex items-center"><Type className="w-4 h-4 text-gray-700"/><ChevronDown className="w-3 h-3 ml-0.5"/></button>
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      <button className="p-1.5 hover:bg-gray-200 rounded flex items-center"><LinkIcon className="w-4 h-4"/><ChevronDown className="w-3 h-3 ml-0.5"/></button>
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      <button className="p-1.5 hover:bg-gray-200 rounded"><List className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-gray-200 rounded"><ListOrdered className="w-4 h-4" /></button>
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      <button className="p-1.5 hover:bg-gray-200 rounded flex items-center"><Smile className="w-4 h-4"/><ChevronDown className="w-3 h-3 ml-0.5"/></button>
                      <button className="p-1.5 hover:bg-gray-200 rounded flex items-center"><Plus className="w-4 h-4"/><ChevronDown className="w-3 h-3 ml-0.5"/></button>
                    </div>
                    <textarea 
                      value={transitionCommentText}
                      onChange={(e) => setTransitionCommentText(e.target.value)}
                      className={`w-full p-3 min-h-[120px] focus:outline-none resize-y text-sm ${transitionCommentType === 'internal' ? 'bg-amber-50/10' : ''}`}
                      placeholder={transitionCommentType === 'internal' ? "Dodaj notatkę wewnętrzną..." : "Odpowiedz klientowi..."}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setTransitionModalConfig({ isOpen: false, targetStatus: null })}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isSubmittingTransition}
              >
                Anuluj
              </button>
              <button 
                onClick={handleSubmitTransition}
                disabled={isSubmittingTransition}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-md shadow-sm transition-all disabled:opacity-70 flex items-center"
              >
                {transitionModalConfig.targetStatus === 'W_TOKU' ? 'W toku' : 
                 transitionModalConfig.targetStatus === 'NOWE' ? 'Nowe' :
                 transitionModalConfig.targetStatus === 'ROZWIAZANE' ? 'Rozwiązane' :
                 transitionModalConfig.targetStatus === 'ZAMKNIETE' ? 'Zamknięte' : transitionModalConfig.targetStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailsPage;
