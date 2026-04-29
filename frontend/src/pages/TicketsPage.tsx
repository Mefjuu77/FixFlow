import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { ticketService } from '../api/ticketService';
import { Ticket, User } from '../types';
import dayjs from 'dayjs';
import { PlusCircle, Search, ChevronDown, ArrowUp, ArrowDown, UserMinus, Circle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import useTitle from '../hooks/useTitle';
import { getCategoryIcon, STATUS_LABELS, STATUS_STYLES, PRIORITY_LABELS, PRIORITY_ICONS } from '../utils/ticketConstants';

type SortField = 'id' | 'title' | 'category_name' | 'priority' | 'creator' | 'technician' | 'status' | 'created_at';

interface CustomDropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  className?: string;
  placement?: 'bottom' | 'top';
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, options, placeholder = "Wybierz", className = "w-48", placement = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between pl-3 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${className}`}
      >
        <span className="flex items-center gap-2 truncate text-inherit">
          {selected?.value === 'all' ? placeholder : (
            <>
              {selected?.icon}
              {selected ? selected.label : placeholder}
            </>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-[60] left-0 ${placement === 'top' ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-1 max-h-60 overflow-y-auto w-full min-w-max animate-in fade-in zoom-in-95 duration-100`}>
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`flex items-center w-full gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${value === opt.value ? 'bg-blue-50/50 dark:bg-blue-900/30 font-semibold text-blue-700 dark:text-blue-400' : ''}`}
            >
              {opt.icon}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};



const TicketsPage: React.FC = () => {
  useTitle('Zgłoszenia');
  const authContext = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const location = useLocation();
  const state = location.state as { searchQuery?: string } | null;
  const [searchQuery, setSearchQuery] = useState(state?.searchQuery || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtry technika i admina — inicjalizacja z URL params
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>(searchParams.get('assignment') || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || 'all');
  const [sortConfig, setSortConfig] = useState<{ key: SortField, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string>('');

  const [technicians, setTechnicians] = useState<User[]>([]);

  const role = authContext?.user?.role;
  const isEmployee = role === 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';

  useEffect(() => {
    fetchTickets();
    if (isAdmin || isTechnician) {
      ticketService.getTechnicians().then(setTechnicians).catch(console.error);
    }
  }, [isAdmin, isTechnician]);

  const fetchTickets = async () => {
    try {
      const response = await api.get('tickets/');
      setTickets(response.data);
    } catch (err) {
      console.error("Błąd podczas pobierania zgłoszeń:", err);
      setError('Nie udało się pobrać listy zgłoszeń.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return <div className="p-4 text-red-700 bg-red-100 rounded-xl">{error}</div>;

  // ---------- Logika filtrowania ----------
  let filteredTickets = tickets.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toString().includes(searchQuery) ||
    (t.creator_details && `${t.creator_details.first_name} ${t.creator_details.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Wspólne filtry dla wszystkich
  if (statusFilter !== 'all') {
    filteredTickets = filteredTickets.filter(t => t.status === statusFilter);
  }
  if (categoryFilter !== 'all') {
    filteredTickets = filteredTickets.filter(t => t.category_name === categoryFilter);
  }

  // Filtry tylko dla technika i admina
  if (isAdmin || isTechnician) {
    if (priorityFilter !== 'all') {
      filteredTickets = filteredTickets.filter(t => t.priority === priorityFilter);
    }
    if (assignmentFilter === 'unassigned') {
      filteredTickets = filteredTickets.filter(t => t.technician === null);
    } else if (assignmentFilter === 'assigned_to_me') {
      filteredTickets = filteredTickets.filter(t => t.technician === authContext?.user?.id);
    } else if (assignmentFilter !== 'all') {
      const techId = Number(assignmentFilter);
      if (!isNaN(techId)) {
        filteredTickets = filteredTickets.filter(t => t.technician === techId);
      }
    }
  }

  // ---------- Logika Sortowania ----------
  const handleSort = (key: SortField) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortTooltip = (key: SortField, label: string) => {
    const isActive = sortConfig.key === key;
    const direction = sortConfig.direction;
    let sortLegend = '';

    if (!isActive) {
      if (key === 'created_at') sortLegend = 'Sortuj od najstarszych';
      else if (key === 'id') sortLegend = 'Sortuj rosnąco';
      else if (key === 'priority') sortLegend = 'Sortuj od najniższego';
      else if (key === 'status') sortLegend = 'Sortuj Nowe ➔ Zamknięte';
      else sortLegend = 'Sortuj A → Z';
    } else {
      if (key === 'created_at') {
        sortLegend = direction === 'asc' ? 'Posortowane od najstarszych' : 'Posortowane od najnowszych';
      } else if (key === 'id') {
        sortLegend = direction === 'asc' ? 'Posortowane rosnąco' : 'Posortowane malejąco';
      } else if (key === 'priority') {
        sortLegend = direction === 'asc' ? 'Posortowane od najniższego' : 'Posortowane od najwyższego';
      } else if (key === 'status') {
        sortLegend = direction === 'asc' ? 'Posortowane Nowe ➔ Zamknięte' : 'Posortowane Zamknięte ➔ Nowe';
      } else {
        sortLegend = direction === 'asc' ? 'Posortowane A → Z' : 'Posortowane Z → A';
      }
    }

    return `${label} • ${sortLegend}`;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTicketIds(filteredTickets.map(t => t.id));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const handleSelectTicket = (ticketId: number) => {
    setSelectedTicketIds(prev =>
      prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleBulkAction = async () => {
    if (selectedTicketIds.length === 0) return;
    if (!bulkStatus && !bulkAssignee) return;

    setIsBulkSubmitting(true);
    try {
      const updates: Partial<Ticket> = {};
      if (bulkStatus) updates.status = bulkStatus as any;
      if (bulkAssignee === 'me' && authContext?.user) {
        updates.technician = authContext.user.id;
      } else if (bulkAssignee) {
        updates.technician = Number(bulkAssignee);
      }

      await Promise.all(selectedTicketIds.map(id => ticketService.updateTicket(id, updates)));

      const response = await api.get('tickets/');
      setTickets(response.data);
      setBulkSuccessMessage('Zmiany zostały pomyślnie zastosowane!');
      setTimeout(() => {
        setBulkSuccessMessage('');
        setSelectedTicketIds([]);
        setBulkStatus('');
        setBulkAssignee('');
      }, 4000);
    } catch (err) {
      console.error('Bulk update error', err);
      alert('Wystąpił błąd podczas masowej aktualizacji.');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const renderSortableHeader = (field: SortField, label: string) => {
    const isActive = sortConfig.key === field;
    const direction = sortConfig.direction;
    const isAsc = direction === 'asc';

    return (
      <th
        key={field}
        className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 transition-colors group/th"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1 relative w-max">
          {label}
          <span className={`transition-opacity duration-200 flex items-center ${isActive ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover/th:opacity-100 text-gray-400'}`}>
            {(!isActive || isAsc) ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </span>

          {/* Custom Tooltip */}
          <div className={`absolute top-full mt-2 z-[60] pointer-events-none opacity-0 group-hover/th:opacity-100 transition-opacity duration-200 ${field === 'created_at' ? '-right-3' : 'left-1/2 -translate-x-1/2'}`}>
            <div className="bg-[#24272f] text-white text-[11.5px] font-medium px-3 py-2 rounded shadow-lg w-max max-w-[160px] whitespace-normal normal-case tracking-normal text-left leading-snug">
              {getSortTooltip(field, label)}
            </div>
          </div>
        </div>
      </th>
    );
  };

  filteredTickets = [...filteredTickets].sort((a, b) => {
    let aValue: any = a.id;
    let bValue: any = b.id;

    switch (sortConfig.key) {
      case 'id':
        aValue = a.id;
        bValue = b.id;
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'category_name':
        aValue = a.category_name?.toLowerCase() || '';
        bValue = b.category_name?.toLowerCase() || '';
        break;
      case 'priority':
        const priorityOrder = { 'WYSOKI': 3, 'NORMALNY': 2, 'NISKI': 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'creator':
        aValue = a.creator_details ? `${a.creator_details.first_name} ${a.creator_details.last_name}`.toLowerCase() : '';
        bValue = b.creator_details ? `${b.creator_details.first_name} ${b.creator_details.last_name}`.toLowerCase() : '';
        break;
      case 'technician':
        aValue = a.technician_details ? `${a.technician_details.first_name} ${a.technician_details.last_name}`.toLowerCase() : '';
        bValue = b.technician_details ? `${b.technician_details.first_name} ${b.technician_details.last_name}`.toLowerCase() : '';
        break;
      case 'status':
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Unikalne kategorie z zgloszen
  const categories = [...new Set(tickets.map(t => t.category_name).filter(Boolean))];

  // Liczniki (admin)
  const statusCounts = {
    all: tickets.length,
    NOWE: tickets.filter(t => t.status === 'NOWE').length,
    W_TOKU: tickets.filter(t => t.status === 'W_TOKU').length,
    ROZWIAZANE: tickets.filter(t => t.status === 'ROZWIAZANE').length,
    ZAMKNIETE: tickets.filter(t => t.status === 'ZAMKNIETE').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEmployee ? 'Moje zgłoszenia' : isAdmin ? 'Zarządzanie zgłoszeniami' : 'Zgłoszenia'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredTickets.length} z {tickets.length} zgłoszeń
          </p>
        </div>
        <Link
          to="/create-ticket"
          className="inline-flex items-center px-5 py-2.5 text-white text-sm font-bold bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
        >
          <PlusCircle size={18} className="mr-2" />
          Nowe zgłoszenie
        </Link>
      </div>

      {/* ============ Filtry ============ */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Wyszukiwarka */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Szukaj po tytule, ID lub osobie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status */}
        <CustomDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Status"
          options={[
            { value: 'all', label: 'Wszystkie' },
            { value: 'NOWE', label: `Nowe (${statusCounts.NOWE})`, icon: <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" /> },
            { value: 'W_TOKU', label: `W toku (${statusCounts.W_TOKU})`, icon: <Circle className="w-4 h-4 text-amber-500 dark:text-amber-400 stroke-[2.5]" /> },
            { value: 'ROZWIAZANE', label: `Rozwiązane (${statusCounts.ROZWIAZANE})`, icon: <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 stroke-[2.5]" /> },
            { value: 'ZAMKNIETE', label: `Zamknięte (${statusCounts.ZAMKNIETE})`, icon: <XCircle className="w-4 h-4 text-teal-500 dark:text-teal-400 stroke-[2.5]" /> }
          ]}
          className="w-36 sm:w-44"
        />

        {/* Kategoria */}
        <CustomDropdown
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Kategoria"
          options={[
            { value: 'all', label: 'Wszystkie' },
            ...categories.map(cat => ({
              value: cat as string,
              label: cat as string,
              icon: getCategoryIcon(cat as string)
            }))
          ]}
          className="w-40 sm:w-48"
        />

        {/* Priorytet (tylko dla Admina/Technika) */}
        {(isAdmin || isTechnician) && (
          <CustomDropdown
            value={priorityFilter}
            onChange={setPriorityFilter}
            placeholder="Priorytet"
            options={[
              { value: 'all', label: 'Wszystkie' },
              { value: 'WYSOKI', label: 'Wysoki', icon: PRIORITY_ICONS['WYSOKI'] },
              { value: 'NORMALNY', label: 'Normalny', icon: PRIORITY_ICONS['NORMALNY'] },
              { value: 'NISKI', label: 'Niski', icon: PRIORITY_ICONS['NISKI'] }
            ]}
            className="w-36 sm:w-44"
          />
        )}

        {/* Przypisanie (tylko dla Admina/Technika) */}
        {(isAdmin || isTechnician) && (
          <CustomDropdown
            value={assignmentFilter}
            onChange={setAssignmentFilter}
            placeholder="Przypisanie"
            options={[
              { value: 'all', label: 'Wszystkie' },
              {
                value: 'assigned_to_me', label: 'Moje zgłoszenia', icon: (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {authContext?.user?.avatar ? (
                      <img src={authContext.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase">{authContext?.user?.first_name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                )
              },
              {
                value: 'unassigned', label: 'Nie przypisano', icon: (
                  <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center flex-shrink-0">
                    <UserMinus className="w-3 h-3" />
                  </div>
                )
              },
              ...technicians.filter(t => t.id !== authContext?.user?.id).map((tech) => ({
                value: String(tech.id),
                label: `${tech.first_name} ${tech.last_name}`,
                icon: (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {tech.avatar ? (
                      <img src={tech.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase">{tech.first_name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                )
              }))
            ]}
            className="w-44 sm:w-56"
          />
        )}
      </div>

      {/* ============ Tabela ============ */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              {selectedTicketIds.length > 0 ? (
                <tr className="border-b-2 border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-[#1a1d24] transition-colors animate-in fade-in duration-200 z-10 relative">
                  <th className="py-4 pl-5 pr-3 w-10 text-center align-middle">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-blue-500 cursor-pointer translate-y-[2px]"
                      onChange={handleSelectAll}
                      checked={filteredTickets.length > 0 && selectedTicketIds.length === filteredTickets.length}
                    />
                  </th>
                  <th colSpan={isEmployee ? 6 : 8} className="px-6 py-2 font-normal text-left">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1.5 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 rounded-xl font-bold text-sm border border-blue-100 dark:border-blue-800 whitespace-nowrap shadow-sm flex items-center">
                        <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-md flex items-center justify-center text-xs mr-2">{selectedTicketIds.length}</span>
                        Wybrano
                      </div>

                      <div className="w-px h-6 bg-blue-200/50 dark:bg-blue-800/50"></div>

                      {(isAdmin || isTechnician) && (
                        <CustomDropdown
                          className="w-48 shadow-sm bg-white dark:bg-gray-800 border-blue-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700/50 text-blue-900 dark:text-gray-200"
                          value={bulkAssignee}
                          onChange={setBulkAssignee}
                          placeholder="Przypisz do..."
                          options={[
                            {
                              value: 'me',
                              label: 'Przypisz do mnie',
                              icon: authContext?.user?.avatar ? (
                                <img src={authContext.user.avatar} alt="" className="w-5 h-5 rounded-full object-cover mr-1" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] mr-1">Ty</div>
                              )
                            },
                            ...technicians.filter(t => t.id !== authContext?.user?.id).map((tech) => ({
                              value: String(tech.id),
                              label: `${tech.first_name} ${tech.last_name}`,
                              icon: tech.avatar ? (
                                <img src={tech.avatar} alt="" className="w-5 h-5 rounded-full object-cover mr-1" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-[10px] mr-1">{tech.first_name[0]}{tech.last_name[0]}</div>
                              )
                            }))
                          ]}
                        />
                      )}

                      <CustomDropdown
                        className="w-44 shadow-sm bg-white dark:bg-gray-800 border-blue-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700/50 text-blue-900 dark:text-gray-200"
                        value={bulkStatus}
                        onChange={setBulkStatus}
                        placeholder="Zmień status..."
                        options={[
                          { value: 'NOWE', label: 'Nowe', icon: <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" /> },
                          { value: 'W_TOKU', label: 'W toku', icon: <Circle className="w-4 h-4 text-amber-500 dark:text-amber-400 stroke-[2.5]" /> },
                          { value: 'ROZWIAZANE', label: 'Rozwiązane', icon: <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 stroke-[2.5]" /> },
                          { value: 'ZAMKNIETE', label: 'Zamknięte', icon: <XCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 stroke-[2.5]" /> },
                        ]}
                      />

                      <div className="w-px h-6 bg-blue-200/50 dark:bg-blue-800/50"></div>

                      <button
                        onClick={handleBulkAction}
                        disabled={isBulkSubmitting || (!bulkAssignee && !bulkStatus)}
                        className={`px-5 py-2 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${bulkSuccessMessage
                          ? 'bg-green-500 hover:bg-green-600 shadow-green-200 dark:shadow-none pointer-events-none'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
                          }`}
                      >
                        {isBulkSubmitting && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                        {!isBulkSubmitting && bulkSuccessMessage && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                        {isBulkSubmitting
                          ? 'Przetwarzanie...'
                          : bulkSuccessMessage
                            ? 'Sukces!'
                            : 'Zastosuj'}
                      </button>
                    </div>
                  </th>
                </tr>
              ) : (
                <tr className="border-b-2 border-gray-200 bg-gray-50/50 transition-colors animate-in fade-in">
                  <th className="py-4 pl-5 pr-3 w-10 text-center align-middle">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer translate-y-[2px]"
                      onChange={handleSelectAll}
                      checked={filteredTickets.length > 0 && selectedTicketIds.length === filteredTickets.length}
                    />
                  </th>
                  {renderSortableHeader('id', 'ID')}
                  {renderSortableHeader('title', 'Tytuł')}
                  {renderSortableHeader('category_name', 'Kategoria')}
                  {!isEmployee && renderSortableHeader('priority', 'Priorytet')}
                  {renderSortableHeader('creator', 'Zgłaszający')}
                  {!isEmployee && renderSortableHeader('technician', 'Przypisany')}
                  {renderSortableHeader('status', 'Status')}
                  {renderSortableHeader('created_at', 'Utworzono')}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="px-6 py-12 text-center text-gray-500 text-sm italic">
                    Brak zgłoszeń spełniających kryteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id} className={`transition-colors ${selectedTicketIds.includes(ticket.id)
                    ? 'bg-blue-50/60 hover:bg-blue-100/60 dark:bg-blue-900/50 dark:hover:bg-blue-800/60'
                    : 'hover:bg-gray-50/60 dark:hover:bg-gray-700/30'
                    }`}>
                    <td className="py-4 pl-5 pr-3 w-10 text-center align-middle">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-blue-500 cursor-pointer translate-y-[2px]"
                        checked={selectedTicketIds.includes(ticket.id)}
                        onChange={() => handleSelectTicket(ticket.id)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">#{ticket.id}</td>
                    <td className="px-6 py-4 text-sm max-w-[200px] sm:max-w-[250px] lg:max-w-[350px]">
                      {selectedTicketIds.length > 0 ? (
                        <div
                          title={ticket.title}
                          onClick={() => handleSelectTicket(ticket.id)}
                          className="inline-block font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors whitespace-normal break-words"
                        >
                          {ticket.title}
                        </div>
                      ) : (
                        <Link
                          to={`/tickets/${ticket.id}`}
                          title={ticket.title}
                          className="inline-block font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors whitespace-normal break-words"
                        >
                          {ticket.title}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        {getCategoryIcon(ticket.category_name || '')}
                        {ticket.category_name || '—'}
                      </span>
                    </td>
                    {!isEmployee && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {PRIORITY_ICONS[ticket.priority]}
                          <span className={ticket.priority === 'WYSOKI' ? 'text-red-600' : ticket.priority === 'NORMALNY' ? 'text-blue-600' : 'text-gray-500'}>
                            {PRIORITY_LABELS[ticket.priority]}
                          </span>
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">
                      {ticket.creator_details ? (
                        <span className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {ticket.creator_details.avatar ? (
                              <img src={ticket.creator_details.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold uppercase">{ticket.creator_details.first_name?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          {ticket.creator_details.first_name} {ticket.creator_details.last_name}
                        </span>
                      ) : <span className="text-gray-400 italic">Nieznany</span>}
                    </td>
                    {!isEmployee && (
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {ticket.technician_details ? (
                          <span className="flex items-center gap-2 text-gray-900 dark:text-gray-200 font-medium">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {ticket.technician_details.avatar ? (
                                <img src={ticket.technician_details.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold uppercase">{ticket.technician_details.first_name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            {ticket.technician_details.first_name} {ticket.technician_details.last_name}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-500 italic">
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center flex-shrink-0">
                              <UserMinus className="w-3 h-3" />
                            </div>
                            Nie przypisano
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-lg ${STATUS_STYLES[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {dayjs(ticket.created_at).format('DD MMM YYYY, HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;