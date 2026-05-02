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
  MessageSquare,
  FileText,
  Paperclip,
  Timer,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import useTitle from '../hooks/useTitle';
import relativeTime from 'dayjs/plugin/relativeTime';
import UserAvatar from '../components/UserAvatar';

const formatTicketCount = (count: number) => {
  if (count === 1) return 'Masz 1 otwarte zgłoszenie';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return `Masz ${count} otwarte zgłoszenia`;
  }
  return `Masz ${count} otwartych zgłoszeń`;
};

// Plugin do obsługi czasu relatywnego (np. "2 godziny temu")
dayjs.extend(relativeTime);

const formatActivityTime = (dateStr: string) => {
  const date = dayjs(dateStr);
  const now = dayjs();
  const diffMinutes = now.diff(date, 'minute');
  const diffHours = now.diff(date, 'hour');

  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)} min temu`;
  if (diffHours < 24 && date.isSame(now, 'day')) return `${diffHours} godz. temu`;
  if (date.isSame(now.subtract(1, 'day'), 'day')) return `wczoraj`;
  
  const plMonths = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const plDays = ['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'];
  return `${plDays[date.day()]}, ${date.date()} ${plMonths[date.month()]}`;
};

const DashboardPage: React.FC = () => {
  useTitle('Panel główny');
  const authContext = useContext(AuthContext);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState('Wszystkie');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

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

  // Pobieranie globalnych logów aktywności
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await api.get('tickets/activity-feed/');
        setActivityLogs(response.data);
      } catch (error) {
        console.error('Błąd pobierania aktywności:', error);
      }
    };
    if (authContext?.user?.role === 'ADMIN' || authContext?.user?.role === 'TECHNICIAN') {
      fetchActivity();
    }
  }, [authContext?.user?.role]);

  const role = authContext?.user?.role;
  const isEmployee = role === 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';




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


  // ==================== DASHBOARD TECHNIKA ====================
  if (isTechnician) {
    const myId = authContext?.user?.id;
    const myTickets = tickets.filter(t => t.technician === myId);

    const myOpen = myTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
    const myInProgress = myTickets.filter(t => t.status === 'W_TOKU');
    const unassignedTickets = tickets.filter(t => t.technician === null && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
    const myCompletedToday = myTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status) && dayjs(t.updated_at).isAfter(dayjs().startOf('day')));

    // Technika interesują priorytety, zgłoszenia nieruszane oraz nieprzypisane.
    const needsAttention = tickets
      .filter(t => (
        (t.technician === null && t.priority === 'WYSOKI' && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)) ||
        (t.technician === myId && t.priority === 'WYSOKI' && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)) ||
        (t.technician === myId && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status) && dayjs(t.updated_at).isBefore(dayjs().subtract(2, 'day')))
      ))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 6);

    const techRecentActivity = [...myTickets]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    const techStats = [
      {
        label: 'Moje otwarte zgłoszenia',
        value: myOpen.length.toString(),
        icon: <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-100 dark:border-blue-500/20'
      },
      {
        label: 'Moje "W toku"',
        value: myInProgress.length.toString(),
        icon: <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-100 dark:border-amber-500/20'
      },
      {
        label: 'Pula nieprzypisanych',
        value: unassignedTickets.length.toString(),
        icon: <Users className="w-6 h-6 text-red-600 dark:text-red-400" />,
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-100 dark:border-red-500/20'
      },
      {
        label: 'Rozwiązane dzisiaj',
        value: myCompletedToday.length.toString(),
        icon: <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />,
        bg: 'bg-green-50 dark:bg-green-500/10',
        border: 'border-green-100 dark:border-green-500/20'
      },
    ];

    return (
      <div className="w-full space-y-8 animate-in fade-in duration-700">
        {/* Baner Welcome */}
        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 dark:from-gray-800 dark:via-gray-900 dark:to-black rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-gray-900/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-10 -mb-10 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="relative z-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight text-white">
              Witaj, {authContext?.user?.first_name}! 👋
            </h1>
            <p className="text-gray-300 text-lg max-w-lg font-medium">
              {formatTicketCount(myOpen.length)}. Pula nieprzypisanych czeka!
            </p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-3">
            <Link
              to="/tickets"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center whitespace-nowrap"
            >
              Moje zgłoszenia
            </Link>
            <Link
              to="/create-ticket"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center whitespace-nowrap"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nowe zgłoszenie
            </Link>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {techStats.map((stat, index) => (
            <div
              key={index}
              className={`p-6 bg-white dark:bg-gray-800 border ${stat.border} rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-default`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3.5 ${stat.bg} rounded-2xl`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Wymagające uwagi */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" /> Wymagają uwagi (Priorytety / Nieruszane)
              </h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                {needsAttention.length} {needsAttention.length === 1 ? 'zgłoszenie' : 'zgłoszeń'}
              </span>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
              {needsAttention.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Świetna robota!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Brak priorytetowych lub opóźnionych zgłoszeń na Twoim koncie.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {needsAttention.map(ticket => (
                    <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="p-5 flex items-start hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors block group cursor-pointer">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${ticket.priority === 'WYSOKI' ? 'bg-red-50 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20' : 'bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20'
                        } transition-colors`}>
                        {ticket.priority === 'WYSOKI'
                          ? <AlertTriangle className="w-6 h-6 text-red-500" />
                          : <TicketIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                      </div>
                      <div className="ml-5 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-2">
                          <h3 className="font-extrabold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base">#{ticket.id} {ticket.title}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ticket.priority === 'WYSOKI' && (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 uppercase tracking-wider">Wysoki</span>
                            )}
                            {ticket.technician === null ? (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase tracking-wider">Do wzięcia</span>
                            ) : (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wider">Moje</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">
                          <span className="flex items-center">
                            <UserAvatar avatar={ticket.creator_details?.avatar} name={ticket.creator_details?.first_name || 'U'} size="xs" className="mr-1.5" />
                            {ticket.creator_details ? `${ticket.creator_details.first_name} ${ticket.creator_details.last_name}` : 'Nieznany'}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                            Ostatnia akcja: {dayjs(ticket.updated_at).fromNow()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aktywność technika */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" /> Moja Aktywność
              </h2>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center">
                Wszystko <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm p-6 space-y-3">
              {techRecentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">Brak aktywności na Twoich zgłoszeniach.</p>
              ) : (
                techRecentActivity.map(ticket => (
                  <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="block p-4 border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">#{ticket.id} {ticket.title}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg ${ticket.status === 'NOWE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                          ticket.status === 'W_TOKU' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                            ticket.status === 'ROZWIAZANE' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                              'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
                        }`}>
                        {ticket.status === 'W_TOKU' ? 'W TOKU' :
                          ticket.status === 'NOWE' ? 'NOWE' :
                            ticket.status === 'ROZWIAZANE' ? 'ROZWIĄZANE' : 'ZAMKNIĘTE'}
                      </span>
                      <p className="text-[11px] font-medium text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1 opacity-70" />
                        {dayjs(ticket.updated_at).fromNow()}
                      </p>
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
    const completedToday = tickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status) && dayjs(t.updated_at).isAfter(dayjs().startOf('day')));
    const openTickets = tickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    // Admin interesuje się globalnymi wąskimi gardłami (stare nierozwiązane, bardzo opóźnione)
    const adminNeedsAttention = tickets
      .filter(t => (
        (t.technician === null && t.priority === 'WYSOKI' && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)) ||
        (t.technician === null && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status) && dayjs(t.created_at).isBefore(dayjs().subtract(1, 'day'))) ||
        (t.status === 'W_TOKU' && dayjs(t.updated_at).isBefore(dayjs().subtract(3, 'day')))
      ))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 6);

    const adminStats = [
      {
        label: 'Otwarte (Globalnie)',
        value: openTickets.length.toString(),
        icon: <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-100 dark:border-blue-500/20'
      },
      {
        label: 'Czekają w kolejce',
        value: unassignedTickets.length.toString(),
        icon: <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-100 dark:border-amber-500/20'
      },
      {
        label: 'Wąskie gardła',
        value: adminNeedsAttention.length.toString(),
        icon: <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />,
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-100 dark:border-red-500/20'
      },
      {
        label: 'Rozwiązane dzisiaj (Zespół)',
        value: completedToday.length.toString(),
        icon: <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />,
        bg: 'bg-green-50 dark:bg-green-500/10',
        border: 'border-green-100 dark:border-green-500/20'
      },
    ];

    return (
      <div className="w-full space-y-8 animate-in fade-in duration-700">
        {/* Baner Welcome */}
        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 dark:from-gray-800 dark:via-gray-900 dark:to-black rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-gray-900/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-10 -mb-10 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="relative z-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight text-white">
              Przegląd Systemu, {authContext?.user?.first_name}! 👋
            </h1>
            <p className="text-gray-300 text-lg max-w-lg font-medium">
              Oto podsumowanie stanu operacyjnego oraz eskalacje całego zespołu FixFlow.
            </p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-3">
            <Link
              to="/users"
              className="px-6 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/40 transition-all flex items-center justify-center whitespace-nowrap"
            >
              <Users className="w-5 h-5 mr-2" /> Zarządzaj użytkownikami
            </Link>
            <Link
              to="/tickets"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center whitespace-nowrap"
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
              className={`p-6 bg-white dark:bg-gray-800 border ${stat.border} rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-default`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3.5 ${stat.bg} rounded-2xl`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Wymagające uwagi (Wąskie gardła) */}
          <div className="xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" /> Globalne Wąskie Gardła
              </h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                {adminNeedsAttention.length} {adminNeedsAttention.length === 1 ? 'eskalacja' : 'eskalacji'}
              </span>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
              {adminNeedsAttention.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Zespół radzi sobie świetnie!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Brak starych, nieprzypisanych lub zablokowanych zgłoszeń w systemie.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {adminNeedsAttention.map(ticket => (
                    <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="p-5 flex items-start hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors block group cursor-pointer">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${ticket.priority === 'WYSOKI' ? 'bg-red-50 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20' : 'bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20'
                        } transition-colors`}>
                        {ticket.priority === 'WYSOKI'
                          ? <AlertTriangle className="w-6 h-6 text-red-500" />
                          : <TicketIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                      </div>
                      <div className="ml-5 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-2">
                          <h3 className="font-extrabold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base">#{ticket.id} {ticket.title}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ticket.priority === 'WYSOKI' && (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 uppercase tracking-wider">Wysoki</span>
                            )}
                            {ticket.technician === null ? (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 uppercase tracking-wider">Nieprzypisane zbyt długo</span>
                            ) : (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wider">Zamrożone "W toku"</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">
                          <span className="flex items-center">
                            <UserAvatar avatar={ticket.creator_details?.avatar} name={ticket.creator_details?.first_name || 'U'} size="xs" className="mr-1.5" />
                            {ticket.creator_details ? `${ticket.creator_details.first_name} ${ticket.creator_details.last_name}` : 'Nieznany'}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                            Ostatnia akcja: {dayjs(ticket.updated_at).fromNow()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aktywność globalna */}
          <div className="xl:col-span-2 space-y-4">
            {(() => {
              const activityTabs = ['Wszystkie', 'Zgłoszenia', 'Zespół'];
              
              // Mapowanie akcji z API na konfigurację wizualną
              const getActivityConfig = (log: any) => {
                const action = log.action;
                const ticketId = log.ticket;
                const user = log.user_details;
                const userName = user ? `${user.first_name} ${user.last_name}` : 'System';
                
                switch (action) {
                  case 'CREATED':
                    return {
                      type: 'GREEN', icon: Plus, tab: 'Zgłoszenia',
                      text: (<span>{userName} utworzył(a) zgłoszenie <strong>#{ticketId}</strong></span>),
                      unread: true,
                    };
                  case 'STATUS_CHANGED':
                    if (['ROZWIAZANE', 'ZAMKNIETE'].includes(log.new_value)) {
                      return {
                        type: 'GREEN', icon: CheckCircle2, tab: 'Zgłoszenia',
                        text: (<span>{userName}: zgłoszenie <strong>#{ticketId}</strong> {log.new_value === 'ZAMKNIETE' ? 'zamknięte' : 'rozwiązane'}</span>),
                        unread: false,
                      };
                    }
                    return {
                      type: 'ORANGE', icon: Activity, tab: 'Zgłoszenia',
                      text: (<span>{userName} zmienił(a) status <strong>#{ticketId}</strong></span>),
                      unread: true,
                    };
                  case 'PRIORITY_CHANGED':
                    return {
                      type: 'ORANGE', icon: AlertTriangle, tab: 'Zgłoszenia',
                      text: (<span>Zmiana priorytetu <strong>#{ticketId}</strong>{log.new_value ? ` → ${log.new_value}` : ''}</span>),
                      unread: true,
                    };
                  case 'CATEGORY_CHANGED':
                    return {
                      type: 'ORANGE', icon: ClipboardList, tab: 'Zgłoszenia',
                      text: (<span>Zmiana kategorii w <strong>#{ticketId}</strong>{log.new_value ? ` → ${log.new_value}` : ''}</span>),
                      unread: false,
                    };
                  case 'DESCRIPTION_CHANGED':
                    return {
                      type: 'ORANGE', icon: FileText, tab: 'Zgłoszenia',
                      text: (<span>Edycja opisu <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                  case 'TITLE_CHANGED':
                    return {
                      type: 'ORANGE', icon: FileText, tab: 'Zgłoszenia',
                      text: (<span>Edycja tytułu <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                  case 'REOPENED':
                    return {
                      type: 'ORANGE', icon: Activity, tab: 'Zgłoszenia',
                      text: (<span>Ponownie otwarto <strong>#{ticketId}</strong></span>),
                      unread: true,
                    };
                  case 'AUTO_CLOSED':
                    return {
                      type: 'GREEN', icon: CheckCircle2, tab: 'Zgłoszenia',
                      text: (<span>Auto-zamknięcie <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                  case 'TECHNICIAN_ASSIGNED':
                    return {
                      type: 'BLUE', icon: Users, tab: 'Zespół',
                      text: (<span>Przypisano technika do <strong>#{ticketId}</strong>{log.new_value ? `: ${log.new_value}` : ''}</span>),
                      unread: false,
                    };
                  case 'TECHNICIAN_REMOVED':
                    return {
                      type: 'BLUE', icon: Users, tab: 'Zespół',
                      text: (<span>Usunięto technika z <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                  case 'CREATOR_CHANGED':
                    return {
                      type: 'BLUE', icon: Users, tab: 'Zgłoszenia',
                      text: (<span>Zmiana zgłaszającego w <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                  case 'COMMENT_ADDED':
                    return {
                      type: 'BLUE', icon: MessageSquare,
                      tab: log.new_value === 'INTERNAL' ? 'Zespół' : 'Zgłoszenia',
                      text: (<span>{userName} skomentował(a) <strong>#{ticketId}</strong></span>),
                      unread: true,
                    };
                  case 'ATTACHMENT_ADDED': {
                    const isMultiple = log.new_value && /^\d+ załączników$/.test(log.new_value);
                    return {
                      type: 'PURPLE', icon: Paperclip, tab: 'Zgłoszenia',
                      text: isMultiple
                        ? (<span>Dodano {log.new_value} do <strong>#{ticketId}</strong></span>)
                        : (<span>Dodano załącznik do <strong>#{ticketId}</strong>{log.new_value ? `: ${log.new_value}` : ''}</span>),
                      unread: false,
                    };
                  }
                  case 'ATTACHMENT_DELETED':
                    return {
                      type: 'PURPLE', icon: Paperclip, tab: 'Zgłoszenia',
                      text: (<span>Usunięto załącznik z <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                  case 'WORK_LOGGED':
                    return {
                      type: 'PURPLE', icon: Timer, tab: 'Zespół',
                      text: (<span>Zarejestrowano czas pracy w <strong>#{ticketId}</strong>{log.new_value ? ` (${log.new_value})` : ''}</span>),
                      unread: false,
                    };
                  default:
                    return {
                      type: 'ORANGE', icon: ClipboardList, tab: 'Zgłoszenia',
                      text: (<span>Aktualizacja <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                }
              };

              // Filtruj: ukryj ATTACHMENT_ADDED jeśli tuż po CREATED dla tego samego ticketu
              const createdTicketIds = new Set(
                activityLogs
                  .filter(l => l.action === 'CREATED')
                  .map(l => l.ticket)
              );

              const filteredLogs = activityLogs.filter(log => {
                if (log.action === 'ATTACHMENT_ADDED' && createdTicketIds.has(log.ticket)) {
                  const createdLog = activityLogs.find(l => l.action === 'CREATED' && l.ticket === log.ticket);
                  if (createdLog) {
                    const diff = Math.abs(dayjs(log.created_at).diff(dayjs(createdLog.created_at), 'second'));
                    if (diff < 60) return false;
                  }
                }
                return true;
              });

              const activities = filteredLogs.map(log => {
                const config = getActivityConfig(log);
                return {
                  id: log.id,
                  ticketId: log.ticket,
                  type: config.type,
                  icon: config.icon,
                  text: config.text,
                  time: log.created_at,
                  unread: config.unread,
                  tab: config.tab,
                  link: `/tickets/${log.ticket}`,
                };
              });

              const filteredActivities = activityTab === 'Wszystkie' ? activities : activities.filter(a => a.tab === activityTab);

              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[500px]">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Ostatnia aktywność
                    </h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {activityTabs.map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActivityTab(tab)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                            activityTab === tab 
                            ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400' 
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    {filteredActivities.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">Brak aktywności.</p>
                    ) : (
                      <div className="space-y-1">
                        {filteredActivities.map((activity) => {
                          const Icon = activity.icon;
                          
                          let colorClass = 'text-gray-600 dark:text-gray-400';
                          let bgClass = 'bg-gray-100 dark:bg-gray-800';
                          
                          if (activity.type === 'GREEN') {
                            colorClass = 'text-green-600 dark:text-green-400';
                            bgClass = 'bg-green-100 dark:bg-green-500/20';
                          } else if (activity.type === 'ORANGE') {
                            colorClass = 'text-amber-600 dark:text-amber-400';
                            bgClass = 'bg-amber-100 dark:bg-amber-500/20';
                          } else if (activity.type === 'BLUE') {
                            colorClass = 'text-blue-600 dark:text-blue-400';
                            bgClass = 'bg-blue-100 dark:bg-blue-500/20';
                          } else if (activity.type === 'PURPLE') {
                            colorClass = 'text-violet-600 dark:text-violet-400';
                            bgClass = 'bg-violet-100 dark:bg-violet-500/20';
                          }

                          return (
                            <Link to={activity.link} key={activity.id} className="flex items-center px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group relative">
                              {activity.unread && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/40"></div>
                              )}
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mr-4 transition-transform group-hover:scale-105 ${bgClass} ${colorClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-[13px] text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {activity.text}
                                </p>
                              </div>
                              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                {formatActivityTime(activity.time)}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
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

