import React from 'react';
import {
  Monitor, AppWindow, Globe, KeyRound, Shapes,
  ChevronsUp, Equal, ChevronsDown,
  Circle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

// ==================== Kategorie ====================

export const getCategoryIcon = (name: string, size = 'w-4 h-4') => {
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('sprzęt')) return <Monitor className={`${size} text-gray-500`} />;
  if (lowerName.includes('oprogramowanie')) return <AppWindow className={`${size} text-gray-500`} />;
  if (lowerName.includes('sieć')) return <Globe className={`${size} text-gray-500`} />;
  if (lowerName.includes('dostęp')) return <KeyRound className={`${size} text-gray-500`} />;
  return <Shapes className={`${size} text-gray-500`} />;
};

// ==================== Statusy ====================

export const STATUS_LABELS: Record<string, string> = {
  NOWE: 'Nowe',
  W_TOKU: 'W toku',
  ROZWIAZANE: 'Rozwiązane',
  ZAMKNIETE: 'Zamknięte',
};

export const STATUS_STYLES: Record<string, string> = {
  NOWE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  W_TOKU: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ROZWIAZANE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ZAMKNIETE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export const STATUS_ICONS: Record<string, React.ReactNode> = {
  NOWE: <Circle className="w-4 h-4 text-blue-600 stroke-[2.5]" />,
  W_TOKU: <Loader2 className="w-4 h-4 text-amber-500 stroke-[2.5]" />,
  ROZWIAZANE: <CheckCircle2 className="w-4 h-4 text-green-600 stroke-[2.5]" />,
  ZAMKNIETE: <XCircle className="w-4 h-4 text-emerald-500 stroke-[2.5]" />,
};

// ==================== Priorytety ====================

export const PRIORITY_LABELS: Record<string, string> = {
  NISKI: 'Niski',
  NORMALNY: 'Normalny',
  WYSOKI: 'Wysoki',
};

export const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  WYSOKI: <ChevronsUp className="w-4 h-4 text-red-500" />,
  NORMALNY: <Equal className="w-4 h-4 text-blue-500" />,
  NISKI: <ChevronsDown className="w-4 h-4 text-gray-400" />,
};

export const PRIORITY_COLORS: Record<string, string> = {
  WYSOKI: 'text-red-600',
  NORMALNY: 'text-blue-600',
  NISKI: 'text-gray-500',
};
