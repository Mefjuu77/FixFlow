import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { Ticket as TicketType } from '../types';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Ticket as TicketIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import useTitle from '../hooks/useTitle';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pl';

// Konfiguracja dayjs do obsługi czasu relatywnego po polsku
dayjs.extend(relativeTime);
dayjs.locale('pl');

const DashboardPage: React.FC = () => {
  useTitle('Panel główny');
  const authContext = useContext(AuthContext);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('tickets/');
        setTickets(response.data);
      } catch (error) {
        console.error("Błąd pobierania statystyk:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const isEmployee = authContext?.user?.role === 'EMPLOYEE';

  const stats = [
    {
      label: isEmployee ? 'Moje zgłoszenia' : 'Wszystkie zgłoszenia',
      value: tickets.length,
      icon: <ClipboardList className="text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    },
    ...(isEmployee 
      ? [
          {
            label: 'Nowe',
            value: tickets.filter(t => t.status === 'NOWE').length,
            icon: <AlertCircle className="text-amber-600" />,
            bg: 'bg-amber-50',
            border: 'border-amber-100'
          },
          {
            label: 'W toku',
            value: tickets.filter(t => t.status === 'W_TOKU').length,
            icon: <Clock className="text-indigo-600" />,
            bg: 'bg-indigo-50',
            border: 'border-indigo-100'
          },
          {
            label: 'Rozwiązane',
            value: tickets.filter(t => t.status === 'ROZWIAZANE' || t.status === 'ZAMKNIETE').length,
            icon: <CheckCircle2 className="text-green-600" />,
            bg: 'bg-green-50',
            border: 'border-green-100'
          }
        ]
      : [
          {
            label: 'Przypisane do mnie',
            value: tickets.filter(t => t.technician === authContext?.user?.id).length,
            icon: <ClipboardList className="text-amber-600" />,
            bg: 'bg-amber-50',
            border: 'border-amber-100'
          },
          {
            label: 'Nieprzypisane (Nowe)',
            value: tickets.filter(t => t.technician === null).length,
            icon: <AlertCircle className="text-indigo-600" />,
            bg: 'bg-indigo-50',
            border: 'border-indigo-100'
          },
          {
            label: 'Rozwiązane',
            value: tickets.filter(t => t.status === 'ROZWIAZANE' || t.status === 'ZAMKNIETE').length,
            icon: <CheckCircle2 className="text-green-600" />,
            bg: 'bg-green-50',
            border: 'border-green-100'
          }
        ])
  ];

  // Pobranie 5 najnowszych aktywności (posortowane po dacie utworzenia/aktualizacji)
  const recentActivity = [...tickets]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isEmployee) {
    const activeTickets = tickets.filter(t => ['NOWE', 'W_TOKU'].includes(t.status));
    const resolvedTickets = tickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    return (
      <div className="w-full space-y-8 animate-in fade-in duration-500">
        {/* Baner CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-blue-900/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
           <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
           <div className="relative z-10 text-center md:text-left">
             <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">Cześć, {authContext?.user?.first_name}! 👋</h1>
             <p className="text-blue-100 text-lg max-w-lg font-medium">Potrzebujesz pomocy IT, wsparcia technicznego lub coś nie działa poprawnie?</p>
           </div>
           <div className="relative z-10">
             <Link
               to="/create-ticket"
               className="px-6 py-3.5 bg-white text-blue-700 font-extrabold rounded-xl shadow-lg hover:bg-gray-50 flex items-center whitespace-nowrap"
             >
               <Plus className="w-5 h-5 mr-2" />
               Utwórz nowe zgłoszenie
             </Link>
           </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Aktywne Zgłoszenia */}
          <div className="xl:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 text-blue-600 mr-2" /> Twoje aktywne zgłoszenia
            </h2>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
               {activeTickets.length === 0 ? (
                 <div className="p-12 pl-10 text-center flex flex-col items-center">
                   <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600">
                     <CheckCircle2 className="w-8 h-8" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900">Brak otwartych spraw</h3>
                   <p className="text-sm text-gray-500 mt-1 max-w-sm">Wygląda na to, że wszystko działa bez zarzutu. Jeśli pojawią się problemy, użyj przycisku u góry.</p>
                 </div>
               ) : (
                 <div className="divide-y divide-gray-50">
                    {activeTickets.map(ticket => (
                      <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="p-6 flex items-start hover:bg-gray-50 transition-colors block group cursor-pointer">
                         <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                           <TicketIcon className="w-5 h-5 text-blue-600" />
                         </div>
                         <div className="ml-4 flex-1">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
                             <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.title}</h3>
                             <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase whitespace-nowrap self-start sm:self-auto ${ticket.status === 'W_TOKU' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                               {ticket.status === 'W_TOKU' ? 'W TOKU' : 'NOWE'}
                             </span>
                           </div>
                           <p className="text-sm text-gray-500 line-clamp-2 max-w-2xl">{ticket.description}</p>
                           <div className="flex items-center text-xs font-medium text-gray-400 mt-3">
                             Aktualizacja: {dayjs(ticket.updated_at).fromNow()}
                           </div>
                         </div>
                      </Link>
                    ))}
                 </div>
               )}
            </div>
          </div>
          
          {/* Ostatnio Rozwiązane */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-gray-900 flex items-center">
                 <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" /> Ostatnio zamknięte
               </h2>
               <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                 Wszystkie
               </Link>
             </div>
             
             <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
               {resolvedTickets.length === 0 ? (
                 <p className="text-sm text-gray-500 italic text-center py-6">Brak w historii.</p>
               ) : (
                 resolvedTickets.slice(0, 5).map(ticket => (
                   <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="block p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm transition-all group">
                     <p className="text-sm font-semibold text-gray-800 truncate mb-1 group-hover:text-blue-700 transition-colors">{ticket.title}</p>
                     <div className="flex items-center justify-between">
                       <p className="text-[11px] text-green-600 font-bold uppercase tracking-wider">{ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' : 'Zamknięte'}</p>
                       <p className="text-[10px] text-gray-400">{dayjs(ticket.updated_at).format('DD.MM.YYYY')}</p>
                     </div>
                   </Link>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Powitanie */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Witaj, {authContext?.user?.first_name}! 👋
          </h1>
          <p className="mt-1 text-gray-500">
            Przegląd wszystkich zgłoszeń:
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/tickets"
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
          >
            Lista zgłoszeń
          </Link>
          <Link
            to="/create-ticket"
            className="inline-flex items-center px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Nowe zgłoszenie
          </Link>
        </div>
      </div>

      {/* Siatka Statystyk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-6 bg-white border ${stat.border} rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-default`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bg} rounded-xl`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Dolny panel (Aktywność) */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Ostatnia aktywność</h3>
          <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center">
            Zobacz wszystko <ArrowUpRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm italic">
              Brak zarejestrowanych aktywności.
            </div>
          ) : (
            recentActivity.map((ticket) => (
              <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="p-6 flex items-start hover:bg-gray-50 transition-colors block cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <TicketIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Zgłoszenie #{ticket.id}: {ticket.title}</p>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase ${ticket.status === 'NOWE' ? 'bg-blue-50 text-blue-700' :
                      ticket.status === 'W_TOKU' ? 'bg-amber-50 text-amber-700' :
                        'bg-green-50 text-green-700'
                      }`}>
                      {ticket.status === 'W_TOKU' ? 'W TOKU' : 
                       ticket.status === 'NOWE' ? 'NOWE' :
                       ticket.status === 'ROZWIAZANE' ? 'ROZWIĄZANE' :
                       ticket.status === 'ZAMKNIETE' ? 'ZAMKNIĘTE' : ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-2xl">{ticket.description}</p>
                  <div className="flex items-center mt-2 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {dayjs(ticket.updated_at).fromNow()}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
