import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { Ticket } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import useTitle from '../hooks/useTitle';
import {
  AlertTriangle,
  ArrowUpRight,
  Lightbulb,
  Users as UsersIcon,
  Cpu,
  AppWindow,
  Globe,
  KeyRound,
  Shapes,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
dayjs.locale('pl');

const getCategoryIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('sprzęt')) return <Cpu className="w-4 h-4" />;
  if (lowerName.includes('oprogramowanie')) return <AppWindow className="w-4 h-4" />;
  if (lowerName.includes('sieć')) return <Globe className="w-4 h-4" />;
  if (lowerName.includes('dostęp')) return <KeyRound className="w-4 h-4" />;
  return <Shapes className="w-4 h-4" />;
};

// ==================== DONUT CHART (czysty SVG) ====================
interface DonutSegment {
  label: string;
  value: number;
  color: string;
  filterValue?: string;
}

const DonutChart: React.FC<{ segments: DonutSegment[]; total: number; filterType?: string }> = ({ segments, total, filterType }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 200;
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

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
    <div className="flex items-center justify-between w-full">
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
              navigate(`/tickets?${filterType}=${segments[hovered].filterValue}`);
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
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Łącznie</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 ml-auto">
        {segments.map((seg, i) => {
          const isActive = hovered === i;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isActive ? 'bg-gray-100 scale-[1.03]' : 'hover:bg-gray-50'}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { if (filterType && seg.filterValue) navigate(`/tickets?${filterType}=${seg.filterValue}`); }}
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
const HorizontalBar: React.FC<{ label: string; value: number; max: number; color: string; icon?: React.ReactNode; onClick?: () => void; total?: number }> = ({ label, value, max, color, icon, onClick, total }) => {
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
            ({value}/{total} zgłoszeń)
          </div>
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
  useTitle('Statystyki');
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const role = authContext?.user?.role;
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';

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
  const activeTickets = tickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
  const allCount = tickets.length;

  // Statusy
  const statusData: DonutSegment[] = [
    { label: 'Nowe', value: tickets.filter(t => t.status === 'NOWE').length, color: '#3b82f6', filterValue: 'NOWE' },
    { label: 'W toku', value: tickets.filter(t => t.status === 'W_TOKU').length, color: '#f59e0b', filterValue: 'W_TOKU' },
    { label: 'Rozwiązane', value: tickets.filter(t => t.status === 'ROZWIAZANE').length, color: '#22c55e', filterValue: 'ROZWIAZANE' },
    { label: 'Zamknięte', value: tickets.filter(t => t.status === 'ZAMKNIETE').length, color: '#6b7280', filterValue: 'ZAMKNIETE' },
  ];

  // Kategorie
  const categoryMap = new Map<string, number>();
  activeTickets.forEach(t => {
    const cat = t.category_name || 'Nieznana';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const categorySorted = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxCategoryVal = categorySorted.length > 0 ? categorySorted[0][1] : 1;
  const categoryColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#14b8a6'];

  // Priorytety
  const priorityData: DonutSegment[] = [
    { label: 'Wysoki', value: activeTickets.filter(t => t.priority === 'WYSOKI').length, color: '#ef4444', filterValue: 'WYSOKI' },
    { label: 'Normalny', value: activeTickets.filter(t => t.priority === 'NORMALNY').length, color: '#3b82f6', filterValue: 'NORMALNY' },
    { label: 'Niski', value: activeTickets.filter(t => t.priority === 'NISKI').length, color: '#9ca3af', filterValue: 'NISKI' },
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
  const suggestions: { text: string; severity: 'warning' | 'info' | 'success' }[] = [];

  if (unassignedCount > 0) {
    suggestions.push({
      text: `${unassignedCount} zgłosze${unassignedCount === 1 ? 'nie nie jest przypisane' : (unassignedCount < 5 ? 'nia nie są przypisane' : 'ń nie jest przypisanych')} do żadnego technika.`,
      severity: 'warning'
    });
  }

  const highPriorityOpen = activeTickets.filter(t => t.priority === 'WYSOKI');
  if (highPriorityOpen.length > 0) {
    suggestions.push({
      text: `${highPriorityOpen.length} otwart${highPriorityOpen.length === 1 ? 'e zgłoszenie' : (highPriorityOpen.length < 5 ? 'e zgłoszenia' : 'ych zgłoszeń')} z wysokim priorytetem wymaga uwagi.`,
      severity: 'warning'
    });
  }

  const oldTickets = activeTickets.filter(t => dayjs().diff(dayjs(t.created_at), 'day') > 7);
  if (oldTickets.length > 0) {
    suggestions.push({
      text: `${oldTickets.length} zgłosze${oldTickets.length === 1 ? 'nie jest' : (oldTickets.length < 5 ? 'nia są' : 'ń jest')} otwart${oldTickets.length === 1 ? 'e' : (oldTickets.length < 5 ? 'e' : 'ych')} dłużej niż 7 dni.`,
      severity: 'info'
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      text: 'Brak problemów – wszystko wygląda dobrze!',
      severity: 'success'
    });
  }

  // ==================== TECHNIK ====================
  if (isTechnician) {
    const myTickets = tickets.filter(t => t.technician === authContext?.user?.id);
    const myActive = myTickets.filter(t => !['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));
    const myResolved = myTickets.filter(t => ['ROZWIAZANE', 'ZAMKNIETE'].includes(t.status));

    const myStatusData: DonutSegment[] = [
      { label: 'Nowe', value: myTickets.filter(t => t.status === 'NOWE').length, color: '#3b82f6', filterValue: 'NOWE' },
      { label: 'W toku', value: myTickets.filter(t => t.status === 'W_TOKU').length, color: '#f59e0b', filterValue: 'W_TOKU' },
      { label: 'Rozwiązane', value: myTickets.filter(t => t.status === 'ROZWIAZANE').length, color: '#22c55e', filterValue: 'ROZWIAZANE' },
      { label: 'Zamknięte', value: myTickets.filter(t => t.status === 'ZAMKNIETE').length, color: '#6b7280', filterValue: 'ZAMKNIETE' },
    ];

    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        {/* Nagłówek */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Statystyki 📊
            </h1>
            <p className="mt-1 text-gray-500">
              Przegląd Twoich przypisanych zgłoszeń i ogólnych danych.
            </p>
          </div>
        </div>

        {/* Kafelki podsumowania */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Moje aktywne</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{myActive.length}</p>
          </div>
          <div className="bg-white border border-green-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Moje rozwiązane</p>
            <p className="text-3xl font-extrabold text-green-600 mt-1">{myResolved.length}</p>
          </div>
          <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Nieprzypisane w systemie</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{unassignedCount}</p>
          </div>
        </div>

        {/* Siatka statystyk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Przegląd statusów (moje) */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Przegląd statusów</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                Wyświetl zgłoszenia <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-5">Rozkład statusów Twoich zgłoszeń.</p>
            <DonutChart segments={myStatusData} total={myTickets.length} filterType="status" />
          </div>

          {/* Rodzaj zgłoszeń */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Rodzaj zgłoszeń</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                Wyświetl zgłoszenia <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-5">Otwarte zgłoszenia według kategorii.</p>
            <div className="space-y-3">
              {categorySorted.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak otwartych zgłoszeń.</p>
              ) : (
                categorySorted.map(([cat, count], i) => (
                  <HorizontalBar key={cat} label={cat} value={count} max={maxCategoryVal} color={categoryColors[i % categoryColors.length]} total={activeTickets.length} icon={getCategoryIcon(cat)} onClick={() => navigate(`/tickets?category=${encodeURIComponent(cat)}`)} />
                ))
              )}
            </div>
          </div>

          {/* Podział priorytetów */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Priorytety zgłoszeń</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Rozkład aktywnych zgłoszeń według priorytetu.</p>
            <DonutChart segments={priorityData} total={activeTickets.length} filterType="priority" />
          </div>

          {/* Obciążenie zespołu */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Obciążenie zespołu</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Rozkład aktywnych zgłoszeń w zespole.</p>
            <div className="space-y-3">
              {unassignedCount > 0 && (
                <HorizontalBar label="Nie przypisano" value={unassignedCount} max={maxWorkload} color="#f87171" total={activeTickets.length} icon={<UsersIcon className="w-4 h-4 text-gray-400" />} onClick={() => navigate('/tickets?assignment=unassigned')} />
              )}
              {workloadEntries.map(([name, data]) => (
                <HorizontalBar key={name} label={name} value={data.count} max={maxWorkload} color="#6366f1" total={activeTickets.length} icon={
                  data.avatar ? (
                    <img src={data.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center"><span className="text-[10px] font-bold text-indigo-600">{name.charAt(0)}</span></div>
                  )
                } onClick={() => navigate(`/tickets?assignment=${data.techId}`)} />
              ))}
              {workloadEntries.length === 0 && unassignedCount === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak aktywnych zgłoszeń.</p>
              )}
            </div>
          </div>

          {/* Sugestie */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900">Sugestie</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Automatyczne wskazówki na podstawie danych.</p>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl text-sm font-medium ${s.severity === 'warning'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : s.severity === 'info'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-green-50 text-green-800 border border-green-200'
                    }`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.severity === 'warning' ? 'text-amber-500' : s.severity === 'info' ? 'text-blue-500' : 'text-green-500'
                    }`} />
                  {s.text}
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
    const totalResolved = tickets.filter(t => t.status === 'ROZWIAZANE').length;
    const totalClosed = tickets.filter(t => t.status === 'ZAMKNIETE').length;

    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        {/* Nagłówek */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Statystyki 📊
            </h1>
            <p className="mt-1 text-gray-500">
              Globalny przegląd systemu i obciążenia zespołu.
            </p>
          </div>
        </div>

        {/* Kafelki podsumowania */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Wszystkie</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{allCount}</p>
          </div>
          <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Aktywne</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{activeTickets.length}</p>
          </div>
          <div className="bg-white border border-green-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Rozwiązane</p>
            <p className="text-3xl font-extrabold text-green-600 mt-1">{totalResolved}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Zamknięte</p>
            <p className="text-3xl font-extrabold text-gray-600 mt-1">{totalClosed}</p>
          </div>
        </div>

        {/* Siatka statystyk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Przegląd statusów */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Przegląd statusów</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                Wyświetl wszystkie zgłoszenia <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-5">Szybki wgląd w status wszystkich zgłoszeń.</p>
            <DonutChart segments={statusData} total={allCount} filterType="status" />
          </div>

          {/* Rodzaj zgłoszeń */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Rodzaj zgłoszeń</h3>
              <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                Wyświetl wszystkie zgłoszenia <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-5">Otwarte zgłoszenia według kategorii.</p>
            <div className="space-y-3">
              {categorySorted.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak otwartych zgłoszeń.</p>
              ) : (
                categorySorted.map(([cat, count], i) => (
                  <HorizontalBar key={cat} label={cat} value={count} max={maxCategoryVal} color={categoryColors[i % categoryColors.length]} total={activeTickets.length} icon={getCategoryIcon(cat)} onClick={() => navigate(`/tickets?category=${encodeURIComponent(cat)}`)} />
                ))
              )}
            </div>
          </div>

          {/* Podział priorytetów */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Priorytety zgłoszeń</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Rozkład aktywnych zgłoszeń według priorytetu.</p>
            <DonutChart segments={priorityData} total={activeTickets.length} filterType="priority" />
          </div>

          {/* Obciążenie zespołu */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Obciążenie zespołu</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Monitoruj potencjał wykonawczy swojego zespołu.</p>

            <div className="space-y-1 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Osoba przypisana</span>
                <span className="text-gray-600 font-medium">Rozkład prac</span>
              </div>
            </div>

            <div className="space-y-3">
              {unassignedCount > 0 && (
                <HorizontalBar label="Nie przypisano" value={unassignedCount} max={maxWorkload} color="#f87171" total={activeTickets.length} icon={<UsersIcon className="w-4 h-4 text-gray-400" />} onClick={() => navigate('/tickets?assignment=unassigned')} />
              )}
              {workloadEntries.map(([name, data]) => (
                <HorizontalBar key={name} label={name} value={data.count} max={maxWorkload} color="#6366f1" total={activeTickets.length} icon={
                  data.avatar ? (
                    <img src={data.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center"><span className="text-[10px] font-bold text-indigo-600">{name.charAt(0)}</span></div>
                  )
                } onClick={() => navigate(`/tickets?assignment=${data.techId}`)} />
              ))}
              {workloadEntries.length === 0 && unassignedCount === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-6">Brak aktywnych zgłoszeń.</p>
              )}
            </div>
          </div>

          {/* Sugestie */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900">Sugestie</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Automatyczne wskazówki na podstawie danych.</p>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl text-sm font-medium ${s.severity === 'warning'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : s.severity === 'info'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-green-50 text-green-800 border border-green-200'
                    }`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.severity === 'warning' ? 'text-amber-500' : s.severity === 'info' ? 'text-blue-500' : 'text-green-500'
                    }`} />
                  {s.text}
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
