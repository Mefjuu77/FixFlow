import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pl';
import 'dayjs/locale/en';
import { ticketService } from '../api/ticketService';
import { Notification } from '../types';
import { AuthContext } from '../context/AuthContext';

dayjs.extend(relativeTime);

const POLL_INTERVAL = 60 * 1000; // 60s

const NotificationBell: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    try {
      setUnread(await ticketService.getUnreadCount());
    } catch {
      // cisza — licznik to funkcja pomocnicza
    }
  }, []);

  // Reset stanu przy zmianie zalogowanego użytkownika (wylogowanie/logowanie
  // bez przeładowania strony) — zapobiega pokazywaniu powiadomień poprzedniego konta.
  useEffect(() => {
    setIsOpen(false);
    setItems([]);
    setUnread(0);
    if (userId) {
      fetchUnread();
    }
  }, [userId, fetchUnread]);

  // Polling licznika nieprzeczytanych
  // Polling licznika nieprzeczytanych (tylko dla zalogowanego użytkownika)
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(fetchUnread, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchUnread, userId]);

  // Zamknięcie po kliknięciu poza panelem
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      try {
        setItems(await ticketService.getNotifications());
      } catch {
        // ignoruj
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClickItem = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await ticketService.markNotificationRead(n.id);
        setItems(prev => prev.map(it => (it.id === n.id ? { ...it, is_read: true } : it)));
        setUnread(u => Math.max(0, u - 1));
      } catch {
        // ignoruj
      }
    }
    setIsOpen(false);
    if (n.ticket) navigate(`/tickets/${n.ticket}`);
  };

  const handleMarkAll = async () => {
    try {
      await ticketService.markAllNotificationsRead();
      setItems(prev => prev.map(it => ({ ...it, is_read: true })));
      setUnread(0);
    } catch {
      // ignoruj
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={openPanel}
        className="relative flex items-center justify-center w-10 h-10 text-gray-300 transition-colors bg-gray-800 rounded-md hover:bg-gray-700 hover:text-white"
        title={t('notifications.title')}
        aria-label={t('notifications.title')}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-gray-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 left-4 right-4 w-auto md:absolute md:inset-auto md:bottom-full md:left-0 md:mb-2 md:w-80 md:max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('notifications.title')}</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> {t('notifications.markAll')}
              </button>
            )}
          </div>

          <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${n.is_read ? '' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] leading-snug ${n.is_read ? 'text-gray-600 dark:text-gray-400' : 'font-semibold text-gray-900 dark:text-gray-100'}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {dayjs(n.created_at).locale(i18n.language.startsWith('pl') ? 'pl' : 'en').fromNow()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
