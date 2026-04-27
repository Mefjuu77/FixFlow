import React, { useState, useEffect, useContext, useCallback } from 'react';
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
  ChevronsDown, Circle, XCircle
} from 'lucide-react';

dayjs.locale('pl');

// === Typy ===
interface PreviewRow {
  id: number; title: string; status: string; priority: string;
  category: string; creator: string; technician: string;
  created_at: string; comments_count: number; work_minutes: number;
}

type DatePreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';

// === Komponent MultiSelect ===
interface MultiSelectProps {
  label: string; icon: React.ReactNode;
  options: { value: string; label: string; icon?: React.ReactNode; color?: string }[];
  selected: string[]; onChange: (v: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, icon, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

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
    <div className="relative" ref={ref}>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {icon}{label}
      </label>
      <button
        type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      >
        <span className={selected.length ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selected.length ? `Wybrano: ${selected.length}` : 'Wszystkie'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 font-medium border-b border-gray-100">
              Wyczyść filtr
            </button>
          )}
          {options.map(opt => (
            <button key={opt.value} onClick={() => toggle(opt.value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${selected.includes(opt.value) ? 'bg-blue-50/60 font-semibold' : ''}`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected.includes(opt.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {selected.includes(opt.value) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              {opt.icon}
              <span className={opt.color || 'text-gray-700'}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// === Strona Raporty ===
const ReportsPage: React.FC = () => {
  useTitle('Raporty');
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

  // Załaduj dane pomocnicze
  useEffect(() => {
    ticketService.getCategories().then(setCategories).catch(() => {});
    ticketService.getTechnicians().then(setTechnicians).catch(() => {});
    ticketService.getUsers().then(setAllUsers).catch(() => {});
  }, []);

  // Obsługa presetów dat
  useEffect(() => {
    const now = dayjs();
    switch (datePreset) {
      case 'week': setDateFrom(now.subtract(7, 'day').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
      case 'month': setDateFrom(now.subtract(1, 'month').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
      case 'quarter': setDateFrom(now.subtract(3, 'month').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
      case 'year': setDateFrom(now.subtract(1, 'year').format('YYYY-MM-DD')); setDateTo(now.format('YYYY-MM-DD')); break;
    }
  }, [datePreset]);

  // Buduj parametry
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

  // Podgląd
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

  // Auto-preview przy zmianie filtrów
  useEffect(() => {
    const timer = setTimeout(fetchPreview, 400);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  // Pobierz raport
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

  // Guard: admin only
  if (authContext?.user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const statusOptions = [
    { value: 'NOWE', label: 'Nowe', icon: <Circle className="w-3.5 h-3.5 text-blue-500" />, color: 'text-blue-700' },
    { value: 'W_TOKU', label: 'W toku', icon: <Loader2 className="w-3.5 h-3.5 text-amber-500" />, color: 'text-amber-700' },
    { value: 'ROZWIAZANE', label: 'Rozwiązane', icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />, color: 'text-green-700' },
    { value: 'ZAMKNIETE', label: 'Zamknięte', icon: <XCircle className="w-3.5 h-3.5 text-gray-400" />, color: 'text-gray-600' },
  ];

  const priorityOptions = [
    { value: 'NISKI', label: 'Niski', icon: <ChevronsDown className="w-3.5 h-3.5 text-gray-400" />, color: 'text-gray-600' },
    { value: 'NORMALNY', label: 'Normalny', icon: <Equal className="w-3.5 h-3.5 text-blue-500" />, color: 'text-blue-600' },
    { value: 'WYSOKI', label: 'Wysoki', icon: <ChevronsUp className="w-3.5 h-3.5 text-red-500" />, color: 'text-red-600' },
  ];

  const categoryOptions = categories.map(c => ({ value: String(c.id), label: c.name }));
  const technicianOptions = technicians.map(t => ({ value: String(t.id), label: `${t.first_name} ${t.last_name}` }));
  const creatorOptions = allUsers.map(u => ({ value: String(u.id), label: `${u.first_name} ${u.last_name}` }));

  const presetButtons: { key: DatePreset; label: string }[] = [
    { key: 'week', label: 'Tydzień' },
    { key: 'month', label: 'Miesiąc' },
    { key: 'quarter', label: 'Kwartał' },
    { key: 'year', label: 'Rok' },
    { key: 'custom', label: 'Własny' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <FileBarChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Raporty</h1>
            <p className="text-sm text-gray-500">Kreator eksportu zgłoszeń</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* === Panel filtrów === */}
        <div className="space-y-4">
          {/* Zakres dat */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <Calendar className="w-3.5 h-3.5" /> Zakres dat
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presetButtons.map(pb => (
                <button key={pb.key} onClick={() => setDatePreset(pb.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${datePreset === pb.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >{pb.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1 block">Od</label>
                <input type="date" value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1 block">Do</label>
                <input type="date" value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Filtry */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" /> Filtry
            </div>
            <MultiSelect label="Status" icon={<Circle className="w-3 h-3" />} options={statusOptions} selected={statuses} onChange={setStatuses} />
            <MultiSelect label="Priorytet" icon={<ChevronsUp className="w-3 h-3" />} options={priorityOptions} selected={priorities} onChange={setPriorities} />
            <MultiSelect label="Kategoria" icon={<Filter className="w-3 h-3" />} options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
            <MultiSelect label="Technik" icon={<Search className="w-3 h-3" />} options={technicianOptions} selected={selectedTechnicians} onChange={setSelectedTechnicians} />
            <MultiSelect label="Zgłaszający" icon={<Search className="w-3 h-3" />} options={creatorOptions} selected={selectedCreators} onChange={setSelectedCreators} />
          </div>

          {/* Format + Download */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              <Download className="w-3.5 h-3.5" /> Pobieranie
            </label>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setExportFormat('xlsx')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border ${exportFormat === 'xlsx' ? 'bg-green-50 border-green-300 text-green-700 ring-2 ring-green-500/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <FileSpreadsheet className="w-4 h-4" /> XLSX
              </button>
              <button onClick={() => setExportFormat('csv')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border ${exportFormat === 'csv' ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <FileText className="w-4 h-4" /> CSV
              </button>
            </div>
            <button onClick={handleDownload} disabled={downloading || total === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Generowanie...' : `Pobierz raport ${exportFormat.toUpperCase()}`}
            </button>
            {total !== null && (
              <p className="text-center text-xs text-gray-400 mt-2">
                {total === 0 ? 'Brak zgłoszeń spełniających kryteria' : `${total} zgłoszeń w raporcie`}
              </p>
            )}
          </div>
        </div>

        {/* === Podgląd wyników === */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800 text-sm">Podgląd wyników</h3>
              {total !== null && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{total}</span>
              )}
            </div>
            {loadingPreview && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          </div>

          <div className="flex-1 overflow-auto">
            {preview.length === 0 && !loadingPreview ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileBarChart className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium">Brak danych do wyświetlenia</p>
                <p className="text-xs mt-1">Zmień filtry, aby zobaczyć podgląd</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-3 py-2.5 font-semibold">Tytuł</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Priorytet</th>
                    <th className="px-3 py-2.5 font-semibold">Kategoria</th>
                    <th className="px-3 py-2.5 font-semibold">Zgłaszający</th>
                    <th className="px-3 py-2.5 font-semibold">Technik</th>
                    <th className="px-3 py-2.5 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row, i) => (
                    <tr key={row.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{row.id}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{row.title}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.status === 'Nowe' ? 'bg-blue-100 text-blue-700' :
                          row.status === 'W toku' ? 'bg-amber-100 text-amber-700' :
                          row.status === 'Rozwiązane' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{row.status}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-semibold ${
                          row.priority === 'Wysoki' ? 'text-red-600' :
                          row.priority === 'Normalny' ? 'text-blue-600' : 'text-gray-500'
                        }`}>{row.priority}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{row.category}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{row.creator}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{row.technician}</td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">{row.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {total !== null && total > 10 && preview.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Wyświetlono 10 z {total} zgłoszeń. Pobierz raport, aby zobaczyć wszystkie.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
