import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import CommandPalette from '../CommandPalette';
import NotificationBell from '../NotificationBell';
import {
  LayoutGrid,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Wrench,
  BarChart2,
  FileText,
  Search,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    authContext?.logout();
  };

  const role = authContext?.user?.role;
  const isAdmin = role === 'ADMIN';
  const isTechOrAdmin = role === 'ADMIN' || role === 'TECHNICIAN';

  const navSections = [
    {
      label: 'GŁÓWNE',
      items: [
        { name: isTechOrAdmin ? 'Pulpit' : 'Start', path: '/dashboard', icon: <LayoutGrid size={20} strokeWidth={1.75} /> },
        { name: 'Zgłoszenia', path: '/tickets', icon: <ClipboardList size={20} strokeWidth={1.75} /> },
      ],
    },
    ...(isTechOrAdmin ? [{
      label: 'ANALITYKA',
      items: [
        { name: 'Statystyki', path: '/statistics', icon: <BarChart2 size={20} strokeWidth={1.75} /> },
        ...(isAdmin ? [{ name: 'Eksport danych', path: '/export', icon: <FileText size={20} strokeWidth={1.75} /> }] : []),
      ],
    }] : []),
    ...(isAdmin ? [{
      label: 'ZARZĄDZANIE',
      items: [
        { name: 'Użytkownicy', path: '/users', icon: <Users size={20} strokeWidth={1.75} /> },
      ],
    }] : []),
    {
      label: 'KONFIGURACJA',
      items: [
        { name: 'Ustawienia', path: '/settings', icon: <Settings size={20} strokeWidth={1.75} /> },
      ],
    },
  ];

  const roleNames: Record<string, string> = {
    'EMPLOYEE': 'Pracownik',
    'TECHNICIAN': 'Technik',
    'ADMIN': 'Administrator',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -ml-1 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        {/* Logo wyśrodkowane absolutnie */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-400" />
          <span className="text-lg font-bold text-white">FixFlow</span>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:relative z-50 md:z-auto flex flex-col w-64 text-white bg-gray-900 h-full transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-20 border-b border-gray-800">
          <Wrench className="w-8 h-8 mr-3 text-blue-400" />
          <h1 className="text-2xl font-bold">FixFlow</h1>
        </div>

        {/* Command Palette Trigger */}
        <div className="px-4 mt-4">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              // Dispatch event to open CommandPalette
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: false }));
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl transition-all group"
          >
            <Search className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
            <span className="flex-1 text-left text-gray-500 group-hover:text-gray-300 transition-colors">Szukaj...</span>
            <kbd className="hidden md:inline px-2 py-0.5 text-[11px] font-bold text-gray-500 bg-gray-700 border border-gray-600 rounded">/</kbd>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 mt-5 space-y-6">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="px-2 mb-2 text-[10.5px] font-semibold tracking-widest text-gray-500 uppercase select-none">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 font-medium text-sm ${isActive
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/30'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                          }`}
                      >
                        <span className={isActive ? 'text-white' : 'text-gray-500'}>
                          {item.icon}
                        </span>
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full flex-shrink-0 overflow-hidden outline outline-1 outline-white/10">
              {authContext?.user?.avatar ? (
                <img src={authContext.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-white uppercase">
                  {authContext?.user?.first_name ? authContext.user.first_name.charAt(0) : 'U'}
                </span>
              )}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate" title={`${authContext?.user?.first_name} ${authContext?.user?.last_name}`}>
                {authContext?.user?.first_name} {authContext?.user?.last_name}
              </p>
              <p className="text-[11px] text-gray-400 truncate tracking-wide uppercase mt-0.5">
                {authContext?.user?.role ? roleNames[authContext.user.role] : 'Użytkownik'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm text-gray-300 transition-colors bg-gray-800 rounded-md hover:bg-gray-700 hover:text-white"
            >
              <LogOut size={16} className="mr-2" /> Wyloguj się
            </button>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Page Content */}
        <main className={`flex-1 px-4 md:px-6 pb-6 overflow-y-auto bg-gray-50 dark:bg-transparent ${location.pathname === '/dashboard' || location.pathname === '/' ? 'pt-14 md:pt-0' : 'pt-[calc(3.5rem+1rem)] md:pt-6'}`}>
          {children}
        </main>
      </div>

      {/* Command Palette (globalny overlay) */}
      <CommandPalette />
    </div>
  );
};

export default Layout;