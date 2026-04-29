import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import CommandPalette from '../CommandPalette';
import { LayoutDashboard, Ticket, Users, Settings, LogOut, Wrench, BarChart3, FileBarChart, Moon, Sun, Search } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const themeContext = useContext(ThemeContext);
  const location = useLocation();

  const handleLogout = () => {
    authContext?.logout();
  };

  const navItems = [
    { name: 'Panel główny', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Zgłoszenia', path: '/tickets', icon: <Ticket size={20} /> },
    // Statystyki dostępne dla Technika i Admina
    ...(authContext?.user?.role === 'ADMIN' || authContext?.user?.role === 'TECHNICIAN' ? [
      { name: 'Statystyki', path: '/statistics', icon: <BarChart3 size={20} /> }
    ] : []),
    // Dostęp do panelu użytkowników tylko dla Admina
    ...(authContext?.user?.role === 'ADMIN' ? [
      { name: 'Raporty', path: '/reports', icon: <FileBarChart size={20} /> },
      { name: 'Użytkownicy', path: '/users', icon: <Users size={20} /> },
    ] : []),
    // Ustawienia dostępne dla wszystkich
    { name: 'Ustawienia', path: '/settings', icon: <Settings size={20} /> }
  ];

  const roleNames: Record<string, string> = {
    'EMPLOYEE': 'Pracownik',
    'TECHNICIAN': 'Technik',
    'ADMIN': 'Administrator',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className="flex flex-col w-64 text-white bg-gray-900">
        <div className="flex items-center justify-center h-20 border-b border-gray-800">
          <Wrench className="w-8 h-8 mr-3 text-blue-400" />
          <h1 className="text-2xl font-bold">FixFlow</h1>
        </div>

        {/* Command Palette Trigger */}
        <div className="px-4 mt-4">
          <button
            onClick={() => {
              // Dispatch event to open CommandPalette
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: false }));
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl transition-all group"
          >
            <Search className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
            <span className="flex-1 text-left text-gray-500 group-hover:text-gray-300 transition-colors">Szukaj...</span>
            <kbd className="px-2 py-0.5 text-[11px] font-bold text-gray-500 bg-gray-700 border border-gray-600 rounded">/</kbd>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 mt-6 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname.includes(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-3 transition-colors rounded-lg ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  {item.icon}
                  <span className="ml-3 font-medium">{item.name}</span>
                </Link>
              );
            })}
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
            <button
              onClick={() => themeContext?.toggleTheme()}
              className="flex items-center justify-center w-9 h-9 text-gray-300 transition-colors bg-gray-800 rounded-md hover:bg-gray-700 hover:text-white flex-shrink-0"
              title={themeContext?.isDark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
            >
              {themeContext?.isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>

      {/* Command Palette (globalny overlay) */}
      <CommandPalette />
    </div>
  );
};

export default Layout;