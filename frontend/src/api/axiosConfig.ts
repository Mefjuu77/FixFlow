import axios from 'axios';

// Odczytuje access token z localStorage lub sessionStorage
export const getAccessToken = (): string | null =>
  localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token');

// Odczytuje refresh token z localStorage lub sessionStorage
export const getRefreshToken = (): string | null =>
  localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');

// Zapisuje tokeny w odpowiednim storage
export const storeTokens = (access: string, refresh: string, remember: boolean) => {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('access_token', access);
  storage.setItem('refresh_token', refresh);
};

// Usuwa tokeny z obu storage
export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
};

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

// Interceptor dołączający token JWT do każdego zapytania
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flaga zapobiegająca wielokrotnemu odświeżaniu jednocześnie
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Funkcja odświeżania tokena
const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('Brak refresh tokena');

  const response = await axios.post('http://127.0.0.1:8000/api/users/refresh/', {
    refresh: refreshToken,
  });

  const newAccessToken = response.data.access;

  // Zachowaj ten sam storage co poprzednio
  const inLocal = !!localStorage.getItem('refresh_token');
  const storage = inLocal ? localStorage : sessionStorage;
  storage.setItem('access_token', newAccessToken);

  // Po rotacji serwer zwraca nowy refresh token
  if (response.data.refresh) {
    storage.setItem('refresh_token', response.data.refresh);
  }

  return newAccessToken;
};

// Interceptor przechwytujący błędy — próba odświeżenia tokena przy 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jeśli 401 i to nie jest request logowania/refresha i nie próbowaliśmy jeszcze retry
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('users/login/') &&
      !originalRequest.url?.includes('token/refresh/')
    ) {
      if (isRefreshing) {
        // Kolejkuj żądania podczas odświeżania
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        clearTokens();

        // Nasz CustomTokenRefreshSerializer zwraca code='user_inactive' gdy
        // konto jest zdezaktywowane. Sprawdzamy też detail jako fallback.
        const data = refreshError.response?.data;
        const isDeactivated =
          data?.code === 'user_inactive' ||
          (typeof data?.detail === 'string' && data.detail.includes('zdezaktywowane'));
        window.location.href = isDeactivated
          ? '/login?account_deactivated=true'
          : '/login?session_expired=true';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Proaktywne odświeżanie tokena co 14 minut (token JWT wygasa po ~60min)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minut

const refreshIntervalId = setInterval(async () => {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await refreshAccessToken();
      console.log('[Auth] Token odświeżony proaktywnie');
    } catch (err) {
      console.warn('[Auth] Proaktywne odświeżanie tokena nie powiodło się', err);
    }
  }
}, TOKEN_REFRESH_INTERVAL);

// Czyszczenie interwału przy Vite HMR, aby uniknąć tworzenia duplikatów
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearInterval(refreshIntervalId);
  });
}

export default api;