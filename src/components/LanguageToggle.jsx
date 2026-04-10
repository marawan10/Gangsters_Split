import { useLanguage } from '../utils/i18n';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      className="flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-600 shadow-sm transition active:scale-90 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      aria-label="Toggle language"
    >
      {lang === 'en' ? 'عر' : 'EN'}
    </button>
  );
}
