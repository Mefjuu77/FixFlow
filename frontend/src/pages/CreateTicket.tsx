import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ticketService } from '../api/ticketService';
import { Category, TicketPayload } from '../types/ticket';
import {
  Send,
  ArrowLeft,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronsUp,
  Equal,
  ChevronsDown,
  X,
  Check,
  UploadCloud
} from 'lucide-react';
import { getCategoryIcon, getCategoryLabel, CANONICAL_CATEGORIES } from '../utils/ticketConstants';
import MarkdownEditor from '../components/MarkdownEditor';
import useTitle from '../hooks/useTitle';

const CreateTicketPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  useTitle(t('createTicket.title'));
  const [formData, setFormData] = useState<TicketPayload>({
    title: '',
    description: '',
    category: 0,
    priority: 'NORMALNY'
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string; category?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'priority' | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await ticketService.getCategories();
        setCategories(data);

        // Auto-select kategorii z parametru URL (?category=Hardware).
        // Dopasowujemy po kanonicznej nazwie z bazy oraz po nazwie
        // przetłumaczonej — linki mogą pochodzić z dowolnego języka.
        const paramCategory = searchParams.get('category')?.trim().toLowerCase();
        if (paramCategory) {
          const match = data.find(c =>
            c.name.toLowerCase() === paramCategory ||
            getCategoryLabel(c.name, t).toLowerCase() === paramCategory
          );
          if (match) setFormData(prev => ({ ...prev, category: match.id }));
        }
      } catch (err) {
        setError(t('createTicket.errorCategories'));
      }
    };
    fetchCategories();
  }, []);

  // Kolejność listy zależy od języka → przeliczana przy zmianie tłumaczeń.
  // "Other"/"Inne" zawsze na końcu.
  const sortedCategories = useMemo(() => {
    const withLabels = categories.map(c => ({ cat: c, label: getCategoryLabel(c.name, t) }));
    withLabels.sort((a, b) => a.label.localeCompare(b.label, i18n.language));
    const otherIndex = withLabels.findIndex(x => x.cat.name === CANONICAL_CATEGORIES.OTHER);
    if (otherIndex > -1) {
      const [other] = withLabels.splice(otherIndex, 1);
      withLabels.push(other);
    }
    return withLabels;
  }, [categories, t, i18n.language]);

  // Zamknij dropdown przy kliknięciu poza nim
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const priorityOptions = [
    { value: 'WYSOKI', label: t('createTicket.priorityHighLabel'), icon: <ChevronsUp className="w-4 h-4 text-red-500" />, color: 'text-red-600', hint: t('createTicket.priorityHighHint') },
    { value: 'NORMALNY', label: t('createTicket.priorityNormalLabel'), icon: <Equal className="w-4 h-4 text-blue-500" />, color: 'text-blue-600', hint: t('createTicket.priorityNormalHint') },
    { value: 'NISKI', label: t('createTicket.priorityLowLabel'), icon: <ChevronsDown className="w-4 h-4 text-gray-400" />, color: 'text-gray-600', hint: t('createTicket.priorityLowHint') },
  ];

  const descriptionPlaceholderMap: Record<string, string> = {
    [CANONICAL_CATEGORIES.ACCOUNT_ACCESS]: t('createTicket.descPlaceholderAccount'),
    [CANONICAL_CATEGORIES.SOFTWARE]: t('createTicket.descPlaceholderSoftware'),
    [CANONICAL_CATEGORIES.NETWORK]: t('createTicket.descPlaceholderNetwork'),
    [CANONICAL_CATEGORIES.HARDWARE]: t('createTicket.descPlaceholderHardware'),
    [CANONICAL_CATEGORIES.OTHER]: t('createTicket.descPlaceholderDefault'),
  };

  const selectedCategoryName = categories.find(c => c.id === formData.category)?.name || '';
  const descriptionPlaceholder = descriptionPlaceholderMap[selectedCategoryName] || t('createTicket.descPlaceholderDefault');

  const handleTitleBlur = () => {
    setTitleBlurred(true);
  };

  const handleDescriptionBlur = () => {
    // We only validate on submit now.
  };

  const processFiles = (files: FileList | File[]) => {
    setAttachmentErrors([]);
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'];
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    let currentTotal = selectedFiles.reduce((sum, f) => sum + f.size, 0);

    Array.from(files).forEach(f => {
      const extIndex = f.name.lastIndexOf('.');
      const ext = extIndex >= 0 ? f.name.substring(extIndex).toLowerCase() : '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        invalidFiles.push(t('createTicket.rejectedInvalidFormat', { name: f.name }));
      } else if (f.size > MAX_FILE_SIZE) {
        invalidFiles.push(t('createTicket.rejectedTooLarge', { name: f.name }));
      } else if (currentTotal + f.size > MAX_TOTAL_SIZE) {
        invalidFiles.push(t('createTicket.rejectedTotalLimit', { name: f.name }));
      } else {
        validFiles.push(f);
        currentTotal += f.size;
      }
    });

    if (invalidFiles.length > 0) {
      setAttachmentErrors(invalidFiles);
    }
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const validateForm = (): boolean => {
    const errors: { title?: string; description?: string; category?: string } = {};
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedTitle) {
      errors.title = t('createTicket.titleRequired');
    } else if (trimmedTitle.length < 5) {
      errors.title = t('createTicket.titleTooShort', { n: trimmedTitle.length });
    } else if (trimmedTitle.length > 200) {
      errors.title = t('createTicket.titleTooLong', { n: trimmedTitle.length });
    }

    if (!trimmedDescription) {
      errors.description = t('createTicket.descriptionRequired');
    } else {
      const textOnly = trimmedDescription.replace(/<[^>]*>?/gm, '');
      if (textOnly.length < 10) {
        errors.description = t('createTicket.descriptionTooShort');
      }
    }

    setTitleBlurred(true);
    let isValid = Object.keys(errors).length === 0;

    if (formData.category === 0) {
      errors.category = t('createTicket.categoryRequired');
      isValid = false;
    }

    setFieldErrors(errors);

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    // Trimujemy dane przed wysłaniem
    const payload: TicketPayload = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    setIsSubmitting(true);
    try {
      const created = await ticketService.createTicket(payload);
      // Upload załączników jeśli są
      if (selectedFiles.length > 0 && created.id) {
        try {
          await ticketService.uploadAttachments(created.id, selectedFiles);
        } catch (uploadErr) {
          console.error('Błąd uploadu załączników:', uploadErr);
        }
      }
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/tickets');
      }, 1200);
    } catch (err: any) {
      // Próba odczytania błędów walidacji z backendu
      if (err?.response?.data) {
        const data = err.response.data;
        const backendErrors: { title?: string; description?: string } = {};
        if (data.title) backendErrors.title = Array.isArray(data.title) ? data.title[0] : data.title;
        if (data.description) backendErrors.description = Array.isArray(data.description) ? data.description[0] : data.description;

        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
        } else {
          setError(t('createTicket.errorCreate'));
        }
      } else {
        setError(t('createTicket.errorCreate'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.category);
  const selectedPriority = priorityOptions.find(p => p.value === formData.priority);

  return (
    <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4 pb-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title={t('createTicket.back')}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-none">{t('createTicket.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 hidden sm:block">{t('createTicket.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5">
          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Tytuł */}
          <div className="space-y-1 sm:space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('createTicket.labelTitle')}</label>
            <div className="relative">
              <input
                type="text"
                className={`w-full pl-4 pr-12 py-2 sm:py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all ${fieldErrors.title ? 'border-red-400 bg-red-50/30' : (titleBlurred && formData.title.trim().length >= 5) ? 'border-green-400 bg-green-50/10' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'}`}
                placeholder={t('createTicket.titlePlaceholder')}
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: undefined }));
                }}
                onBlur={handleTitleBlur}
              />
              {titleBlurred && formData.title.trim().length >= 5 && !fieldErrors.title && (
                <Check className="absolute right-4 top-3.5 w-5 h-5 text-green-500" />
              )}
            </div>
            {fieldErrors.title && (
              <p className="text-xs text-red-600 font-medium ml-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> {fieldErrors.title}
              </p>
            )}
          </div>

          <hr className="border-gray-100 dark:border-gray-800 hidden sm:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5" ref={dropdownRef}>
            {/* Kategoria - Dropdown */}
            <div className="relative space-y-1 sm:space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('createTicket.labelCategory')}</label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
                className={`w-full flex items-center justify-between pl-4 pr-3 py-2 sm:py-3 border rounded-xl hover:border-blue-400 dark:hover:border-blue-500/70 transition-all text-left ${fieldErrors.category ? 'border-red-400 bg-red-50/30' : (formData.category !== 0 ? 'bg-white dark:bg-gray-800/60 border-blue-300 dark:border-blue-500/40 ring-2 ring-blue-500/10 dark:ring-blue-500/20 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800')}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">{getCategoryIcon(selectedCategory?.name || '', 'w-4 h-4')}</div>
                  <span className={`font-medium ${formData.category !== 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{selectedCategory?.name ? getCategoryLabel(selectedCategory.name, t) : t('createTicket.categoryPlaceholder')}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${activeDropdown === 'category' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'category' && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100">
                  {sortedCategories.map(({ cat, label }) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: cat.id });
                        setActiveDropdown(null);
                        if (fieldErrors.category) setFieldErrors(prev => ({ ...prev, category: undefined }));
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${formData.category === cat.id ? 'bg-blue-50/70 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold' : 'hover:bg-blue-50/50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 font-medium'}`}
                    >
                      <div className="text-blue-600">{getCategoryIcon(cat.name, 'w-4 h-4')}</div>
                      <span className="flex-1">{label}</span>
                      {formData.category === cat.id && <Check className="w-5 h-5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.category && (
                <p className="text-xs text-red-600 font-medium ml-1 flex items-center mt-1">
                  <AlertCircle className="w-3 h-3 mr-1" /> {fieldErrors.category}
                </p>
              )}
            </div>

            {/* Priorytet - Dropdown */}
            <div className="relative space-y-1 sm:space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('createTicket.labelPriority')}</label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                className={`w-full flex items-center justify-between pl-4 pr-3 py-2 sm:py-3 border rounded-xl hover:border-blue-400 dark:hover:border-blue-500/70 transition-all text-left ${formData.priority ? 'bg-white dark:bg-gray-800/60 border-blue-300 dark:border-blue-500/40 ring-2 ring-blue-500/10 dark:ring-blue-500/20 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'}`}
              >
                <div className="flex items-center gap-3">
                  {selectedPriority?.icon}
                  <span className={`font-medium ${selectedPriority?.color}`}>{selectedPriority?.label}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${activeDropdown === 'priority' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'priority' && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, priority: opt.value as any });
                        setActiveDropdown(null);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${formData.priority === opt.value ? 'bg-blue-50/70 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold' : 'hover:bg-blue-50/50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 font-medium'}`}
                    >
                      <div className="flex-shrink-0">{opt.icon}</div>
                      <div className="flex-1 flex flex-col items-start leading-tight">
                        <span>{opt.label}</span>
                        <span className={`text-xs mt-0.5 font-normal ${formData.priority === opt.value ? 'text-blue-600/80 dark:text-blue-300/80' : 'text-gray-500 dark:text-gray-400'}`}>
                          {opt.hint}
                        </span>
                      </div>
                      {formData.priority === opt.value && <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800 hidden sm:block" />

          <div className="space-y-1 sm:space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('createTicket.labelDescription')}</label>
            <MarkdownEditor
              key={descriptionPlaceholder}
              value={formData.description}
              onChange={(v) => {
                setFormData({ ...formData, description: v });
                if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: undefined }));
              }}
              placeholder={descriptionPlaceholder}
              className={`${fieldErrors.description ? 'border-red-400 bg-red-50/30 ring-1 ring-red-400/50 rounded-xl' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'} sm:[&_.ProseMirror]:!min-h-[180px]`}
              resizable={true}
              minHeight="80px"
              onAttachFile={() => fileInputRef.current?.click()}
              onBlur={handleDescriptionBlur}
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600 font-medium ml-1 flex items-center mt-1">
                <AlertCircle className="w-3 h-3 mr-1" /> {fieldErrors.description}
              </p>
            )}
          </div>

          <hr className="border-gray-100 dark:border-gray-800 hidden sm:block" />

          <div className="space-y-1 sm:space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{t('createTicket.labelAttachments')}</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500/70 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
            >
              <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full p-1.5 sm:p-2 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="text-center px-2 sm:px-4 space-y-0.5 sm:space-y-1">
                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                  <span className="hidden sm:inline">{t('createTicket.dropDesktop')} <span className="font-normal text-gray-500 dark:text-gray-400">{t('createTicket.dropDesktopOr')}</span></span>
                  <span className="sm:hidden">{t('createTicket.dropMobile')}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md">{t('createTicket.dropMaxFile')}</span>
                  <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md">{t('createTicket.dropMaxTotal')}</span>
                  <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md hidden sm:inline">{t('createTicket.dropFormats')}</span>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(e.target.files);
                }
                e.target.value = '';
              }}
            />

            {/* Błędy wrzucania plików (np za duże) */}
            {attachmentErrors.length > 0 && (
              <div className="mt-3 p-3.5 bg-red-50 border border-red-100 rounded-xl relative animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 mb-1.5">{t('createTicket.rejectedFilesTitle')}</h4>
                    <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                      {attachmentErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachmentErrors([])}
                  className="absolute top-2.5 right-2.5 p-1 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-3">
                {/* Podgląd obrazków */}
                {selectedFiles.some(f => f.type.startsWith('image/')) && (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {selectedFiles.map((file, idx) =>
                      file.type.startsWith('image/') ? (
                        <div key={idx} className="relative group rounded-lg sm:rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200" />
                          <div className="absolute bottom-0 left-0 right-0 p-1 sm:p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <p className="text-white text-[10px] sm:text-xs font-medium truncate">{file.name}</p>
                            <p className="text-white/70 text-[9px] sm:text-[10px] hidden sm:block">{(file.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          >
                            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {/* Pozostałe pliki (nie-obrazki) */}
                {selectedFiles.map((file, idx) =>
                  !file.type.startsWith('image/') ? (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate text-gray-700 font-medium">{file.name}</span>
                        <span className="text-gray-400 text-xs flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={`w-full sm:max-w-[300px] flex items-center justify-center py-3.5 sm:py-4 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-80 ${isSuccess ? 'bg-green-600 hover:bg-green-700 shadow-green-100/50 dark:shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 dark:shadow-none'}`}
            >
              {isSubmitting && !isSuccess && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isSuccess && (
                <>
                  <Check className="w-5 h-5 mr-2" /> {t('createTicket.submitSuccess')}
                </>
              )}
              {!isSubmitting && !isSuccess && (
                <>
                  <Send className="w-5 h-5 mr-2" /> {t('createTicket.submit')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketPage;
