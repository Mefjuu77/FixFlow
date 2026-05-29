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
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import useTitle from '../hooks/useTitle';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getActivityConfig, formatActivityTime } from '../utils/dashboardActivity';



// Plugin do obsługi czasu relatywnego (np. "2 godziny temu")
dayjs.extend(relativeTime);

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
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const isTechOrAdmin = authContext?.user?.role === 'ADMIN' || authContext?.user?.role === 'TECHNICIAN';
  useTitle(isTechOrAdmin ? t('nav.dashboard') : t('nav.dashboardEmployee'));
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState('all');
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
  const [hoverDate, setHoverDate] = useState<dayjs.Dayjs | null>(null);
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

  const plMonthsShort = t('calendar.monthsShort', { returnObjects: true }) as string[];
  const plMonthsFull = t('calendar.monthsFull', { returnObjects: true }) as string[];

  const applyPreset = (days: number) => {
    setDateRange({ start: dayjs().subtract(days - 1, 'day').startOf('day'), end: dayjs().endOf('day') });
    setShowDatePicker(false);
    setCustomStart(null);
    setHoverDate(null);
  };

  const applyToday = () => {
    setDateRange({ start: dayjs().startOf('day'), end: dayjs().endOf('day') });
    setShowDatePicker(false);
    setCustomStart(null);
    setHoverDate(null);
  };

  const applyThisMonth = () => {
    setDateRange({ start: dayjs().startOf('month'), end: dayjs().endOf('day') });
    setShowDatePicker(false);
    setCustomStart(null);
    setHoverDate(null);
  };

  const applyLastMonth = () => {
    const last = dayjs().subtract(1, 'month');
    setDateRange({ start: last.startOf('month'), end: last.endOf('month') });
    setShowDatePicker(false);
    setCustomStart(null);
    setHoverDate(null);
  };

  const handleDayClick = (d: dayjs.Dayjs) => {
    if (d.isAfter(dayjs(), 'day')) return; // blokuj przyszłe daty
    if (!customStart) {
      setCustomStart(d);
    } else {
      const [s, e] = d.isBefore(customStart) ? [d, customStart] : [customStart, d];
      setDateRange({ start: s.startOf('day'), end: e.endOf('day') });
      setShowDatePicker(false);
      setCustomStart(null);
      setHoverDate(null);
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
    const activeTickets = tickets
      .filter(t => ['NOWE', 'W_TOKU'].includes(t.status))
      .sort((a, b) => dayjs(b.updated_at).diff(dayjs(a.updated_at)));
    const resolvedTickets = tickets
      .filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status))
      .sort((a, b) => dayjs(b.updated_at).diff(dayjs(a.updated_at)));

    return (
      <div className="w-full h-[calc(100vh-2.5rem)] flex flex-col space-y-4 md:space-y-5 animate-in fade-in duration-700 pb-2">
        {/* Page header — greeting IS the main h1, CTA top-right */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-[22px]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {t('dashboard.greeting', { name: authContext?.user?.first_name })}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('dashboard.employeeSubtitle')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
            <Link
              to="/create-ticket"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm hover:shadow-md shadow-blue-600/10 transition-all text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.newTicket')}
            </Link>
          </div>
        </div>

        {/* Quick Actions — Zgłoś problem */}
        <div className="space-y-3 pt-1">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('dashboard.reportProblem')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: t('dashboard.quickLoginLabel'),
                sub: t('dashboard.quickLoginSub'),
                icon: <KeyRound className="w-5 h-5" />,
                category: 'Dostęp do konta',
                color: 'text-rose-600 dark:text-rose-400',
                bg: 'bg-rose-50 dark:bg-rose-500/10',
              },
              {
                label: t('dashboard.quickSoftwareLabel'),
                sub: t('dashboard.quickSoftwareSub'),
                icon: <Monitor className="w-5 h-5" />,
                category: 'Oprogramowanie',
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-500/10',
              },
              {
                label: t('dashboard.quickNetworkLabel'),
                sub: t('dashboard.quickNetworkSub'),
                icon: <Globe className="w-5 h-5" />,
                category: 'Sieć i internet',
                color: 'text-teal-600 dark:text-teal-400',
                bg: 'bg-teal-50 dark:bg-teal-500/10',
              },
              {
                label: t('dashboard.quickHardwareLabel'),
                sub: t('dashboard.quickHardwareSub'),
                icon: <Printer className="w-5 h-5" />,
                category: 'Sprzęt',
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-500/10',
              },
            ].map(action => (
              <Link
                key={action.label}
                to={`/create-ticket?category=${encodeURIComponent(action.category)}`}
                className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-blue-50 dark:hover:!bg-gray-700/50 hover:border-blue-300 dark:hover:!border-blue-500/50 hover:shadow-md transition-all duration-200 group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${action.bg} ${action.color} group-hover:scale-105 transition-transform`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {action.sub}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Grid: Aktywne + Ostatnio zamknięte */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0 pt-4 md:pt-6">
          {/* Aktywne Zgłoszenia */}
          <div className="xl:col-span-2 flex flex-col space-y-3 min-h-0">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t('dashboard.activeTickets')}
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex-1 flex flex-col min-h-0">
              {activeTickets.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('dashboard.noOpenTitle')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{t('dashboard.noOpenDesc')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50 flex-1 overflow-y-auto custom-scrollbar">
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
                        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <span className="font-bold text-gray-900 dark:text-white">#{ticket.id}</span>
                          <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                          {ticket.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {t('dashboard.updatedPrefix', { time: dayjs(ticket.updated_at).fromNow() })}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap flex-shrink-0 ${ticket.status === 'W_TOKU' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                        {ticket.status === 'W_TOKU' ? t('status.W_TOKU') : t('status.NOWE')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ostatnio Rozwiązane */}
          <div className="flex flex-col space-y-3 min-h-0">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {t('dashboard.recentlyClosed')}
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex-1 flex flex-col min-h-0">
              {resolvedTickets.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-5 text-gray-400 dark:text-gray-500">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{t('dashboard.noClosed')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50 flex-1 overflow-y-auto custom-scrollbar">
                  {resolvedTickets.slice(0, 30).map(ticket => (
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
                        {ticket.status === 'ROZWIAZANE' ? t('status.ROZWIAZANE') : t('status.ZAMKNIETE')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {resolvedTickets.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50">
                  <Link to="/tickets" className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                    {t('dashboard.allTickets')}
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
        label: t('dashboard.kpiTechOpen'),
        value: myOpen.length.toString(),
        icon: <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-100 dark:border-blue-500/20'
      },
      {
        label: t('dashboard.kpiTechInProgress'),
        value: myInProgress.length.toString(),
        icon: <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-100 dark:border-amber-500/20'
      },
      {
        label: t('dashboard.kpiPoolUnassigned'),
        value: unassignedTickets.length.toString(),
        icon: <Users className="w-6 h-6 text-red-600 dark:text-red-400" />,
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-100 dark:border-red-500/20'
      },
      {
        label: t('dashboard.kpiResolvedToday'),
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
              {t('dashboard.techTitle')}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {myOpen.length === 0
                  ? t('dashboard.techNoOpen')
                  : t('dashboard.techOpenSummary', { count: myOpen.length })}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/tickets?assignment=assigned_to_me"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-bold rounded-xl shadow-sm transition-all text-sm whitespace-nowrap"
            >
              {t('dashboard.myTickets')}
            </Link>
            <Link
              to="/create-ticket"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm hover:shadow-md shadow-blue-600/10 transition-all text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.newTicket')}
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
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
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
                { reason: 'critical_mine', label: t('dashboard.chipCriticalMine') },
                { reason: 'pool_unassigned', label: t('dashboard.chipToTake') },
                { reason: 'stale_mine', label: t('dashboard.chipUntouched') },
              ];

              const techRiskReasonLabel: Record<TechRiskReason, string> = {
                critical_mine: t('dashboard.reasonCriticalMine'),
                pool_unassigned: t('dashboard.reasonPoolUnassigned'),
                stale_mine: t('dashboard.reasonStaleMine'),
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
                  bg: 'bg-slate-100 dark:bg-slate-700/60',
                  icon: 'text-slate-600 dark:text-slate-300',
                  text: 'text-slate-700 dark:text-slate-200',
                },
              };

              const priorityBadge = (priority: string) => {
                const styles: Record<string, string> = {
                  WYSOKI: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                  NORMALNY: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                  NISKI: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
                };
                return (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[priority] || styles.NORMALNY}`}>
                    {t(`priority.${priority}`, priority)}
                  </span>
                );
              };

              const statusBadge = (status: string) => {
                const styles: Record<string, string> = {
                  NOWE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                  W_TOKU: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                };
                return (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {t(`status.${status}`, status)}
                  </span>
                );
              };

              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">

                  {/* Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {t('dashboard.needAttention')}
                        {techRiskItems.length > 0 && (
                          <span className="ml-2 text-sm font-semibold text-gray-400 dark:text-gray-500">
                            ({riskFilter ? visibleTechRisks.length : techRiskItems.length})
                          </span>
                        )}
                      </h2>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {techRiskItems.length === 0 ? (
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{t('dashboard.noProblems')}</span>
                      ) : (
                        <>
                          <button
                            onClick={() => setRiskFilter(null)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${riskFilter === null
                              ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                              }`}
                          >
                            {t('dashboard.tabAll')}
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
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('dashboard.greatJob')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.noUrgent')}</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {(() => {
                          const groupLabels: Record<TechRiskReason, string> = {
                            critical_mine: t('dashboard.groupCriticalMine'),
                            pool_unassigned: t('dashboard.groupToTake'),
                            stale_mine: t('dashboard.groupUntouched'),
                          };

                          let lastGroup: TechRiskReason | null = null;

                          return visibleTechRisks.map((risk) => {
                            const colors = techRiskReasonColor[risk.reason];
                            const tk = risk.ticket;

                            const RiskIcon = risk.reason === 'critical_mine'
                              ? AlertTriangle
                              : risk.reason === 'pool_unassigned'
                                ? Users
                                : Clock;

                            const idleLabel =
                              risk.reason === 'stale_mine'
                                ? t('dashboard.daysSilent', { n: risk.idle })
                                : risk.reason === 'pool_unassigned'
                                  ? t('dashboard.daysWaiting', { n: risk.age })
                                  : t('dashboard.daysShort', { n: risk.age });

                            const urgencyDays = getTechUrgencyDays(risk);

                            const severityBarColor =
                              urgencyDays >= 15
                                ? 'bg-rose-500/60'
                                : urgencyDays >= 8
                                  ? 'bg-orange-400/60'
                                  : urgencyDays >= 4
                                    ? 'bg-amber-400/60'
                                    : 'bg-emerald-400/60';

                            const ownershipTag = tk.technician === null ? t('dashboard.ownToTake') : t('dashboard.ownMine');

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
                              <React.Fragment key={tk.id}>
                                {groupHeader}
                                <Link
                                  to={`/tickets/${tk.id}`}
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
                                      <span className="text-[13px] font-bold text-gray-900 dark:text-white flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">#{tk.id}</span>
                                      <span className="mx-1.5 text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
                                      <span className="text-[13px] text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">{tk.title}</span>
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
                                      {priorityBadge(tk.priority)}
                                      {statusBadge(tk.status)}
                                      {riskFilter === null && (
                                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1.5">
                                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-500"></span>
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
                                      {t('dashboard.investigate')}
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
              const techActivityTabs = [
                { id: 'all', label: t('dashboard.tabAll') },
                { id: 'mine', label: t('dashboard.tabMine') },
                { id: 'pool', label: t('dashboard.tabPool') },
              ];

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
                const config = getActivityConfig(log, t, myId, 'tech');
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

              const filteredActivities = activityTab === 'all'
                ? activities
                : activities.filter(a => a.tab === activityTab && a.tab !== '_edits');

              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      {t('dashboard.recentActivity')}
                    </h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {techActivityTabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActivityTab(tab.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${activityTab === tab.id
                            ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                            }`}
                        >
                          {tab.label}
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
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('dashboard.noActivity')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.noActivityDesc')}</p>
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
                                  {formatActivityTime(activity.time, t)}
                                </span>
                                <span className="absolute inset-0 flex items-center justify-end text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out whitespace-nowrap pointer-events-none">
                                  {t('dashboard.investigate')}
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
      critical_unassigned: t('dashboard.reasonCriticalUnassigned'),
      stale_unassigned: t('dashboard.reasonStaleUnassigned'),
      frozen_progress: t('dashboard.reasonFrozen'),
    };

    const riskReasonColor: Record<RiskReason, { text: string; bg: string; icon: string }> = {
      critical_unassigned: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: 'text-rose-500' },
      stale_unassigned: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: 'text-amber-500' },
      frozen_progress: { text: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-700/60', icon: 'text-slate-600 dark:text-slate-300' },
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
        label: t('dashboard.kpiOpen'),
        value: openTickets.length,
        displayValue: openTickets.length.toString(),
        icon: <TicketIcon className="w-5 h-5" />,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-100/50 dark:ring-blue-500/20',
        trend: { ...openTrend, isGood: openTrend.direction === 'down' },
        tooltip: t('dashboard.tooltipMetrics', { current: openTickets.length, period: prevPeriodLabel, previous: prevOpen }),
      },
      {
        label: t('dashboard.kpiUnassigned'),
        value: waitingTickets.length,
        displayValue: waitingTickets.length.toString(),
        icon: <Users className="w-5 h-5" />,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-100/50 dark:ring-amber-500/20',
        trend: { ...waitingTrend, isGood: waitingTrend.direction === 'down' },
        tooltip: t('dashboard.tooltipMetrics', { current: waitingTickets.length, period: prevPeriodLabel, previous: prevWaiting }),
      },
      {
        label: t('dashboard.kpiResolved'),
        value: resolvedTickets.length,
        displayValue: resolvedTickets.length.toString(),
        icon: <CheckCircle2 className="w-5 h-5" />,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100/50 dark:ring-emerald-500/20',
        trend: { ...resolvedTrend, isGood: resolvedTrend.direction === 'up' },
        tooltip: t('dashboard.tooltipMetrics', { current: resolvedTickets.length, period: prevPeriodLabel, previous: prevResolved }),
      },
      {
        label: t('dashboard.kpiAvgResolution'),
        value: currentAvgMin,
        displayValue: formatMinutes(currentAvgMin),
        icon: <Timer className="w-5 h-5" />,
        iconColor: 'text-violet-600 dark:text-violet-400',
        iconBg: 'bg-violet-50 dark:bg-violet-500/10 ring-1 ring-violet-100/50 dark:ring-violet-500/20',
        trend: { ...avgTrend, isGood: avgTrend.direction === 'down' },
        tooltip: t('dashboard.tooltipMetrics', { current: formatMinutes(currentAvgMin), period: prevPeriodLabel, previous: formatMinutes(prevAvgMin) }),
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
                {t('dashboard.adminTitle')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {t('dashboard.adminSubtitle')}
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
                  {/* Presety */}
                  <div className="flex flex-col gap-1 min-w-[160px] pr-4 md:border-r border-gray-100 dark:border-gray-700">
                    <button onClick={applyToday} className="text-left px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors font-semibold">{t('dashboard.pickerToday')}</button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                    <button onClick={() => applyPreset(7)} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">{t('dashboard.pickerLast7')}</button>
                    <button onClick={() => applyPreset(14)} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">{t('dashboard.pickerLast14')}</button>
                    <button onClick={() => applyPreset(30)} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">{t('dashboard.pickerLast30')}</button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                    <button onClick={applyThisMonth} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">{t('dashboard.pickerThisMonth')}</button>
                    <button onClick={applyLastMonth} className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">{t('dashboard.pickerLastMonth')}</button>
                  </div>

                  {/* Mini kalendarz */}
                  <div className="w-64">
                    {/* Nawigacja: rok + miesiąc */}
                    <div className="flex justify-between items-center mb-3 px-1">
                      {/* Poprzedni rok */}
                      <button
                        onClick={() => setPickerView(p => ({ ...p, year: p.year - 1 }))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 text-xs font-bold"
                        title={t('dashboard.pickerPrevYear')}
                      >
                        «
                      </button>
                      {/* Poprzedni miesiąc */}
                      <button onClick={() => setPickerView(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                      </button>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm select-none">
                        {plMonthsFull[pickerView.month]} {pickerView.year}
                      </span>
                      {/* Następny miesiąc */}
                      <button
                        onClick={() => setPickerView(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })}
                        disabled={pickerView.year === dayjs().year() && pickerView.month >= dayjs().month()}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                      {/* Następny rok */}
                      <button
                        onClick={() => setPickerView(p => ({ ...p, year: p.year + 1 }))}
                        disabled={pickerView.year >= dayjs().year()}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('dashboard.pickerNextYear')}
                      >
                        »
                      </button>
                    </div>

                    {/* Dni tygodnia */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {(t('calendar.weekdays', { returnObjects: true }) as string[]).map(d => (
                        <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                      ))}
                    </div>

                    {/* Siatka dni */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const today = dayjs();
                        const firstDay = dayjs().year(pickerView.year).month(pickerView.month).startOf('month');
                        const daysInMonth = firstDay.daysInMonth();
                        const startPadding = firstDay.day() === 0 ? 6 : firstDay.day() - 1;

                        const days = [];
                        for (let i = 0; i < startPadding; i++) {
                          days.push(<div key={`pad-${i}`} className="h-8"></div>);
                        }

                        for (let i = 1; i <= daysInMonth; i++) {
                          const d = dayjs().year(pickerView.year).month(pickerView.month).date(i);
                          const isFuture = d.isAfter(today, 'day');
                          const isToday = d.isSame(today, 'day');

                          // Oblicz zaznaczenie i zakres
                          let isSelected = false;
                          let isInRange = false;
                          let isStart = false;
                          let isEnd = false;

                          // Preview hover range gdy wybrano customStart
                          if (customStart && !isFuture) {
                            if (d.isSame(customStart, 'day')) { isSelected = true; isStart = true; }
                            if (hoverDate) {
                              const [hStart, hEnd] = hoverDate.isBefore(customStart) ? [hoverDate, customStart] : [customStart, hoverDate];
                              if (d.isSame(hEnd, 'day')) { isSelected = true; isEnd = true; }
                              if (d.isAfter(hStart, 'day') && d.isBefore(hEnd, 'day')) isInRange = true;
                            }
                          } else if (!customStart) {
                            if (d.isSame(dateRange.start, 'day')) { isSelected = true; isStart = true; }
                            if (d.isSame(dateRange.end, 'day')) { isSelected = true; isEnd = true; }
                            if (d.isAfter(dateRange.start, 'day') && d.isBefore(dateRange.end, 'day')) isInRange = true;
                            if (d.isSame(dateRange.start, 'day') && d.isSame(dateRange.end, 'day')) { isStart = true; isEnd = true; }
                          }

                          let cls = "h-8 relative flex items-center justify-center text-sm rounded-lg transition-colors ";

                          if (isFuture) {
                            cls += "text-gray-300 dark:text-gray-600 cursor-not-allowed";
                          } else if (isSelected) {
                            cls += "bg-blue-600 text-white font-bold cursor-pointer z-10";
                            if (isStart && !isEnd) cls += " rounded-r-none";
                            if (!isStart && isEnd) cls += " rounded-l-none";
                          } else if (isInRange) {
                            cls += "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-none cursor-pointer";
                          } else {
                            cls += "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer";
                          }

                          days.push(
                            <div
                              key={`day-${i}`}
                              onClick={() => handleDayClick(d)}
                              onMouseEnter={() => customStart && !isFuture && setHoverDate(d)}
                              onMouseLeave={() => customStart && setHoverDate(null)}
                              className={cls}
                            >
                              {i}
                              {/* Marker dzisiaj */}
                              {isToday && !isSelected && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500"></span>
                              )}
                            </div>
                          );
                        }
                        return days;
                      })()}
                    </div>

                    {/* Podpowiedź wyboru zakresu */}
                    {customStart ? (
                      <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-3 animate-pulse">
                        {t('dashboard.pickerSelectEnd')}
                      </p>
                    ) : (
                      <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
                        {t('dashboard.pickerClickTwice')}
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
                      {t('dashboard.vsPrevPeriod')}
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

                const visibleRisks = (riskFilter
                  ? riskItems.filter(r => r.reason === riskFilter)
                  : riskItems
                ).slice().sort((a, b) => {
                  if (!riskFilter) {
                    const groupOrder: Record<RiskReason, number> = { critical_unassigned: 0, stale_unassigned: 1, frozen_progress: 2 };
                    const groupDiff = groupOrder[a.reason] - groupOrder[b.reason];
                    if (groupDiff !== 0) return groupDiff;
                  }
                  return getUrgencyDays(b) - getUrgencyDays(a);
                });


                const chipConfig: { reason: RiskReason; label: string; activeStyle: string; inactiveStyle: string }[] = [
                  {
                    reason: 'critical_unassigned',
                    label: t('dashboard.chipCritical'),
                    activeStyle: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white ring-2 ring-rose-300 dark:ring-rose-500/40',
                    inactiveStyle: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20',
                  },
                  {
                    reason: 'stale_unassigned',
                    label: t('dashboard.chipUnassigned'),
                    activeStyle: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white ring-2 ring-amber-300 dark:ring-amber-500/40',
                    inactiveStyle: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20',
                  },
                  {
                    reason: 'frozen_progress',
                    label: t('dashboard.chipFrozen'),
                    activeStyle: 'bg-gray-700 text-white dark:bg-gray-500 dark:text-white ring-2 ring-gray-400 dark:ring-gray-500/40',
                    inactiveStyle: 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50',
                  },
                ];

                const priorityBadge = (priority: string) => {
                  const styles: Record<string, string> = {
                    WYSOKI: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                    NORMALNY: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                    NISKI: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
                  };
                  return (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[priority] || styles.NORMALNY}`}>
                      {t(`priority.${priority}`, priority)}
                    </span>
                  );
                };

                const statusBadge = (status: string) => {
                  const styles: Record<string, string> = {
                    NOWE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                    W_TOKU: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                  };
                  return (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {t(`status.${status}`, status)}
                    </span>
                  );
                };

                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">

                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                          {t('dashboard.needAttention')}
                          {riskItems.length > 0 && (
                            <span className="ml-2 text-sm font-semibold text-gray-400 dark:text-gray-500">
                              ({riskFilter ? visibleRisks.length : riskItems.length})
                            </span>
                          )}
                        </h2>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {riskItems.length === 0 ? (
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{t('dashboard.noProblemsSystem')}</span>
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
                              {t('dashboard.tabAll')}
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
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('dashboard.allUnderControl')}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.noIntervention')}</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {(() => {
                            const groupLabels: Record<RiskReason, string> = {
                              critical_unassigned: t('dashboard.groupCritical'),
                              stale_unassigned: t('dashboard.groupUnassigned'),
                              frozen_progress: t('dashboard.groupFrozen'),
                            };
                            let lastGroup: RiskReason | null = null;

                            return visibleRisks.map((risk) => {
                              const colors = riskReasonColor[risk.reason];
                              const tk = risk.ticket;
  
                              const RiskIcon = risk.reason === 'critical_unassigned'
                                ? AlertTriangle
                                : risk.reason === 'stale_unassigned'
                                  ? Users
                                  : Clock;
  
                              const idleLabel =
                                risk.reason === 'frozen_progress'
                                  ? t('dashboard.daysSilent', { n: risk.idle })
                                  : risk.reason === 'stale_unassigned'
                                    ? t('dashboard.daysWaiting', { n: risk.age })
                                    : t('dashboard.daysShort', { n: risk.age });
  
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

                              // Group separator
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
                                <React.Fragment key={tk.id}>
                                  {groupHeader}
                              <Link
                                to={`/tickets/${tk.id}`}
                                key={tk.id}
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
                                    <span className="text-[13px] font-bold text-gray-900 dark:text-white flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">#{tk.id}</span>
                                    <span className="mx-1.5 text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
                                    <span className="text-[13px] text-gray-700 dark:text-gray-200 truncate block min-w-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">{tk.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`text-[11px] font-medium ${colors.text}`}>
                                      {riskReasonLabel[risk.reason]}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    {priorityBadge(tk.priority)}
                                    {statusBadge(tk.status)}
                                  </div>
                                </div>

                                {/* Timestamp ↔ Zbadaj cross-fade */}
                                <div className="relative flex-shrink-0 w-20 text-right">
                                  <span className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 opacity-100 group-hover:opacity-0 transition-opacity duration-150 ease-in-out">
                                    {idleLabel}
                                  </span>
                                  <span className="absolute inset-0 flex items-center justify-end text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out whitespace-nowrap pointer-events-none">
                                    {t('dashboard.investigate')}
                                  </span>
                                </div>
                              </Link>
                              </React.Fragment>
                            );
                          })})()}
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
                const activityTabs = [
                  { id: 'all', label: t('dashboard.tabAll') },
                  { id: 'tickets', label: t('dashboard.tabTickets') },
                  { id: 'team', label: t('dashboard.tabTeam') },
                ];

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
                  const config = getActivityConfig(log, t, authContext?.user?.id, 'admin');
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

                const filteredActivities = activityTab === 'all'
                  ? activities
                  : activities.filter(a => a.tab === activityTab && a.tab !== '_edits');

                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[580px]">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700/50">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        {t('dashboard.recentActivity')}
                      </h2>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {activityTabs.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActivityTab(tab.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${activityTab === tab.id
                              ? 'bg-gray-900 text-white dark:bg-blue-500/20 dark:text-blue-400'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                              }`}
                          >
                            {tab.label}
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
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('dashboard.noActivity')}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.noActivityDesc')}</p>
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
                                    {formatActivityTime(activity.time, t)}
                                  </span>
                                  <span className="absolute inset-0 flex items-center justify-end text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out whitespace-nowrap pointer-events-none">
                                    {t('dashboard.investigate')}
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
        <h2 className="text-xl font-bold text-gray-700">{t('dashboard.noAccess')}</h2>
        <p className="text-sm text-gray-500 mt-2">{t('dashboard.noAccessDesc')}</p>
      </div>
    </div>
  );
};

export default DashboardPage;

