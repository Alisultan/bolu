'use client';

import Link from 'next/link';

import { useLanguage } from '../../i18n/LanguageProvider';

export function BackToGroupsLink() {
  const { t } = useLanguage();

  return (
    <Link
      href="/"
      className="inline-block mb-4 text-sm font-medium text-gray-600 hover:text-black"
    >
      {t('backToGroups')}
    </Link>
  );
}
