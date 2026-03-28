import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import TicketsPage from './pages/TicketsPage';
import Layout from './components/layout/Layout';

// Komponent chroniący ścieżki
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const authContext = useContext(AuthContext);
  
  // Jeśli wciąż sprawdzamy token, nie przekierowujemy
  if (authContext?.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authContext?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const Dashboard = () => (
  <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
    <h3 className="mb-2 text-lg font-medium text-gray-800">Witaj w FixFlow</h3>
    <p className="text-gray-500">Wybierz "Zgłoszenia" z menu, aby zobaczyć listę zgłoszeń.</p>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;