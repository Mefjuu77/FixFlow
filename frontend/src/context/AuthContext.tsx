import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api, { getAccessToken, getRefreshToken, storeTokens, clearTokens } from '../api/axiosConfig';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, rememberMe?: boolean) => Promise<void>;
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
    const token = getAccessToken();
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Synchronizacja sesji między kartami przeglądarki
  useEffect(() => {
    // 1. StorageEvent - dla localStorage (zapamiętaj mnie)
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

    // 2. BroadcastChannel - dla sessionStorage (bez zapamiętaj mnie)
    // Synchronizuje stan logowania we wszystkich kartach nawet przy sessionStorage
    const channel = new BroadcastChannel('auth_sync_channel');
    channel.onmessage = (event) => {
      if (event.data.type === 'LOGIN') {
        const { access, refresh, rememberMe } = event.data;
        storeTokens(access, refresh, rememberMe);
        fetchCurrentUser();
      } else if (event.data.type === 'LOGOUT') {
        clearTokens();
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      channel.close();
    };
  }, []);

  const login = async (accessToken: string, refreshToken: string, rememberMe: boolean = true) => {
    storeTokens(accessToken, refreshToken, rememberMe);
    
    // Powiadom inne karty o logowaniu
    const channel = new BroadcastChannel('auth_sync_channel');
    channel.postMessage({ type: 'LOGIN', access: accessToken, refresh: refreshToken, rememberMe });
    channel.close();

    setIsLoading(true);
    await fetchCurrentUser();
  };

  const logout = async () => {
    // Blacklistuj refresh token na serwerze
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await api.post('users/logout/', { refresh: refreshToken });
      } catch {
        // Kontynuuj logout nawet jeśli serwer nie odpowiedział
      }
    }
    
    // Powiadom inne karty o wylogowaniu
    const channel = new BroadcastChannel('auth_sync_channel');
    channel.postMessage({ type: 'LOGOUT' });
    channel.close();

    clearTokens();
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