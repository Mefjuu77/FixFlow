import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { ticketService } from '../api/ticketService';
import { User, Category } from '../types';
import useTitle from '../hooks/useTitle';
import dayjs from 'dayjs';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/src/style.css';
import { pl } from 'date-fns/locale/pl';
import {
  FileBarChart, Calendar, Filter, FileSpreadsheet, FileText,
  ChevronDown, Search, Loader2, CheckCircle2, ChevronsUp, Equal,
  ChevronsDown, Circle, XCircle, ArrowDownToLine, RefreshCw,
  UserMinus, AlertTriangle
} from 'lucide-react';
import { getCategoryIcon } from '../utils/ticketConstants';
import UserAvatar from '../components/UserAvatar';

// === Typy ===
interface PreviewRow {
  id: number; title: string; status: string; priority: string;
  category: string; creator: string; creator_avatar?: string | null;
  technician: string; technician_avatar?: string | null;
  created_at: string; comments_count: number; work_minutes: number;
}

type DatePreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';



// === Custom Calendar Dropdown (replaces ugly native <select>) ===
const CalendarDropdown = (props: any) => {
  const { value, onChange, options, name } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedOption = options?.find((o: any) => String(o.value) === String(value));
  const label = selectedOption?.label || '';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm active:scale-95 transition-all cursor-pointer capitalize"
      >
        <span className="capitalize">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute z-[60] mt-1 ${name === 'years' ? 'right-0' : 'left-0'} bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200/80 dark:border-slate-700 py-1 max-h-52 overflow-y-auto min-w-[120px]`}>
          {options?.map((opt: any) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange?.({ target: { value: String(opt.value) } } as any);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm font-medium transition-colors capitalize
                ${String(opt.value) === String(value)
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const calendarComponents = { Dropdown: CalendarDropdown };

// === Premium MultiSelect Component ===
interface MultiSelectProps {
  label: string; icon?: React.ReactNode;
  options: { value: string; label: string; icon?: React.ReactNode; color?: string }[];
  selected: string[]; onChange: (v: string[]) => void;
  placeholder?: string;
  position?: 'top' | 'bottom';
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, icon, options, selected, onChange, placeholder = 'Wszystkie', position = 'bottom' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <div className="relative flex flex-col gap-1.5" ref={ref}>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
        {icon && icon} {label}
      </label>
      <button
        type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-2 rounded-xl text-sm transition-all duration-300 shadow-sm
          ${open ? 'border-indigo-400 dark:border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800'}
        `}
      >
        <span className={selected.length ? 'text-indigo-900 dark:text-indigo-300 font-bold' : 'text-slate-500 dark:text-slate-300 font-medium'}>
          {selected.length ? `Wybrano (${selected.length})` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-300'}`} />
      </button>

      {open && (
        <div className={`absolute z-50 left-0 w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700 rounded-2xl shadow-2xl py-2 max-h-64 overflow-y-auto animate-in fade-in duration-200
          ${position === 'top' ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}`}
        >
          {selected.length > 0 && (
            <div className="px-2 pb-2 mb-2 border-b border-slate-100">
              <button onClick={() => onChange([])} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Wyczyść
              </button>
            </div>
          )}
          <div className="px-1.5 space-y-0.5">
            {options.map(opt => {
              const isSelected = selected.includes(opt.value);
              return (
                <button key={opt.value} onClick={() => toggle(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                    ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300
                    ${isSelected ? 'bg-indigo-500 border-indigo-500 shadow-md shadow-indigo-500/30 scale-110' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                  >
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {opt.icon && <div className="flex-shrink-0">{opt.icon}</div>}
                  <span className={`font-medium ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : opt.color ? opt.color : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// === Premium Page ===
const ReportsPage: React.FC = () => {
  useTitle('Eksport danych');
  const authContext = useContext(AuthContext);

  // Dane pomocnicze
  const [categories, setCategories] = useState<Category[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Filtry
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal, setShowToCal] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');

  // Podgląd
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    ticketService.getCategories().then(setCategories).catch(() => { });
    ticketService.getTechnicians().then(setTechnicians).catch(() => { });
    ticketService.getUsers().then(setAllUsers).catch(() => { });
  }, []);

  useEffect(() => {
    const now = dayjs();
    switch (datePreset) {
      case 'week': setDateFrom(now.subtract(7, 'day').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
      case 'month': setDateFrom(now.subtract(1, 'month').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
      case 'quarter': setDateFrom(now.subtract(3, 'month').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
      case 'year': setDateFrom(now.subtract(1, 'year').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
    }
  }, [datePreset]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.append('date_from', dateFrom);
    if (dateTo) p.append('date_to', dateTo);
    statuses.forEach(s => p.append('status', s));
    priorities.forEach(s => p.append('priority', s));
    selectedCategories.forEach(s => p.append('category', s));
    selectedTechnicians.forEach(s => p.append('technician', s));
    selectedCreators.forEach(s => p.append('creator', s));
    return p;
  }, [dateFrom, dateTo, statuses, priorities, selectedCategories, selectedTechnicians, selectedCreators]);

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const p = buildParams();
      p.append('preview', '1');
      const res = await api.get(`reports/export/?${p.toString()}`);
      setTotal(res.data.total);
      setPreview(res.data.preview);
    } catch { setTotal(null); setPreview([]); }
    setLoadingPreview(false);
  }, [buildParams]);

  useEffect(() => {
    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const p = buildParams();
      p.append('file_format', exportFormat);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/api/reports/export/?${p.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `fixflow_raport_${dayjs().format('YYYYMMDD_HHmm')}.${exportFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download error:', err);
    }
    setDownloading(false);
  };

  if (authContext?.user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const statusOptions = [
    { value: 'NOWE', label: 'Nowe', icon: <Circle className="w-4 h-4 text-blue-600 stroke-[2.5]" />, color: 'text-blue-700' },
    { value: 'W_TOKU', label: 'W toku', icon: <Loader2 className="w-4 h-4 text-amber-500 stroke-[2.5]" />, color: 'text-amber-700' },
    { value: 'ROZWIAZANE', label: 'Rozwiązane', icon: <CheckCircle2 className="w-4 h-4 text-green-600 stroke-[2.5]" />, color: 'text-emerald-700' },
    { value: 'ZAMKNIETE', label: 'Zamknięte', icon: <XCircle className="w-4 h-4 text-teal-500 stroke-[2.5]" />, color: 'text-teal-800 dark:text-teal-300' },
  ];

  const priorityOptions = [
    { value: 'WYSOKI', label: 'Wysoki', icon: <ChevronsUp className="w-4 h-4 text-red-500" /> },
    { value: 'NORMALNY', label: 'Normalny', icon: <Equal className="w-4 h-4 text-blue-500" /> },
    { value: 'NISKI', label: 'Niski', icon: <ChevronsDown className="w-4 h-4 text-gray-400" /> },
  ];

  const categoryOptions = categories.map(c => ({ value: String(c.id), label: c.name, icon: getCategoryIcon(c.name) }));
  const technicianOptions = technicians.map(t => ({
    value: String(t.id),
    label: `${t.first_name} ${t.last_name}`,
    icon: <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden">
      {t.avatar ? <img src={t.avatar} alt="" className="w-full h-full object-cover" /> : t.first_name.charAt(0)}
    </div>
  }));
  const creatorOptions = allUsers.map(u => ({
    value: String(u.id),
    label: `${u.first_name} ${u.last_name}`,
    icon: <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden">
      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.first_name.charAt(0)}
    </div>
  }));

  const presetButtons: { key: DatePreset; label: string }[] = [
    { key: 'week', label: '7 Dni' },
    { key: 'month', label: '30 Dni' },
    { key: 'quarter', label: 'Kwartał' },
    { key: 'year', label: 'Rok' },
    { key: 'custom', label: 'Własny' },
  ];

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col gap-8 pb-10">
      {/* Nowy prosty nagłówek z pobieraniem w prawym górnym rogu */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <FileBarChart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Eksport danych</h1>
            <p className="text-slate-500 text-sm font-medium">Generowanie zestawień zgłoszeń</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex gap-2">
            <button onClick={() => setExportFormat('xlsx')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border-2 ${exportFormat === 'xlsx' ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> XLSX
            </button>
            <button onClick={() => setExportFormat('csv')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border-2 ${exportFormat === 'csv' ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
            >
              <FileText className="w-4 h-4" /> CSV
            </button>
          </div>
          <button onClick={handleDownload} disabled={downloading || total === 0 || (dateFrom > dateTo)}
            className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-600/20 w-[220px] shrink-0"
          >
            {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
            {downloading ? 'Pobieranie...' : `Pobierz raport ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8 items-start">
        {/* 🎛️ Filtr Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Karta: Zakres Dat */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
            <label className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-slate-400" /> Zakres Dat
            </label>

            <div className="flex gap-1 p-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl overflow-x-auto hide-scrollbar mb-4">
              {presetButtons.map(pb => (
                <button key={pb.key} onClick={() => setDatePreset(pb.key)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap
                    ${datePreset === pb.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                >
                  {pb.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1 relative">
                <label className="flex items-center gap-1 text-[10px] text-indigo-500/70 font-extrabold uppercase ml-1 tracking-wider">
                  <Calendar className="w-3 h-3" /> Od
                </label>
                <button
                  type="button"
                  onClick={() => { setShowFromCal(!showFromCal); setShowToCal(false); }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer text-left"
                >
                  {dateFrom ? dayjs(dateFrom).format('DD.MM.YYYY') : 'Wybierz datę'}
                </button>
                {showFromCal && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFromCal(false)} />
                    <div className="absolute z-50 mt-1 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 p-3">
                      <DayPicker
                        mode="single"
                        selected={dateFrom ? new Date(dateFrom) : undefined}
                        onSelect={(date) => { if (date) { setDateFrom(dayjs(date).format('YYYY-MM-DD')); setDatePreset('custom'); setShowFromCal(false); } }}
                        locale={pl}
                        captionLayout="dropdown"
                        startMonth={new Date(2020, 0)}
                        endMonth={new Date(new Date().getFullYear() + 1, 11)}
                        components={calendarComponents}
                        modifiers={{
                          other: dateTo ? new Date(dateTo) : undefined,
                          inRange: (dateFrom && dateTo) ? { after: new Date(dateFrom), before: new Date(dateTo) } : undefined
                        }}
                        modifiersClassNames={{
                          other: 'rdp-other-date',
                          inRange: 'rdp-in-range'
                        }}
                      />
                    </div>
                  </>
                )}
                {dateFrom && <p className="text-[10px] text-slate-400 font-medium ml-1 mt-0.5">{dayjs(dateFrom).format('DD MMMM YYYY')}</p>}
              </div>
              <div className="space-y-1 relative">
                <label className="flex items-center gap-1 text-[10px] text-indigo-500/70 font-extrabold uppercase ml-1 tracking-wider">
                  <Calendar className="w-3 h-3" /> Do
                </label>
                <button
                  type="button"
                  onClick={() => { setShowToCal(!showToCal); setShowFromCal(false); }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer text-left"
                >
                  {dateTo ? dayjs(dateTo).format('DD.MM.YYYY') : 'Wybierz datę'}
                </button>
                {showToCal && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowToCal(false)} />
                    <div className="absolute z-50 mt-1 right-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 p-3">
                      <DayPicker
                        mode="single"
                        selected={dateTo ? new Date(dateTo) : undefined}
                        onSelect={(date) => { if (date) { setDateTo(dayjs(date).format('YYYY-MM-DD')); setDatePreset('custom'); setShowToCal(false); } }}
                        locale={pl}
                        captionLayout="dropdown"
                        startMonth={new Date(2020, 0)}
                        endMonth={new Date(new Date().getFullYear() + 1, 11)}
                        components={calendarComponents}
                        modifiers={{
                          other: dateFrom ? new Date(dateFrom) : undefined,
                          inRange: (dateFrom && dateTo) ? { after: new Date(dateFrom), before: new Date(dateTo) } : undefined
                        }}
                        modifiersClassNames={{
                          other: 'rdp-other-date',
                          inRange: 'rdp-in-range'
                        }}
                      />
                    </div>
                  </>
                )}
                {dateTo && <p className="text-[10px] text-slate-400 font-medium ml-1 mt-0.5">{dayjs(dateTo).format('DD MMMM YYYY')}</p>}
              </div>
            </div>

            {dateFrom && dateTo && dateFrom > dateTo && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Data &quot;Od&quot; nie może być późniejsza niż data &quot;Do&quot;
              </div>
            )}
          </div>

          {/* Karta: Filtry */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Filter className="w-4 h-4 text-slate-400" /> Filtry
              </label>
              <button
                onClick={() => {
                  setStatuses([]);
                  setPriorities([]);
                  setSelectedCategories([]);
                  setSelectedTechnicians([]);
                  setSelectedCreators([]);
                }}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all border border-slate-200/60 dark:border-slate-600 shadow-sm"
                title="Wyczyść wszystkie filtry"
              >
                <RefreshCw className="w-3.5 h-3.5 transition-transform duration-500 group-hover:-rotate-180" />
                Resetuj
              </button>
            </div>

            <div className="space-y-4">
              <MultiSelect label="Kategoria" options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
              <MultiSelect label="Priorytet" options={priorityOptions} selected={priorities} onChange={setPriorities} />
              <MultiSelect label="Zgłaszający" options={creatorOptions} selected={selectedCreators} onChange={setSelectedCreators} position="top" />
              <MultiSelect label="Technik" options={technicianOptions} selected={selectedTechnicians} onChange={setSelectedTechnicians} position="top" />
              <MultiSelect label="Status" options={statusOptions} selected={statuses} onChange={setStatuses} position="top" />
            </div>
          </div>
        </div>

        {/* 📊 Tabela Podglądu */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden h-[calc(100vh-16rem)] min-h-[500px]">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Podgląd wyników</h3>
              {total !== null && (
                <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-lg ml-2">
                  {total} zgłoszeń
                </span>
              )}
            </div>
            {loadingPreview && (
              <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" /> Odświeżanie...
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto relative">
            {preview.length === 0 && !loadingPreview ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <div className="w-24 h-24 mb-6 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-lg font-bold text-slate-600">Brak dopasowań</p>
                <p className="text-sm font-medium mt-1 text-slate-400 max-w-xs text-center">Zmień parametry filtrowania, aby zobaczyć podgląd wyników.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm dark:shadow-slate-900/50">
                  <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-4 w-16">ID</th>
                    <th className="px-5 py-4">Tytuł</th>
                    <th className="px-5 py-4 hidden md:table-cell">Kategoria</th>
                    <th className="px-5 py-4 w-32">Priorytet</th>
                    <th className="px-5 py-4 hidden lg:table-cell">Zgłaszający</th>
                    <th className="px-5 py-4 hidden lg:table-cell">Technik</th>
                    <th className="px-5 py-4 w-32">Status</th>
                    <th className="px-5 py-4 w-40">Utworzono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 dark:divide-slate-700/80">
                  {preview.map((row) => (
                    <tr key={row.id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-colors duration-200">
                      <td className="px-5 py-4 text-slate-400 font-mono text-xs">{row.id}</td>
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300 max-w-[200px] truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{row.title}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium hidden md:table-cell">
                        <span className="flex items-center gap-1.5 font-medium">
                          {getCategoryIcon(row.category || '')}
                          {row.category || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {row.priority === 'Wysoki' ? <ChevronsUp className="w-4 h-4 text-red-500" /> : row.priority === 'Normalny' ? <Equal className="w-4 h-4 text-blue-500" /> : <ChevronsDown className="w-4 h-4 text-gray-400" />}
                          <span className={row.priority === 'Wysoki' ? 'text-red-600' : row.priority === 'Normalny' ? 'text-blue-600' : 'text-gray-500'}>
                            {row.priority}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <UserAvatar avatar={row.creator_avatar} name={row.creator} size="md" />
                          {row.creator}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium hidden lg:table-cell">
                        {row.technician !== 'Brak' ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar avatar={row.technician_avatar} name={row.technician} size="md" />
                            {row.technician}
                          </div>
                        ) : (
                          <span className="flex items-center gap-2 text-slate-400 italic">
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 flex items-center justify-center flex-shrink-0">
                              <UserMinus className="w-3 h-3" />
                            </div>
                            Nie przypisano
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-lg ${row.status === 'Nowe' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          row.status === 'W toku' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                            row.status === 'Rozwiązane' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                          }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs font-medium whitespace-nowrap">{dayjs(row.created_at).format('DD MMM YYYY, HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Overlay during loading */}
            {loadingPreview && preview.length > 0 && (
              <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-20">
                <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Aktualizowanie...</span>
                </div>
              </div>
            )}
          </div>

          {total !== null && total > 10 && preview.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                Pokazuję <strong className="text-slate-700 dark:text-slate-300">10</strong> z <strong className="text-slate-700 dark:text-slate-300">{total}</strong> wyników.
              </p>
              <p className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline" onClick={handleDownload}>
                Pobierz pełny raport →
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
