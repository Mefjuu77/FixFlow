import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, X, AlertTriangle, Clock } from 'lucide-react';
import useTitle from '../hooks/useTitle';

const ResolutionActionPage: React.FC = () => {
  const { result } = useParams<{ result: string }>();

  const config: Record<string, { icon: React.ReactNode; title: string; message: string; color: string; bgColor: string; borderColor: string }> = {
    accepted: {
      icon: <Check className="w-8 h-8 text-green-600" />,
      title: 'Rozwiązanie zaakceptowane',
      message: 'Dziękujemy! Twoje zgłoszenie zostało zamknięte. Jeśli problem pojawi się ponownie, możesz utworzyć nowe zgłoszenie.',
      color: 'text-green-800',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    rejected: {
      icon: <X className="w-8 h-8 text-red-600" />,
      title: 'Zgłoszenie ponownie otwarte',
      message: 'Twoje zgłoszenie zostało ponownie otwarte. Przypisany technik został powiadomiony i wkrótce się z Tobą skontaktuje.',
      color: 'text-red-800',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    invalid: {
      icon: <AlertTriangle className="w-8 h-8 text-amber-600" />,
      title: 'Nieprawidłowy link',
      message: 'Ten link jest nieprawidłowy lub wygasł. Zaloguj się do panelu FixFlow, aby zarządzać swoimi zgłoszeniami.',
      color: 'text-amber-800',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    'already-processed': {
      icon: <Clock className="w-8 h-8 text-gray-600" />,
      title: 'Zgłoszenie już przetworzone',
      message: 'To zgłoszenie zostało już wcześniej zaakceptowane, odrzucone lub zamknięte. Żadna dodatkowa akcja nie jest wymagana.',
      color: 'text-gray-800',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
  };

  const current = config[result || ''] || config['invalid'];

  useTitle(current.title);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className={`${current.bgColor} border ${current.borderColor} rounded-2xl shadow-lg p-8 text-center`}>
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-5">
            {current.icon}
          </div>
          <h1 className={`text-xl font-bold ${current.color} mb-3`}>{current.title}</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{current.message}</p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Zaloguj się do FixFlow →
          </Link>
        </div>
        <div className="text-center mt-4 text-xs text-gray-400">
          ⚙ FixFlow · System zgłoszeń IT
        </div>
      </div>
    </div>
  );
};

export default ResolutionActionPage;
