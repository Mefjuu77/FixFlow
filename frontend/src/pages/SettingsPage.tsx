import React, { useContext, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const validTabs = ['profile', 'security', 'appearance', 'notifications'] as const;
type SettingsTab = typeof validTabs[number];

const SettingsPage: React.FC = () => {
  useTitle('Ustawienia');
  const authContext = useContext(AuthContext);
  const themeContext = useContext(ThemeContext);
  const user = authContext?.user;
  const role = user?.role;
  const [searchParams, setSearchParams] = useSearchParams();

  // Tabs — read initial tab from URL ?tab=security etc.
  const initialTab = (() => {
    const param = searchParams.get('tab');
    if (param && validTabs.includes(param as SettingsTab)) return param as SettingsTab;
    return 'profile';
  })();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Zmiana aktywnej zakładki, jeśli zmieni się parametr w URL (np. kliknięcie z Palety Komend)
  useEffect(() => {
    const param = searchParams.get('tab');
    if (param && validTabs.includes(param as SettingsTab) && param !== activeTab) {
      setActiveTab(param as SettingsTab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

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
    { id: 'notifications', label: 'Powiadomienia', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10" />
        <div className="relative px-8 py-8 md:py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">Ustawienia</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Dostosuj swoje preferencje, wygląd aplikacji oraz zarządzaj bezpieczeństwem.</p>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { handleTabChange(tab.id as SettingsTab); setSuccessMsg(null); setErrorMsg(null); }}
                className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-[0_2px_10px_-3px_rgba(59,130,246,0.15)] border border-blue-100 dark:border-blue-900/50'
                    : 'text-gray-500 dark:text-gray-400 bg-white/40 dark:bg-gray-800/20 hover:bg-white/80 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/60'
                  }`}
              >
                {activeTab === tab.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
                )}
                <span className={`${activeTab === tab.id ? 'opacity-100 scale-110' : 'opacity-70 scale-100'} transition-all duration-300`}>
                  {tab.icon}
                </span>
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

              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8 transition-all">
                {/* Profile Header (Avatar + Info + Actions) */}
                <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                  <div className="relative group flex-shrink-0">
                    <div className="w-28 h-28 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-gray-100 dark:border-gray-700 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-extrabold text-4xl uppercase">
                            {user?.first_name ? user.first_name.charAt(0) : 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-110 border-[3px] border-white dark:border-gray-800"
                      title="Zmień zdjęcie"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {user?.first_name} {user?.last_name}
                      </h3>
                      {role && (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABELS[role]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-4">
                      <Mail className="w-4 h-4 opacity-70" />
                      {user?.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-xl transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Zmień zdjęcie
                      </button>
                      {avatarPreview && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Usuń zdjęcie
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Editable fields */}
                  <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">Dane osobowe</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Imię</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
                          placeholder="Wpisz imię..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nazwisko</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
                          placeholder="Wpisz nazwisko..."
                        />
                      </div>
                    </div>
                  </div>


                  {/* Save button — inside card */}
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] dark:shadow-none transition-all disabled:opacity-50 hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] active:scale-[0.98]"
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

              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                    <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Zmiana hasła</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Zaktualizuj swoje hasło dostępowe do platformy FixFlow.</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Obecne hasło</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm pr-11"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPasswords ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nowe hasło</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Powtórz nowe hasło</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
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
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                    <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Motyw aplikacji</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Wybierz preferowany motyw kolorystyczny interfejsu.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                    <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Powiadomienia</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Zarządzaj swoimi preferencjami powiadomień.</p>
                  </div>
                </div>

                <div className="space-y-4">
                {role !== 'EMPLOYEE' && (
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
                      <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${notifyNewTicket ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                )}

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
                    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${notifyComment ? 'translate-x-5' : 'translate-x-0'}`} />
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
                    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${notifyStatus ? 'translate-x-5' : 'translate-x-0'}`} />
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
