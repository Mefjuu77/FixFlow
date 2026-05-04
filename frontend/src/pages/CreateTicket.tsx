import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Paperclip,
  Check,
  X,
  Key,
  Layout,
  Globe,
  Monitor,
  HelpCircle,
  Info
} from 'lucide-react';
import MarkdownEditor from '../components/MarkdownEditor';
import useTitle from '../hooks/useTitle';

const CreateTicketPage: React.FC = () => {
  useTitle('Nowe zgłoszenie');
  const [formData, setFormData] = useState<TicketPayload>({
    title: '',
    description: '',
    category: 0,
    priority: 'NORMALNY'
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'priority' | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryShake, setCategoryShake] = useState(false);
  const [showPriorityTooltip, setShowPriorityTooltip] = useState(false);
  const [titleBlurred, setTitleBlurred] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await ticketService.getCategories();

        // Sortowanie alfabetyczne kategorii
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));

        // Przeniesienie "Inne" na sam koniec
        const otherIndex = sortedData.findIndex(c => c.name.toLowerCase() === 'inne');
        let finalData = sortedData;
        if (otherIndex > -1) {
          const [other] = sortedData.splice(otherIndex, 1);
          finalData = [...sortedData, other];
        }

        setCategories(finalData);
        // Don't auto-select — user must choose explicitly
      } catch (err) {
        setError('Błąd podczas ładowania kategorii.');
      }
    };
    fetchCategories();
  }, []);

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
    { value: 'WYSOKI', label: 'Wysoki', icon: <ChevronsUp className="w-4 h-4 text-red-500" />, color: 'text-red-600', hint: 'Blokuje pracę lub uniemożliwia działanie' },
    { value: 'NORMALNY', label: 'Normalny', icon: <Equal className="w-4 h-4 text-blue-500" />, color: 'text-blue-600', hint: 'Utrudnia pracę' },
    { value: 'NISKI', label: 'Niski', icon: <ChevronsDown className="w-4 h-4 text-gray-400" />, color: 'text-gray-600', hint: 'Nie blokuje pracy' },
  ];

  const categoryIconMap: Record<string, React.ReactNode> = {
    'Dostęp do konta': <Key className="w-4 h-4" />,
    'Oprogramowanie': <Layout className="w-4 h-4" />,
    'Sieć i internet': <Globe className="w-4 h-4" />,
    'Sprzęt': <Monitor className="w-4 h-4" />,
    'Inne': <HelpCircle className="w-4 h-4" />,
  };

  const descriptionPlaceholderMap: Record<string, string> = {
    'Dostęp do konta': 'Opisz problem. Podaj nazwę systemu lub aplikacji...',
    'Oprogramowanie': 'Opisz problem. Podaj nazwę i wersję aplikacji jeśli znasz...',
    'Sieć i internet': 'Opisz problem. Podaj lokalizację lub numer pokoju...',
    'Sprzęt': 'Opisz problem. Podaj numer seryjny urządzenia jeśli znasz...',
    'Inne': 'Podaj jak najwięcej szczegółów...',
  };

  const selectedCategoryName = categories.find(c => c.id === formData.category)?.name || '';
  const descriptionPlaceholder = descriptionPlaceholderMap[selectedCategoryName] || 'Podaj jak najwięcej szczegółów...';

  const handleTitleBlur = () => {
    setTitleBlurred(true);
    const trimmed = formData.title.trim();
    if (trimmed.length > 0 && trimmed.length < 5) {
      setFieldErrors(prev => ({ ...prev, title: 'Tytuł musi mieć min. 5 znaków' }));
    } else if (trimmed.length >= 5) {
      setFieldErrors(prev => ({ ...prev, title: undefined }));
    }
  };

  const handleDescriptionBlur = () => {
    const trimmed = formData.description.trim();
    // Assuming simple text length approximation.
    // HTML string length will be longer, but for UX simple length checking is fine or we strip HTML.
    // Since we just need to show an error if it's too short.
    const textOnly = trimmed.replace(/<[^>]*>?/gm, '');
    if (textOnly.length > 0 && textOnly.length < 10) {
      setFieldErrors(prev => ({ ...prev, description: 'Opis musi mieć min. 10 znaków' }));
    } else if (textOnly.length >= 10) {
      setFieldErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: { title?: string; description?: string } = {};
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedTitle) {
      errors.title = 'Tytuł jest wymagany.';
    } else if (trimmedTitle.length < 5) {
      errors.title = `Tytuł musi mieć co najmniej 5 znaków (obecnie ${trimmedTitle.length}).`;
    } else if (trimmedTitle.length > 200) {
      errors.title = `Tytuł nie może przekraczać 200 znaków (obecnie ${trimmedTitle.length}).`;
    }

    if (!trimmedDescription) {
      errors.description = 'Opis jest wymagany.';
    } else {
      const textOnly = trimmedDescription.replace(/<[^>]*>?/gm, '');
      if (textOnly.length < 10) {
        errors.description = 'Opis musi mieć min. 10 znaków';
      }
    }

    setTitleBlurred(true);
    setFieldErrors(errors);

    let isValid = Object.keys(errors).length === 0;

    if (formData.category === 0) {
      setCategoryShake(true);
      setTimeout(() => setCategoryShake(false), 400); // 0.4s to match CSS
      isValid = false;
    }

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
          setError('Nie udało się utworzyć zgłoszenia.');
        }
      } else {
        setError('Nie udało się utworzyć zgłoszenia.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.category);
  const selectedPriority = priorityOptions.find(p => p.value === formData.priority);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-blue-600 font-semibold transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Wróć
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-2xl font-bold text-gray-900">Nowe zgłoszenie</h1>
          <p className="text-gray-500 text-sm mt-1">Uzupełnij szczegóły problemu technicznego.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Tytuł */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Tytuł zgłoszenia</label>
            <div className="relative">
              <input
                type="text"
                className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all ${fieldErrors.title ? 'border-red-400 bg-red-50/30' : (titleBlurred && formData.title.trim().length >= 5) ? 'border-green-400 bg-green-50/10' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'}`}
                placeholder="Co się stało?"
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
            {fieldErrors.title ? (
              <p className="text-xs text-red-600 font-medium ml-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> {fieldErrors.title}
              </p>
            ) : (
              <p className={`text-xs ml-1 ${formData.title.trim().length > 0 && (formData.title.trim().length < 5 || formData.title.trim().length > 200) ? 'text-red-500' : 'text-gray-400'}`}>
                {formData.title.trim().length} / 200 znaków (min. 5)
              </p>
            )}
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={dropdownRef}>
            {/* Kategoria - Dropdown */}
            <div className={`relative space-y-2 ${categoryShake ? 'animate-shake' : ''}`}>
              <label className="text-sm font-bold text-gray-700 ml-1">Kategoria</label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
                className={`w-full flex items-center justify-between pl-4 pr-3 py-3 border rounded-xl hover:border-blue-400 dark:hover:border-blue-500/70 transition-all text-left ${formData.category !== 0 ? 'bg-white dark:bg-gray-800/60 border-blue-300 dark:border-blue-500/40 ring-2 ring-blue-500/10 dark:ring-blue-500/20 shadow-sm' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">{categoryIconMap[selectedCategory?.name || ''] || <HelpCircle className="w-4 h-4 text-gray-400" />}</div>
                  <span className="font-medium text-gray-900">{selectedCategory?.name || 'Wybierz kategorię...'}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${activeDropdown === 'category' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'category' && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: cat.id });
                        setActiveDropdown(null);
                        if (error === 'Proszę wybrać kategorię.') setError('');
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${formData.category === cat.id ? 'bg-blue-50/70 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold' : 'hover:bg-blue-50/50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 font-medium'}`}
                    >
                      <div className="text-blue-600">{categoryIconMap[cat.name] || <HelpCircle className="w-4 h-4" />}</div>
                      <span className="flex-1">{cat.name}</span>
                      {formData.category === cat.id && <Check className="w-5 h-5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priorytet - Dropdown */}
            <div className="relative space-y-2">
              <div className="flex items-center gap-2 ml-1">
                <label className="text-sm font-bold text-gray-700">Priorytet</label>
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setShowPriorityTooltip(true)}
                    onMouseLeave={() => setShowPriorityTooltip(false)}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  {showPriorityTooltip && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2.5 shadow-xl z-50 pointer-events-none">
                      <ul className="space-y-1">
                        <li><span className="text-red-400 font-semibold">Wysoki</span> — blokuje pracę lub uniemożliwia działanie</li>
                        <li><span className="text-blue-400 font-semibold">Normalny</span> — utrudnia pracę</li>
                        <li><span className="text-gray-400 font-semibold">Niski</span> — nie blokuje pracy</li>
                      </ul>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-gray-900" />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                className={`w-full flex items-center justify-between pl-4 pr-3 py-3 border rounded-xl hover:border-blue-400 dark:hover:border-blue-500/70 transition-all text-left ${formData.priority ? 'bg-white dark:bg-gray-800/60 border-blue-300 dark:border-blue-500/40 ring-2 ring-blue-500/10 dark:ring-blue-500/20 shadow-sm' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  {selectedPriority?.icon}
                  <span className={`font-medium ${selectedPriority?.color}`}>{selectedPriority?.label}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${activeDropdown === 'priority' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'priority' && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100">
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
                      {opt.icon}
                      <span className="flex-1">{opt.label}</span>
                      <span className="text-xs text-gray-400 font-normal">{opt.hint}</span>
                      {formData.priority === opt.value && <Check className="w-5 h-5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Opis */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Opis problemu</label>
            <MarkdownEditor
              key={descriptionPlaceholder}
              value={formData.description}
              onChange={(v) => {
                setFormData({ ...formData, description: v });
                if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: undefined }));
              }}
              placeholder={descriptionPlaceholder}
              className={fieldErrors.description ? 'border-red-400 bg-red-50/30 ring-1 ring-red-400/50 rounded-xl' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'}
              resizable={true}
              onAttachFile={() => fileInputRef.current?.click()}
              onBlur={handleDescriptionBlur}
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600 font-medium ml-1 flex items-center mt-1">
                <AlertCircle className="w-3 h-3 mr-1" /> {fieldErrors.description}
              </p>
            )}
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Załączniki */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Załączniki (opcjonalne)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all text-gray-500 hover:text-blue-600"
            >
              <div className="text-center px-4">
                <div className="flex items-center justify-center gap-2 mb-1.5 text-gray-700">
                  <Paperclip className="w-4 h-4" />
                  <span className="font-semibold">Kliknij, aby dołączyć pliki</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">lub przeciągnij i upuść pliki tutaj</p>
                <p className="text-[11.5px] leading-relaxed text-gray-500 max-w-sm">
                  Maks. waga pojedyńczego pliku do <strong>5MB</strong> (łącznie do 15MB na zgłoszenie). Obsługujemy obrazki, PDF, dokumenty tekstowe oraz ZIP.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              className="hidden"
              onChange={(e) => {
                setAttachmentErrors([]);
                if (e.target.files) {
                  const MAX_FILE_SIZE = 5 * 1024 * 1024;
                  const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
                  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'];
                  const validFiles: File[] = [];
                  const invalidFiles: string[] = [];

                  let currentTotal = selectedFiles.reduce((sum, f) => sum + f.size, 0);

                  Array.from(e.target.files).forEach(f => {
                    const extIndex = f.name.lastIndexOf('.');
                    const ext = extIndex >= 0 ? f.name.substring(extIndex).toLowerCase() : '';
                    if (!ALLOWED_EXTENSIONS.includes(ext)) {
                      invalidFiles.push(`${f.name} (niedozwolony format)`);
                    } else if (f.size > MAX_FILE_SIZE) {
                      invalidFiles.push(`${f.name} (powyżej 5MB)`);
                    } else if (currentTotal + f.size > MAX_TOTAL_SIZE) {
                      invalidFiles.push(`${f.name} (przekracza limit 15MB)`);
                    } else {
                      validFiles.push(f);
                      currentTotal += f.size;
                    }
                  });
                  if (invalidFiles.length > 0) {
                    setAttachmentErrors(invalidFiles);
                  }
                  setSelectedFiles(prev => [...prev, ...validFiles]);
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
                    <h4 className="text-sm font-semibold text-red-800 mb-1.5">Odrzucono niektóre pliki:</h4>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedFiles.map((file, idx) =>
                      file.type.startsWith('image/') ? (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200" />
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <p className="text-white text-xs font-medium truncate">{file.name}</p>
                            <p className="text-white/70 text-[10px]">{(file.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          >
                            <X className="w-3.5 h-3.5" />
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
            className={`max-w-[300px] w-full flex items-center justify-center py-4 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-80 ${isSuccess ? 'bg-green-600 hover:bg-green-700 shadow-green-100/50 dark:shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 dark:shadow-none'}`}
          >
            {isSubmitting && !isSuccess && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isSuccess && (
              <>
                <Check className="w-5 h-5 mr-2" /> Sukces
              </>
            )}
            {!isSubmitting && !isSuccess && (
              <>
                <Send className="w-5 h-5 mr-2" /> Utwórz zgłoszenie
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
