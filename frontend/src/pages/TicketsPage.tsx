import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Ticket } from '../types';
import dayjs from 'dayjs';
import { PlusCircle, Search } from 'lucide-react';
import useTitle from '../hooks/useTitle';

const TicketsPage: React.FC = () => {
  useTitle('Zgłoszenia');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get('tickets/');
      setTickets(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Błąd podczas pobierania zgłoszeń:", err);
      setError('Nie udało się pobrać listy zgłoszeń.');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NOWE: 'bg-blue-100 text-blue-800',
      W_TOKU: 'bg-yellow-100 text-yellow-800',
      ROZWIAZANE: 'bg-green-100 text-green-800',
      ZAMKNIETE: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      NOWE: 'Nowe',
      W_TOKU: 'W toku',
      ROZWIAZANE: 'Rozwiązane',
      ZAMKNIETE: 'Zamknięte',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) return <div className="mt-10 text-center text-gray-500">Ładowanie zgłoszeń...</div>;
  if (error) return <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>;

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col items-center justify-between sm:flex-row">
        <h1 className="text-2xl font-bold text-gray-900">Lista zgłoszeń</h1>
        <Link 
          to="/create-ticket"
          className="flex items-center px-4 py-2 mt-4 text-white transition-colors bg-blue-600 rounded-lg sm:mt-0 hover:bg-blue-700"
        >
          <PlusCircle size={18} className="mr-2" />
          Nowe Zgłoszenie
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
            placeholder="Szukaj po tytule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ID</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Tytuł</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Osoba zgłaszająca</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Osoba przypisana</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Utworzono</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    Brak wyników do wyświetlenia.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">#{ticket.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <Link to={`/tickets/${ticket.id}`} className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors drop-shadow-sm">
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap font-medium">
                      {ticket.creator_details ? `${ticket.creator_details.first_name} ${ticket.creator_details.last_name}` : 'Nieznany'}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                       {ticket.technician_details 
                          ? <span className="text-gray-900 font-medium">{ticket.technician_details.first_name} {ticket.technician_details.last_name}</span> 
                          : <span className="text-gray-400 italic">Nie przypisano</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap font-medium">
                      {dayjs(ticket.created_at).format('DD.MM.YYYY HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;