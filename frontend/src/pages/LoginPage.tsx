import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Wrench,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import useTitle from '../hooks/useTitle';

const LoginPage: React.FC = () => {
  useTitle('Logowanie');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const authContext = useContext(AuthContext);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session_expired') === 'true') {
      setError('Twoja sesja wygasła. Ze względów bezpieczeństwa zostaniesz poproszony o ponowne logowanie.');
      window.history.replaceState({}, document.title, '/login');
    }
    if (params.get('account_deactivated') === 'true') {
      setError('Twoje konto zostało zdezaktywowane w trakcie trwania sesji. Zostałeś automatycznie wylogowany.');
      window.history.replaceState({}, document.title, '/login');
    }
  }, [location.search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('users/login/', { email, password });
      if (authContext) {
        await authContext.login(response.data.access, response.data.refresh, rememberMe);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'user_inactive') {
        setError(err.response.data.detail || 'Twoje konto zostało zdezaktywowane. Skontaktuj się z administratorem.');
      } else if (err.response?.status === 401) {
        setError('Błędny e-mail lub hasło.');
      } else {
        setError(err.response?.data?.detail || 'Wystąpił błąd logowania. Spróbuj ponownie.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen min-h-[100dvh] p-3 sm:p-4 bg-gray-50 dark:bg-[#0f172a] overflow-hidden">
      {/* Dekoracyjne tło — subtelny akcent zgodny z resztą aplikacji */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-64 sm:w-96 h-64 sm:h-96 bg-blue-200/40 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-full blur-3xl" />
      </div>



      <div className="relative w-full max-w-md animate-in fade-in duration-500">
        {/* Karta logowania */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
          <div className="p-6 sm:p-8 md:p-10">
            {/* Header karty — wzorzec z SettingsPage */}
            <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center mb-4">
                <Wrench className="w-7 h-7 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                FixFlow
              </h1>
            </div>

            {/* Alert błędu — styl z Settings */}
            {error && (
              <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400">
                  Adres e-mail
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" strokeWidth={1.75} />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                    placeholder="Adres e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Hasło */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400">
                    Hasło
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    Zapomniałeś hasła?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" strokeWidth={1.75} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="w-full pl-11 pr-11 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                    placeholder="Hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Zapamiętaj mnie */}
              <div className="flex items-center pt-1">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-0 bg-white dark:bg-gray-900"
                />
                <label htmlFor="remember-me" className="ml-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 select-none cursor-pointer">
                  Zapamiętaj mnie
                </label>
              </div>

              {/* Przycisk submit — styl aplikacji */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] dark:shadow-none transition-all hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 ${isSubmitting ? '' : ''}`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Zaloguj się</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
