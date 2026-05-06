import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { Ticket as TicketType } from '../types';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Ticket as TicketIcon,
  Users,
  AlertTriangle,
  MessageSquare,
  FileText,
  Paperclip,
  Timer,
  Activity,
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Monitor,
  Globe,
  Printer,
  KeyRound
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import useTitle from '../hooks/useTitle';
import relativeTime from 'dayjs/plugin/relativeTime';



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

/**
 * Grupuje logi z bulk actions: jeśli ten sam user + action + new_value
 * wystąpiły w oknie 30s, łączy je w jeden wiersz z liczbą zgłoszeń.
 */
const groupBulkLogs = (logs: any[]): any[] => {
  if (logs.length === 0) return [];

  const BULK_WINDOW_SEC = 30;
  const groups: any[][] = [];
  let currentGroup: any[] = [logs[0]];

  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1];
    const curr = logs[i];
    const sameUser = prev.user === curr.user;
    const sameAction = prev.action === curr.action;
    const sameValue = (prev.new_value || '') === (curr.new_value || '');
    const timeDiff = Math.abs(dayjs(prev.created_at).diff(dayjs(curr.created_at), 'second'));

    if (sameUser && sameAction && sameValue && timeDiff <= BULK_WINDOW_SEC) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  groups.push(currentGroup);

  // Zwróć: grupy 1-elementowe → oryginalny log; grupy >1 → log z _bulkCount i _bulkTicketIds
  return groups.map(group => {
    if (group.length === 1) return group[0];
    return {
      ...group[0],
      _bulkCount: group.length,
      _bulkTicketIds: group.map((l: any) => l.ticket),
    };
  });
};

const DashboardPage: React.FC = () => {
  useTitle('Start');
  const authContext = useContext(AuthContext);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState('Wszystkie');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  // Zakres dat dla KPI (domyślnie: ostatnie 7 dni)
  const [dateRange, setDateRange] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(6, 'day').startOf('day'),
    end: dayjs().endOf('day'),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerView, setPickerView] = useState<{ year: number; month: number }>({
    year: dayjs().year(),
    month: dayjs().month(),
  });
  const [customStart, setCustomStart] = useState<dayjs.Dayjs | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

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

  // Zamknij picker po kliknięciu poza nim
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
        setCustomStart(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const plMonthsShort = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const plMonthsFull = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

  const applyPreset = (days: number) => {
    setDateRange({ start: dayjs().subtract(days - 1, 'day').startOf('day'), end: dayjs().endOf('day') });
    setShowDatePicker(false);
    setCustomStart(null);
  };

  const applyThisMonth = () => {
    setDateRange({ start: dayjs().startOf('month'), end: dayjs().endOf('day') });
    setShowDatePicker(false);
    setCustomStart(null);
  };

  const applyLastMonth = () => {
    const last = dayjs().subtract(1, 'month');
    setDateRange({ start: last.startOf('month'), end: last.endOf('month') });
    setShowDatePicker(false);
    setCustomStart(null);
  };

  const handleDayClick = (d: dayjs.Dayjs) => {
    if (!customStart) {
      setCustomStart(d);
    } else {
      const [s, e] = d.isBefore(customStart) ? [d, customStart] : [customStart, d];
      setDateRange({ start: s.startOf('day'), end: e.endOf('day') });
      setShowDatePicker(false);
      setCustomStart(null);
    }
  };

  const dateRangeLabel = (() => {
    const { start, end } = dateRange;
    if (start.month() === end.month() && start.year() === end.year()) {
      return `${start.date()}–${end.date()} ${plMonthsShort[end.month()]} ${end.year()}`;
    }
    return `${start.date()} ${plMonthsShort[start.month()]} – ${end.date()} ${plMonthsShort[end.month()]} ${end.year()}`;
  })();

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
      <div className="w-full space-y-5 md:space-y-6 animate-in fade-in duration-700">
        {/* Page header — greeting IS the main h1, CTA top-right */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-[22px]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Cześć, {authContext?.user?.first_name}! 👋
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Potrzebujesz pomocy IT lub coś nie działa? Utwórz zgłoszenie.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
            <Link
              to="/create-ticket"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm hover:shadow-md shadow-blue-600/10 transition-all text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nowe zgłoszenie
            </Link>
          </div>
        </div>

        {/* Quick Actions — Zgłoś problem */}
        <div className="space-y-3 pt-1">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Zgłoś problem
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Problem z logowaniem',
                sub: 'Hasło, konto, dostęp do systemu',
                icon: <KeyRound className="w-5 h-5" />,
                category: 'Dostęp do konta',
                color: 'text-rose-600 dark:text-rose-400',
                bg: 'bg-rose-50 dark:bg-rose-500/10',
              },
              {
                label: 'Problem z programem',
                sub: 'Aplikacje, oprogramowanie, błędy',
                icon: <Monitor className="w-5 h-5" />,
                category: 'Oprogramowanie',
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-500/10',
              },
              {
                label: 'Brak internetu',
                sub: 'Wi-Fi, sieć, VPN',
                icon: <Globe className="w-5 h-5" />,
                category: 'Sieć i internet',
                color: 'text-teal-600 dark:text-teal-400',
                bg: 'bg-teal-50 dark:bg-teal-500/10',
              },
              {
                label: 'Problem ze sprzętem',
                sub: 'Komputer, drukarka, urządzenia',
                icon: <Printer className="w-5 h-5" />,
                category: 'Sprzęt',
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-500/10',
              },
            ].map(action => (
              <Link
                key={action.label}
                to={`/create-ticket?category=${encodeURIComponent(action.category)}`}
                className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${action.bg} ${action.color} group-hover:scale-105 transition-transform`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.label}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {action.sub}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Grid: Aktywne + Ostatnio zamknięte */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Aktywne Zgłoszenia */}
          <div className="xl:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Aktywne zgłoszenia
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
              {activeTickets.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Brak otwartych spraw</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">Wygląda na to, że wszystko działa bez zarzutu. Jeśli pojawią się problemy, użyj przycisku u góry.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {activeTickets.map(ticket => (
                    <Link
                      to={`/tickets/${ticket.id}`}
                      key={ticket.id}
                      className="flex items-center px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mr-4 bg-blue-50 dark:bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
                        <TicketIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-[13px] text-gray-700 dark:text-gray-200 truncate leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <span className="font-bold text-gray-900 dark:text-white">#{ticket.id}</span>
                          <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                          {ticket.title}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          Aktualizacja: {dayjs(ticket.updated_at).fromNow()}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap flex-shrink-0 ${ticket.status === 'W_TOKU' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                        {ticket.status === 'W_TOKU' ? 'W TOKU' : 'NOWE'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ostatnio Rozwiązane */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Ostatnio zamknięte
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
              {resolvedTickets.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-5 text-gray-400 dark:text-gray-500">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">Brak zamkniętych zgłoszeń.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {resolvedTickets.slice(0, 5).map(ticket => (
                    <Link
                      to={`/tickets/${ticket.id}`}
                      key={ticket.id}
                      className="flex items-center px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {ticket.title}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {dayjs(ticket.updated_at).format('DD.MM.YYYY')}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap flex-shrink-0 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 uppercase tracking-wide">
                        {ticket.status === 'ROZWIAZANE' ? 'Rozwiązane' : 'Zamknięte'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {resolvedTickets.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50">
                  <Link to="/tickets" className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                    Wszystkie zgłoszenia →
                  </Link>
                </div>
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

    // ---- Risk scoring system (technik) ----
    type TechRiskReason = 'critical_mine' | 'pool_unassigned' | 'stale_mine';
    type TechRiskItem = { ticket: TicketType; reason: TechRiskReason; score: number; age: number; idle: number };

    const techRiskItems: TechRiskItem[] = [];
    const now = dayjs();

    tickets.forEach(t => {
      if (['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)) return;
      const age = now.diff(dayjs(t.created_at), 'day');
      const idle = now.diff(dayjs(t.updated_at), 'day');

      // 🔴 Krytyczne moje — moje z wysokim priorytetem
      if (t.technician === myId && t.priority === 'WYSOKI') {
        techRiskItems.push({ ticket: t, reason: 'critical_mine', score: 100 + idle * 3, age, idle });
      }
      // 🟠 Do wzięcia — nieprzypisane w puli (wysoki priorytet daje bonus)
      else if (t.technician === null) {
        const priorityBonus = t.priority === 'WYSOKI' ? 30 : t.priority === 'NORMALNY' ? 10 : 0;
        techRiskItems.push({ ticket: t, reason: 'pool_unassigned', score: 50 + age * 2 + priorityBonus, age, idle });
      }
      // 🟡 Nieruszane — moje, ale brak aktywności >= 2 dni
      else if (t.technician === myId && idle >= 2) {
        techRiskItems.push({ ticket: t, reason: 'stale_mine', score: 30 + idle * 2, age, idle });
      }
    });

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
      <div className="w-full space-y-6 md:space-y-8 animate-in fade-in duration-700">
        {/* Page title — matches admin style */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-[22px]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Mój pulpit
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {(() => {
                  const count = myOpen.length;
                  if (count === 0) return 'Nie masz żadnych otwartych zgłoszeń';
                  if (count === 1) return 'Masz 1 otwarte zgłoszenie przypisane do Ciebie';
                  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
                    return `Masz ${count} otwarte zgłoszenia przypisane do Ciebie`;
                  }
                  return `Masz ${count} otwartych zgłoszeń przypisanych do Ciebie`;
                })()}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/tickets?assignment=assigned_to_me"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-bold rounded-xl shadow-sm transition-all text-sm whitespace-nowrap"
            >
              Moje zgłoszenia
            </Link>
            <Link
              to="/create-ticket"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm hover:shadow-md shadow-blue-600/10 transition-all text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nowe zgłoszenie
            </Link>
          </div>
        </div>

        {/* KPI Cards — admin-style visual system */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {techStats.map((stat, index) => (
            <div
              key={index}
              className="group relative flex flex-col p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">
                  {stat.label}
                </p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg} ring-1 ${stat.border}`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Wymagają uwagi — panel ryzyka (technik) */}
          <div className="xl:col-span-3">
            {/* Severity bar animation CSS */}
            <style>{`
              .risk-row .risk-severity-bar { transform: scaleX(0); }
              .risk-row:hover .risk-severity-bar { transform: scaleX(1); }
            `}</style>
            {(() => {
              const getTechUrgencyDays = (r: TechRiskItem) =>
                r.reason === 'stale_mine' ? r.idle : r.age;

              const visibleTechRisks = (riskFilter
                ? techRiskItems.filter(r => r.reason === riskFilter)
                : techRiskItems
              ).slice().sort((a, b) => {
                // In "Wszystkie" view, group by category first
                if (!riskFilter) {
                  const groupOrder: Record<TechRiskReason, number> = { critical_mine: 0, pool_unassigned: 1, stale_mine: 2 };
                  const groupDiff = groupOrder[a.reason] - groupOrder[b.reason];
                  if (groupDiff !== 0) return groupDiff;
                }
                return getTechUrgencyDays(b) - getTechUrgencyDays(a);
              });

              const techChipConfig: { reason: TechRiskReason; label: string }[] = [
                { reason: 'critical_mine', label: 'Krytyczne moje' },
                { reason: 'pool_unassigned', label: 'Do wzięcia' },
                { reason: 'stale_mine', label: 'Nieruszane' },
              ];

              const techRiskReasonLabel: Record<TechRiskReason, string> = {
                critical_mine: 'Wysoki priorytet — moje',
                pool_unassigned: 'Nieprzypisane — pula',
                stale_mine: 'Brak aktywności',
              };

              const techRiskReasonColor: Record<TechRiskReason, { bg: string; icon: string; text: string }> = {
                critical_mine: {
                  bg: 'bg-rose-50 dark:bg-rose-500/10',
                  icon: 'text-rose-500 dark:text-rose-400',
                  text: 'text-rose-600 dark:text-rose-400',
                },
                pool_unassigned: {
                  bg: 'bg-amber-50 dark:bg-amber-500/10',
                  icon: 'text-amber-500 dark:text-amber-400',
                  text: 'text-amber-600 dark:text-amber-400',
                },
                stale_mine: {
                  bg: 'bg-gray-100 dark:bg-gray-700/50',
                  icon: 'text-gray-500 dark:text-gray-400',
                  text: 'text-gray-500 dark:text-gray-400',
                },
              };

              const priorityBadge = (priority: string) => {
                const styles: Record<string, string> = {
                  WYSOKI: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                  NORMALNY: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                  NISKI: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
                };
                const labels: Record<string, string> = { WYSOKI: 'Wysoki', NORMALNY: 'Normalny', NISKI: 'Niski' };
                return (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[priority] || styles.NORMALNY}`}>
                    {labels[priority] || priority}
                  </span>
                );
              };

              const statusBadge = (status: string) => {
                const styles: Record<string, string> = {
                  NOWE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                  W_TOKU: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                };
                const labels: Record<string, string> = { NOWE: 'Nowe', W_TOKU: 'W toku' };
                return (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {labels[status] || status}
                  </span>
                );
              };

              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">

                  {/* Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Wymagają uwagi
                        {techRiskItems.length > 0 && (
                          <span className="ml-2 text-sm font-semibold text-gray-400 dark:text-gray-500">
                            ({riskFilter ? visibleTechRisks.length : techRiskItems.length})
                          </span>
                        )}
                      </h2>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {techRiskItems.length === 0 ? (
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Brak problemów</span>
                      ) : (
                        <>
                          <button
                            onClick={() => setRiskFilter(null)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${riskFilter === null
                              ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                              }`}
                          >
                            Wszystkie
                          </button>
                          {techChipConfig.map(chip => {
                            const count = techRiskItems.filter(r => r.reason === chip.reason).length;
                            const isActive = riskFilter === chip.reason;
                            const isEmpty = count === 0;
                            return (
                              <button
                                key={chip.reason}
                                onClick={() => !isEmpty && setRiskFilter(isActive ? null : chip.reason)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${isEmpty
                                  ? 'text-gray-300 dark:text-gray-600 cursor-default'
                                  : isActive
                                    ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                                  }`}
                              >
                                {chip.label} · {count}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    {visibleTechRisks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Świetna robota!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Brak priorytetowych lub opóźnionych zgłoszeń.</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {(() => {
                          const groupLabels: Record<TechRiskReason, string> = {
                            critical_mine: '🔴 Krytyczne moje',
                            pool_unassigned: '🟠 Do wzięcia',
                            stale_mine: '🟡 Nieruszane',
                          };

                          let lastGroup: TechRiskReason | null = null;

                          return visibleTechRisks.map((risk) => {
                            const colors = techRiskReasonColor[risk.reason];
                            const t = risk.ticket;

                            const RiskIcon = risk.reason === 'critical_mine'
                              ? AlertTriangle
                              : risk.reason === 'pool_unassigned'
                                ? Users
                                : Clock;

                            const idleLabel =
                              risk.reason === 'stale_mine'
                                ? `${risk.idle}d ciszy`
                                : risk.reason === 'pool_unassigned'
                                  ? `${risk.age}d czeka`
                                  : `${risk.age}d`;

                            const urgencyDays = getTechUrgencyDays(risk);

                            const severityBarColor =
                              urgencyDays >= 15
                                ? 'bg-rose-500/60'
                                : urgencyDays >= 8
                                  ? 'bg-orange-400/60'
                                  : urgencyDays >= 4
                                    ? 'bg-amber-400/60'
                                    : 'bg-emerald-400/60';

                            const ownershipTag = t.technician === null ? 'Do wzięcia' : 'Moje';

                            // Group separator — only in "Wszystkie" view
                            let groupHeader: React.ReactNode = null;
                            if (riskFilter === null && risk.reason !== lastGroup) {
                              lastGroup = risk.reason;
                              groupHeader = (
                                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {groupLabels[risk.reason]}
                                  </span>
                                  <div className="flex-1 h-px bg-gray-200/60 dark:bg-gray-700/60" />
                                </div>
                              );
                            }

                            return (
                              <React.Fragment key={t.id}>
                                {groupHeader}
                                <Link
                                  to={`/tickets/${t.id}`}
                                  className="risk-row relative flex items-center px-4 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group overflow-hidden"
                                >
                                  {/* Bottom-edge severity bar */}
                                  <div
                                    className={`risk-severity-bar absolute bottom-0 left-0 h-0.5 ${severityBarColor} rounded-full`}
                                    style={{
                                      width: '100%',
                                      transformOrigin: 'left',
                                      transition: 'transform 200ms ease-out',
                                    }}
                                  />

                                  <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mr-3.5 transition-transform group-hover:scale-105 ${colors.bg}`}>
                                    <RiskIcon className={`w-4 h-4 ${colors.icon}`} />
                                  </div>
                                  <div className="relative flex-1 min-w-0 mr-3">
                                    <div className="flex items-center min-w-0">
                                      <span className="text-[13px] font-bold text-gray-900 dark:text-white flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">#{t.id}</span>
                                      <span className="mx-1.5 text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
                                      <span className="text-[13px] text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">{t.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      {riskFilter === null && (
                                        <>
                                          <span className={`text-[11px] font-medium ${colors.text}`}>
                                            {techRiskReasonLabel[risk.reason]}
                                          </span>
                                          <span className="text-gray-300 dark:text-gray-600">·</span>
                                        </>
                                      )}
                                      {priorityBadge(t.priority)}
                                      {statusBadge(t.status)}
                                      {riskFilter === null && (
                                        <span className="text-[10px] text-gray-400/80 dark:text-gray-500/60 ml-1 flex items-center gap-1.5">
                                          <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                          {ownershipTag}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Timestamp ↔ Zbadaj cross-fade */}
                                  <div className="relative flex-shrink-0 w-20 text-right">
                                    <span className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 opacity-100 group-hover:opacity-0 transition-opacity duration-150 ease-in-out">
                                      {idleLabel}
                                    </span>
                                    <span className="absolute inset-0 flex items-center justify-end text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out whitespace-nowrap pointer-events-none">
                                      Zbadaj →
                                    </span>
                                  </div>
                                </Link>
                              </React.Fragment>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Ostatnia aktywność — perspektywa technika */}
          <div className="xl:col-span-2 space-y-4">
            {(() => {
              const techActivityTabs = ['Wszystkie', 'Moje', 'Pula'];

              // Mapowanie akcji z API na konfigurację wizualną (technik)
              // Pełna wersja — identyczna szczegółowość co admin, z perspektywą "Ty/ImięNazwisko"
              const trunc = (s: string, max = 40) => s.length > max ? s.slice(0, max) + '...' : s;

              const statusLabel: Record<string, string> = {
                NOWE: 'Nowe', W_TOKU: 'W toku', ROZWIAZANE: 'Rozwiązane', ZAMKNIETE: 'Zamknięte',
              };
              const priorityLabel: Record<string, string> = {
                NISKI: 'Niski', NORMALNY: 'Normalny', WYSOKI: 'Wysoki',
              };
              const sl = (v: string) => statusLabel[v] ?? v;
              const pl = (v: string) => priorityLabel[v] ?? v;

              const getTechActivityConfig = (log: any) => {
                const action = log.action;
                const ticketId = log.ticket;
                const user = log.user_details;
                const userName = user ? `${user.first_name} ${user.last_name}` : 'System';
                const isMe = user?.id === myId;
                const youLabel = isMe ? 'Ty' : userName;
                const bulk = log._bulkCount;
                const bulkLabel = bulk ? `${bulk} zgłoszeń` : null;

                switch (action) {
                  case 'CREATED':
                    return {
                      type: 'GREEN', icon: Plus, tab: 'Moje',
                      text: bulk
                        ? (<span>{youLabel} utworzył(a) <strong>{bulkLabel}</strong></span>)
                        : (<span>{youLabel} utworzył(a) zgłoszenie <strong>#{ticketId}</strong></span>),
                      unread: true,
                    };

                  case 'STATUS_CHANGED': {
                    const oldS = log.old_value ? sl(log.old_value) : null;
                    const newS = log.new_value ? sl(log.new_value) : null;
                    const arrow = oldS && newS ? `: ${oldS} → ${newS}` : newS ? ` → ${newS}` : '';
                    const isResolved = ['ROZWIAZANE', 'ZAMKNIETE'].includes(log.new_value);
                    return {
                      type: isResolved ? 'GREEN' : 'ORANGE',
                      icon: isResolved ? CheckCircle2 : Activity,
                      tab: 'Moje',
                      text: bulk
                        ? (<span>{youLabel} zmienił(a) status <strong>{bulkLabel}</strong>{newS ? ` → ${newS}` : ''}</span>)
                        : (<span>{youLabel} zmienił(a) status <strong>#{ticketId}</strong>{arrow}</span>),
                      unread: !isResolved,
                    };
                  }

                  case 'PRIORITY_CHANGED': {
                    const oldP = log.old_value ? pl(log.old_value) : null;
                    const newP = log.new_value ? pl(log.new_value) : null;
                    const arrow = oldP && newP ? `: ${oldP} → ${newP}` : newP ? ` → ${newP}` : '';
                    return {
                      type: 'ORANGE', icon: AlertTriangle, tab: 'Moje',
                      text: bulk
                        ? (<span>{youLabel} zmienił(a) priorytet <strong>{bulkLabel}</strong>{newP ? ` → ${newP}` : ''}</span>)
                        : (<span>{youLabel} zmienił(a) priorytet <strong>#{ticketId}</strong>{arrow}</span>),
                      unread: true,
                    };
                  }

                  case 'CATEGORY_CHANGED': {
                    const oldC = log.old_value || null;
                    const newC = log.new_value || null;
                    const arrow = oldC && newC ? `: ${oldC} → ${newC}` : newC ? ` → ${newC}` : '';
                    return {
                      type: 'ORANGE', icon: ClipboardList, tab: 'Moje',
                      text: bulk
                        ? (<span>{youLabel} zmienił(a) kategorię <strong>{bulkLabel}</strong>{newC ? ` → ${newC}` : ''}</span>)
                        : (<span>{youLabel} zmienił(a) kategorię <strong>#{ticketId}</strong>{arrow}</span>),
                      unread: false,
                    };
                  }

                  case 'TITLE_CHANGED': {
                    const oldT = log.old_value ? `„${trunc(log.old_value)}"` : null;
                    const newT = log.new_value ? `„${trunc(log.new_value)}"` : null;
                    const detail = oldT && newT ? `: ${oldT} → ${newT}` : newT ? ` → ${newT}` : '';
                    return {
                      type: 'ORANGE', icon: FileText, tab: '_edycje',
                      text: (<span>{youLabel} zmienił(a) tytuł <strong>#{ticketId}</strong>{detail}</span>),
                      unread: false,
                    };
                  }

                  case 'DESCRIPTION_CHANGED':
                    return {
                      type: 'ORANGE', icon: FileText, tab: '_edycje',
                      text: (<span>{youLabel} zaktualizował(a) opis zgłoszenia <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };

                  case 'REOPENED':
                    return {
                      type: 'ORANGE', icon: Activity, tab: 'Moje',
                      text: bulk
                        ? (<span>{youLabel} ponownie otworzył(a) <strong>{bulkLabel}</strong></span>)
                        : (<span>{youLabel} ponownie otworzył(a) <strong>#{ticketId}</strong></span>),
                      unread: true,
                    };

                  case 'AUTO_CLOSED':
                    return {
                      type: 'GREEN', icon: CheckCircle2, tab: 'Moje',
                      text: (<span>System automatycznie zamknął <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };

                  case 'TECHNICIAN_ASSIGNED': {
                    const tech = log.new_value || null;
                    return {
                      type: 'BLUE', icon: Users, tab: 'Pula',
                      text: bulk
                        ? (<span>{youLabel} przypisał(a) technika do <strong>{bulkLabel}</strong>{tech ? `: ${tech}` : ''}</span>)
                        : (<span>{youLabel} przypisał(a) technika do <strong>#{ticketId}</strong>{tech ? `: ${tech}` : ''}</span>),
                      unread: false,
                    };
                  }

                  case 'TECHNICIAN_REMOVED': {
                    const tech = log.old_value || log.new_value || null;
                    return {
                      type: 'BLUE', icon: Users, tab: 'Pula',
                      text: bulk
                        ? (<span>{youLabel} usunął(a) technika z <strong>{bulkLabel}</strong>{tech ? `: ${tech}` : ''}</span>)
                        : (<span>{youLabel} usunął(a) technika z <strong>#{ticketId}</strong>{tech ? `: ${tech}` : ''}</span>),
                      unread: false,
                    };
                  }

                  case 'CREATOR_CHANGED':
                    return {
                      type: 'BLUE', icon: Users, tab: 'Moje',
                      text: (<span>{youLabel} zmienił(a) zgłaszającego w <strong>#{ticketId}</strong>{log.new_value ? ` → ${log.new_value}` : ''}</span>),
                      unread: false,
                    };

                  case 'COMMENT_ADDED':
                    return {
                      type: 'BLUE', icon: MessageSquare,
                      tab: log.new_value === 'INTERNAL' ? 'Pula' : 'Moje',
                      text: (<span>{youLabel} skomentował(a) <strong>#{ticketId}</strong></span>),
                      unread: true,
                    };

                  case 'ATTACHMENT_ADDED': {
                    const isMultiple = log.new_value && /^\d+ załącznik/.test(log.new_value);
                    return {
                      type: 'PURPLE', icon: Paperclip, tab: 'Moje',
                      text: isMultiple
                        ? (<span>{youLabel} dodał(a) {log.new_value} do <strong>#{ticketId}</strong></span>)
                        : (<span>{youLabel} dodał(a) załącznik do <strong>#{ticketId}</strong>{log.new_value ? `: ${log.new_value}` : ''}</span>),
                      unread: false,
                    };
                  }

                  case 'ATTACHMENT_DELETED':
                    return {
                      type: 'PURPLE', icon: Paperclip, tab: 'Moje',
                      text: (<span>{youLabel} usunął(a) załącznik z <strong>#{ticketId}</strong>{log.old_value ? `: ${log.old_value}` : ''}</span>),
                      unread: false,
                    };

                  case 'WORK_LOGGED':
                    return {
                      type: 'PURPLE', icon: Timer, tab: 'Moje',
                      text: (<span>{youLabel} zarejestrował(a) czas pracy w <strong>#{ticketId}</strong>{log.new_value ? ` (${log.new_value})` : ''}</span>),
                      unread: false,
                    };

                  default:
                    return {
                      type: 'ORANGE', icon: ClipboardList, tab: 'Moje',
                      text: (<span>{youLabel}: aktualizacja <strong>#{ticketId}</strong></span>),
                      unread: false,
                    };
                }
              };

              // Zbiory ticketów per tab
              const myTicketIds = new Set(myTickets.map(t => t.id));
              const unassignedIds = new Set(
                tickets
                  .filter(t => t.technician === null && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status))
                  .map(t => t.id)
              );

              // Filtruj duplikaty załączników (jak w adminie)
              const parentEvents = new Set(
                activityLogs
                  .filter((l: any) => ['CREATED', 'COMMENT_ADDED'].includes(l.action))
                  .map((l: any) => l.ticket)
              );
              const cleanedLogs = activityLogs.filter((log: any) => {
                if (log.action === 'ATTACHMENT_ADDED' && parentEvents.has(log.ticket)) {
                  const parentLog = activityLogs.find(
                    (l: any) => ['CREATED', 'COMMENT_ADDED'].includes(l.action) && l.ticket === log.ticket
                  );
                  if (parentLog) {
                    const diff = Math.abs(dayjs(log.created_at).diff(dayjs(parentLog.created_at), 'second'));
                    if (diff < 60) return false;
                  }
                }
                return true;
              });

              // Tylko logi dotyczące ticketów technika LUB nieprzypisanych
              const relevantLogs = cleanedLogs.filter((log: any) =>
                myTicketIds.has(log.ticket) || unassignedIds.has(log.ticket)
              );

              // Grupuj bulk actions
              const groupedLogs = groupBulkLogs(relevantLogs);

              const activities = groupedLogs.map((log: any) => {
                const config = getTechActivityConfig(log);
                return {
                  id: log.id,
                  ticketId: log.ticket,
                  type: config.type,
                  icon: config.icon,
                  text: config.text,
                  time: log.created_at,
                  tab: config.tab,
                  unread: config.unread,
                  link: log._bulkCount ? '/tickets' : `/tickets/${log.ticket}`,
                  isMine: myTicketIds.has(log.ticket),
                  isPool: unassignedIds.has(log.ticket),
                };
              });

              const filteredActivities = activityTab === 'Wszystkie'
                ? activities
                : activities.filter(a => a.tab === activityTab && a.tab !== '_edycje');

              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Ostatnia aktywność
                    </h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {techActivityTabs.map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActivityTab(tab)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${activityTab === tab
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
                      <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                          <Activity className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Brak aktywności</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nie znaleziono zdarzeń dla wybranego filtru.</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
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
                            <Link
                              to={activity.link}
                              key={activity.id}
                              className="relative flex items-center px-4 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group overflow-hidden"
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mr-3.5 transition-transform group-hover:scale-105 ${bgClass} ${colorClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-[13px] text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">
                                  {activity.text}
                                </p>
                              </div>
                              {/* Timestamp ↔ Zbadaj cross-fade */}
                              <div className="relative flex-shrink-0 w-20 text-right">
                                <span className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 opacity-100 group-hover:opacity-0 transition-opacity duration-150 ease-in-out whitespace-nowrap">
                                  {formatActivityTime(activity.time)}
                                </span>
                                <span className="absolute inset-0 flex items-center justify-end text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out whitespace-nowrap pointer-events-none">
                                  Zbadaj →
                                </span>
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

  // ==================== DASHBOARD ADMINA ====================
  if (isAdmin) {
    // Filtrowanie bazy ticketów przez wybrany dateRange
    const filteredTickets = tickets.filter(t => {
      const created = dayjs(t.created_at);
      return created.isAfter(dateRange.start) || created.isSame(dateRange.start, 'day')
        ? (created.isBefore(dateRange.end) || created.isSame(dateRange.end, 'day'))
        : false;
    });

    const openTickets = filteredTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    // Panel ryzyka — niezależny od kalendarza
    // Każdy ticket dostaje powód + score do priorytetyzacji
    type RiskReason = 'critical_unassigned' | 'stale_unassigned' | 'frozen_progress';
    interface RiskItem {
      ticket: TicketType;
      reason: RiskReason;
      score: number;
      age: number; // dni od created_at
      idle: number; // dni od updated_at
    }

    const riskReasonLabel: Record<RiskReason, string> = {
      critical_unassigned: 'Krytyczne — brak technika',
      stale_unassigned: 'Nieprzypisane zbyt długo',
      frozen_progress: 'Brak aktywności',
    };

    const riskReasonColor: Record<RiskReason, { text: string; bg: string; icon: string }> = {
      critical_unassigned: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: 'text-rose-500' },
      stale_unassigned: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: 'text-amber-500' },
      frozen_progress: { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700/50', icon: 'text-gray-500 dark:text-gray-400' },
    };

    const riskItems: RiskItem[] = [];
    const now = dayjs();

    tickets.forEach(t => {
      if (['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)) return;
      const age = now.diff(dayjs(t.created_at), 'day');
      const idle = now.diff(dayjs(t.updated_at), 'day');

      if (t.technician === null && t.priority === 'WYSOKI') {
        // Krytyczny priorytet + brak technika = najwyższy risk
        riskItems.push({ ticket: t, reason: 'critical_unassigned', score: 100 + age * 2, age, idle });
      } else if (t.technician === null && age >= 1) {
        // Nieprzypisane > 1 dzień
        riskItems.push({ ticket: t, reason: 'stale_unassigned', score: 50 + age * 3, age, idle });
      } else if (t.status === 'W_TOKU' && idle >= 3) {
        // Zamrożone W toku > 3 dni bez aktywności
        riskItems.push({ ticket: t, reason: 'frozen_progress', score: 30 + idle * 2, age, idle });
      }
    });

    // Sortuj: najwyższy risk score pierwsze
    riskItems.sort((a, b) => b.score - a.score);

    // Dane KPI
    const waitingTickets = filteredTickets.filter(t => t.status === 'NOWE' || (t.technician === null && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)));
    const resolvedTickets = filteredTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    // Poprzedni okres (ta sama długość, bezpośrednio przed bieżącym)
    const rangeDays = dateRange.end.diff(dateRange.start, 'day') + 1;
    const prevStart = dateRange.start.subtract(rangeDays, 'day');
    const prevEnd = dateRange.start.subtract(1, 'day').endOf('day');

    const prevTickets = tickets.filter(t => {
      const created = dayjs(t.created_at);
      return (created.isAfter(prevStart) || created.isSame(prevStart, 'day'))
        && (created.isBefore(prevEnd) || created.isSame(prevEnd, 'day'));
    });

    const prevOpen = prevTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;
    const prevWaiting = prevTickets.filter(t => t.status === 'NOWE' || (t.technician === null && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status))).length;
    const prevResolved = prevTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;

    // Oblicz trend procentowy
    const calcTrend = (current: number, prev: number) => {
      if (prev === 0 && current === 0) return { value: 0, direction: 'up' as const };
      if (prev === 0) return { value: 100, direction: 'up' as const };
      const pct = ((current - prev) / prev) * 100;
      return {
        value: Math.abs(pct),
        direction: pct >= 0 ? 'up' as const : 'down' as const,
      };
    };

    const openTrend = calcTrend(openTickets.length, prevOpen);
    const waitingTrend = calcTrend(waitingTickets.length, prevWaiting);
    const resolvedTrend = calcTrend(resolvedTickets.length, prevResolved);

    // Śr. czas odpowiedzi (w minutach) — resolved_at - created_at dla rozwiązanych ticketów
    const avgResponseTime = (ticketList: TicketType[]) => {
      const resolved = ticketList.filter(t => t.resolved_at && ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
      if (resolved.length === 0) return 0;
      const totalMin = resolved.reduce((sum, t) => {
        return sum + dayjs(t.resolved_at).diff(dayjs(t.created_at), 'minute');
      }, 0);
      return Math.round(totalMin / resolved.length);
    };

    const currentAvgMin = avgResponseTime(filteredTickets);
    const prevAvgMin = avgResponseTime(prevTickets);
    const avgTrend = calcTrend(currentAvgMin, prevAvgMin);

    const formatMinutes = (min: number) => {
      if (min === 0) return '—';
      const h = Math.floor(min / 60);
      const m = min % 60;
      if (h === 0) return `${m}m`;
      return `${h}h ${m}m`;
    };

    // Formatuj etykietę dla poprzedniego okresu
    const prevPeriodLabel = `${prevStart.date()} ${plMonthsShort[prevStart.month()]} – ${prevEnd.date()} ${plMonthsShort[prevEnd.month()]}`;

    const kpiCards = [
      {
        label: 'Otwarte zgłoszenia',
        value: openTickets.length,
        displayValue: openTickets.length.toString(),
        icon: <TicketIcon className="w-5 h-5" />,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-100/50 dark:ring-blue-500/20',
        trend: { ...openTrend, isGood: openTrend.direction === 'down' },
        tooltip: `Bieżący: ${openTickets.length} | Poprzedni (${prevPeriodLabel}): ${prevOpen}`,
      },
      {
        label: 'Nieprzypisane',
        value: waitingTickets.length,
        displayValue: waitingTickets.length.toString(),
        icon: <Users className="w-5 h-5" />,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-100/50 dark:ring-amber-500/20',
        trend: { ...waitingTrend, isGood: waitingTrend.direction === 'down' },
        tooltip: `Bieżący: ${waitingTickets.length} | Poprzedni (${prevPeriodLabel}): ${prevWaiting}`,
      },
      {
        label: 'Rozwiązane',
        value: resolvedTickets.length,
        displayValue: resolvedTickets.length.toString(),
        icon: <CheckCircle2 className="w-5 h-5" />,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100/50 dark:ring-emerald-500/20',
        trend: { ...resolvedTrend, isGood: resolvedTrend.direction === 'up' },
        tooltip: `Bieżący: ${resolvedTickets.length} | Poprzedni (${prevPeriodLabel}): ${prevResolved}`,
      },
      {
        label: 'Śr. czas odpowiedzi',
        value: currentAvgMin,
        displayValue: formatMinutes(currentAvgMin),
        icon: <Timer className="w-5 h-5" />,
        iconColor: 'text-violet-600 dark:text-violet-400',
        iconBg: 'bg-violet-50 dark:bg-violet-500/10 ring-1 ring-violet-100/50 dark:ring-violet-500/20',
        trend: { ...avgTrend, isGood: avgTrend.direction === 'down' },
        tooltip: `Bieżący: ${formatMinutes(currentAvgMin)} | Poprzedni (${prevPeriodLabel}): ${formatMinutes(prevAvgMin)}`,
      },
    ];

    return (
      <>
        <style>{`
          .risk-row .risk-severity-bar { transform: scaleX(0); }
          .risk-row:hover .risk-severity-bar { transform: scaleX(1); }
        `}</style>
        <div className="w-full space-y-6 md:space-y-8 animate-in fade-in duration-700">
          {/* Page title + Date range picker */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-[22px]">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Pulpit
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                Przegląd obciążenia zespołu i wydajności
              </p>
            </div>

            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>{dateRangeLabel}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown kalendarza */}
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 p-3 flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-1 min-w-[160px] pr-4 md:border-r border-gray-100 dark:border-gray-700">
                    <button onClick={() => applyPreset(7)} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Ostatnie 7 dni</button>
                    <button onClick={() => applyPreset(14)} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Ostatnie 14 dni</button>
                    <button onClick={() => applyPreset(30)} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Ostatnie 30 dni</button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                    <button onClick={applyThisMonth} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Ten miesiąc</button>
                    <button onClick={applyLastMonth} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Poprzedni miesiąc</button>
                  </div>

                  {/* Mini kalendarz */}
                  <div className="w-64">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <button onClick={() => setPickerView(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                        <ChevronDown className="w-5 h-5 rotate-90" />
                      </button>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {plMonthsFull[pickerView.month]} {pickerView.year}
                      </span>
                      <button onClick={() => setPickerView(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                        <ChevronDown className="w-5 h-5 -rotate-90" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(d => (
                        <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const firstDay = dayjs().year(pickerView.year).month(pickerView.month).startOf('month');
                        const daysInMonth = firstDay.daysInMonth();
                        // day() zwraca 0 dla niedzieli, chcemy 1 dla pon, 7 dla nd
                        const startPadding = firstDay.day() === 0 ? 6 : firstDay.day() - 1;

                        const days = [];
                        for (let i = 0; i < startPadding; i++) {
                          days.push(<div key={`pad-${i}`} className="h-8"></div>);
                        }

                        for (let i = 1; i <= daysInMonth; i++) {
                          const d = dayjs().year(pickerView.year).month(pickerView.month).date(i);

                          let isSelected = false;
                          let isInRange = false;
                          let isStart = false;
                          let isEnd = false;

                          if (customStart) {
                            if (d.isSame(customStart, 'day')) isSelected = true;
                          } else {
                            if (d.isSame(dateRange.start, 'day')) {
                              isSelected = true; isStart = true;
                            }
                            if (d.isSame(dateRange.end, 'day')) {
                              isSelected = true; isEnd = true;
                            }
                            if (d.isAfter(dateRange.start, 'day') && d.isBefore(dateRange.end, 'day')) {
                              isInRange = true;
                            }
                            if (d.isSame(dateRange.start, 'day') && d.isSame(dateRange.end, 'day')) {
                              isStart = true; isEnd = true;
                            }
                          }

                          const baseClass = "h-8 flex items-center justify-center text-sm rounded-lg transition-colors cursor-pointer ";
                          let stateClass = "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

                          if (isSelected) {
                            stateClass = "bg-blue-600 text-white font-bold";
                            if (!customStart && isStart && !isEnd) stateClass += " rounded-r-none";
                            if (!customStart && !isStart && isEnd) stateClass += " rounded-l-none";
                          } else if (isInRange) {
                            stateClass = "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-none";
                          }

                          days.push(
                            <div key={`day-${i}`} onClick={() => handleDayClick(d)} className={baseClass + stateClass}>
                              {i}
                            </div>
                          );
                        }
                        return days;
                      })()}
                    </div>
                    {customStart && (
                      <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-3 animate-pulse">
                        Wybierz datę końcową...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {kpiCards.map((kpi, index) => {
              const trendColor = kpi.trend.isGood
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400';
              const trendBg = kpi.trend.isGood
                ? 'bg-emerald-50 dark:bg-emerald-500/10'
                : 'bg-rose-50 dark:bg-rose-500/10';
              const TrendIcon = kpi.trend.direction === 'up' ? TrendingUp : TrendingDown;

              return (
                <div
                  key={index}
                  className="group relative flex flex-col p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                  title={kpi.tooltip}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">
                      {kpi.label}
                    </p>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.iconBg} ${kpi.iconColor}`}>
                      {kpi.icon}
                    </div>
                  </div>

                  <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
                    {kpi.displayValue}
                  </p>

                  <div className="flex items-center mt-auto">
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold ${trendColor} ${trendBg}`}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      <span>{kpi.trend.value.toFixed(1).replace('.', ',')}%</span>
                    </div>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-2">
                      vs poprz. okres
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            {/* Wymagają uwagi — panel ryzyka */}
            <div className="xl:col-span-3">
              {(() => {
                // Urgency helper — used for both sorting and bar color
                const getUrgencyDays = (r: RiskItem) =>
                  r.reason === 'frozen_progress' ? r.idle : r.age;

                // Filtrowane risk items wg wybranego chipa, zawsze sortowane wg urgencyDays malejąco
                // (żeby czerwone były na górze niezależnie od kategorii)
                const visibleRisks = (riskFilter
                  ? riskItems.filter(r => r.reason === riskFilter)
                  : riskItems
                ).slice().sort((a, b) => getUrgencyDays(b) - getUrgencyDays(a));


                const chipConfig: { reason: RiskReason; label: string; activeStyle: string; inactiveStyle: string }[] = [
                  {
                    reason: 'critical_unassigned',
                    label: 'Krytyczne',
                    activeStyle: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white ring-2 ring-rose-300 dark:ring-rose-500/40',
                    inactiveStyle: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20',
                  },
                  {
                    reason: 'stale_unassigned',
                    label: 'Nieprzypisane',
                    activeStyle: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white ring-2 ring-amber-300 dark:ring-amber-500/40',
                    inactiveStyle: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20',
                  },
                  {
                    reason: 'frozen_progress',
                    label: 'Zamrożone',
                    activeStyle: 'bg-gray-700 text-white dark:bg-gray-500 dark:text-white ring-2 ring-gray-400 dark:ring-gray-500/40',
                    inactiveStyle: 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50',
                  },
                ];

                const priorityBadge = (priority: string) => {
                  const styles: Record<string, string> = {
                    WYSOKI: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                    NORMALNY: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                    NISKI: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
                  };
                  const labels: Record<string, string> = { WYSOKI: 'Wysoki', NORMALNY: 'Normalny', NISKI: 'Niski' };
                  return (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[priority] || styles.NORMALNY}`}>
                      {labels[priority] || priority}
                    </span>
                  );
                };

                const statusBadge = (status: string) => {
                  const styles: Record<string, string> = {
                    NOWE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                    W_TOKU: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                  };
                  const labels: Record<string, string> = { NOWE: 'Nowe', W_TOKU: 'W toku' };
                  return (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {labels[status] || status}
                    </span>
                  );
                };

                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">

                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                          Wymagają uwagi
                          {riskItems.length > 0 && (
                            <span className="ml-2 text-sm font-semibold text-gray-400 dark:text-gray-500">
                              ({riskFilter ? visibleRisks.length : riskItems.length})
                            </span>
                          )}
                        </h2>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {riskItems.length === 0 ? (
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Brak problemów w systemie</span>
                        ) : (
                          <>
                            {/* Chip "Wszystkie" */}
                            <button
                              onClick={() => setRiskFilter(null)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${riskFilter === null
                                ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                                }`}
                            >
                              Wszystkie
                            </button>
                            {chipConfig.map(chip => {
                              const count = riskItems.filter(r => r.reason === chip.reason).length;
                              if (count === 0) return null;
                              const isActive = riskFilter === chip.reason;
                              return (
                                <button
                                  key={chip.reason}
                                  onClick={() => setRiskFilter(isActive ? null : chip.reason)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                                    }`}
                                >
                                  {chip.label} · {count}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {visibleRisks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                          </div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">Wszystko pod kontrolą</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Brak zgłoszeń wymagających interwencji.</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {visibleRisks.map((risk) => {
                            const colors = riskReasonColor[risk.reason];
                            const t = risk.ticket;

                            const RiskIcon = risk.reason === 'critical_unassigned'
                              ? AlertTriangle
                              : risk.reason === 'stale_unassigned'
                                ? Users
                                : Clock;

                            const idleLabel =
                              risk.reason === 'frozen_progress'
                                ? `${risk.idle}d ciszy`
                                : risk.reason === 'stale_unassigned'
                                  ? `${risk.age}d czeka`
                                  : `${risk.age}d`;

                            // Urgency days — shared helper ensures consistency with sort order
                            const urgencyDays = getUrgencyDays(risk);

                            // Severity bar color based on wait time
                            const severityBarColor =
                              urgencyDays >= 15
                                ? 'bg-rose-500/60'
                                : urgencyDays >= 8
                                  ? 'bg-orange-400/60'
                                  : urgencyDays >= 4
                                    ? 'bg-amber-400/60'
                                    : 'bg-emerald-400/60';

                            return (
                              <Link
                                to={`/tickets/${t.id}`}
                                key={t.id}
                                className="risk-row relative flex items-center px-4 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group overflow-hidden min-w-0"
                              >
                                {/* Bottom-edge severity bar — animates scaleX 0→1 on hover via .risk-row CSS */}
                                <div
                                  className={`risk-severity-bar absolute bottom-0 left-0 h-0.5 ${severityBarColor} rounded-full`}
                                  style={{
                                    width: '100%',
                                    transformOrigin: 'left',
                                    transition: 'transform 200ms ease-out',
                                  }}
                                />

                                <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mr-3.5 transition-transform group-hover:scale-105 ${colors.bg}`}>
                                  <RiskIcon className={`w-4 h-4 ${colors.icon}`} />
                                </div>
                                <div className="relative flex-1 min-w-0 mr-3">
                                  <div className="flex items-center min-w-0">
                                    <span className="text-[13px] font-bold text-gray-900 dark:text-white flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">#{t.id}</span>
                                    <span className="mx-1.5 text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
                                    <span className="text-[13px] text-gray-700 dark:text-gray-200 truncate block min-w-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">{t.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`text-[11px] font-medium ${colors.text}`}>
                                      {riskReasonLabel[risk.reason]}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    {priorityBadge(t.priority)}
                                    {statusBadge(t.status)}
                                  </div>
                                </div>

                                {/* Timestamp ↔ Zbadaj cross-fade */}
                                <div className="relative flex-shrink-0 w-20 text-right">
                                  <span className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 opacity-100 group-hover:opacity-0 transition-opacity duration-150 ease-in-out">
                                    {idleLabel}
                                  </span>
                                  <span className="absolute inset-0 flex items-center justify-end text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out whitespace-nowrap pointer-events-none">
                                    Zbadaj →
                                  </span>
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

            {/* Aktywność globalna */}
            <div className="xl:col-span-2 space-y-4">
              {(() => {
                const activityTabs = ['Wszystkie', 'Zgłoszenia', 'Zespół'];

                // Mapowanie akcji z API na konfigurację wizualną
                const trunc = (s: string, max = 40) => s.length > max ? s.slice(0, max) + '...' : s;

                const statusLabel: Record<string, string> = {
                  NOWE: 'Nowe', W_TOKU: 'W toku', ROZWIAZANE: 'Rozwiązane', ZAMKNIETE: 'Zamknięte',
                };
                const priorityLabel: Record<string, string> = {
                  NISKI: 'Niski', NORMALNY: 'Normalny', WYSOKI: 'Wysoki',
                };
                const sl = (v: string) => statusLabel[v] ?? v;
                const pl = (v: string) => priorityLabel[v] ?? v;

                const getActivityConfig = (log: any) => {
                  const action = log.action;
                  const ticketId = log.ticket;
                  const user = log.user_details;
                  const userName = user ? `${user.first_name} ${user.last_name}` : 'System';
                  const bulk = log._bulkCount;
                  const bulkLabel = bulk ? `${bulk} zgłoszeń` : null;

                  switch (action) {
                    case 'CREATED':
                      return {
                        type: 'GREEN', icon: Plus, tab: 'Zgłoszenia',
                        text: bulk
                          ? (<span>{userName} utworzył(a) <strong>{bulkLabel}</strong></span>)
                          : (<span>{userName} utworzył(a) zgłoszenie <strong>#{ticketId}</strong></span>),
                        unread: true,
                      };

                    case 'STATUS_CHANGED': {
                      const oldS = log.old_value ? sl(log.old_value) : null;
                      const newS = log.new_value ? sl(log.new_value) : null;
                      const arrow = oldS && newS ? `: ${oldS} → ${newS}` : newS ? ` → ${newS}` : '';
                      const isResolved = ['ROZWIAZANE', 'ZAMKNIETE'].includes(log.new_value);
                      return {
                        type: isResolved ? 'GREEN' : 'ORANGE',
                        icon: isResolved ? CheckCircle2 : Activity,
                        tab: 'Zgłoszenia',
                        text: bulk
                          ? (<span>{userName} zmienił(a) status <strong>{bulkLabel}</strong>{newS ? ` → ${newS}` : ''}</span>)
                          : (<span>{userName} zmienił(a) status <strong>#{ticketId}</strong>{arrow}</span>),
                        unread: !isResolved,
                      };
                    }

                    case 'PRIORITY_CHANGED': {
                      const oldP = log.old_value ? pl(log.old_value) : null;
                      const newP = log.new_value ? pl(log.new_value) : null;
                      const arrow = oldP && newP ? `: ${oldP} → ${newP}` : newP ? ` → ${newP}` : '';
                      return {
                        type: 'ORANGE', icon: AlertTriangle, tab: 'Zgłoszenia',
                        text: bulk
                          ? (<span>{userName} zmienił(a) priorytet <strong>{bulkLabel}</strong>{newP ? ` → ${newP}` : ''}</span>)
                          : (<span>{userName} zmienił(a) priorytet <strong>#{ticketId}</strong>{arrow}</span>),
                        unread: true,
                      };
                    }

                    case 'CATEGORY_CHANGED': {
                      const oldC = log.old_value || null;
                      const newC = log.new_value || null;
                      const arrow = oldC && newC ? `: ${oldC} → ${newC}` : newC ? ` → ${newC}` : '';
                      return {
                        type: 'ORANGE', icon: ClipboardList, tab: 'Zgłoszenia',
                        text: bulk
                          ? (<span>{userName} zmienił(a) kategorię <strong>{bulkLabel}</strong>{newC ? ` → ${newC}` : ''}</span>)
                          : (<span>{userName} zmienił(a) kategorię <strong>#{ticketId}</strong>{arrow}</span>),
                        unread: false,
                      };
                    }

                    case 'TITLE_CHANGED': {
                      const oldT = log.old_value ? `„${trunc(log.old_value)}”` : null;
                      const newT = log.new_value ? `„${trunc(log.new_value)}”` : null;
                      const detail = oldT && newT ? `: ${oldT} → ${newT}` : newT ? ` → ${newT}` : '';
                      return {
                        type: 'ORANGE', icon: FileText, tab: '_edycje',
                        text: (<span>{userName} zmienił(a) tytuł <strong>#{ticketId}</strong>{detail}</span>),
                        unread: false,
                      };
                    }

                    case 'DESCRIPTION_CHANGED':
                      return {
                        type: 'ORANGE', icon: FileText, tab: '_edycje',
                        text: (<span>{userName} zaktualizował(a) opis zgłoszenia <strong>#{ticketId}</strong></span>),
                        unread: false,
                      };

                    case 'REOPENED':
                      return {
                        type: 'ORANGE', icon: Activity, tab: 'Zgłoszenia',
                        text: bulk
                          ? (<span>{userName} ponownie otworzył(a) <strong>{bulkLabel}</strong></span>)
                          : (<span>{userName} ponownie otworzył(a) <strong>#{ticketId}</strong></span>),
                        unread: true,
                      };

                    case 'AUTO_CLOSED':
                      return {
                        type: 'GREEN', icon: CheckCircle2, tab: 'Zgłoszenia',
                        text: (<span>System automatycznie zamknął <strong>#{ticketId}</strong></span>),
                        unread: false,
                      };

                    case 'TECHNICIAN_ASSIGNED': {
                      const tech = log.new_value || null;
                      return {
                        type: 'BLUE', icon: Users, tab: 'Zespół',
                        text: bulk
                          ? (<span>{userName} przypisał(a) technika do <strong>{bulkLabel}</strong>{tech ? `: ${tech}` : ''}</span>)
                          : (<span>{userName} przypisał(a) technika do <strong>#{ticketId}</strong>{tech ? `: ${tech}` : ''}</span>),
                        unread: false,
                      };
                    }

                    case 'TECHNICIAN_REMOVED': {
                      const tech = log.old_value || log.new_value || null;
                      return {
                        type: 'BLUE', icon: Users, tab: 'Zespół',
                        text: bulk
                          ? (<span>{userName} usunął(a) technika z <strong>{bulkLabel}</strong>{tech ? `: ${tech}` : ''}</span>)
                          : (<span>{userName} usunął(a) technika z <strong>#{ticketId}</strong>{tech ? `: ${tech}` : ''}</span>),
                        unread: false,
                      };
                    }

                    case 'CREATOR_CHANGED':
                      return {
                        type: 'BLUE', icon: Users, tab: 'Zgłoszenia',
                        text: (<span>{userName} zmienił(a) zgłaszającego w <strong>#{ticketId}</strong>{log.new_value ? ` → ${log.new_value}` : ''}</span>),
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
                      const isMultiple = log.new_value && /^\d+ załącznik/.test(log.new_value);
                      return {
                        type: 'PURPLE', icon: Paperclip, tab: 'Zgłoszenia',
                        text: isMultiple
                          ? (<span>{userName} dodał(a) {log.new_value} do <strong>#{ticketId}</strong></span>)
                          : (<span>{userName} dodał(a) załącznik do <strong>#{ticketId}</strong>{log.new_value ? `: ${log.new_value}` : ''}</span>),
                        unread: false,
                      };
                    }

                    case 'ATTACHMENT_DELETED':
                      return {
                        type: 'PURPLE', icon: Paperclip, tab: 'Zgłoszenia',
                        text: (<span>{userName} usunął(a) załącznik z <strong>#{ticketId}</strong>{log.old_value ? `: ${log.old_value}` : ''}</span>),
                        unread: false,
                      };

                    case 'WORK_LOGGED':
                      return {
                        type: 'PURPLE', icon: Timer, tab: 'Zespół',
                        text: (<span>{userName} zarejestrował(a) czas pracy w <strong>#{ticketId}</strong>{log.new_value ? ` (${log.new_value})` : ''}</span>),
                        unread: false,
                      };

                    default:
                      return {
                        type: 'ORANGE', icon: ClipboardList, tab: 'Zgłoszenia',
                        text: (<span>{userName}: aktualizacja <strong>#{ticketId}</strong></span>),
                        unread: false,
                      };
                  }
                };

                // Filtruj: ukryj ATTACHMENT_ADDED jeśli tuż po CREATED lub COMMENT_ADDED dla tego samego ticketu
                const parentEvents = new Set(
                  activityLogs
                    .filter(l => ['CREATED', 'COMMENT_ADDED'].includes(l.action))
                    .map(l => l.ticket)
                );

                const filteredLogs = activityLogs.filter(log => {
                  if (log.action === 'ATTACHMENT_ADDED' && parentEvents.has(log.ticket)) {
                    const parentLog = activityLogs.find(
                      l => ['CREATED', 'COMMENT_ADDED'].includes(l.action) && l.ticket === log.ticket
                    );
                    if (parentLog) {
                      const diff = Math.abs(dayjs(log.created_at).diff(dayjs(parentLog.created_at), 'second'));
                      if (diff < 60) return false;
                    }
                  }
                  return true;
                });

                // Grupuj bulk actions
                const groupedLogs = groupBulkLogs(filteredLogs);

                const activities = groupedLogs.map((log: any) => {
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
                    link: log._bulkCount ? '/tickets' : `/tickets/${log.ticket}`,
                  };
                });

                const filteredActivities = activityTab === 'Wszystkie'
                  ? activities
                  : activities.filter(a => a.tab === activityTab && a.tab !== '_edycje');

                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Ostatnia aktywność
                      </h2>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {activityTabs.map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActivityTab(tab)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${activityTab === tab
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
                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                            <Activity className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">Brak aktywności</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nie znaleziono zdarzeń dla wybranego filtru.</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
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
                              <Link
                                to={activity.link}
                                key={activity.id}
                                className="relative flex items-center px-4 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group overflow-hidden"
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mr-3.5 transition-transform group-hover:scale-105 ${bgClass} ${colorClass}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0 mr-3">
                                  <p className="text-[13px] text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">
                                    {activity.text}
                                  </p>
                                </div>
                                {/* Timestamp ↔ Zbadaj cross-fade — identical to risk panel */}
                                <div className="relative flex-shrink-0 w-20 text-right">
                                  <span className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 opacity-100 group-hover:opacity-0 transition-opacity duration-150 ease-in-out whitespace-nowrap">
                                    {formatActivityTime(activity.time)}
                                  </span>
                                  <span className="absolute inset-0 flex items-center justify-end text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out whitespace-nowrap pointer-events-none">
                                    Zbadaj →
                                  </span>
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
      </>
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

