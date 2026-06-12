'use client';

import { useLanguage } from './LanguageProvider';
import { type Language, languageLabels } from './translations';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex justify-end gap-4">
      {(['kz', 'ru', 'en'] as Language[]).map((nextLanguage) => (
        <button
          key={nextLanguage}
          onClick={() => setLanguage(nextLanguage)}
          className={language === nextLanguage ? 'font-semibold text-black' : ''}
        >
          {languageLabels[nextLanguage]}
        </button>
      ))}
    </div>
  );
}
