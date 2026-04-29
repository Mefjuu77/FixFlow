import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import api from '../api/axiosConfig';
import { Ticket } from '../types';
import {
  Search, LayoutDashboard, Ticket as TicketIcon, BarChart3, FileBarChart,
  Users, Settings, PlusCircle, LogOut, Moon, Sun, ArrowRight,
  Hash, Command, KeyRound, Bell, Palette, UserPlus
} from 'lucide-react';

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

  // Otwieranie / zamykanie palety
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
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
      { id: 'nav-dashboard', label: 'Panel główny', icon: <LayoutDashboard className="w-4 h-4" />, action: () => runAndClose(() => navigate('/dashboard')), group: 'Nawigacja', keywords: 'dashboard strona główna home' },
      { id: 'nav-tickets', label: 'Zgłoszenia', icon: <TicketIcon className="w-4 h-4" />, action: () => runAndClose(() => navigate('/tickets')), group: 'Nawigacja', keywords: 'tickety lista' },
    );

    if (isAdmin || isTechnician) {
      items.push(
        { id: 'nav-stats', label: 'Statystyki', icon: <BarChart3 className="w-4 h-4" />, action: () => runAndClose(() => navigate('/statistics')), group: 'Nawigacja', keywords: 'wykresy analityka dane' },
      );
    }

    if (isAdmin) {
      items.push(
        { id: 'nav-reports', label: 'Raporty', icon: <FileBarChart className="w-4 h-4" />, action: () => runAndClose(() => navigate('/reports')), group: 'Nawigacja', keywords: 'eksport pdf csv' },
        { id: 'nav-users', label: 'Użytkownicy', icon: <Users className="w-4 h-4" />, action: () => runAndClose(() => navigate('/users')), group: 'Nawigacja', keywords: 'pracownicy technicy administracja' },
        { id: 'action-add-user', label: 'Dodaj nowego użytkownika', icon: <UserPlus className="w-4 h-4" />, action: () => runAndClose(() => navigate('/users', { state: { openCreateModal: true } })), group: 'Akcje', keywords: 'dodaj utwórz stwórz pracownika technika admina nowy uzytkownik user' },
      );
    }

    items.push(
      { id: 'nav-settings', label: 'Ustawienia (Ogólne)', icon: <Settings className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings')), group: 'Nawigacja', keywords: 'profil konto ustawienia' },
      { id: 'nav-settings-security', label: 'Zmień hasło (Zabezpieczenia)', icon: <KeyRound className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings?tab=security')), group: 'Nawigacja', keywords: 'hasło zmiana hasła bezpieczeństwo security password' },
      { id: 'nav-settings-notifications', label: 'Ustawienia powiadomień', icon: <Bell className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings?tab=notifications')), group: 'Nawigacja', keywords: 'powiadomienia alerty maile notifications' },
      { id: 'nav-settings-appearance', label: 'Wygląd aplikacji', icon: <Palette className="w-4 h-4" />, action: () => runAndClose(() => navigate('/settings?tab=appearance')), group: 'Nawigacja', keywords: 'wygląd motyw kolory interfejs appearance' },
    );

    // Akcje
    items.push(
      { id: 'nav-create', label: 'Nowe zgłoszenie', icon: <PlusCircle className="w-4 h-4" />, action: () => runAndClose(() => navigate('/create-ticket')), group: 'Akcje', keywords: 'utwórz stwórz dodaj nowy ticket zgłoś' },
      {
        id: 'action-theme',
        label: themeContext?.isDark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw',
        icon: themeContext?.isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        action: () => runAndClose(() => themeContext?.toggleTheme()),
        group: 'Akcje',
        keywords: 'dark mode tryb ciemny jasny theme motyw'
      },
      {
        id: 'action-logout',
        label: 'Wyloguj się',
        icon: <LogOut className="w-4 h-4" />,
        action: () => runAndClose(() => authContext?.logout()),
        group: 'Akcje',
        keywords: 'logout wylogowanie wyjście'
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
    const filteredTickets: CommandItem[] = tickets
      .filter(t =>
        t.id.toString().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.creator_details && `${t.creator_details.first_name} ${t.creator_details.last_name}`.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map(t => ({
        id: `ticket-${t.id}`,
        label: `#${t.id} ${t.title}`,
        sublabel: t.creator_details ? `${t.creator_details.first_name} ${t.creator_details.last_name}` : undefined,
        icon: <Hash className="w-4 h-4" />,
        action: () => runAndClose(() => navigate(`/tickets/${t.id}`)),
        group: 'Zgłoszenia',
      }));

    return [...filteredCommands, ...filteredTickets];
  }, [query, commands, tickets, navigate, runAndClose]);

  // Grupowanie
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filteredResults.forEach(item => {
      const arr = map.get(item.group) || [];
      arr.push(item);
      map.set(item.group, arr);
    });
    return map;
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
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-4 px-5 py-5 border-b border-gray-100 dark:border-gray-800 bg-transparent">
          <Search className="w-6 h-6 text-gray-400 dark:text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz komendę lub wyszukaj zgłoszenie..."
            className="flex-1 text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-transparent !bg-transparent border-0 border-none ring-0 focus:ring-0 focus:outline-none shadow-none"
            style={{ backgroundColor: 'transparent' }}
          />
          <kbd className="hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md uppercase tracking-wider">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
          {filteredResults.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Brak wyników dla „{query}"</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Spróbuj wpisać nazwę strony, numer zgłoszenia lub akcję</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="px-5 pt-3 pb-1.5">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{group}</span>
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
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-75 ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                          {item.label}
                        </p>
                        {item.sublabel && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.sublabel}</p>
                        )}
                      </div>
                      {isActive && (
                        <ArrowRight className="w-4 h-4 text-blue-400 dark:text-blue-400 flex-shrink-0 animate-in fade-in duration-100" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-bold">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-bold">↓</kbd>
              nawiguj
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-bold">↵</kbd>
              wybierz
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <Command className="w-3 h-3" />
            <span className="font-medium">FixFlow</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
