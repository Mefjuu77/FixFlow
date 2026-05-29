import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, AppLanguage } from '../i18n';

const LANG_LABELS: Record<AppLanguage, { native: string; flag: string }> = {
  pl: { native: 'Polski', flag: '🇵🇱' },
  en: { native: 'English', flag: '🇬🇧' },
};

interface Props {
  /** "dark" wariant do ciemnego sidebara, "light" do jasnych ekranów (login). */
  variant?: 'light' | 'dark';
}

const LanguageSwitcher: React.FC<Props> = ({ variant = 'light' }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = (i18n.language?.split('-')[0] as AppLanguage) || 'pl';
  const activeLang: AppLanguage = SUPPORTED_LANGUAGES.includes(current) ? current : 'pl';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeLang = (lng: AppLanguage) => {
    i18n.changeLanguage(lng);
    setOpen(false);
  };

  const triggerClass =
    variant === 'dark'
      ? 'flex items-center gap-1.5 px-2.5 py-2 text-sm text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700 hover:text-white transition-colors'
      : 'flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-label="Language"
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase font-bold text-xs">{activeLang}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute right-0 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 py-1 animate-in fade-in zoom-in-95 duration-100 ${variant === 'dark' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <button
              key={lng}
              onClick={() => changeLang(lng)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-blue-50 dark:hover:bg-gray-700/70 ${
                activeLang === lng ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-base leading-none">{LANG_LABELS[lng].flag}</span>
              <span className="flex-1 text-left">{LANG_LABELS[lng].native}</span>
              {activeLang === lng && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
