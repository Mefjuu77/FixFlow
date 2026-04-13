import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { Ticket } from '../types';
import dayjs from 'dayjs';
import { PlusCircle, Search, ChevronDown, AlertTriangle, Minus, ArrowDown, Folder, Tag, Filter, Users, UserCheck, UserMinus, Monitor, Terminal, Wifi, Lock, HelpCircle } from 'lucide-react';
import useTitle from '../hooks/useTitle';

interface CustomDropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, options, placeholder = "Wybierz", className = "w-48" }) => {
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
        className={`flex items-center justify-between pl-3 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-[60] left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto w-full min-w-max">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`flex items-center w-full gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors ${value === opt.value ? 'bg-blue-50/50 font-semibold text-blue-700' : ''}`}
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

const STATUS_LABELS: Record<string, string> = {
  NOWE: 'Nowe',
  W_TOKU: 'W toku',
  ROZWIAZANE: 'Rozwiązane',
  ZAMKNIETE: 'Zamknięte',
};

const STATUS_STYLES: Record<string, string> = {
  NOWE: 'bg-blue-100 text-blue-800',
  W_TOKU: 'bg-amber-100 text-amber-800',
  ROZWIAZANE: 'bg-green-100 text-green-800',
  ZAMKNIETE: 'bg-gray-100 text-gray-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  NISKI: 'Niski',
  NORMALNY: 'Normalny',
  WYSOKI: 'Wysoki',
};

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  WYSOKI: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  NORMALNY: <Minus className="w-3.5 h-3.5 text-blue-500" />,
  NISKI: <ArrowDown className="w-3.5 h-3.5 text-gray-400" />,
};

const getCategoryIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('sprzęt')) return <Monitor className="w-4 h-4 text-gray-500" />;
  if (lowerName.includes('oprogramowanie')) return <Terminal className="w-4 h-4 text-gray-500" />;
  if (lowerName.includes('sieć')) return <Wifi className="w-4 h-4 text-gray-500" />;
  if (lowerName.includes('dostęp')) return <Lock className="w-4 h-4 text-gray-500" />;
  return <HelpCircle className="w-4 h-4 text-gray-500" />;
};

const TicketsPage: React.FC = () => {
  useTitle('Zgłoszenia');
  const authContext = useContext(AuthContext);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtry technika i admina
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const role = authContext?.user?.role;
  const isEmployee = role === 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';

  useEffect(() => { fetchTickets(); }, []);

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

  // Filtry technika i admina
  if (isAdmin || isTechnician) {
    if (statusFilter !== 'all') {
      filteredTickets = filteredTickets.filter(t => t.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      filteredTickets = filteredTickets.filter(t => t.priority === priorityFilter);
    }
    if (categoryFilter !== 'all') {
      filteredTickets = filteredTickets.filter(t => t.category_name === categoryFilter);
    }
    if (assignmentFilter === 'unassigned') {
      filteredTickets = filteredTickets.filter(t => t.technician === null);
    } else if (assignmentFilter === 'assigned') {
      filteredTickets = filteredTickets.filter(t => t.technician !== null);
    } else if (assignmentFilter === 'assigned_to_me') {
      filteredTickets = filteredTickets.filter(t => t.technician === authContext?.user?.id);
    }
  }

  // Sortowanie: najnowsze na górze
  filteredTickets = filteredTickets.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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

      {/* ============ Filtry ADMIN / TECHNIK ============ */}
      {(isAdmin || isTechnician) && (
        <div className="space-y-4">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Wszystkie', count: statusCounts.all },
              { key: 'NOWE', label: 'Nowe', count: statusCounts.NOWE },
              { key: 'W_TOKU', label: 'W toku', count: statusCounts.W_TOKU },
              { key: 'ROZWIAZANE', label: 'Rozwiązane', count: statusCounts.ROZWIAZANE },
              { key: 'ZAMKNIETE', label: 'Zamknięte', count: statusCounts.ZAMKNIETE },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-md ${
                  statusFilter === tab.key ? 'bg-blue-500 text-blue-100' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Dropdowns row */}
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

            {/* Kategoria */}
            <CustomDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'Kategoria: Wszystkie', icon: <Folder className="w-4 h-4 text-gray-400" /> },
                ...categories.map(cat => ({
                   value: cat as string,
                   label: cat as string,
                   icon: getCategoryIcon(cat as string)
                }))
              ]}
              className="w-48 sm:w-52"
            />

            {/* Priorytet */}
            <CustomDropdown
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: 'all', label: 'Priorytet: Wszystkie', icon: <Filter className="w-4 h-4 text-gray-400" /> },
                { value: 'WYSOKI', label: 'Wysoki', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
                { value: 'NORMALNY', label: 'Normalny', icon: <Minus className="w-4 h-4 text-blue-500" /> },
                { value: 'NISKI', label: 'Niski', icon: <ArrowDown className="w-4 h-4 text-gray-400" /> }
              ]}
              className="w-40 sm:w-48"
            />

            {/* Przypisanie */}
            <CustomDropdown
              value={assignmentFilter}
              onChange={setAssignmentFilter}
              options={[
                { value: 'all', label: 'Przypisanie: Wszystkie', icon: <Users className="w-4 h-4 text-gray-400" /> },
                ...(isTechnician ? [{ value: 'assigned_to_me', label: 'Przypisane do mnie', icon: <UserCheck className="w-4 h-4 text-blue-600" /> }] : []),
                { value: 'assigned', label: 'Przypisane', icon: <UserCheck className="w-4 h-4 text-green-600" /> },
                { value: 'unassigned', label: 'Nieprzypisane', icon: <UserMinus className="w-4 h-4 text-red-500" /> }
              ]}
              className="w-44 sm:w-56"
            />
          </div>
        </div>
      )}

      {/* ============ Filtry PRACOWNIK ============ */}
      {isEmployee && (
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Szukaj po tytule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ============ Tabela ============ */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Tytuł</th>
                {!isEmployee && (
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Kategoria</th>
                )}
                {!isEmployee && (
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Priorytet</th>
                )}
                {!isEmployee && (
                  <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Zgłaszający</th>
                )}
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Przypisany</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Utworzono</th>
              </tr>
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
                  <tr key={ticket.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-400 whitespace-nowrap">#{ticket.id}</td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    {!isEmployee && (
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 font-medium">
                          {getCategoryIcon(ticket.category_name || '')}
                          {ticket.category_name || '—'}
                        </span>
                      </td>
                    )}
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
                    {!isEmployee && (
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap font-medium">
                        {ticket.creator_details
                          ? `${ticket.creator_details.first_name} ${ticket.creator_details.last_name}`
                          : <span className="text-gray-400 italic">Nieznany</span>}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {ticket.technician_details
                        ? <span className="text-gray-900 font-medium">{ticket.technician_details.first_name} {ticket.technician_details.last_name}</span>
                        : <span className="text-gray-400 italic">Nie przypisano</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-lg ${STATUS_STYLES[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {dayjs(ticket.created_at).format('DD.MM.YYYY HH:mm')}
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