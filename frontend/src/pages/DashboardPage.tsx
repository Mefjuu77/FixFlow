import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { Ticket as TicketType } from '../types';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Ticket as TicketIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import useTitle from '../hooks/useTitle';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pl';

// Konfiguracja dayjs do obsługi czasu relatywnego po polsku
dayjs.extend(relativeTime);
dayjs.locale('pl');

const DashboardPage: React.FC = () => {
  useTitle('Panel główny');
  const authContext = useContext(AuthContext);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('tickets/');
        setTickets(response.data);
      } catch (error) {
        console.error("Błąd pobierania statystyk:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    {
      label: 'Wszystkie zgłoszenia',
      value: tickets.length,
      icon: <ClipboardList className="text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    },
    {
      label: 'Nowe',
      value: tickets.filter(t => t.status === 'NOWE').length,
      icon: <AlertCircle className="text-amber-600" />,
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    },
    {
      label: 'W toku',
      value: tickets.filter(t => t.status === 'W_TOKU').length,
      icon: <Clock className="text-indigo-600" />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-100'
    },
    {
      label: 'Rozwiązane',
      value: tickets.filter(t => t.status === 'ROZWIAZANE' || t.status === 'ZAMKNIETE').length,
      icon: <CheckCircle2 className="text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-100'
    },
  ];

  // Pobranie 5 najnowszych aktywności (posortowane po dacie utworzenia/aktualizacji)
  const recentActivity = [...tickets]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Powitanie */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Witaj, {authContext?.user?.first_name}! 👋
          </h1>
          <p className="mt-1 text-gray-500">Dzisiejsze podsumowanie:</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/tickets"
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
          >
            Lista zgłoszeń
          </Link>
          <Link
            to="/create-ticket"
            className="inline-flex items-center px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" /> Nowe zgłoszenie
          </Link>
        </div>
      </div>

      {/* Siatka Statystyk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-6 bg-white border ${stat.border} rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-default`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bg} rounded-xl`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Dolny panel (Aktywność) */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Ostatnia aktywność</h3>
          <Link to="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center">
            Zobacz wszystko <ArrowUpRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm italic">
              Brak zarejestrowanych aktywności.
            </div>
          ) : (
            recentActivity.map((ticket) => (
              <div key={ticket.id} className="p-6 flex items-start hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <TicketIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Zgłoszenie #{ticket.id}: {ticket.title}</p>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase ${ticket.status === 'NOWE' ? 'bg-blue-50 text-blue-700' :
                      ticket.status === 'W_TOKU' ? 'bg-amber-50 text-amber-700' :
                        'bg-green-50 text-green-700'
                      }`}>
                      {ticket.status === 'W_TOKU' ? 'W TOKU' : 
                       ticket.status === 'NOWE' ? 'NOWE' :
                       ticket.status === 'ROZWIAZANE' ? 'ROZWIĄZANE' :
                       ticket.status === 'ZAMKNIETE' ? 'ZAMKNIĘTE' : ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-2xl">{ticket.description}</p>
                  <div className="flex items-center mt-2 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {dayjs(ticket.updated_at).fromNow()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
