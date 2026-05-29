import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import 'dayjs/locale/en';

import pl from './locales/pl.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['pl', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'fixflow_lang';

const FALLBACK: AppLanguage = 'pl';

/** Normalizuje dowolny kod języka (np. 'en-US') do obsługiwanego lub fallback. */
const normalize = (lng?: string | null): AppLanguage => {
  const base = (lng || '').split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(base as AppLanguage) ? (base as AppLanguage) : FALLBACK;
};

/**
 * Wybór początkowego języka — analogicznie do trybu ciemnego (ThemeContext):
 * 1. jeśli użytkownik zapisał wybór → użyj go,
 * 2. w przeciwnym razie wykryj język systemu/przeglądarki,
 * 3. ostatecznie fallback na polski.
 */
const detectInitialLanguage = (): AppLanguage => {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved) return normalize(saved);
  return normalize(navigator.language || (navigator.languages && navigator.languages[0]));
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: pl },
      en: { translation: en },
    },
    lng: detectInitialLanguage(),
    fallbackLng: FALLBACK,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// Utrwalaj wybór i synchronizuj locale dayjs (daty względne itp.)
const onLanguageChanged = (lng: string) => {
  const normalized = normalize(lng);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  dayjs.locale(normalized);
};

onLanguageChanged(i18n.language);
i18n.on('languageChanged', onLanguageChanged);

export default i18n;
