import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import api from '../api/axiosConfig';
import { Ticket } from '../types';
import {
  Search, LayoutGrid, BarChart2, FileText,
  Users, Settings, PlusCircle, LogOut, Moon, Sun, ArrowRight,
  Hash, KeyRound, Bell, Palette, UserPlus,
  ClipboardList,
} from 'lucide-react';

const GROUP_ORDER = ['Akcje', 'Nawigacja', 'Ustawienia', 'Zgłoszenia'];

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string;
}

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const themeContext = useContext(ThemeContext);

  const role = authContext?.user?.role;
  const isAdmin = role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';
  const isEmployee = role === 'EMPLOYEE';

  // Otwieranie / zamykanie palety
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');

      if ((e.key === '/' && !isInputActive) || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        if (e.key === '/') e.preventDefault(); // Prevent typing the slash
        if (e.key === 'k') e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus na input po otwarciu
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setActiveIndex(0);

      // Pobierz tickety tylko raz
      if (!ticketsLoaded) {
        api.get('tickets/').then(res => {
          setTickets(res.data);
          setTicketsLoaded(true);
        }).catch(console.error);
      }
    }
  }, [isOpen]);

  const runAndClose = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  // Budowanie listy komend
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Nawigacja
    items.push(
      { id: 'nav-dashboard', label: isEmployee ? 'Start' : 'Pulpit', icon: <LayoutGrid className="w-4 h-4" />, action: () => runAndClose(() => navigate('/dashboard')), group: 'Nawigacja', keywords: 'dashboard strona główna home panel start pulpit' },
      { id: 'nav-tickets', label: 'Zgłoszenia', icon: <ClipboardList className="w-4 h-4" />, action: () => runAndClose(() => navigate('/tickets')), group: 'Nawigacja', keywords: 'tickety lista moje zgłoszenia przypisane do mnie my tickets assigned' },
    );

    if (isAdmin || isTechnician) {
      items.push(
        { id: 'nav-stats', label: 'Statystyki', icon: <BarChart2 className="w-4 h-4" />, action: () => runAndClose(() => navigate('/statistics')), group: 'Nawigacja', keywords: 'wykresy analityka dane' },
      );
    }

    if (isAdmin) {
      items.push(
        { id: 'nav-reports', label: 'Eksport danych', icon: <FileText className="w-4 h-4" />, action: () => runAndClose(() => navigate('/export')), group: 'Nawigacja', keywords: 'eksport raporty pdf csv' },
        { id: 'nav-users', label: 'Użytkownicy', icon: <Users className="w-4 h-4" />, action: () => runAndClose(() => navigate('/users')), group: 'Nawigacja', keywords: 'pracownicy technicy administracja' },
      );
    }

    // ========== USTAWIENIA ==========
    items.push(
      { id: 'nav-settings', label: 'Mój profil', icon: <Settings className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings')), group: 'Ustawienia', keywords: 'profil konto ustawienia moje dane' },
      { id: 'nav-settings-security', label: 'Zmień hasło', icon: <KeyRound className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings?tab=security')), group: 'Ustawienia', keywords: 'hasło zmiana hasła bezpieczeństwo security password' },
      { id: 'nav-settings-notifications', label: 'Powiadomienia', icon: <Bell className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings?tab=notifications')), group: 'Ustawienia', keywords: 'powiadomienia alerty maile notifications' },
    );

    if (!isEmployee) {
      items.push(
        { id: 'nav-settings-appearance', label: 'Wygląd aplikacji', icon: <Palette className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings?tab=appearance')), group: 'Ustawienia', keywords: 'wygląd motyw kolory interfejs appearance' },
      );
    }

    // ========== AKCJE ==========
    items.push(
      { id: 'action-create-ticket', label: 'Nowe zgłoszenie', icon: <PlusCircle className="w-4 h-4" />, action: () => runAndClose(() => navigate('/create-ticket')), group: 'Akcje', keywords: 'utwórz stwórz dodaj nowy ticket zgłoś create' },

    );

    if (isAdmin) {
      items.push(
        { id: 'action-add-user', label: 'Dodaj użytkownika', icon: <UserPlus className="w-4 h-4" />, action: () => runAndClose(() => navigate('/users', { state: { openCreateModal: true } })), group: 'Akcje', keywords: 'dodaj utwórz stwórz pracownika technika admina nowy uzytkownik user create' },
      );
    }

    items.push(
      {
        id: 'action-theme',
        label: themeContext?.isDark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw',
        icon: themeContext?.isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        action: () => runAndClose(() => themeContext?.toggleTheme()),
        group: 'Akcje',
        keywords: 'dark mode tryb ciemny jasny theme motyw switch'
      },
      {
        id: 'action-logout',
        label: 'Wyloguj się',
        icon: <LogOut className="w-4 h-4" />,
        action: () => runAndClose(() => authContext?.logout()),
        group: 'Akcje',
        keywords: 'logout wylogowanie wyjście zakończ sesję'
      },
    );

    return items;
  }, [navigate, runAndClose, isAdmin, isTechnician, themeContext?.isDark]);

  // Filtrowanie wyników
  const filteredResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;

    // Filtrowane komendy nawigacji/akcji
    const filteredCommands = commands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      (cmd.keywords && cmd.keywords.toLowerCase().includes(q))
    );

    // Wyszukiwanie w ticketach
    const matchedTickets = tickets.filter(t =>
      t.id.toString().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      (t.creator_details && `${t.creator_details.first_name} ${t.creator_details.last_name}`.toLowerCase().includes(q))
    );

    const filteredTickets: CommandItem[] = matchedTickets
      .slice(0, 5)
      .map(t => ({
        id: `ticket-${t.id}`,
        label: `#${t.id} ${t.title}`,
        sublabel: t.creator_details ? `${t.creator_details.first_name} ${t.creator_details.last_name}` : undefined,
        icon: <Hash className="w-4 h-4" />,
        action: () => runAndClose(() => navigate(`/tickets/${t.id}`)),
        group: 'Zgłoszenia',
      }));

    if (matchedTickets.length > 5) {
      filteredTickets.push({
        id: 'action-more-tickets',
        label: `Pokaż wszystkie zgłoszenia (${matchedTickets.length})`,
        sublabel: `Wyszukaj "${query}" na pełnej liście zgłoszeń`,
        icon: <Search className="w-4 h-4 text-blue-500" />,
        action: () => runAndClose(() => navigate('/tickets', { state: { searchQuery: query } })),
        group: 'Zgłoszenia',
      });
    }

    return [...filteredCommands, ...filteredTickets];
  }, [query, commands, tickets, navigate, runAndClose]);

  // Grupowanie z zachowaniem stałej kolejności
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filteredResults.forEach(item => {
      const arr = map.get(item.group) || [];
      arr.push(item);
      map.set(item.group, arr);
    });

    // Sortuj grupy wg stałej kolejności
    const sorted = new Map<string, CommandItem[]>();
    GROUP_ORDER.forEach(g => {
      if (map.has(g)) sorted.set(g, map.get(g)!);
    });
    // Dorzuć ewentualne nieznane grupy na koniec
    map.forEach((v, k) => {
      if (!sorted.has(k)) sorted.set(k, v);
    });

    return sorted;
  }, [filteredResults]);

  // Keyboard navigation
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredResults[activeIndex]) {
      e.preventDefault();
      filteredResults[activeIndex].action();
    }
  };

  // Scroll do aktywnego elementu
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-4 px-6 py-5 command-palette-divider bg-transparent">
          <Search className="w-6 h-6 text-gray-400 dark:text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz komendę lub wyszukaj zgłoszenie..."
            className="flex-1 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none shadow-none command-palette-input"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-3" style={{ scrollbarWidth: 'thin' }}>
          {filteredResults.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Brak wyników dla „{query}"</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Spróbuj wpisać nazwę strony, numer zgłoszenia lub akcję</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="px-6 pt-4 pb-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{group}</span>
                </div>
                {items.map((item) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={item.action}
                      onPointerMove={() => {
                        if (activeIndex !== idx) setActiveIndex(idx);
                      }}
                      className={`w-full flex items-center gap-4 px-6 py-3 text-left ${isActive
                          ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                        }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isActive
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-medium truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                          {item.label}
                        </p>
                        {item.sublabel && (
                          <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{item.sublabel}</p>
                        )}
                      </div>
                      {isActive && (
                        <ArrowRight className="w-5 h-5 text-blue-400 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-start px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs font-bold shadow-sm">↑</kbd>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs font-bold shadow-sm">↓</kbd>
              <span className="font-medium ml-1">nawiguj</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs font-bold shadow-sm">↵</kbd>
              <span className="font-medium ml-1">wybierz</span>
            </span>
            <span className="flex items-center gap-2 hidden sm:flex">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs font-bold shadow-sm tracking-wider">ESC</kbd>
              <span className="font-medium ml-1">zamknij</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
