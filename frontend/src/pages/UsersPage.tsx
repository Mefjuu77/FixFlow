import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axiosConfig';
import { User } from '../types';
import useTitle from '../hooks/useTitle';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Shield,
  Wrench,
  UserIcon,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  ArrowUp,
  ArrowDown,
  Users,
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
  const [sortConfig, setSortConfig] = useState<{ key: SortField; direction: SortDirection }>({ key: 'name', direction: 'asc' });

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Role counts
  const roleCounts = {
    all: users.length,
    EMPLOYEE: users.filter(u => u.role === 'EMPLOYEE').length,
    TECHNICIAN: users.filter(u => u.role === 'TECHNICIAN').length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
  };

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
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

  // Filter: search ∩ role
  const filteredUsers = [...users]
    .filter(u => {
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

  // ---------- Delete ----------
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`users/${deleteTarget.id}/`);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      console.error('Błąd usuwania:', err);
      alert('Nie udało się usunąć użytkownika.');
    } finally {
      setIsDeleting(false);
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
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* ============ Header ============ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zarządzanie użytkownikami</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {users.length} {users.length === 1 ? 'użytkownik' : 'użytkowników'} w systemie
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm hover:shadow-md shadow-blue-600/10 transition-all text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Nowy użytkownik
        </button>
      </div>

      {/* ============ Filter Bar ============ */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
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

        {/* Role tabs */}
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
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`tabular-nums text-xs ${
                roleFilter === tab.value ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}>({tab.count})</span>
            </button>
          ))}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Wyczyść
            </button>
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filteredUsers.length === 0 ? (
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
                filteredUsers.map(user => (
                  <tr key={user.id} className="group/row hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden outline outline-1 outline-gray-200 text-white font-bold text-sm flex-shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            user.first_name ? user.first_name.charAt(0).toUpperCase() : '?'
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${ROLE_STYLES[user.role]}`}>
                        {ROLE_ICONS[user.role]}
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all hover:scale-110"
                          title="Edytuj"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all hover:scale-110"
                          title="Resetuj hasło"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all hover:scale-110"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
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
      )}

      {/* ========== Modal: Potwierdzenie usunięcia ========== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Usunąć użytkownika?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Czy na pewno chcesz usunąć <span className="font-semibold text-gray-700 dark:text-gray-200">{deleteTarget.first_name} {deleteTarget.last_name}</span>?
              <br />Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center"
              >
                {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
