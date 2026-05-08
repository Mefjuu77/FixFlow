import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axiosConfig';
import { User } from '../types';
import useTitle from '../hooks/useTitle';
import {
  Plus,
  Search,
  Trash2,
  X,
  Shield,
  Wrench,
  UserIcon,
  Mail,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Users,
  UserX,
  UserCheck,
  Settings,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Pracownik',
  TECHNICIAN: 'Technik',
  ADMIN: 'Administrator',
};


const ROLE_STYLES: Record<string, string> = {
  EMPLOYEE: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  TECHNICIAN: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
  ADMIN: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  EMPLOYEE: <UserIcon className="w-3.5 h-3.5" />,
  TECHNICIAN: <Wrench className="w-3.5 h-3.5" />,
  ADMIN: <Shield className="w-3.5 h-3.5" />,
};


interface UserForm {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  password: string;
}

type SortField = 'name' | 'email';
type SortDirection = 'asc' | 'desc';

const emptyForm: UserForm = { email: '', first_name: '', last_name: '', role: 'EMPLOYEE', password: '' };

const UsersPage: React.FC = () => {
  useTitle('Użytkownicy');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortConfig, setSortConfig] = useState<{ key: SortField; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);

  // Toggle active
  const [isToggling, setIsToggling] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get<User[]>('users/list/');
      setUsers(res.data);
    } catch (err) {
      console.error('Błąd pobierania użytkowników:', err);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchUsers();
    // Sprawdzamy czy przekazano state wymuszający otwarcie modala (np. z Palety Komend)
    if (location.state?.openCreateModal) {
      // Z opóźnieniem by upewnić się, że komponent się w pełni zamontował
      setTimeout(() => openCreateModal(), 100);
      // Czyścimy state, by modal nie otwierał się po każdym refreshu
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, sortConfig]);

  // Role counts
  const roleCounts = {
    all: users.length,
    EMPLOYEE: users.filter(u => u.role === 'EMPLOYEE').length,
    TECHNICIAN: users.filter(u => u.role === 'TECHNICIAN').length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
  };

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'all' || statusFilter !== 'active';

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('active');
  };

  const getSortTooltip = (field: 'name' | 'email', label: string) => {
    const isActive = sortConfig.key === field;
    let sortLegend = '';

    if (!isActive) {
      sortLegend = 'Sortuj A → Z';
    } else {
      sortLegend = sortConfig.direction === 'asc' ? 'Posortowane A → Z' : 'Posortowane Z → A';
    }

    return `${label} • ${sortLegend}`;
  };

  // Filter: search ∩ role ∩ status
  const filteredUsers = [...users]
    .filter(u => {
      if (statusFilter === 'active' && u.is_active === false) return false;
      if (statusFilter === 'inactive' && u.is_active !== false) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          u.email.toLowerCase().includes(q) ||
          u.first_name.toLowerCase().includes(q) ||
          u.last_name.toLowerCase().includes(q) ||
          ROLE_LABELS[u.role]?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      if (sortConfig.key === 'name') {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB, 'pl') * dir;
      }
      return a.email.localeCompare(b.email, 'pl') * dir;
    });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      key: field,
      direction: prev.key === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ---------- Modal ----------
  const openCreateModal = () => {
    setEditUserId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setShowPassword(false);
    setFocusPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditUserId(user.id);
    setFormData({ email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, password: '' });
    setFormErrors({});
    setShowPassword(false);
    setFocusPassword(false);
    setIsModalOpen(true);
  };

  const openResetPasswordModal = (user: User) => {
    setEditUserId(user.id);
    setFormData({ email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, password: '' });
    setFormErrors({});
    setShowPassword(true);
    setFocusPassword(true);
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Partial<Record<keyof UserForm, string>> = {};
    if (!formData.email.trim()) errs.email = 'Email jest wymagany.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Nieprawidłowy format email.';
    if (!formData.first_name.trim()) errs.first_name = 'Imię jest wymagane.';
    if (!formData.last_name.trim()) errs.last_name = 'Nazwisko jest wymagane.';
    if (!editUserId && !formData.password) errs.password = 'Hasło jest wymagane.';
    else if (formData.password && formData.password.length < 6) errs.password = 'Hasło musi mieć min. 6 znaków.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    const payload: any = {
      email: formData.email.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      role: formData.role,
    };
    if (formData.password) payload.password = formData.password;

    try {
      if (editUserId) {
        await api.patch(`users/${editUserId}/`, payload);
      } else {
        await api.post('users/create/', payload);
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      if (err.response?.data) {
        const apiErrors: Partial<Record<keyof UserForm, string>> = {};
        for (const [key, val] of Object.entries(err.response.data)) {
          apiErrors[key as keyof UserForm] = Array.isArray(val) ? val[0] : String(val);
        }
        setFormErrors(apiErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Toggle Active ----------
  const handleToggleActive = async (user: User) => {
    setIsToggling(user.id);
    try {
      await api.post(`users/${user.id}/toggle-active/`);
      await fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Nie udało się zmienić statusu.';
      alert(msg);
    } finally {
      setIsToggling(null);
    }
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        {/* ============ Header ============ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zarządzanie użytkownikami</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm hover:shadow-md shadow-blue-600/10 transition-all text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Nowy użytkownik
        </button>
      </div>

      {/* ============ Filter Bar ============ */}
      <div className="flex flex-col gap-2.5 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        {/* Row 1: Search + Role tabs (primary) */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              placeholder="Szukaj po imieniu, nazwisku lub email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Role tabs (primary) */}
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { value: 'all', label: 'Wszyscy', count: roleCounts.all, icon: null },
              { value: 'EMPLOYEE', label: 'Pracownicy', count: roleCounts.EMPLOYEE, icon: <UserIcon className="w-3.5 h-3.5" /> },
              { value: 'TECHNICIAN', label: 'Technicy', count: roleCounts.TECHNICIAN, icon: <Wrench className="w-3.5 h-3.5" /> },
              { value: 'ADMIN', label: 'Administratorzy', count: roleCounts.ADMIN, icon: <Shield className="w-3.5 h-3.5" /> },
            ] as const).map(tab => (
              <button
                key={tab.value}
                onClick={() => setRoleFilter(tab.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  roleFilter === tab.value
                    ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`tabular-nums text-xs ${
                  roleFilter === tab.value ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
                }`}>({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Status filter (secondary) */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 whitespace-nowrap select-none">Status</span>
          <div className="flex items-center gap-1">
            {([
              { value: 'active' as const, label: 'Aktywni', icon: <UserCheck className="w-3 h-3" /> },
              { value: 'inactive' as const, label: 'Nieaktywni', icon: <UserX className="w-3 h-3" /> },
              { value: 'all' as const, label: 'Wszyscy', icon: null },
            ]).map(tab => (
              <button
                key={`status-${tab.value}`}
                onClick={() => setStatusFilter(tab.value)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? tab.value === 'inactive'
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      : tab.value === 'active'
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
                    : tab.value === 'inactive'
                      ? 'text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
                      : tab.value === 'active'
                        ? 'text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
              <button
                onClick={clearFilters}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Wyczyść filtry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ Table ============ */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
                {/* Sortable: Użytkownik */}
                <th
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors group/th"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1 relative w-max">
                    Użytkownik
                    <span className={`transition-opacity duration-200 flex items-center ${sortConfig.key === 'name' ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover/th:opacity-100 text-gray-400'}`}>
                      {sortConfig.key !== 'name' || sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute top-full mt-2 -left-2 z-[60] pointer-events-none opacity-0 group-hover/th:opacity-100 transition-opacity duration-200">
                      <div className="bg-[#24272f] text-white text-[11.5px] font-medium px-3 py-2 rounded shadow-lg w-max whitespace-nowrap normal-case tracking-normal text-left leading-snug">
                        {getSortTooltip('name', 'Użytkownik')}
                      </div>
                    </div>
                  </div>
                </th>
                {/* Sortable: Email */}
                <th
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors group/th"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1 relative w-max">
                    Email
                    <span className={`transition-opacity duration-200 flex items-center ${sortConfig.key === 'email' ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover/th:opacity-100 text-gray-400'}`}>
                      {sortConfig.key !== 'email' || sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[60] pointer-events-none opacity-0 group-hover/th:opacity-100 transition-opacity duration-200">
                      <div className="bg-[#24272f] text-white text-[11.5px] font-medium px-3 py-2 rounded shadow-lg w-max whitespace-nowrap normal-case tracking-normal text-left leading-snug">
                        {getSortTooltip('email', 'Email')}
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rola</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    {users.length === 0 ? (
                      /* Empty state: no users at all */
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                          <Users className="w-7 h-7 text-blue-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Brak użytkowników w systemie</p>
                        <p className="text-xs text-gray-400 mb-4">Dodaj pierwszego użytkownika, aby rozpocząć.</p>
                        <button
                          onClick={openCreateModal}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                        >
                          <Plus className="w-4 h-4" /> Dodaj użytkownika
                        </button>
                      </div>
                    ) : (
                      /* Empty state: no search results */
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Brak wyników</p>
                        <p className="text-xs text-gray-400 mb-4">Spróbuj zmienić kryteria wyszukiwania.</p>
                        <button
                          onClick={clearFilters}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Wyczyść filtry
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => {
                  const inactive = user.is_active === false;
                  return (
                  <tr key={user.id} className={`group/row transition-colors ${inactive ? 'bg-gray-50/40 dark:bg-gray-800/40' : 'hover:bg-gray-50/60 dark:hover:bg-gray-700/30'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden outline outline-1 outline-gray-200 text-white font-bold text-sm flex-shrink-0 ${inactive ? 'bg-gray-400 dark:bg-gray-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                          {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className={`w-full h-full object-cover ${inactive ? 'opacity-50 grayscale' : ''}`} />
                          ) : (
                            user.first_name ? user.first_name.charAt(0).toUpperCase() : '?'
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${inactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${inactive ? 'opacity-50' : ''} ${ROLE_STYLES[user.role]}`}>
                          {ROLE_ICONS[user.role]}
                          {ROLE_LABELS[user.role]}
                        </span>
                        {inactive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                            <UserX className="w-3 h-3" />
                            Nieaktywny
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-1.5">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-800 transition-colors shadow-sm"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Zarządzaj
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={isToggling === user.id}
                          className={`inline-flex items-center justify-center gap-1.5 w-28 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white dark:bg-gray-800 shadow-sm transition-colors ${
                            inactive
                              ? 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 hover:border-green-200 dark:hover:border-green-800/60'
                              : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-200 dark:hover:border-amber-800/60'
                          } disabled:opacity-40`}
                        >
                          {isToggling === user.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : inactive ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                          {inactive ? 'Aktywuj' : 'Dezaktywuj'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer z informacją o liczbie wyników i paginacją */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-500">
            Pokazuję <strong className="text-slate-700 dark:text-slate-300">
              {filteredUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
            </strong> do <strong className="text-slate-700 dark:text-slate-300">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}
            </strong> z <strong className="text-slate-700 dark:text-slate-300">{filteredUsers.length}</strong> wyników.
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Poprzednia
              </button>
              
              <div className="flex items-center px-1 gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
                          currentPage === pageNum 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' 
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 || 
                    pageNum === currentPage + 2
                  ) {
                    return <span key={`ellipsis-${pageNum}`} className="text-gray-400 dark:text-gray-500 text-xs tracking-widest px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Następna
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ========== Modal: Tworzenie / Edycja ========== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editUserId ? (focusPassword ? 'Resetuj hasło' : 'Edytuj użytkownika') : 'Nowy użytkownik'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Imię i Nazwisko */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Imię</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={e => { setFormData({ ...formData, first_name: e.target.value }); if (formErrors.first_name) setFormErrors(p => ({ ...p, first_name: undefined })); }}
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:text-white ${formErrors.first_name ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}
                    placeholder="Jan"
                  />
                  {formErrors.first_name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.first_name}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Nazwisko</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={e => { setFormData({ ...formData, last_name: e.target.value }); if (formErrors.last_name) setFormErrors(p => ({ ...p, last_name: undefined })); }}
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:text-white ${formErrors.last_name ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}
                    placeholder="Kowalski"
                  />
                  {formErrors.last_name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.last_name}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => { setFormData({ ...formData, email: e.target.value }); if (formErrors.email) setFormErrors(p => ({ ...p, email: undefined })); }}
                    className={`w-full pl-10 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:text-white ${formErrors.email ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}
                    placeholder="jan.kowalski@firma.pl"
                  />
                </div>
                {formErrors.email && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.email}</p>}
              </div>

              {/* Rola */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Rola</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['EMPLOYEE', 'TECHNICIAN', 'ADMIN'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r })}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${formData.role === r
                          ? `${ROLE_STYLES[r]} ring-2 ring-offset-1 dark:ring-offset-gray-800 ${r === 'ADMIN' ? 'ring-violet-400 dark:ring-violet-500' : r === 'TECHNICIAN' ? 'ring-blue-400 dark:ring-blue-500' : 'ring-gray-400 dark:ring-gray-500'}`
                          : `border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 ${
                              r === 'ADMIN' ? 'hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-800/60' :
                              r === 'TECHNICIAN' ? 'hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800/60' :
                              'hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300'
                            }`
                        }`}
                    >
                      {ROLE_ICONS[r]}
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hasło */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">
                  Hasło {editUserId && <span className="font-normal text-gray-400 dark:text-gray-500">(zostaw puste aby nie zmieniać)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => { setFormData({ ...formData, password: e.target.value }); if (formErrors.password) setFormErrors(p => ({ ...p, password: undefined })); }}
                    className={`w-full px-3 py-2 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:text-white ${formErrors.password ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10' : focusPassword ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-500/10' : 'border-gray-200 dark:border-gray-700'}`}
                    placeholder={editUserId ? '••••••••' : 'Min. 6 znaków'}
                    autoFocus={focusPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.password}</p>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div />
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                    {editUserId ? 'Zapisz zmiany' : 'Utwórz użytkownika'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default UsersPage;
