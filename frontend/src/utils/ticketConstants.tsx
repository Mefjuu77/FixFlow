import React from 'react';
import type { TFunction } from 'i18next';
import {
  Monitor, AppWindow, KeyRound, Shapes,
  ChevronsUp, Equal, ChevronsDown,
  Circle, CheckCircle2, XCircle, Loader2,
  Printer, Smartphone, Mail, Wifi, Server,
  ShieldCheck, Users, HardDrive, Headphones,
  Camera, Laptop, Plug, FileText, Settings,
  Database, Lock, AlertTriangle, Wrench,
} from 'lucide-react';

// ==================== Kategorie ====================

/**
 * Kanoniczne (angielskie) nazwy kategorii systemowych zapisane w bazie danych.
 * Używaj ich zawsze przy dopasowywaniu kategorii w kodzie — nigdy nazw
 * przetłumaczonych, bo te zależą od aktywnego języka.
 */
export const CANONICAL_CATEGORIES = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  NETWORK: 'Network & Internet',
  ACCOUNT_ACCESS: 'Account Access',
  OTHER: 'Other',
} as const;

/**
 * Zwraca zlokalizowaną nazwę kategorii. Kategorie systemowe mają tłumaczenia
 * w `categories.*`; kategorie własne (dodane przez admina) wracają bez zmian.
 */
export const getCategoryLabel = (name: string | null | undefined, t: TFunction): string =>
  name ? t(`categories.${name}`, { defaultValue: name }) : '';

export const getCategoryIcon = (name: string, size = 'w-4 h-4') => {
  const n = (name || '').toLowerCase();

  // Sprzęt / Hardware
  if (n.includes('sprzęt') || n.includes('hardware') || n.includes('urządzeni')) return <Monitor className={`${size} text-gray-500`} />;
  // Laptop / notebook
  if (n.includes('laptop') || n.includes('notebook') || n.includes('komputer')) return <Laptop className={`${size} text-gray-500`} />;
  // Drukarka / skaner
  if (n.includes('drukark') || n.includes('skaner') || n.includes('print') || n.includes('scanner')) return <Printer className={`${size} text-gray-500`} />;
  // Telefon / mobile
  if (n.includes('telefon') || n.includes('mobile') || n.includes('smartfon') || n.includes('smartphone') || n.includes('komórk')) return <Smartphone className={`${size} text-gray-500`} />;
  // Oprogramowanie / software
  if (n.includes('oprogramowanie') || n.includes('software') || n.includes('aplikacj') || n.includes('program') || n.includes('system')) return <AppWindow className={`${size} text-gray-500`} />;
  // Sieć / internet / wifi
  if (n.includes('sieć') || n.includes('network') || n.includes('internet') || n.includes('wifi') || n.includes('wi-fi') || n.includes('vpn') || n.includes('łącze')) return <Wifi className={`${size} text-gray-500`} />;
  // Serwer / infrastruktura
  if (n.includes('serwer') || n.includes('server') || n.includes('infrastruktur') || n.includes('hosting')) return <Server className={`${size} text-gray-500`} />;
  // Dostęp / konto / hasło / logowanie
  if (n.includes('dostęp') || n.includes('access') || n.includes('konto') || n.includes('account') || n.includes('logowanie') || n.includes('login')) return <KeyRound className={`${size} text-gray-500`} />;
  // Bezpieczeństwo / security
  if (n.includes('bezpieczeństwo') || n.includes('security') || n.includes('antywirus') || n.includes('antivirus') || n.includes('firewall') || n.includes('wirus')) return <ShieldCheck className={`${size} text-gray-500`} />;
  // Użytkownicy / HR / onboarding
  if (n.includes('użytkowni') || n.includes('user') || n.includes('pracowni') || n.includes('onboarding') || n.includes('hr')) return <Users className={`${size} text-gray-500`} />;
  // Email / poczta
  if (n.includes('email') || n.includes('e-mail') || n.includes('poczta') || n.includes('mail') || n.includes('outlook')) return <Mail className={`${size} text-gray-500`} />;
  // Dysk / storage / backup
  if (n.includes('dysk') || n.includes('storage') || n.includes('backup') || n.includes('kopia') || n.includes('disk') || n.includes('pamięć')) return <HardDrive className={`${size} text-gray-500`} />;
  // Baza danych
  if (n.includes('baza') || n.includes('database') || n.includes('sql') || n.includes('db')) return <Database className={`${size} text-gray-500`} />;
  // Wsparcie / helpdesk / support
  if (n.includes('wsparcie') || n.includes('support') || n.includes('helpdesk') || n.includes('pomoc') || n.includes('help')) return <Headphones className={`${size} text-gray-500`} />;
  // Kamera / monitoring
  if (n.includes('kamera') || n.includes('camera') || n.includes('monitoring') || n.includes('cctv')) return <Camera className={`${size} text-gray-500`} />;
  // Zasilanie / prąd / UPS
  if (n.includes('zasilani') || n.includes('prąd') || n.includes('ups') || n.includes('power') || n.includes('wtyczk') || n.includes('kabel')) return <Plug className={`${size} text-gray-500`} />;
  // Dokumenty / pliki
  if (n.includes('dokument') || n.includes('plik') || n.includes('file') || n.includes('raport') || n.includes('report')) return <FileText className={`${size} text-gray-500`} />;
  // Konfiguracja / ustawienia
  if (n.includes('konfiguracja') || n.includes('config') || n.includes('ustawieni') || n.includes('setting')) return <Settings className={`${size} text-gray-500`} />;
  // Blokada / uprawnienia
  if (n.includes('blokad') || n.includes('uprawni') || n.includes('permission') || n.includes('lock') || n.includes('zablokow')) return <Lock className={`${size} text-gray-500`} />;
  // Awaria / błąd / incydent
  if (n.includes('awaria') || n.includes('błąd') || n.includes('error') || n.includes('incydent') || n.includes('incident') || n.includes('problem') || n.includes('usterka')) return <AlertTriangle className={`${size} text-gray-500`} />;
  // Serwis / naprawa
  if (n.includes('serwis') || n.includes('naprawa') || n.includes('repair') || n.includes('maintenance') || n.includes('konserwacj')) return <Wrench className={`${size} text-gray-500`} />;

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
  ZAMKNIETE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
};

export const STATUS_ICONS: Record<string, React.ReactNode> = {
  NOWE: <Circle className="w-4 h-4 text-blue-600 stroke-[2.5]" />,
  W_TOKU: <Loader2 className="w-4 h-4 text-amber-500 stroke-[2.5]" />,
  ROZWIAZANE: <CheckCircle2 className="w-4 h-4 text-green-600 stroke-[2.5]" />,
  ZAMKNIETE: <XCircle className="w-4 h-4 text-teal-500 stroke-[2.5]" />,
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
