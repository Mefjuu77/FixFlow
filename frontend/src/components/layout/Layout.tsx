import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { LayoutDashboard, Ticket, Users, Settings, LogOut, Wrench } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const location = useLocation();

  const handleLogout = () => {
    authContext?.logout();
  };

  const navItems = [
    { name: 'Panel główny', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Zgłoszenia', path: '/tickets', icon: <Ticket size={20} /> },
    // Dostęp do panelu użytkowników i ustawień tylko dla Admina (można rozbudować później)
    ...(authContext?.user?.role === 'ADMIN' ? [
      { name: 'Użytkownicy', path: '/users', icon: <Users size={20} /> },
      { name: 'Ustawienia', path: '/settings', icon: <Settings size={20} /> }
    ] : [])
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
        
        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 mt-6 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname.includes(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-3 transition-colors rounded-lg ${
                    isActive 
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
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full">
              <span className="font-bold text-white">
                {authContext?.user?.email ? authContext.user.email.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{authContext?.user?.email}</p>
              <p className="text-xs text-gray-400">
                {authContext?.user?.role ? roleNames[authContext.user.role] : 'Użytkownik'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-sm text-gray-300 transition-colors bg-gray-800 rounded-md hover:bg-gray-700 hover:text-white"
          >
            <LogOut size={16} className="mr-2" /> Wyloguj się
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(item => location.pathname.includes(item.path))?.name || 'Panel'}
          </h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;