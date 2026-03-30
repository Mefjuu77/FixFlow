import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '../api/ticketService';
import { Ticket } from '../types';
import { AuthContext } from '../context/AuthContext';
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
  ArrowDown
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

  const handleStatusChange = async (newStatus: Ticket['status']) => {
    if (!ticket) return;
    try {
      const updated = await ticketService.updateTicket(ticket.id, { status: newStatus });
      setTicket(updated);
    } catch (err) {
      alert('Błąd podczas zmiany statusu.');
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
                      onClick={() => { handleStatusChange('NOWE'); setIsStatusMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      Nowe
                    </button>
                    <button
                      onClick={() => { handleStatusChange('W_TOKU'); setIsStatusMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      W toku
                    </button>
                    <button
                      onClick={() => { handleStatusChange('ROZWIAZANE'); setIsStatusMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-sm font-medium"
                    >
                      Rozwiązane
                    </button>
                    <button
                      onClick={() => { handleStatusChange('ZAMKNIETE'); setIsStatusMenuOpen(false); }}
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
    </div>
  );
};

export default TicketDetailsPage;
