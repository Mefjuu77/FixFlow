import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api from '../api/axiosConfig';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      // Używamy ścieżki bez wiodącego slasha, aby dokleiła się do baseURL (.../api/)
      const response = await api.get('users/me/');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Błąd autoryzacji:", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Synchronizacja sesji między kartami przeglądarki
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        if (!e.newValue) {
          // Token usunięty w innej karcie → wyloguj
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        } else if (e.newValue !== e.oldValue) {
          // Token zmieniony w innej karcie (inny użytkownik) → odśwież dane
          fetchCurrentUser();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setIsLoading(true);
    await fetchCurrentUser();
  };

  const logout = async () => {
    // Blacklistuj refresh token na serwerze
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('users/logout/', { refresh: refreshToken });
      } catch {
        // Kontynuuj logout nawet jeśli serwer nie odpowiedział
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};