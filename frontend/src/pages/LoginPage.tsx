import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import { Lock, Mail, Wrench, ArrowRight, AlertCircle } from 'lucide-react';
import useTitle from '../hooks/useTitle';

const LoginPage: React.FC = () => {
  useTitle('Logowanie');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('users/login/', { email, password });
      if (authContext) {
        await authContext.login(response.data.access, response.data.refresh);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Błędny e-mail lub hasło.');
      } else {
        setError(err.response?.data?.detail || 'Wystąpił błąd logowania. Spróbuj ponownie.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
      {/* Dekoracyjne elementy tła */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute w-64 h-64 bg-white rounded-full -top-10 -left-10 blur-3xl opacity-20"></div>
        <div className="absolute w-96 h-96 bg-blue-400 rounded-full bottom-10 right-10 blur-3xl opacity-10"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Karta logowania */}
        <div className="overflow-hidden bg-white shadow-2xl rounded-2xl">
          <div className="p-8">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="flex items-center justify-center w-16 h-16 mb-4 bg-blue-100 rounded-2xl">
                <Wrench className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">FixFlow</h1>
            </div>
            
            {error && (
              <div className="flex items-center p-4 mb-6 text-sm text-red-800 border border-red-100 bg-red-50 rounded-xl animate-shake">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 ml-1">Adres e-mail</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full py-3 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                    placeholder="np. admin@fixflow.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-semibold text-gray-700">Hasło</label>
                  <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">Zapomniałeś hasła?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    className="w-full py-3 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center ml-1">
                <input id="remember-me" type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600">Zapamiętaj mnie</label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center justify-center w-full px-4 py-3.5 text-white font-bold bg-blue-600 rounded-xl transition-all shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Zaloguj się</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="px-8 py-4 text-center bg-gray-50 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Nie masz konta? <span className="font-bold text-blue-600 cursor-pointer hover:underline">Skontaktuj się z IT</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-blue-100/60 font-medium">
          &copy; 2026 FixFlow Helpdesk. Wszelkie prawa zastrzeżone.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;