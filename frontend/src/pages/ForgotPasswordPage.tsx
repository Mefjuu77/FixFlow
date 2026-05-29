import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Mail, Wrench, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import useTitle from '../hooks/useTitle';

const ForgotPasswordPage: React.FC = () => {
  useTitle('Reset hasła');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('users/password-reset/', { email });
      setSent(true);
    } catch {
      // Backend zawsze zwraca 200 — błąd oznacza problem sieciowy
      setError('Wystąpił błąd. Spróbuj ponownie za chwilę.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-[#0f172a] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200/40 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in duration-500">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center mb-4">
                <Wrench className="w-7 h-7 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Reset hasła</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                Podaj adres e-mail, a wyślemy link do ustawienia nowego hasła
              </p>
            </div>

            {sent ? (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Jeśli konto o podanym adresie istnieje, wysłaliśmy wiadomość z instrukcją resetu hasła.
                  Sprawdź swoją skrzynkę odbiorczą.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Powrót do logowania
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400">Adres e-mail</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" strokeWidth={1.75} />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                      placeholder="twoj.adres@firma.pl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] dark:shadow-none transition-all hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Wyślij link resetujący</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Powrót do logowania
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
