import React, { useContext, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import useTitle from '../hooks/useTitle';
import api from '../api/axiosConfig';
import {
  Camera,
  Save,
  User,
  Bell,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Sun,
  Moon,
  Palette,
  Mail,
  Trash2,
  Upload,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Pracownik',
  TECHNICIAN: 'Technik',
  ADMIN: 'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  TECHNICIAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
};

const SettingsPage: React.FC = () => {
  useTitle('Ustawienia');
  const authContext = useContext(AuthContext);
  const themeContext = useContext(ThemeContext);
  const user = authContext?.user;
  const role = user?.role;

  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'notifications'>('profile');

  // Profile form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Notifications state
  const [notifyNewTicket, setNotifyNewTicket] = useState(user?.notify_new_ticket ?? true);
  const [notifyComment, setNotifyComment] = useState(user?.notify_ticket_comment ?? true);
  const [notifyStatus, setNotifyStatus] = useState(user?.notify_ticket_status_change ?? true);

  // Status messages
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Proszę wybrać plik graficzny (JPG, PNG, GIF, WebP).');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Rozmiar pliku nie może przekraczać 5 MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setErrorMsg(null);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim());

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (avatarPreview === null && user?.avatar) {
        // User clicked remove → send empty value to clear avatar
        formData.append('avatar', '');
      }

      await api.patch('users/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Refresh user data in AuthContext
      await authContext?.refreshUser();
      setAvatarFile(null);
      setSuccessMsg('Profil został zaktualizowany pomyślnie.');
    } catch (err: any) {
      console.error('Błąd aktualizacji profilu:', err);
      if (err.response?.data) {
        const messages = Object.values(err.response.data).flat().join(' ');
        setErrorMsg(messages || 'Wystąpił błąd podczas zapisywania.');
      } else {
        setErrorMsg('Wystąpił błąd podczas zapisywania.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Nowe hasła nie są identyczne.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('users/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccessMsg('Hasło zostało pomyślnie zmienione.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.response?.data) {
        const messages = Object.values(err.response.data).flat().join(' ');
        setPasswordErrorMsg(messages || 'Nie udało się zmienić hasła.');
      } else {
        setPasswordErrorMsg('Wystąpił błąd podczas zmiany hasła.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTogglePreference = async (field: 'notify_new_ticket' | 'notify_ticket_comment' | 'notify_ticket_status_change', currentValue: boolean) => {
    const newValue = !currentValue;
    try {
      await api.patch('users/me/', { [field]: newValue });
      
      if (field === 'notify_new_ticket') setNotifyNewTicket(newValue);
      if (field === 'notify_ticket_comment') setNotifyComment(newValue);
      if (field === 'notify_ticket_status_change') setNotifyStatus(newValue);
      
      await authContext?.refreshUser();
    } catch (err) {
      console.error('Błąd aktualizacji preferencji:', err);
    }
  };

  const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Mój profil', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Zabezpieczenia', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'appearance', label: 'Wygląd', icon: <Palette className="w-4 h-4" /> },
  ];

  // Technik & Admin get extra tabs
  if (role === 'TECHNICIAN' || role === 'ADMIN') {
    tabs.push({ id: 'notifications', label: 'Powiadomienia', icon: <Bell className="w-4 h-4" /> });
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Ustawienia</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Zarządzaj swoim profilem i preferencjami konta.</p>
      </div>

      {/* Tabs & Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSuccessMsg(null); setErrorMsg(null); }}
                className={`flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ===== PROFILE TAB ===== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Status messages */}
              {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-300 animate-in fade-in duration-200">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="font-medium">{successMsg}</span>
                  <button onClick={() => setSuccessMsg(null)} className="ml-auto p-1 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                  <button onClick={() => setErrorMsg(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Avatar + Personal Info — combined card */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                {/* Avatar banner */}
                <div className="relative h-28 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
                  <div className="absolute -bottom-12 left-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-3xl uppercase">
                            {user?.first_name ? user.first_name.charAt(0) : 'U'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shadow-md transition-all hover:scale-110 border-2 border-white dark:border-gray-800"
                        title="Zmień zdjęcie"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                  {/* Avatar actions — top right of banner */}
                  <div className="absolute bottom-3 right-4 flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      <Upload className="w-3 h-3" />
                      {avatarPreview ? 'Zmień' : 'Dodaj zdjęcie'}
                    </button>
                    {avatarPreview && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm text-white text-xs font-semibold rounded-lg transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        Usuń
                      </button>
                    )}
                  </div>
                </div>

                {/* User info below avatar */}
                <div className="pt-16 px-6 pb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {user?.first_name} {user?.last_name}
                    </h3>
                    {role && (
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {user?.email}
                  </p>

                  {/* Editable fields */}
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Dane osobowe</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider">Imię</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all placeholder-gray-400"
                          placeholder="Jan"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider">Nazwisko</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all placeholder-gray-400"
                          placeholder="Kowalski"
                        />
                      </div>
                    </div>
                  </div>


                  {/* Save button — inside card */}
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/20 dark:shadow-none transition-all disabled:opacity-50 hover:shadow-xl hover:shadow-blue-600/25 active:scale-[0.98]"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== SECURITY TAB ===== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {passwordSuccessMsg && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-300 animate-in fade-in duration-200">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="font-medium">{passwordSuccessMsg}</span>
                  <button onClick={() => setPasswordSuccessMsg(null)} className="ml-auto p-1 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {passwordErrorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="font-medium">{passwordErrorMsg}</span>
                  <button onClick={() => setPasswordErrorMsg(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Zmiana hasła</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Zaktualizuj swoje hasło do konta.</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="mt-8 space-y-4 max-w-md">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider">Obecne hasło</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all placeholder-gray-400 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider">Nowe hasło</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all placeholder-gray-400 pr-10"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider">Powtórz nowe hasło</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all placeholder-gray-400 pr-10"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/20 dark:shadow-none transition-all disabled:opacity-50 hover:shadow-xl hover:shadow-blue-600/25 active:scale-[0.98]"
                    >
                      {isChangingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isChangingPassword ? 'Zmienianie...' : 'Zmień hasło'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===== APPEARANCE TAB ===== */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Motyw aplikacji</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Wybierz preferowany motyw kolorystyczny interfejsu.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light mode */}
                  <button
                    onClick={() => { if (themeContext?.isDark) themeContext.toggleTheme(); }}
                    className={`relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all group ${!themeContext?.isDark
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-md ring-4 ring-blue-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'
                      }`}
                  >
                    <div className={`w-20 h-14 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60`}>
                      <Sun className="w-8 h-8 text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Jasny</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Klasyczny, jasny interfejs</p>
                    </div>
                    {!themeContext?.isDark && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </button>

                  {/* Dark mode */}
                  <button
                    onClick={() => { if (!themeContext?.isDark) themeContext?.toggleTheme(); }}
                    className={`relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all group ${themeContext?.isDark
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-md ring-4 ring-blue-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'
                      }`}
                  >
                    <div className={`w-20 h-14 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600`}>
                      <Moon className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Ciemny</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Łagodny dla oczu w ciemności</p>
                    </div>
                    {themeContext?.isDark && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS TAB (Technik / Admin) ===== */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Powiadomienia</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Zarządzaj swoimi preferencjami powiadomień.</p>

              <div className="space-y-3">
                <div 
                  onClick={() => handleTogglePreference('notify_new_ticket', notifyNewTicket)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                    notifyNewTicket 
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50' 
                      : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nowe zgłoszenia</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Otrzymuj e-mail gdy zostanie utworzone nowe zgłoszenie.</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative shadow-inner flex-shrink-0 ml-4 transition-colors duration-300 ${notifyNewTicket ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${notifyNewTicket ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                <div 
                  onClick={() => handleTogglePreference('notify_ticket_comment', notifyComment)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                    notifyComment 
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50' 
                      : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Komentarze</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Otrzymuj e-mail gdy ktoś skomentuje Twoje zgłoszenie.</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative shadow-inner flex-shrink-0 ml-4 transition-colors duration-300 ${notifyComment ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${notifyComment ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                <div 
                  onClick={() => handleTogglePreference('notify_ticket_status_change', notifyStatus)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                    notifyStatus 
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50' 
                      : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Zmiana statusu</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Otrzymuj e-mail gdy zmieni się status Twojego zgłoszenia.</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative shadow-inner flex-shrink-0 ml-4 transition-colors duration-300 ${notifyStatus ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${notifyStatus ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
