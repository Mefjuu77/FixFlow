import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { ticketService } from '../api/ticketService';
import { User, Category } from '../types';
import useTitle from '../hooks/useTitle';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import {
  FileBarChart, Calendar, Filter, Download, FileSpreadsheet, FileText,
  ChevronDown, Search, Loader2, CheckCircle2, ChevronsUp, Equal,
  ChevronsDown, Circle, XCircle, BarChart3, SlidersHorizontal, ArrowDownToLine, RefreshCw
} from 'lucide-react';

dayjs.locale('pl');

// === Typy ===
interface PreviewRow {
  id: number; title: string; status: string; priority: string;
  category: string; creator: string; technician: string;
  created_at: string; comments_count: number; work_minutes: number;
}

type DatePreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';

// === Premium MultiSelect Component ===
interface MultiSelectProps {
  label: string; icon: React.ReactNode;
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
      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
        {icon} {label}
      </label>
      <button
        type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white/60 backdrop-blur-sm border-2 rounded-xl text-sm transition-all duration-300 shadow-sm
          ${open ? 'border-indigo-400 ring-4 ring-indigo-500/10' : 'border-slate-200/80 hover:border-indigo-300 hover:bg-white'}
        `}
      >
        <span className={selected.length ? 'text-indigo-900 font-bold' : 'text-slate-500 font-medium'}>
          {selected.length ? `Wybrano (${selected.length})` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
      </button>
      
      {open && (
        <div className={`absolute z-50 left-0 w-full bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl py-2 max-h-64 overflow-y-auto animate-in fade-in duration-200
          ${position === 'top' ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}`}
        >
          {selected.length > 0 && (
            <div className="px-2 pb-2 mb-2 border-b border-slate-100">
              <button onClick={() => onChange([])} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Wyczyść filtry
              </button>
            </div>
          )}
          <div className="px-1.5 space-y-0.5">
            {options.map(opt => {
              const isSelected = selected.includes(opt.value);
              return (
                <button key={opt.value} onClick={() => toggle(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                    ${isSelected ? 'bg-indigo-50/80' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300
                    ${isSelected ? 'bg-indigo-500 border-indigo-500 shadow-md shadow-indigo-500/30 scale-110' : 'border-slate-300 bg-white'}`}
                  >
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {opt.icon && <div className="flex-shrink-0">{opt.icon}</div>}
                  <span className={`font-medium ${isSelected ? 'text-indigo-900' : opt.color || 'text-slate-700'}`}>{opt.label}</span>
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
  useTitle('Raporty Eksportu');
  const authContext = useContext(AuthContext);

  // Dane pomocnicze
  const [categories, setCategories] = useState<Category[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Filtry
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
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
    ticketService.getCategories().then(setCategories).catch(() => {});
    ticketService.getTechnicians().then(setTechnicians).catch(() => {});
    ticketService.getUsers().then(setAllUsers).catch(() => {});
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
    { value: 'NOWE', label: 'Nowe', icon: <Circle className="w-4 h-4 text-blue-500 drop-shadow-sm" />, color: 'text-blue-700' },
    { value: 'W_TOKU', label: 'W toku', icon: <Loader2 className="w-4 h-4 text-amber-500 drop-shadow-sm" />, color: 'text-amber-700' },
    { value: 'ROZWIAZANE', label: 'Rozwiązane', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 drop-shadow-sm" />, color: 'text-emerald-700' },
    { value: 'ZAMKNIETE', label: 'Zamknięte', icon: <XCircle className="w-4 h-4 text-slate-400 drop-shadow-sm" />, color: 'text-slate-600' },
  ];

  const priorityOptions = [
    { value: 'NISKI', label: 'Niski', icon: <ChevronsDown className="w-4 h-4 text-slate-400" />, color: 'text-slate-600' },
    { value: 'NORMALNY', label: 'Normalny', icon: <Equal className="w-4 h-4 text-blue-500" />, color: 'text-blue-600' },
    { value: 'WYSOKI', label: 'Wysoki', icon: <ChevronsUp className="w-4 h-4 text-rose-500" />, color: 'text-rose-600' },
  ];

  const categoryOptions = categories.map(c => ({ value: String(c.id), label: c.name }));
  const technicianOptions = technicians.map(t => ({ value: String(t.id), label: `${t.first_name} ${t.last_name}` }));
  const creatorOptions = allUsers.map(u => ({ value: String(u.id), label: `${u.first_name} ${u.last_name}` }));

  const presetButtons: { key: DatePreset; label: string }[] = [
    { key: 'week', label: '7 Dni' },
    { key: 'month', label: '30 Dni' },
    { key: 'quarter', label: 'Kwartał' },
    { key: 'year', label: 'Rok' },
    { key: 'custom', label: 'Własny' },
  ];

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col gap-8 pb-10">
      {/* 🌟 Premium Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 lg:p-12 shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <FileBarChart className="w-8 h-8 text-indigo-300 drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                Generator Raportów
              </h1>
              <p className="text-indigo-200/80 font-medium text-sm md:text-base">
                Eksportuj dane zgłoszeń do analizy z zaawansowanym filtrowaniem.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/5 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="flex bg-slate-900/50 p-1 rounded-xl">
              <button onClick={() => setExportFormat('xlsx')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${exportFormat === 'xlsx' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                <FileSpreadsheet className="w-4 h-4" /> XLSX
              </button>
              <button onClick={() => setExportFormat('csv')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${exportFormat === 'csv' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                <FileText className="w-4 h-4" /> CSV
              </button>
            </div>
            <button onClick={handleDownload} disabled={downloading || total === 0}
              className="group relative flex items-center gap-2 px-6 py-3 bg-white text-indigo-950 rounded-xl font-bold transition-all hover:bg-indigo-50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white via-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center gap-2">
                {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />}
                {downloading ? 'Pobieranie...' : 'Generuj Raport'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8 items-start">
        {/* 🎛️ Filtr Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Parametry Filtru</h2>
            </div>

            {/* Zakres dat z premium pill-buttons */}
            <div className="mb-6 space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                <Calendar className="w-4 h-4 text-indigo-500" /> Okres
              </label>
              
              <div className="flex flex-wrap gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                {presetButtons.map(pb => (
                  <button key={pb.key} onClick={() => setDatePreset(pb.key)}
                    className={`flex-1 min-w-[70px] px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 
                      ${datePreset === pb.key ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 scale-95'}`}
                  >
                    {pb.label}
                  </button>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Od</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Do</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200/60 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-6"></div>

            <div className="space-y-5">
              <MultiSelect label="Statusy" icon={<Filter className="w-4 h-4 text-indigo-500" />} options={statusOptions} selected={statuses} onChange={setStatuses} />
              <MultiSelect label="Priorytety" icon={<BarChart3 className="w-4 h-4 text-indigo-500" />} options={priorityOptions} selected={priorities} onChange={setPriorities} />
              <MultiSelect label="Kategorie" icon={<Filter className="w-4 h-4 text-indigo-500" />} options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
              <MultiSelect label="Technicy" icon={<Search className="w-4 h-4 text-indigo-500" />} options={technicianOptions} selected={selectedTechnicians} onChange={setSelectedTechnicians} position="top" />
              <MultiSelect label="Zgłaszający" icon={<Search className="w-4 h-4 text-indigo-500" />} options={creatorOptions} selected={selectedCreators} onChange={setSelectedCreators} position="top" />
            </div>
          </div>
        </div>

        {/* 📊 Tabela Podglądu */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden h-[calc(100vh-16rem)] min-h-[500px]">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
              </div>
              <h3 className="font-bold text-slate-800 text-base">Podgląd na żywo</h3>
              {total !== null && (
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg ml-2">
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
                <div className="w-24 h-24 mb-6 rounded-full bg-slate-50 flex items-center justify-center">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-lg font-bold text-slate-600">Brak dopasowań</p>
                <p className="text-sm font-medium mt-1 text-slate-400 max-w-xs text-center">Zmień parametry filtrowania, aby zobaczyć podgląd zgłoszeń.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-4 w-16">#</th>
                    <th className="px-5 py-4">Tytuł Zgłoszenia</th>
                    <th className="px-5 py-4 w-32">Status</th>
                    <th className="px-5 py-4 w-32">Priorytet</th>
                    <th className="px-5 py-4 hidden md:table-cell">Kategoria</th>
                    <th className="px-5 py-4 hidden lg:table-cell">Technik</th>
                    <th className="px-5 py-4 w-32">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {preview.map((row, i) => (
                    <tr key={row.id} className="group hover:bg-indigo-50/40 transition-colors duration-200">
                      <td className="px-5 py-4 text-slate-400 font-mono text-xs">{row.id}</td>
                      <td className="px-5 py-4 font-bold text-slate-700 max-w-[200px] truncate group-hover:text-indigo-700 transition-colors">{row.title}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          row.status === 'Nowe' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          row.status === 'W toku' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          row.status === 'Rozwiązane' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Nowe' ? 'bg-blue-500' : row.status === 'W toku' ? 'bg-amber-500' : row.status === 'Rozwiązane' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold ${
                          row.priority === 'Wysoki' ? 'text-rose-600' :
                          row.priority === 'Normalny' ? 'text-indigo-600' : 'text-slate-500'
                        }`}>{row.priority}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium hidden md:table-cell">{row.category}</td>
                      <td className="px-5 py-4 text-slate-500 font-medium hidden lg:table-cell">
                        {row.technician !== 'Brak' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                              {row.technician.charAt(0)}
                            </div>
                            {row.technician}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Nieprzypisany</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs font-medium whitespace-nowrap">{dayjs(row.created_at).format('DD MMM YYYY')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {/* Overlay during loading */}
            {loadingPreview && preview.length > 0 && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-20">
                <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-sm font-bold text-slate-700">Aktualizowanie...</span>
                </div>
              </div>
            )}
          </div>

          {total !== null && total > 10 && preview.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                Pokazuję <strong className="text-slate-700">10</strong> z <strong className="text-slate-700">{total}</strong> wyników.
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
