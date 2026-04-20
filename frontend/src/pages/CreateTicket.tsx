import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../api/ticketService';
import { Category, TicketPayload } from '../types/ticket';
import { 
  Send, 
  ArrowLeft, 
  AlertCircle, 
  FileText, 
  Cpu, 
  AppWindow, 
  Globe, 
  KeyRound, 
  Shapes, 
  ChevronDown,
  ChevronsUp,
  Equal,
  ChevronsDown,
  ChevronRight,
  Paperclip,
  X
} from 'lucide-react';
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
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'priority' | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
        if (finalData.length > 0) {
          setFormData(prev => ({ ...prev, category: finalData[0].id }));
        }
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

  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('sprzęt')) return <Cpu className="w-4 h-4" />;
    if (lowerName.includes('oprogramowanie')) return <AppWindow className="w-4 h-4" />;
    if (lowerName.includes('sieć')) return <Globe className="w-4 h-4" />;
    if (lowerName.includes('dostęp')) return <KeyRound className="w-4 h-4" />;
    return <Shapes className="w-4 h-4" />;
  };

  const priorityOptions = [
    { value: 'NISKI', label: 'Niski', icon: <ChevronsDown className="w-4 h-4 text-gray-400" />, color: 'text-gray-600' },
    { value: 'NORMALNY', label: 'Normalny', icon: <Equal className="w-4 h-4 text-blue-500" />, color: 'text-blue-600' },
    { value: 'WYSOKI', label: 'Wysoki', icon: <ChevronsUp className="w-4 h-4 text-red-500" />, color: 'text-red-600' },
  ];

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
    } else if (trimmedDescription.length < 10) {
      errors.description = `Opis musi mieć co najmniej 10 znaków (obecnie ${trimmedDescription.length}).`;
    }

    if (formData.category === 0) {
      setError('Proszę wybrać kategorię.');
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
      navigate('/tickets');
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 ml-1">Tytuł zgłoszenia</label>
              <span className={`text-xs font-medium ${formData.title.trim().length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
                {formData.title.trim().length} / 200
              </span>
            </div>
            <div className="relative group">
              <FileText className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                className={`w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all ${fieldErrors.title ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}
                placeholder="Co się stało? (min. 5 znaków)"
                value={formData.title}
                onChange={(e) => {
                  setFormData({...formData, title: e.target.value});
                  if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: undefined }));
                }}
              />
            </div>
            {fieldErrors.title && (
              <p className="text-xs text-red-600 font-medium ml-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> {fieldErrors.title}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={dropdownRef}>
            {/* Kategorie - Custom Select */}
            <div className="relative space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Kategoria</label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
                className="w-full flex items-center justify-between pl-4 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-400 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">{getCategoryIcon(selectedCategory?.name || '')}</div>
                  <span className="font-medium text-gray-900">{selectedCategory?.name || 'Wybierz...'}</span>
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
                        setFormData({...formData, category: cat.id});
                        setActiveDropdown(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-left"
                    >
                      {getCategoryIcon(cat.name)}
                      <span className="flex-1 font-medium">{cat.name}</span>
                      {formData.category === cat.id && <ChevronRight className="w-4 h-4 text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priorytet - Custom Select */}
            <div className="relative space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Priorytet</label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                className="w-full flex items-center justify-between pl-4 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-400 transition-all text-left"
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
                        setFormData({...formData, priority: opt.value as any});
                        setActiveDropdown(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors text-left"
                    >
                      {opt.icon}
                      <span className="flex-1 font-medium">{opt.label}</span>
                      {formData.priority === opt.value && <ChevronRight className="w-4 h-4 text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Opis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 ml-1">Opis problemu</label>
              <span className={`text-xs font-medium ${formData.description.trim().length > 0 && formData.description.trim().length < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                {formData.description.trim().length} znaków
              </span>
            </div>
            <textarea
              rows={5}
              className={`w-full p-4 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-gray-900 resize-none ${fieldErrors.description ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}
              placeholder="Podaj jak najwięcej szczegółów... (min. 10 znaków)"
              value={formData.description}
              onChange={(e) => {
                setFormData({...formData, description: e.target.value});
                if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: undefined }));
              }}
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600 font-medium ml-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> {fieldErrors.description}
              </p>
            )}
          </div>

          {/* Załączniki */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Załączniki (opcjonalne)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all text-gray-500 hover:text-blue-600"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm font-medium">Kliknij, aby dołączyć pliki (screenshoty, dokumenty...)</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              className="hidden"
              onChange={(e) => {
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
                      invalidFiles.push(`${f.name} (przekracza łączny limit 15MB)`);
                    } else {
                      validFiles.push(f);
                      currentTotal += f.size;
                    }
                  });
                  if (invalidFiles.length > 0) {
                    alert(`Odrzucono niektóre pliki:\n- ${invalidFiles.join('\n- ')}`);
                  }
                  setSelectedFiles(prev => [...prev, ...validFiles]);
                }
                e.target.value = '';
              }}
            />
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" /> Utwórz zgłoszenie
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketPage;
