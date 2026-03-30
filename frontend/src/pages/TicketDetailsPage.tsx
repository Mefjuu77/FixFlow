import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '../api/ticketService';
import { Ticket } from '../types';
import { AuthContext } from '../context/AuthContext';
import {
  ArrowLeft,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Calendar,
  Wrench
} from 'lucide-react';
import dayjs from 'dayjs';

const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

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
            <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border uppercase tracking-wider ${statusColors[ticket.status]}`}>
              {ticket.status === 'W_TOKU' ? 'W toku' : 
               ticket.status === 'NOWE' ? 'Nowe' :
               ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' :
               ticket.status === 'ZAMKNIETE' ? 'Zamknięte' : ticket.status}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">{ticket.title}</h1>

          <div className="bg-white rounded-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100 bg-white rounded-t-sm">
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
                <div className="border border-gray-300 rounded-sm hover:border-gray-400 transition-colors p-3 bg-white cursor-text text-gray-500 text-sm">
                  <span className="text-blue-600 font-medium">Dodaj notatkę wewnętrzną</span> <span className="mx-1">/</span> <span className="text-blue-600 font-medium">Odpowiedź klientowi</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <span className="font-semibold">Fachowa porada:</span> naciśnij <kbd className="px-1 py-0.5 border border-gray-200 rounded-sm bg-gray-50 text-[10px] items-center font-mono font-bold mx-1 text-gray-700">M</kbd>, aby skomentować
                </p>
              </div>
            </div>
          </div>

          {/* Panel Akcji dla Technika */}
          {isTechnicianOrAdmin && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center">
                <Wrench className="w-4 h-4 mr-2 text-blue-600" /> Zarządzanie zgłoszeniem
              </h3>
              <div className="flex flex-wrap gap-4">
                {ticket.status === 'NOWE' && (
                  <button
                    onClick={() => handleStatusChange('W_TOKU')}
                    className="flex items-center px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" /> Rozpocznij pracę
                  </button>
                )}
                {(ticket.status === 'W_TOKU' || ticket.status === 'NOWE') && (
                  <button
                    onClick={() => handleStatusChange('ROZWIAZANE')}
                    className="flex items-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Oznacz jako rozwiązane
                  </button>
                )}
                {ticket.status !== 'ZAMKNIETE' && (
                  <button
                    onClick={() => handleStatusChange('ZAMKNIETE')}
                    className="flex items-center px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
                  >
                    <XCircle className="w-5 h-5 mr-2" /> Zamknij zgłoszenie
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prawa kolumna: Metadane */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-4">Informacje</h3>

            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-3 text-gray-400" />
                <span className="font-medium mr-2 text-gray-400">Zgłaszający:</span>
                <span className="font-bold text-gray-900">{ticket.creator_details?.first_name} {ticket.creator_details?.last_name}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Tag className="w-4 h-4 mr-3 text-gray-400" />
                <span className="font-medium mr-2 text-gray-400">Kategoria:</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">{ticket.category_name}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <AlertCircle className="w-4 h-4 mr-3 text-gray-400" />
                <span className="font-medium mr-2 text-gray-400">Priorytet:</span>
                <span className={`font-bold ${ticket.priority === 'WYSOKI' ? 'text-red-600' : 'text-gray-900'}`}>{ticket.priority}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                <span className="font-medium mr-2 text-gray-400">Utworzono:</span>
                <span className="text-gray-900 font-medium">{dayjs(ticket.created_at).format('DD.MM.YYYY HH:mm')}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-3 text-gray-400" />
                <span className="font-medium mr-2 text-gray-400">Ostatnia zmiana:</span>
                <span className="text-gray-900 font-medium">{dayjs(ticket.updated_at).fromNow()}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TicketDetailsPage;
