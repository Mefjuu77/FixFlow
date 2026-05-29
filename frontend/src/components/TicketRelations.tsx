import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { GitMerge, Link2, Search, X, Loader2, Plus, AlertTriangle } from 'lucide-react';
import { ticketService } from '../api/ticketService';
import { Ticket, TicketRef } from '../types';

const STATUS_STYLES: Record<string, string> = {
  NOWE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  W_TOKU: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  ROZWIAZANE: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  ZAMKNIETE: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
};

interface Props {
  ticket: Ticket;
  canManage: boolean;
  onChanged: () => void;
}

type Mode = 'merge' | 'link' | null;

const TicketRow: React.FC<{ ticket: TicketRef; onRemove?: () => void; removeTitle?: string }> = ({ ticket, onRemove, removeTitle }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 group">
      <RouterLink
        to={`/tickets/${ticket.id}`}
        className="flex items-center gap-2 min-w-0 flex-1"
        title={ticket.title}
      >
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">#{ticket.id}</span>
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{ticket.title}</span>
      </RouterLink>
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${STATUS_STYLES[ticket.status] || ''}`}>
        {t(`status.${ticket.status}`, ticket.status)}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          title={removeTitle}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

const TicketRelations: React.FC<Props> = ({ ticket, canManage, onChanged }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Ticket[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moveContent, setMoveContent] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  const duplicateOf = ticket.merged_into_details;
  const duplicates = ticket.duplicates || [];
  const related = ticket.related_details || [];

  // Zamknij panel wyszukiwania po kliknięciu poza
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setMode(null);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce wyszukiwania
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const found = await ticketService.searchTickets(q.trim());
      // Wyklucz: bieżące zgłoszenie, już powiązane, już duplikaty, nadrzędne
      const excluded = new Set<number>([
        ticket.id,
        ...related.map(r => r.id),
        ...duplicates.map(d => d.id),
        ...(ticket.merged_into ? [ticket.merged_into] : []),
      ]);
      setResults(found.filter(t => !excluded.has(t.id)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [ticket.id, ticket.merged_into, related, duplicates]);

  useEffect(() => {
    if (mode === null) return;
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, mode, runSearch]);

  const closeSearch = () => { setMode(null); setQuery(''); setResults([]); };

  const handlePick = async (target: Ticket) => {
    setBusy(true);
    try {
      if (mode === 'merge') {
        await ticketService.mergeTicket(ticket.id, target.id, moveContent);
      } else if (mode === 'link') {
        await ticketService.linkTicket(ticket.id, target.id);
      }
      closeSearch();
      onChanged();
    } catch (err) {
      console.error('Błąd operacji powiązania:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleUnmerge = async () => {
    setBusy(true);
    try {
      await ticketService.unmergeTicket(ticket.id);
      onChanged();
    } catch (err) {
      console.error('Błąd cofania duplikatu:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (targetId: number) => {
    setBusy(true);
    try {
      await ticketService.unlinkTicket(ticket.id, targetId);
      onChanged();
    } catch (err) {
      console.error('Błąd usuwania powiązania:', err);
    } finally {
      setBusy(false);
    }
  };

  // Nie pokazuj pustej karty pracownikowi, jeśli nie ma żadnych powiązań
  if (!canManage && !duplicateOf && duplicates.length === 0 && related.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm" ref={boxRef}>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
        <GitMerge className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{t('relations.title')}</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Banner: to zgłoszenie jest duplikatem */}
        {duplicateOf && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {t('relations.duplicateOf')}
            </div>
            <TicketRow ticket={duplicateOf} />
            {canManage && (
              <button
                onClick={handleUnmerge}
                disabled={busy}
                className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50"
              >
                {t('relations.unmarkDuplicate')}
              </button>
            )}
          </div>
        )}

        {/* Lista duplikatów tego zgłoszenia */}
        {duplicates.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {t('relations.duplicates', { count: duplicates.length })}
            </p>
            <div className="space-y-1.5">
              {duplicates.map(d => <TicketRow key={d.id} ticket={d} />)}
            </div>
          </div>
        )}

        {/* Lista powiązanych zgłoszeń */}
        {related.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {t('relations.related', { count: related.length })}
            </p>
            <div className="space-y-1.5">
              {related.map(r => (
                <TicketRow
                  key={r.id}
                  ticket={r}
                  onRemove={canManage ? () => handleUnlink(r.id) : undefined}
                  removeTitle={t('relations.removeLink')}
                />
              ))}
            </div>
          </div>
        )}

        {/* Akcje (technik/admin) */}
        {canManage && !duplicateOf && (
          <div>
            {mode === null ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('link')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" /> {t('relations.link')}
                </button>
                <button
                  onClick={() => setMode('merge')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
                >
                  <GitMerge className="w-3.5 h-3.5" /> {t('relations.mergeDuplicate')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {mode === 'merge' ? t('relations.markAsDuplicate') : t('relations.linkTo')}
                  </span>
                  <button onClick={closeSearch} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('relations.searchPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>

                {mode === 'merge' && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none px-0.5">
                    <input
                      type="checkbox"
                      checked={moveContent}
                      onChange={(e) => setMoveContent(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                    {t('relations.moveContent')}
                  </label>
                )}

                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {searching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                  ) : query.trim() && results.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">{t('relations.noResults')}</p>
                  ) : (
                    results.map(r => (
                      <button
                        key={r.id}
                        disabled={busy}
                        onClick={() => handlePick(r)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors text-left disabled:opacity-50 group/item"
                      >
                        <Plus className="w-3.5 h-3.5 text-gray-300 group-hover/item:text-blue-500 flex-shrink-0" />
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">#{r.id}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1" title={r.title}>{r.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${STATUS_STYLES[r.status] || ''}`}>
                          {t(`status.${r.status}`, r.status)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketRelations;
