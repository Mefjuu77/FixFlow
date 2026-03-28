import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../api/ticketService';
import { Category, TicketPayload } from '../types/ticket';
import { 
  Send, 
  ArrowLeft, 
  AlertCircle, 
  FileText, 
  Flag, 
  Monitor, 
  Terminal, 
  Wifi, 
  Lock, 
  HelpCircle, 
  ChevronDown,
  AlertTriangle,
  Minus,
  ChevronRight,
  ArrowDown
} from 'lucide-react';

const CreateTicketPage: React.FC = () => {
  const [formData, setFormData] = useState<TicketPayload>({
    title: '',
    description: '',
    category: 0,
    priority: 'NORMALNY'
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'category' | 'priority' | null>(null);
  
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
    if (lowerName.includes('sprzęt')) return <Monitor className="w-4 h-4" />;
    if (lowerName.includes('oprogramowanie')) return <Terminal className="w-4 h-4" />;
    if (lowerName.includes('sieć')) return <Wifi className="w-4 h-4" />;
    if (lowerName.includes('dostęp')) return <Lock className="w-4 h-4" />;
    return <HelpCircle className="w-4 h-4" />;
  };

  const priorityOptions = [
    { value: 'NISKI', label: 'Niski', icon: <ArrowDown className="w-4 h-4 text-gray-400" />, color: 'text-gray-600' },
    { value: 'NORMALNY', label: 'Normalny', icon: <Minus className="w-4 h-4 text-blue-500" />, color: 'text-blue-600' },
    { value: 'WYSOKI', label: 'Wysoki', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, color: 'text-red-600' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.category === 0) {
      setError('Proszę wybrać kategorię.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await ticketService.createTicket(formData);
      navigate('/tickets');
    } catch (err: any) {
      setError('Nie udało się utworzyć zgłoszenia.');
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
              <AlertCircle className="w-5 h-5 mr-3" /> {error}
            </div>
          )}

          {/* Tytuł */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Tytuł zgłoszenia</label>
            <div className="relative group">
              <FileText className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                placeholder="Co się stało?"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
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
            <label className="text-sm font-bold text-gray-700 ml-1">Opis problemu</label>
            <textarea
              required
              rows={5}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-gray-900 resize-none"
              placeholder="Podaj jak najwięcej szczegółów..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
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
