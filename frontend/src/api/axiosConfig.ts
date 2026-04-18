import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

// Interceptor dołączający token JWT do każdego zapytania
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
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
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('Brak refresh tokena');

  const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
    refresh: refreshToken,
  });

  const newAccessToken = response.data.access;
  localStorage.setItem('access_token', newAccessToken);
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
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh nie powiódł się — wyloguj
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login?session_expired=true';
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

setInterval(async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken) {
    try {
      await refreshAccessToken();
      console.log('[Auth] Token odświeżony proaktywnie');
    } catch (err) {
      console.warn('[Auth] Proaktywne odświeżanie tokena nie powiodło się', err);
    }
  }
}, TOKEN_REFRESH_INTERVAL);

export default api;