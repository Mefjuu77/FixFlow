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
  Shield,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Pracownik',
  TECHNICIAN: 'Technik',
  ADMIN: 'Administrator',
};

const SettingsPage: React.FC = () => {
  useTitle('Ustawienia');
  const authContext = useContext(AuthContext);
  const themeContext = useContext(ThemeContext);
  const user = authContext?.user;
  const role = user?.role;

  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications'>('profile');

  // Profile form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Mój profil', icon: <User className="w-4 h-4" /> },
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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Ustawienia</h1>
        <p className="mt-1 text-gray-500">Zarządzaj swoim profilem i preferencjami konta.</p>
      </div>

      {/* Tabs & Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSuccessMsg(null); setErrorMsg(null); }}
                className={`flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 animate-in fade-in duration-200">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="font-medium">{successMsg}</span>
                  <button onClick={() => setSuccessMsg(null)} className="ml-auto p-1 hover:bg-green-100 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                  <button onClick={() => setErrorMsg(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Avatar Section */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Zdjęcie profilowe</h3>
                <p className="text-sm text-gray-500 mb-5">To zdjęcie będzie widoczne przy Twoich komentarzach i na liście użytkowników.</p>

                <div className="flex items-center gap-6">
                  {/* Avatar preview */}
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
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
                      className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors border-2 border-white"
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

                  {/* Info & actions  */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 font-medium">
                      {avatarFile ? avatarFile.name : (user?.avatar ? 'Aktualne zdjęcie profilowe' : 'Brak zdjęcia profilowego')}
                    </p>
                    <p className="text-xs text-gray-400">JPG, PNG, GIF lub WebP. Maks. 5 MB.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {avatarPreview ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
                      </button>
                      {avatarPreview && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Dane osobowe</h3>
                <p className="text-sm text-gray-500 mb-5">Zaktualizuj swoje imię i nazwisko.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block">Imię</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Jan"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block">Nazwisko</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Kowalski"
                    />
                  </div>
                </div>

                {/* Read-only info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Email</label>
                    <p className="text-sm text-gray-600 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Rola w systemie</label>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                      <Shield className="w-4 h-4 text-gray-400" />
                      {role ? ROLE_LABELS[role] : 'Nieznana'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
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
          )}

          {/* ===== APPEARANCE TAB ===== */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Motyw aplikacji</h3>
                <p className="text-sm text-gray-500 mb-6">Wybierz preferowany motyw kolorystyczny interfejsu.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light mode */}
                  <button
                    onClick={() => { if (themeContext?.isDark) themeContext.toggleTheme(); }}
                    className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${!themeContext?.isDark
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                      <Sun className="w-8 h-8 text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">Jasny</p>
                      <p className="text-xs text-gray-500 mt-0.5">Klasyczny, jasny interfejs</p>
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
                    className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${themeContext?.isDark
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-center shadow-sm">
                      <Moon className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">Ciemny</p>
                      <p className="text-xs text-gray-500 mt-0.5">Łagodny dla oczu w ciemności</p>
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
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Powiadomienia</h3>
              <p className="text-sm text-gray-500 mb-6">Zarządzaj swoimi preferencjami powiadomień.</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Powiadomienia e-mail o nowych zgłoszeniach</p>
                    <p className="text-xs text-gray-500 mt-0.5">Otrzymuj e-mail gdy zostanie utworzone nowe zgłoszenie.</p>
                  </div>
                  <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Powiadomienia o komentarzach</p>
                    <p className="text-xs text-gray-500 mt-0.5">Otrzymuj e-mail gdy ktoś skomentuje Twoje zgłoszenie.</p>
                  </div>
                  <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Powiadomienia o zmianie statusu</p>
                    <p className="text-xs text-gray-500 mt-0.5">Otrzymuj e-mail gdy zmieni się status Twojego zgłoszenia.</p>
                  </div>
                  <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform" />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-amber-800 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Ta sekcja jest w trakcie rozwoju. Ustawienia powiadomień zostaną uruchomione wkrótce.
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
