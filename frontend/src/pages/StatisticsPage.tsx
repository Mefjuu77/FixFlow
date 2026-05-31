import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { Ticket } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useTitle from '../hooks/useTitle';
import {
  AlertTriangle,
  ArrowUpRight,
  Lightbulb,
  UserMinus,
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Ticket as TicketIcon,
  CheckCircle2,
  Info,
  Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { getCategoryIcon } from '../utils/ticketConstants';

dayjs.extend(isBetween);

// ==================== DONUT CHART (czysty SVG) ====================
interface DonutSegment {
  label: string;
  value: number;
  color: string;
  filterValue?: string;
}

const DonutChart: React.FC<{ segments: DonutSegment[]; total: number; filterType?: string; dateRange?: { start: dayjs.Dayjs; end: dayjs.Dayjs }; extraParams?: Record<string, string>; totalLabel?: string }> = ({ segments, total, filterType, dateRange, extraParams, totalLabel = 'Łącznie' }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 200;
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const buildUrl = (filterValue: string) => {
    if (!filterType) return '/tickets';
    const params = new URLSearchParams();
    params.set(filterType, filterValue);
    if (dateRange) {
      params.set('dateFrom', dateRange.start.format('YYYY-MM-DD'));
      params.set('dateTo', dateRange.end.format('YYYY-MM-DD'));
    }
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
    }
    return `/tickets?${params.toString()}`;
  };

  // Precompute segment angles for mouse hit detection
  const segmentAngles: { start: number; end: number }[] = [];
  let a = 0;
  segments.forEach(seg => {
    const pct = total > 0 ? seg.value / total : 0;
    segmentAngles.push({ start: a * 360, end: (a + pct) * 360 });
    a += pct;
  });

  let accumulated = 0;

  return (
    <div className="flex-1 flex items-center justify-center gap-8 w-full">
      <div className="relative flex-shrink-0" style={{ width: size + 16, height: size + 16 }}>
        <svg
          width={size + 16} height={size + 16} viewBox={`-8 -8 ${size + 16} ${size + 16}`}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = e.clientX - rect.left;
            const svgY = e.clientY - rect.top;
            const scale = (size + 16) / rect.width;
            const x = (svgX * scale - 8) - size / 2;
            const y = (svgY * scale - 8) - size / 2;
            const dist = Math.sqrt(x * x + y * y);
            const innerR = radius - strokeWidth / 2;
            const outerR = radius + strokeWidth / 2 + 8;
            if (dist < innerR || dist > outerR) { setHovered(null); return; }
            let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            const idx = segmentAngles.findIndex(s => angle >= s.start && angle < s.end);
            setHovered(idx >= 0 ? idx : null);
          }}
          onMouseLeave={() => setHovered(null)}
          onClick={() => {
            if (hovered !== null && filterType && segments[hovered]?.filterValue) {
              navigate(buildUrl(segments[hovered].filterValue!));
            }
          }}
          className="cursor-pointer overflow-visible"
        >
          {total === 0 && (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-gray-100" strokeWidth={strokeWidth} />
          )}
          {segments.map((seg, i) => {
            const pct = total > 0 ? seg.value / total : 0;
            const gap = 2; // Slightly wider gap since we removed the solid background track
            const segLength = circumference * pct - gap;
            const rotation = accumulated * 360 - 90;
            accumulated += pct;
            const isHovered = hovered === i;
            const isDimmed = hovered !== null && hovered !== i;
            return (
              <circle
                key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 8 : strokeWidth}
                strokeDasharray={`${Math.max(segLength, 0)} ${circumference}`}
                strokeLinecap="butt"
                transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                opacity={isDimmed ? 0.4 : 1}
                style={{ transition: 'stroke-width 0.2s ease, opacity 0.2s ease' }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hovered !== null && segments[hovered] ? (
            <>
              <span className="text-2xl font-extrabold text-gray-900">{segments[hovered].value}</span>
              <span className="text-xs font-bold" style={{ color: segments[hovered].color }}>{segments[hovered].label}</span>
              <span className="text-[10px] text-gray-400 font-medium">{total > 0 ? Math.round((segments[hovered].value / total) * 100) : 0}%</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-extrabold text-gray-900">{total}</span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{totalLabel}</span>            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {segments.map((seg, i) => {
          const isActive = hovered === i;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isActive ? 'bg-gray-100 scale-[1.03]' : 'hover:bg-gray-50'}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { if (filterType && seg.filterValue) navigate(buildUrl(seg.filterValue)); }}
            >
              <span className={`w-3 h-3 rounded-sm flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-125' : ''}`} style={{ backgroundColor: seg.color }} />
              <span className={`text-sm font-medium transition-colors ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{seg.label}:</span>
              <span className="text-sm font-bold text-gray-900">{seg.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== HORIZONTAL BAR ====================
const HorizontalBar: React.FC<{ label: string; value: number; max: number; color: string; icon?: React.ReactNode; onClick?: () => void; total?: number; tooltipTemplate?: string }> = ({ label, value, max, color, icon, onClick, total, tooltipTemplate }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : null;
  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tooltipRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      // Akceleracja sprzętowa transform zapobiega 'lagowaniu' układu (layout recalculation)
      tooltipRef.current.style.transform = `translate3d(${x + 12}px, -50%, 0)`;
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${isHovered ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="w-5 flex justify-center text-gray-400 flex-shrink-0">{icon}</div>
      <span className={`text-sm w-32 truncate font-medium transition-colors ${isHovered ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`} title={label}>{label}</span>
      <div
        className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-md relative flex items-center cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (tooltipRef.current) tooltipRef.current.style.opacity = '0'; }}
        onMouseEnter={(e) => {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
            handleMouseMove(e);
          }
        }}
      >
        <div
          className="h-full rounded-md flex items-center justify-end pr-2 transition-all duration-500 ease-out pointer-events-none"
          style={{ width: `${Math.max(pct, value > 0 ? 8 : 0)}%`, backgroundColor: color, transform: isHovered ? 'scaleY(1.15)' : 'scaleY(1)', transformOrigin: 'bottom' }}
        >
          {value > 0 && (
            <span className="text-xs font-bold text-white drop-shadow-sm">{value}</span>
          )}
        </div>

        {/* Tooltip ze śledzeniem kursora (bez setState dla wydajności) */}
        {isHovered && total !== undefined && total > 0 && (
          <div
            ref={tooltipRef}
            className="absolute top-1/2 left-0 bg-slate-900 dark:bg-slate-200 shadow-md rounded px-2 py-1 text-xs font-semibold text-white dark:text-slate-900 z-10 whitespace-nowrap pointer-events-none transition-opacity duration-150"
            style={{ willChange: 'transform' }}
          >
            {tooltipTemplate
              ? tooltipTemplate.replace('{{value}}', String(value)).replace('{{total}}', String(total))
              : `(${value}/${total})`}          </div>
        )}
      </div>
      {percentage !== null && (
        <span className={`text-xs font-semibold w-10 text-right transition-colors z-0 relative ${isHovered ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{percentage}%</span>
      )}
    </div>
  );
};

// ==================== MAIN PAGE ====================
const StatisticsPage: React.FC = () => {
  const { t } = useTranslation();
  useTitle(t('statistics.title'));
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const role = authContext?.user?.role;
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';

  // Month arrays from i18n (locale-aware)
  const plMonthsShort = t('calendar.monthsShort', { returnObjects: true }) as string[];
  const plMonthsFull = t('calendar.monthsFull', { returnObjects: true }) as string[];

  // ========== DATE PICKER STATE ==========
  const [dateRange, setDateRange] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day').startOf('day'),
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
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
        setCustomStart(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
  // =======================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ticketRes = await api.get('tickets/');
        setTickets(ticketRes.data);
      } catch (err) {
        console.error('Błąd pobierania danych statystyk', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---------- Dane wspólne ----------
  const filteredTickets = tickets.filter(t => dayjs(t.created_at).isBetween(dateRange.start, dateRange.end, 'day', '[]'));

  // Poprzedni okres dla trendów
  const rangeDays = dateRange.end.diff(dateRange.start, 'day') + 1;
  const prevStart = dateRange.start.subtract(rangeDays, 'day');
  const prevEnd = dateRange.start.subtract(1, 'day').endOf('day');
  const prevTickets = tickets.filter(t => dayjs(t.created_at).isBetween(prevStart, prevEnd, 'day', '[]'));

  const calcTrend = (current: number, prev: number) => {
    if (prev < 5) return { value: 0, direction: 'up' as const, invalid: true };
    const pct = ((current - prev) / prev) * 100;
    if (Math.abs(pct) > 300) return { value: 0, direction: 'up' as const, invalid: true };
    return {
      value: Math.abs(pct),
      direction: pct >= 0 ? 'up' as const : 'down' as const,
      invalid: false
    };
  };

  const activeTickets = filteredTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
  const allCount = filteredTickets.length;

  const prevActiveCount = prevTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;
  const prevAllCount = prevTickets.length;
  const prevResolvedCount = prevTickets.filter(t => t.status === 'ROZWIAZANE').length;
  const prevClosedCount = prevTickets.filter(t => t.status === 'ZAMKNIETE').length;

  // Statusy
  const statusData: DonutSegment[] = [
    { label: t('status.NOWE'), value: filteredTickets.filter(t => t.status === 'NOWE').length, color: '#3b82f6', filterValue: 'NOWE' },
    { label: t('status.W_TOKU'), value: filteredTickets.filter(t => t.status === 'W_TOKU').length, color: '#f59e0b', filterValue: 'W_TOKU' },
    { label: t('status.ROZWIAZANE'), value: filteredTickets.filter(t => t.status === 'ROZWIAZANE').length, color: '#22c55e', filterValue: 'ROZWIAZANE' },
    { label: t('status.ZAMKNIETE'), value: filteredTickets.filter(t => t.status === 'ZAMKNIETE').length, color: '#14b8a6', filterValue: 'ZAMKNIETE' },
  ];

  // Kategorie
  const unknownCategory = t('statistics.unassigned');
  const categoryMap = new Map<string, number>();
  activeTickets.forEach(ticket => {
    const cat = ticket.category_name || unknownCategory;
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const categorySorted = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxCategoryVal = categorySorted.length > 0 ? categorySorted[0][1] : 1;
  const categoryColors = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

  // Priorytety
  const priorityData: DonutSegment[] = [
    { label: t('priority.WYSOKI'), value: activeTickets.filter(t => t.priority === 'WYSOKI').length, color: '#ef4444', filterValue: 'WYSOKI' },
    { label: t('priority.NORMALNY'), value: activeTickets.filter(t => t.priority === 'NORMALNY').length, color: '#3b82f6', filterValue: 'NORMALNY' },
    { label: t('priority.NISKI'), value: activeTickets.filter(t => t.priority === 'NISKI').length, color: '#9ca3af', filterValue: 'NISKI' },
  ];

  // Obciążenie zespołu
  const workloadMap = new Map<string, { count: number; avatar?: string | null; techId?: number }>();
  let unassignedCount = 0;
  activeTickets.forEach(t => {
    if (!t.technician_details) {
      unassignedCount++;
    } else {
      const name = `${t.technician_details.first_name} ${t.technician_details.last_name}`;
      const current = workloadMap.get(name);
      workloadMap.set(name, {
        count: (current?.count || 0) + 1,
        avatar: t.technician_details.avatar,
        techId: t.technician_details.id
      });
    }
  });
  const workloadEntries = [...workloadMap.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxWorkload = Math.max(unassignedCount, ...(workloadEntries.map(e => e[1].count)), 1);

  // Sugestie
  const suggestions: { text: string; severity: 'warning' | 'info' | 'success', link?: string }[] = [];

  // Helper: link dla sugestii historycznych/trendowych (z zakresem dat)
  const trendLink = (params: Record<string, string>) => {
    const p = new URLSearchParams({
      ...params,
      dateFrom: dateRange.start.format('YYYY-MM-DD'),
      dateTo: dateRange.end.format('YYYY-MM-DD'),
    });
    return `/tickets?${p.toString()}`;
  };

  if (unassignedCount > 0) {
    suggestions.push({
      text: t('statistics.suggUnassigned', { count: unassignedCount }),
      severity: 'warning',
      link: trendLink({ assignment: 'unassigned', active_only: 'true' })
    });
  }

  const highPriorityOpen = activeTickets.filter(t => t.priority === 'WYSOKI');
  if (highPriorityOpen.length > 0) {
    suggestions.push({
      text: t('statistics.suggHighPriority', { count: highPriorityOpen.length }),
      severity: 'warning',
      link: trendLink({ priority: 'WYSOKI', active_only: 'true' })
    });
  }

  // Stare zgłoszenia z wysokim priorytetem (>3 dni)
  const oldHighPriority = highPriorityOpen.filter(t => dayjs().diff(dayjs(t.created_at), 'day') > 3);
  if (oldHighPriority.length > 0) {
    suggestions.push({
      text: t('statistics.suggOldHighPriority', { count: oldHighPriority.length }),
      severity: 'warning',
      link: trendLink({ priority: 'WYSOKI', active_only: 'true' })
    });
  }

  // Przeciążony technik (>2× średnia)
  if (!isTechnician && workloadEntries.length >= 2) {
    const avgLoad = workloadEntries.reduce((sum, [, d]) => sum + d.count, 0) / workloadEntries.length;
    const overloaded = workloadEntries.find(([, d]) => d.count > avgLoad * 2 && d.count >= 5);
    if (overloaded) {
      suggestions.push({
        text: t('statistics.suggOverloaded', { name: overloaded[0], count: overloaded[1].count, times: Math.round(overloaded[1].count / avgLoad) }),
        severity: 'warning',
        link: trendLink({ assignment: String(overloaded[1].techId), active_only: 'true' })
      });
    }
  }

  // Nierównomierny rozkład pracy
  if (!isTechnician && workloadEntries.length >= 2) {
    const maxEntry = workloadEntries[0];
    const minEntry = workloadEntries[workloadEntries.length - 1];
    if (maxEntry[1].count >= 5 && minEntry[1].count >= 1 && maxEntry[1].count / minEntry[1].count >= 3) {
      suggestions.push({
        text: t('statistics.suggImbalance', { max: maxEntry[0], maxCount: maxEntry[1].count, min: minEntry[0], minCount: minEntry[1].count }),
        severity: 'info',
      });
    }
  }

  // Spadek rozwiązywalności
  const prevResolvedTotal = prevTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;
  const currResolvedTotal = filteredTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;
  if (prevResolvedTotal >= 10 && currResolvedTotal < prevResolvedTotal * 0.7) {
    const dropPct = Math.round((1 - currResolvedTotal / prevResolvedTotal) * 100);
    suggestions.push({
      text: t('statistics.suggResolvedDrop', { pct: dropPct, curr: currResolvedTotal, prev: prevResolvedTotal }),
      severity: 'warning'
    });
  }

  // Stare aktywne zgłoszenia (>7 dni)
  const oldTickets = activeTickets.filter(t => dayjs().diff(dayjs(t.created_at), 'day') > 7);
  if (oldTickets.length > 0) {
    suggestions.push({
      text: t('statistics.suggOldTickets', { count: oldTickets.length }),
      severity: 'info',
      link: trendLink({ active_only: 'true' })
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      text: t('statistics.suggestionsOk'),
      severity: 'success'
    });
  }

  const datePickerElement = (
    <div className="relative" ref={datePickerRef}>
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300"
      >
        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span>{dateRangeLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
      </button>

      {showDatePicker && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 p-3 flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-top-2">
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

          <div className="w-64">
            <div className="flex justify-between items-center mb-3 px-1">
              <button onClick={() => setPickerView(p => ({ ...p, year: p.year - 1 }))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 text-xs font-bold" title={t('dashboard.pickerPrevYear')}>«</button>
              <button onClick={() => setPickerView(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <span className="font-semibold text-gray-900 dark:text-white text-sm select-none">
                {plMonthsFull[pickerView.month]} {pickerView.year}
              </span>
              <button onClick={() => setPickerView(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })} disabled={pickerView.year === dayjs().year() && pickerView.month >= dayjs().month()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
              <button onClick={() => setPickerView(p => ({ ...p, year: p.year + 1 }))} disabled={pickerView.year >= dayjs().year()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed" title={t('dashboard.pickerNextYear')}>»</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {(t('calendar.weekdays', { returnObjects: true }) as string[]).map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const today = dayjs();
                const firstDay = dayjs().year(pickerView.year).month(pickerView.month).startOf('month');
                const daysInMonth = firstDay.daysInMonth();
                const startPadding = firstDay.day() === 0 ? 6 : firstDay.day() - 1;
                const days = [];
                for (let i = 0; i < startPadding; i++) days.push(<div key={`pad-${i}`} className="h-8"></div>);
                for (let i = 1; i <= daysInMonth; i++) {
                  const d = dayjs().year(pickerView.year).month(pickerView.month).date(i);
                  const isFuture = d.isAfter(today, 'day');
                  const isToday = d.isSame(today, 'day');
                  let isSelected = false;
                  let isInRange = false;
                  let isStart = false;
                  let isEnd = false;
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
                  if (isFuture) cls += "text-gray-300 dark:text-gray-600 cursor-not-allowed";
                  else if (isSelected) {
                    cls += "bg-blue-600 text-white font-bold cursor-pointer z-10";
                    if (isStart && !isEnd) cls += " rounded-r-none";
                    if (!isStart && isEnd) cls += " rounded-l-none";
                  } else if (isInRange) cls += "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-none cursor-pointer";
                  else cls += "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer";
                  days.push(
                    <div key={`day-${i}`} onClick={() => handleDayClick(d)} onMouseEnter={() => customStart && !isFuture && setHoverDate(d)} onMouseLeave={() => customStart && setHoverDate(null)} className={cls}>
                      {i}
                      {isToday && !isSelected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500"></span>}
                    </div>
                  );
                }
                return days;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== TECHNIK ====================
  if (isTechnician) {
    const myTickets = filteredTickets.filter(t => t.technician === authContext?.user?.id);
    const myActive = myTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
    const myResolved = myTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    const prevMyTickets = prevTickets.filter(t => t.technician === authContext?.user?.id);
    const prevMyActiveCount = prevMyTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;
    const prevMyResolvedCount = prevMyTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;
    const prevUnassignedCount = prevTickets.filter(t => !t.technician_details && !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status)).length;

    const trendMyActive = calcTrend(myActive.length, prevMyActiveCount);
    const trendMyResolved = calcTrend(myResolved.length, prevMyResolvedCount);
    const trendUnassigned = calcTrend(unassignedCount, prevUnassignedCount);

    const formatTrend = (trendData: ReturnType<typeof calcTrend>, isGoodWhenUp: boolean) => {
      const isGood = trendData.direction === 'up' ? isGoodWhenUp : !isGoodWhenUp;
      return { ...trendData, isGood };
    };

    const techKpis = [
      {
        label: t('statistics.kpiMyActive'),
        value: myActive.length,
        icon: <Clock className="w-5 h-5" />,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-100/50 dark:ring-blue-500/20',
        trend: formatTrend(trendMyActive, false),
      },
      {
        label: t('statistics.kpiMyResolved'),
        value: myResolved.length,
        icon: <CheckCircle2 className="w-5 h-5" />,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100/50 dark:ring-emerald-500/20',
        trend: formatTrend(trendMyResolved, true),
      },
      {
        label: t('statistics.kpiSystemUnassigned'),
        value: unassignedCount,
        icon: <UserMinus className="w-5 h-5" />,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-100/50 dark:ring-amber-500/20',
        trend: formatTrend(trendUnassigned, false),
      },
    ];

    const myStatusData: DonutSegment[] = [
      { label: t('status.NOWE'), value: myTickets.filter(t => t.status === 'NOWE').length, color: '#3b82f6', filterValue: 'NOWE' },
      { label: t('status.W_TOKU'), value: myTickets.filter(t => t.status === 'W_TOKU').length, color: '#f59e0b', filterValue: 'W_TOKU' },
      { label: t('status.ROZWIAZANE'), value: myTickets.filter(t => t.status === 'ROZWIAZANE').length, color: '#22c55e', filterValue: 'ROZWIAZANE' },
      { label: t('status.ZAMKNIETE'), value: myTickets.filter(t => t.status === 'ZAMKNIETE').length, color: '#14b8a6', filterValue: 'ZAMKNIETE' },
    ];

    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        {/* Nagłówek */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('statistics.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
              {t('statistics.techSubtitle')}
            </p>
          </div>
          {datePickerElement}
        </div>

        {/* Kafelki podsumowania */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          {techKpis.map((kpi, index) => {
            const trendColor = kpi.trend.isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
            const trendBg = kpi.trend.isGood ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10';
            const TrendIcon = kpi.trend.direction === 'up' ? TrendingUp : TrendingDown;

            return (
              <div key={index} className="group relative flex flex-col p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">
                    {kpi.label}
                  </p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.iconBg} ${kpi.iconColor}`}>
                    {kpi.icon}
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
                  {kpi.value}
                </p>
                <div className="flex items-center mt-auto">
                  {kpi.trend.invalid ? (
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                      — brak danych
                    </span>
                  ) : (
                    <>
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold ${trendColor} ${trendBg}`}>
                        <TrendIcon className="w-3.5 h-3.5" />
                        <span>{kpi.trend.value.toFixed(1).replace('.', ',')}%</span>
                      </div>
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-2">
                        {t('statistics.vsPrevPeriod')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Siatka statystyk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Przegląd statusów (moje) */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartStatusTitle')}</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center">
                {t('statistics.viewTickets')} <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartStatusSubtechnik')}</p>
            <DonutChart segments={myStatusData} total={myTickets.length} filterType="status" dateRange={dateRange} totalLabel={t('statistics.donutTotal')} extraParams={{ assignment: String(authContext?.user?.id) }} />
          </div>

          {/* Rodzaj zgłoszeń */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartCategoryTitle')}</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center">
                {t('statistics.viewTickets')} <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartCategorySub')}</p>
            <div className="flex-1 space-y-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
              {categorySorted.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-6">Brak otwartych zgłoszeń.</p>
              ) : (
                categorySorted.map(([cat, count], i) => (
                  <HorizontalBar key={cat} label={t(`categories.${cat}`, cat)} value={count} max={maxCategoryVal} color={categoryColors[i % categoryColors.length]} total={activeTickets.length} tooltipTemplate={t('statistics.barTooltip')} icon={getCategoryIcon(cat)} onClick={() => {
                    const params = new URLSearchParams({ category: cat, dateFrom: dateRange.start.format('YYYY-MM-DD'), dateTo: dateRange.end.format('YYYY-MM-DD') });
                    navigate(`/tickets?${params.toString()}`);
                  }} />
                ))
              )}
            </div>
          </div>

          {/* Podział priorytetów */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartPriorityTitle')}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartPrioritySub')}</p>
            <DonutChart segments={priorityData} total={activeTickets.length} filterType="priority" dateRange={dateRange} totalLabel={t('statistics.donutTotal')} />
          </div>

          {/* Obciążenie zespołu */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartWorkloadTitle')}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartWorkloadSubTech')}</p>
            <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: '260px', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
              {unassignedCount > 0 && (
                <HorizontalBar label={t('statistics.unassigned')} value={unassignedCount} max={maxWorkload} color="#f87171" total={activeTickets.length} tooltipTemplate={t('statistics.barTooltip')} icon={<UserMinus className="w-4 h-4 text-amber-500" />} onClick={() => navigate('/tickets?assignment=unassigned')} />
              )}
              {workloadEntries.map(([name, data]) => (
                <HorizontalBar key={name} label={name} value={data.count} max={maxWorkload} color="#6366f1" total={activeTickets.length} tooltipTemplate={t('statistics.barTooltip')} icon={
                  data.avatar ? (
                    <img src={data.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-[10px] font-bold text-white uppercase">{name.charAt(0)}</span></div>
                  )
                } onClick={() => navigate(`/tickets?assignment=${data.techId}`)} />
              ))}
              {workloadEntries.length === 0 && unassignedCount === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak aktywnych zgłoszeń.</p>
              )}
            </div>
          </div>

          {/* Sugestie */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.suggestionsTitle')}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.suggestionsSub')}</p>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${s.severity === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                    : s.severity === 'info'
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                      : 'bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/20'
                    }`}
                >
                  {s.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  ) : s.severity === 'info' ? (
                    <Info className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
                  )}
                  <span className="flex-1">{s.text}</span>
                  {s.link && (
                    <Link to={s.link} onAuxClick={(e) => { e.preventDefault(); window.open(s.link, '_blank', 'noopener,noreferrer'); }} className="flex-shrink-0 flex items-center text-xs font-bold px-3 py-1.5 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-sm border border-black/5 dark:border-white/5 hover:shadow transition-all group">
                      {t('statistics.suggestionsView')}
                      <ArrowUpRight className="w-3 h-3 ml-1 text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==================== ADMIN ====================
  if (isAdmin) {
    const totalResolved = filteredTickets.filter(t => t.status === 'ROZWIAZANE').length;
    const totalClosed = filteredTickets.filter(t => t.status === 'ZAMKNIETE').length;

    const trendAll = calcTrend(allCount, prevAllCount);
    const trendActive = calcTrend(activeTickets.length, prevActiveCount);
    const trendResolved = calcTrend(totalResolved, prevResolvedCount);
    const trendClosed = calcTrend(totalClosed, prevClosedCount);

    const formatTrend = (trendData: ReturnType<typeof calcTrend>, isGoodWhenUp: boolean) => {
      const isGood = trendData.direction === 'up' ? isGoodWhenUp : !isGoodWhenUp;
      return { ...trendData, isGood };
    };

    const adminKpis = [
      {
        label: t('statistics.kpiAll'),
        value: allCount,
        icon: <TicketIcon className="w-5 h-5" />,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-100/50 dark:ring-blue-500/20',
        trend: formatTrend(trendAll, false), // more tickets = not necessarily bad, but usually red? Let's say false = down is good
      },
      {
        label: t('statistics.kpiActive'),
        value: activeTickets.length,
        icon: <Clock className="w-5 h-5" />,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-100/50 dark:ring-amber-500/20',
        trend: formatTrend(trendActive, false), // less active = good
      },
      {
        label: t('statistics.kpiResolved'),
        value: totalResolved,
        icon: <CheckCircle2 className="w-5 h-5" />,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100/50 dark:ring-emerald-500/20',
        trend: formatTrend(trendResolved, true), // more resolved = good
      },
      {
        label: t('statistics.kpiClosed'),
        value: totalClosed,
        icon: <CheckCircle2 className="w-5 h-5" />,
        iconColor: 'text-teal-600 dark:text-teal-400',
        iconBg: 'bg-teal-50 dark:bg-teal-500/10 ring-1 ring-teal-100/50 dark:ring-teal-500/20',
        trend: formatTrend(trendClosed, true), // more closed = good
      },
    ];

    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        {/* Nagłówek */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('statistics.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
              {t('statistics.adminSubtitle')}
            </p>
          </div>
          
          {datePickerElement}
        </div>

        {/* Kafelki podsumowania */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {adminKpis.map((kpi, index) => {
            const trendColor = kpi.trend.isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
            const trendBg = kpi.trend.isGood ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10';
            const TrendIcon = kpi.trend.direction === 'up' ? TrendingUp : TrendingDown;

            return (
              <div key={index} className="group relative flex flex-col p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">
                    {kpi.label}
                  </p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.iconBg} ${kpi.iconColor}`}>
                    {kpi.icon}
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
                  {kpi.value}
                </p>
                <div className="flex items-center mt-auto">
                  {kpi.trend.invalid ? (
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                      — brak danych
                    </span>
                  ) : (
                    <>
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold ${trendColor} ${trendBg}`}>
                        <TrendIcon className="w-3.5 h-3.5" />
                        <span>{kpi.trend.value.toFixed(1).replace('.', ',')}%</span>
                      </div>
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-2">
                        {t('statistics.vsPrevPeriod')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Siatka statystyk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Przegląd statusów */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartStatusTitle')}</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center">
                {t('statistics.viewAllTickets')} <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartStatusSubadmin')}</p>
            <DonutChart segments={statusData} total={allCount} filterType="status" dateRange={dateRange} totalLabel={t('statistics.donutTotal')} />
          </div>

          {/* Rodzaj zgłoszeń */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartCategoryTitle')}</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center">
                {t('statistics.viewAllTickets')} <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartCategorySub')}</p>
            <div className="flex-1 space-y-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
              {categorySorted.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak otwartych zgłoszeń.</p>
              ) : (
                categorySorted.map(([cat, count], i) => (
                  <HorizontalBar key={cat} label={t(`categories.${cat}`, cat)} value={count} max={maxCategoryVal} color={categoryColors[i % categoryColors.length]} total={activeTickets.length} tooltipTemplate={t('statistics.barTooltip')} icon={getCategoryIcon(cat)} onClick={() => {
                    const params = new URLSearchParams({ category: cat, dateFrom: dateRange.start.format('YYYY-MM-DD'), dateTo: dateRange.end.format('YYYY-MM-DD') });
                    navigate(`/tickets?${params.toString()}`);
                  }} />
                ))
              )}
            </div>
          </div>

          {/* Podział priorytetów */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartPriorityTitle')}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartPrioritySub')}</p>
            <DonutChart segments={priorityData} total={activeTickets.length} filterType="priority" dateRange={dateRange} totalLabel={t('statistics.donutTotal')} />
          </div>

          {/* Obciążenie zespołu */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.chartWorkloadTitle')}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.chartWorkloadSubAdmin')}</p>

            <div className="space-y-1 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-medium">{t('statistics.workloadColPerson')}</span>
                <span className="text-gray-600 dark:text-gray-300 font-medium">{t('statistics.workloadColDist')}</span>
              </div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
              {unassignedCount > 0 && (
                <HorizontalBar label={t('statistics.unassigned')} value={unassignedCount} max={maxWorkload} color="#f87171" total={activeTickets.length} tooltipTemplate={t('statistics.barTooltip')} icon={<UserMinus className="w-4 h-4 text-amber-500" />} onClick={() => navigate('/tickets?assignment=unassigned')} />
              )}
              {workloadEntries.map(([name, data]) => (
                <HorizontalBar key={name} label={name} value={data.count} max={maxWorkload} color="#6366f1" total={activeTickets.length} tooltipTemplate={t('statistics.barTooltip')} icon={
                  data.avatar ? (
                    <img src={data.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-[10px] font-bold text-white uppercase">{name.charAt(0)}</span></div>
                  )
                } onClick={() => navigate(`/tickets?assignment=${data.techId}`)} />
              ))}
              {workloadEntries.length === 0 && unassignedCount === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak aktywnych zgłoszeń.</p>
              )}
            </div>
          </div>

          {/* Sugestie */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900 dark:text-white">{t('statistics.suggestionsTitle')}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('statistics.suggestionsSub')}</p>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${s.severity === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                    : s.severity === 'info'
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                      : 'bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/20'
                    }`}
                >
                  {s.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  ) : s.severity === 'info' ? (
                    <Info className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
                  )}
                  <span className="flex-1">{s.text}</span>
                  {s.link && (
                    <Link to={s.link} onAuxClick={(e) => { e.preventDefault(); window.open(s.link, '_blank', 'noopener,noreferrer'); }} className="flex-shrink-0 flex items-center text-xs font-bold px-3 py-1.5 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-sm border border-black/5 dark:border-white/5 hover:shadow transition-all group">
                      {t('statistics.suggestionsView')}
                      <ArrowUpRight className="w-3 h-3 ml-1 text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Fallback – rola bez dostępu
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-10">
        <h2 className="text-xl font-bold text-gray-700">Brak dostępu</h2>
        <p className="text-sm text-gray-500 mt-2">Sekcja statystyk jest dostępna tylko dla techników i administratorów.</p>
      </div>
    </div>
  );
};

export default StatisticsPage;
