import React, { useContext, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import useTitle from '../hooks/useTitle';
import api from '../api/axiosConfig';
import { ticketService } from '../api/ticketService';
import { ReplyTemplate } from '../types';
import { Category } from '../types/ticket';
import { SUPPORTED_LANGUAGES, AppLanguage } from '../i18n';
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
  MessageSquareText,
  Plus,
  Pencil,
  Globe,
  Tags,
  SlidersHorizontal,
} from 'lucide-react';


const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  TECHNICIAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
};

const validTabs = ['profile', 'preferences', 'notifications', 'templates', 'categories'] as const;
type SettingsTab = typeof validTabs[number];

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  useTitle(t('settings.title'));
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
      setErrorMsg(t('settings.avatarInvalidType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(t('settings.avatarTooLarge'));
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
      setSuccessMsg(t('settings.profileSaved'));
    } catch (err: any) {
      console.error('Błąd aktualizacji profilu:', err);
      if (err.response?.data) {
        const messages = Object.values(err.response.data).flat().join(' ');
        setErrorMsg(messages || t('settings.profileSaveError'));
      } else {
        setErrorMsg(t('settings.profileSaveError'));
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
      setPasswordErrorMsg(t('settings.pwdMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg(t('settings.pwdTooShort'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('users/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccessMsg(t('settings.pwdChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.response?.data) {
        const messages = Object.values(err.response.data).flat().join(' ');
        setPasswordErrorMsg(messages || t('settings.pwdChangeError'));
      } else {
        setPasswordErrorMsg(t('settings.pwdChangeGenericError'));
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

  // ===== Szablony szybkich odpowiedzi (technik/admin) =====
  const isTechOrAdmin = role === 'TECHNICIAN' || role === 'ADMIN';
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [tplTitle, setTplTitle] = useState('');
  const [tplContent, setTplContent] = useState('');
  const [tplEditingId, setTplEditingId] = useState<number | null>(null);
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);

  useEffect(() => {
    if (isTechOrAdmin) {
      ticketService.getReplyTemplates().then(setTemplates).catch(console.error);
    }
  }, [isTechOrAdmin]);

  const resetTplForm = () => {
    setTplEditingId(null);
    setTplTitle('');
    setTplContent('');
    setTplError(null);
  };

  const handleSaveTemplate = async () => {
    const title = tplTitle.trim();
    const content = tplContent.trim();
    setTplError(null);

    if (title.length < 3) { setTplError(t('settings.tplErrorTitleShort')); return; }
    if (title.length > 100) { setTplError(t('settings.tplErrorTitleLong')); return; }
    if (!content) { setTplError(t('settings.tplErrorContentEmpty')); return; }
    if (content.length > 2000) { setTplError(t('settings.tplErrorContentLong')); return; }

    // Duplikat tytułu (case-insensitive, pomijamy edytowany rekord)
    const isDuplicate = templates.some(
      tpl => tpl.title.trim().toLowerCase() === title.toLowerCase() && tpl.id !== tplEditingId
    );
    if (isDuplicate) { setTplError(t('settings.tplErrorDuplicate')); return; }

    setTplSaving(true);
    try {
      if (tplEditingId) {
        await ticketService.updateReplyTemplate(tplEditingId, { title, content });
      } else {
        await ticketService.createReplyTemplate({ title, content });
      }
      setTemplates(await ticketService.getReplyTemplates());
      resetTplForm();
    } catch (err) {
      console.error('Błąd zapisu szablonu:', err);
      setTplError(t('settings.catSaveError'));
    } finally {
      setTplSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await ticketService.deleteReplyTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (tplEditingId === id) resetTplForm();
    } catch (err) {
      console.error('Błąd usuwania szablonu:', err);
    }
  };

  // ===== Kategorie zgłoszeń (tylko admin) =====
  const isAdmin = role === 'ADMIN';
  const [categories, setCategories] = useState<Category[]>([]);
  const [catName, setCatName] = useState('');
  const [catEditingId, setCatEditingId] = useState<number | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      ticketService.getCategories().then(setCategories).catch(console.error);
    }
  }, [isAdmin]);

  const resetCatForm = () => {
    setCatEditingId(null);
    setCatName('');
    setCatError(null);
  };

  const handleSaveCategory = async () => {
    const name = catName.trim();
    setCatError(null);

    if (name.length < 2) { setCatError(t('settings.catErrorNameShort')); return; }
    if (name.length > 60) { setCatError(t('settings.catErrorNameLong')); return; }

    // Duplikat nazwy (case-insensitive, pomijamy edytowany rekord)
    const isDuplicate = categories.some(
      c => c.name.trim().toLowerCase() === name.toLowerCase() && c.id !== catEditingId
    );
    if (isDuplicate) { setCatError(t('settings.catErrorDuplicate')); return; }

    setCatSaving(true);
    try {
      if (catEditingId) {
        await ticketService.updateCategory(catEditingId, name);
      } else {
        await ticketService.createCategory(name);
      }
      setCategories(await ticketService.getCategories());
      resetCatForm();
    } catch (err) {
      console.error('Błąd zapisu kategorii:', err);
      setCatError(t('settings.catSaveError'));
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(t('settings.catDeleteConfirm', { name: cat.name }))) return;
    try {
      await ticketService.deleteCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      if (catEditingId === cat.id) resetCatForm();
    } catch (err) {
      console.error('Błąd usuwania kategorii:', err);
    }
  };

  const personalTabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: t('settings.tabAccount'), icon: <User className="w-4 h-4" /> },
    { id: 'preferences', label: t('settings.tabPreferences'), icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'notifications', label: t('settings.tabNotifications'), icon: <Bell className="w-4 h-4" /> },
  ];

  const systemTabs: { id: string; label: string; icon: React.ReactNode }[] = [
    ...(isTechOrAdmin ? [{ id: 'templates', label: t('settings.tabTemplates'), icon: <MessageSquareText className="w-4 h-4" /> }] : []),
    ...(isAdmin ? [{ id: 'categories', label: t('settings.tabCategories'), icon: <Tags className="w-4 h-4" /> }] : []),
  ];

  const renderTab = (tab: { id: string; label: string; icon: React.ReactNode }) => (
    <button
      key={tab.id}
      onClick={() => { handleTabChange(tab.id as SettingsTab); setSuccessMsg(null); setErrorMsg(null); }}
      className={`relative flex items-center justify-center lg:justify-start gap-2 w-full px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ${activeTab === tab.id
          ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-[0_2px_10px_-3px_rgba(59,130,246,0.15)] border border-blue-100 dark:border-blue-900/50'
          : 'text-gray-500 dark:text-gray-400 bg-white/40 dark:bg-gray-800/20 hover:bg-white/80 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300/60'
        }`}
    >
      {activeTab === tab.id && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 sm:w-1.5 h-5 sm:h-6 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
      )}
      <span className={`${activeTab === tab.id ? 'opacity-100' : 'opacity-70'} transition-all duration-300 flex-shrink-0`}>
        {tab.icon}
      </span>
      <span className="truncate">{tab.label}</span>
    </button>
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-700 pb-8 sm:pb-12">
      {/* Header — lewy górny róg, spójny z resztą widoków */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="flex flex-col gap-4">
            {/* PERSONAL section */}
            <div>
              <p className="px-2 mb-2 text-[10.5px] font-semibold tracking-widest text-gray-500 uppercase select-none hidden lg:block">
                {t('settings.sectionPersonal')}
              </p>
              <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2">
                {personalTabs.map(renderTab)}
              </div>
            </div>

            {/* SYSTEM section — admin only (templates visible to tech too) */}
            {systemTabs.length > 0 && (
              <div>
                <p className="px-2 mb-2 text-[10.5px] font-semibold tracking-widest text-gray-500 uppercase select-none hidden lg:block">
                  {t('settings.sectionSystem')}
                </p>
                <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2">
                  {systemTabs.map(renderTab)}
                </div>
              </div>
            )}
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

              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-4 sm:p-8 transition-all">
                {/* Profile Header (Avatar + Info + Actions) */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center">
                  <div className="relative group flex-shrink-0">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-gray-100 dark:border-gray-700 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
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
                      title={t('settings.changePhoto')}
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

                  <div className="flex-1 flex flex-col items-start">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {user?.first_name} {user?.last_name}
                      </h3>
                      {role && (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
                          {t(`role.${role}`)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-4">
                      <Mail className="w-4 h-4 opacity-70" />
                      {user?.email}
                    </p>
                    <div className="flex items-center justify-start gap-3 w-full">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-xl transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        {t('settings.changePhoto')}
                      </button>
                      {avatarPreview && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('settings.removePhoto')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Editable fields */}
                  <div className="mt-4 sm:mt-8 pt-4 sm:pt-8 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">{t('settings.personalData')}</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:gap-5 max-w-md">
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.firstNameLabel')}</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
                          placeholder={t('settings.firstNamePlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.lastNameLabel')}</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
                          placeholder={t('settings.lastNamePlaceholder')}
                        />
                      </div>
                    </div>
                  </div>


                  {/* Save button — inside card */}
                  <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 dark:border-gray-700/50 flex justify-start">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] dark:shadow-none transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? t('settings.saving') : t('settings.saveChanges')}
                    </button>
                  </div>

                  {/* ===== Sekcja bezpieczeństwa (zmiana hasła) — w tej samej karcie ===== */}
                  <div className="mt-4 sm:mt-8 pt-4 sm:pt-8 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <KeyRound className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">{t('settings.changePwdTitle')}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.changePwdSubtitle')}</p>
                      </div>
                    </div>

                    {passwordSuccessMsg && (
                      <div className="flex items-center gap-3 p-4 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-300 animate-in fade-in duration-200">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="font-medium">{passwordSuccessMsg}</span>
                        <button onClick={() => setPasswordSuccessMsg(null)} className="ml-auto p-1 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {passwordErrorMsg && (
                      <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="font-medium">{passwordErrorMsg}</span>
                        <button onClick={() => setPasswordErrorMsg(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-5 max-w-md">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.currentPassword')}</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        autoComplete="current-password"
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
                    <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.newPassword')}</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.confirmPassword')}</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-4">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/20 dark:shadow-none transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isChangingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isChangingPassword ? t('settings.changingPwd') : t('settings.changePwdBtn')}
                    </button>
                  </div>
                </form>
                  </div>
                </div>
            </div>
          )}

          {/* ===== APPEARANCE TAB ===== */}
          {/* ===== PREFERENCES TAB (Wygląd + Język) ===== */}
                    {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Karta: Motyw */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-4 sm:p-8">
                <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                    <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('settings.themeTitle')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.themeDescription')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl">
                  <button
                    onClick={() => { if (themeContext?.isDark) themeContext.toggleTheme(); }}
                    className={`relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all group ${!themeContext?.isDark
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-md ring-4 ring-blue-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'
                      }`}
                  >
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60">
                      <Sun className="w-7 h-7 text-amber-500" />
                    </div>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{t('settings.themeLight')}</p>
                    {!themeContext?.isDark && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => { if (!themeContext?.isDark) themeContext?.toggleTheme(); }}
                    className={`relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all group ${themeContext?.isDark
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-md ring-4 ring-blue-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'
                      }`}
                  >
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600">
                      <Moon className="w-7 h-7 text-blue-400" />
                    </div>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{t('settings.themeDark')}</p>
                    {themeContext?.isDark && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Karta: Język */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-4 sm:p-8">
                <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('language.label')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('language.description')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl">
                  {SUPPORTED_LANGUAGES.map((lng) => {
                    const active = (i18n.language?.split('-')[0] || 'pl') === lng;
                    const meta: Record<AppLanguage, { flag: string; labelKey: string }> = {
                      pl: { flag: '🇵🇱', labelKey: 'language.polish' },
                      en: { flag: '🇬🇧', labelKey: 'language.english' },
                    };
                    const lang = meta[lng];
                    return (
                      <button
                        key={lng}
                        onClick={() => i18n.changeLanguage(lng)}
                        className={`relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all group ${active
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-md ring-4 ring-blue-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'
                        }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 overflow-hidden ${
                            active ? 'bg-white dark:bg-gray-800 shadow-md' : 'bg-gray-50 dark:bg-gray-700/60'
                          }`}
                        >
                          <img
                            src={lng === 'pl' ? 'https://flagcdn.com/w80/pl.png' : 'https://flagcdn.com/w80/gb.png'}
                            alt={lng}
                            className="w-10 h-auto rounded"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{t(lang.labelKey)}</p>
                        {active && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          {/* ===== NOTIFICATIONS TAB (Technik / Admin) ===== */}
          {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-4 sm:p-8">
                <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                    <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('settings.notifTitle')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.notifSubtitle')}</p>
                  </div>
                </div>

                <div className="space-y-4 max-w-xl">
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
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.notifNewTicket')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.notifNewTicketDesc')}</p>
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.notifComment')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.notifCommentDesc')}</p>
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.notifStatus')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.notifStatusDesc')}</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative shadow-inner flex-shrink-0 ml-4 transition-colors duration-300 ${notifyStatus ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${notifyStatus ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TEMPLATES TAB (Technik / Admin) ===== */}
          {activeTab === 'templates' && isTechOrAdmin && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-4 sm:p-8">
                <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20 flex-shrink-0">
                    <MessageSquareText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('settings.templatesTitle')}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.templatesSubtitle')}</p>
                  </div>
                </div>

                {/* Formularz dodawania / edycji */}
                <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-5 space-y-3 mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.tplTitleLabel')}</label>
                      <span className={`text-[11px] font-medium tabular-nums ${tplTitle.length > 90 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>{tplTitle.length}/100</span>
                    </div>
                    <input
                      type="text"
                      value={tplTitle}
                      maxLength={100}
                      onChange={(e) => { setTplTitle(e.target.value); setTplError(null); }}
                      placeholder={t('settings.tplTitlePlaceholder')}
                      className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-400 ${tplError ? 'border-red-400 dark:border-red-500/60' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.tplContentLabel')}</label>
                      <span className={`text-[11px] font-medium tabular-nums ${tplContent.length > 1800 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>{tplContent.length}/2000</span>
                    </div>
                    <textarea
                      value={tplContent}
                      maxLength={2000}
                      onChange={(e) => { setTplContent(e.target.value); setTplError(null); }}
                      placeholder={t('settings.tplContentPlaceholder')}
                      className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-400 min-h-[90px] resize-y ${tplError ? 'border-red-400 dark:border-red-500/60' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                  </div>
                  {tplError && (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{tplError}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    {tplEditingId && (
                      <button
                        onClick={resetTplForm}
                        className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        {t('settings.cancel')}
                      </button>
                    )}
                    <button
                      onClick={handleSaveTemplate}
                      disabled={tplSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {tplSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : tplEditingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {tplEditingId ? t('settings.saveChanges') : t('settings.addTemplate')}
                    </button>
                  </div>
                </div>

                {/* Lista szablonów */}
                {templates.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquareText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">{t('settings.noTemplates')}</p>
                  </div>
                ) : (
                  <div
                    className="space-y-3 overflow-y-auto pr-1"
                    style={{ maxHeight: '400px', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                  >
                    {templates.map(tpl => (
                      <div key={tpl.id} className="flex items-start justify-between gap-3 p-4 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{tpl.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 whitespace-pre-wrap">{tpl.content}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setTplEditingId(tpl.id); setTplTitle(tpl.title); setTplContent(tpl.content); }}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={t('settings.editTitle')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('settings.deleteTitle')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== CATEGORIES TAB (Admin) ===== */}
          {activeTab === 'categories' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-4 sm:p-8">
                <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20 flex-shrink-0">
                    <Tags className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('settings.categoriesTitle')}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.categoriesSubtitle')}</p>
                  </div>
                </div>

                {/* Formularz dodawania / edycji */}
                <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-5 space-y-3 mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.catNameLabel')}</label>
                      <span className={`text-[11px] font-medium tabular-nums ${catName.length > 50 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>{catName.length}/60</span>
                    </div>
                    <input
                      type="text"
                      value={catName}
                      maxLength={60}
                      onChange={(e) => { setCatName(e.target.value); setCatError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveCategory(); } }}
                      placeholder={t('settings.catNamePlaceholder')}
                      className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-400 ${catError ? 'border-red-400 dark:border-red-500/60' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                  </div>
                  {catError && (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{catError}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    {catEditingId && (
                      <button
                        onClick={resetCatForm}
                        className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        {t('settings.cancel')}
                      </button>
                    )}
                    <button
                      onClick={handleSaveCategory}
                      disabled={catSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {catSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : catEditingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {catEditingId ? t('settings.saveChanges') : t('settings.addCategory')}
                    </button>
                  </div>
                </div>

                {/* Lista kategorii */}
                {categories.length === 0 ? (
                  <div className="text-center py-10">
                    <Tags className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">{t('settings.noCategories')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">{t(`categories.${cat.name}`, cat.name)}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setCatEditingId(cat.id); setCatName(cat.name); setCatError(null); }}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={t('settings.editTitle')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('settings.deleteTitle')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
