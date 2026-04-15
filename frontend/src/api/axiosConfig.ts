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

// Interceptor przechwytujący błędy z serwera
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jeśli otrzymamy błąd 401 (Brak autoryzacji / wygasły token)
    if (error.response?.status === 401 && !error.config.url.includes('users/login/')) {
      // Wyczyszczenie martwych tokenów
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Awaryjne, twarde przekierowanie na stronę logowania dołączając parametr w URL
      window.location.href = '/login?session_expired=true';
    }
    return Promise.reject(error);
  }
);

export default api;