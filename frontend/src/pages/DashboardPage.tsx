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
  Ticket as TicketIcon,
  Users,
  AlertTriangle,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import useTitle from '../hooks/useTitle';
import relativeTime from 'dayjs/plugin/relativeTime';

// Plugin do obsługi czasu relatywnego (np. "2 godziny temu")
dayjs.extend(relativeTime);

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

  const role = authContext?.user?.role;
  const isEmployee = role === 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';


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

  // ==================== DASHBOARD ADMINA ====================
  if (isAdmin) {
    const unassignedTickets = tickets.filter(t => t.technician === null && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
    const updatedToday = tickets.filter(t => dayjs(t.updated_at).isAfter(dayjs().startOf('day')));
    const completedTickets = tickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    // Zgłoszenia wymagające uwagi: nieprzypisane LUB wysoki priorytet, posortowane od najstarszego
    const needsAttention = tickets
      .filter(t => (t.technician === null || t.priority === 'WYSOKI') && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 6);

    const adminStats = [
      {
        label: 'Wszystkie zgłoszenia',
        value: tickets.length.toString(),
        icon: <ClipboardList className="text-blue-600" />,
        bg: 'bg-blue-50',
        border: 'border-blue-200'
      },
      {
        label: 'Zaaktualizowane',
        value: updatedToday.length.toString(),
        icon: <Clock className="text-amber-600" />,
        bg: 'bg-amber-50',
        border: 'border-amber-200'
      },
      {
        label: 'Nieprzypisane',
        value: unassignedTickets.length.toString(),
        icon: <Users className="text-red-600" />,
        bg: 'bg-red-50',
        border: 'border-red-200'
      },
      {
        label: 'Ukończone',
        value: completedTickets.length.toString(),
        icon: <CheckCircle2 className="text-green-600" />,
        bg: 'bg-green-50',
        border: 'border-green-200'
      },
    ];

    return (
      <div className="w-full space-y-8 animate-in fade-in duration-500">
        {/* Nagłówek Admina */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Witaj, {authContext?.user?.first_name}! 👋
            </h1>
            <p className="mt-1 text-gray-500">
              Przegląd wszystkich zgłoszeń:
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              to="/users"
              className="inline-flex items-center px-4 py-2 bg-violet-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all"
            >
              <Users className="w-4 h-4 mr-2" /> Zarządzaj użytkownikami
            </Link>
            <Link
              to="/tickets"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
            >
              Wszystkie zgłoszenia
            </Link>

          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminStats.map((stat, index) => (
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Wymagające uwagi */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" /> Wymagają uwagi
              </h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                {needsAttention.length} {needsAttention.length === 1 ? 'zgłoszenie' : 'zgłoszeń'}
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {needsAttention.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Wszystko pod kontrolą</h3>
                  <p className="text-sm text-gray-500 mt-1">Brak zgłoszeń wymagających natychmiastowej uwagi.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {needsAttention.map(ticket => (
                    <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="p-5 flex items-start hover:bg-gray-50 transition-colors block group cursor-pointer">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${ticket.priority === 'WYSOKI' ? 'bg-red-50 group-hover:bg-red-100' : 'bg-amber-50 group-hover:bg-amber-100'
                        } transition-colors`}>
                        {ticket.priority === 'WYSOKI'
                          ? <AlertTriangle className="w-5 h-5 text-red-500" />
                          : <TicketIcon className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">#{ticket.id} {ticket.title}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ticket.priority === 'WYSOKI' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-100 text-red-700 uppercase">Wysoki</span>
                            )}
                            {ticket.technician === null && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-600 uppercase">Nieprzypisane</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {ticket.creator_details ? `${ticket.creator_details.first_name} ${ticket.creator_details.last_name}` : 'Nieznany'}
                          </span>
                          <span>Utworzono {dayjs(ticket.created_at).fromNow()}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aktywność globalna */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" /> Aktywność
              </h2>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center">
                Wszystko <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak aktywności.</p>
              ) : (
                recentActivity.map(ticket => (
                  <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="block p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm transition-all group">
                    <p className="text-sm font-semibold text-gray-800 truncate mb-1 group-hover:text-blue-700 transition-colors">#{ticket.id} {ticket.title}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${ticket.status === 'NOWE' ? 'text-blue-600' :
                          ticket.status === 'W_TOKU' ? 'text-amber-600' :
                            'text-green-600'
                        }`}>
                        {ticket.status === 'W_TOKU' ? 'W toku' :
                          ticket.status === 'NOWE' ? 'Nowe' :
                            ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' : 'Zamknięte'}
                      </span>
                      <p className="text-[10px] text-gray-400">{dayjs(ticket.updated_at).fromNow()}</p>
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

  // ==================== DASHBOARD TECHNIKA ====================
  if (isTechnician) {
    const unassignedTickets = tickets.filter(t => t.technician === null && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
    const updatedToday = tickets.filter(t => dayjs(t.updated_at).isAfter(dayjs().startOf('day')));
    const completedTickets = tickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    // Zgłoszenia wymagające uwagi: nieprzypisane LUB wysoki priorytet, posortowane od najstarszego
    const needsAttention = tickets
      .filter(t => (t.technician === null || t.priority === 'WYSOKI') && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 6);

    const techStats = [
      {
        label: 'Wszystkie zgłoszenia',
        value: tickets.length.toString(),
        icon: <ClipboardList className="text-blue-600" />,
        bg: 'bg-blue-50',
        border: 'border-blue-200'
      },
      {
        label: 'Zaaktualizowane',
        value: updatedToday.length.toString(),
        icon: <Clock className="text-amber-600" />,
        bg: 'bg-amber-50',
        border: 'border-amber-200'
      },
      {
        label: 'Nieprzypisane',
        value: unassignedTickets.length.toString(),
        icon: <Users className="text-red-600" />,
        bg: 'bg-red-50',
        border: 'border-red-200'
      },
      {
        label: 'Ukończone',
        value: completedTickets.length.toString(),
        icon: <CheckCircle2 className="text-green-600" />,
        bg: 'bg-green-50',
        border: 'border-green-200'
      },
    ];

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

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {techStats.map((stat, index) => (
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Wymagające uwagi */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" /> Wymagają uwagi
              </h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                {needsAttention.length} {needsAttention.length === 1 ? 'zgłoszenie' : 'zgłoszeń'}
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {needsAttention.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Wszystko pod kontrolą</h3>
                  <p className="text-sm text-gray-500 mt-1">Brak zgłoszeń wymagających natychmiastowej uwagi.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {needsAttention.map(ticket => (
                    <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="p-5 flex items-start hover:bg-gray-50 transition-colors block group cursor-pointer">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${ticket.priority === 'WYSOKI' ? 'bg-red-50 group-hover:bg-red-100' : 'bg-amber-50 group-hover:bg-amber-100'
                        } transition-colors`}>
                        {ticket.priority === 'WYSOKI'
                          ? <AlertTriangle className="w-5 h-5 text-red-500" />
                          : <TicketIcon className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">#{ticket.id} {ticket.title}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ticket.priority === 'WYSOKI' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-100 text-red-700 uppercase">Wysoki</span>
                            )}
                            {ticket.technician === null && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-600 uppercase">Nieprzypisane</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {ticket.creator_details ? `${ticket.creator_details.first_name} ${ticket.creator_details.last_name}` : 'Nieznany'}
                          </span>
                          <span>Utworzono {dayjs(ticket.created_at).fromNow()}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aktywność globalna */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" /> Aktywność
              </h2>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center">
                Wszystko <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak aktywności.</p>
              ) : (
                recentActivity.map(ticket => (
                  <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="block p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm transition-all group">
                    <p className="text-sm font-semibold text-gray-800 truncate mb-1 group-hover:text-blue-700 transition-colors">#{ticket.id} {ticket.title}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${ticket.status === 'NOWE' ? 'text-blue-600' :
                          ticket.status === 'W_TOKU' ? 'text-amber-600' :
                            'text-green-600'
                        }`}>
                        {ticket.status === 'W_TOKU' ? 'W toku' :
                          ticket.status === 'NOWE' ? 'Nowe' :
                            ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' : 'Zamknięte'}
                      </span>
                      <p className="text-[10px] text-gray-400">{dayjs(ticket.updated_at).fromNow()}</p>
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

  // ==================== FALLBACK (nieznana rola) ====================
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-10">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Brak dostępu</h2>
        <p className="text-sm text-gray-500 mt-2">Twoja rola nie ma przypisanego panelu. Skontaktuj się z administratorem.</p>
      </div>
    </div>
  );
};

export default DashboardPage;

