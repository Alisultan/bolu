'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

import { useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';

const navItems = [
  { labelKey: 'overview', href: '' },
  { labelKey: 'expenses', href: '/expenses' },
  { labelKey: 'settlements', href: '/settlements' },
  { labelKey: 'members', href: '/members' },
  { labelKey: 'analytics', href: '/analytics' },
  { labelKey: 'settings', href: '/settings' },
 ] satisfies { labelKey: TranslationKey; href: string }[];

export default function GroupNav() {
  const { t } = useLanguage();
  const params = useParams();
  const pathname = usePathname();
  const groupId = params.id as string;
  const basePath = `/groups/${groupId}`;

  return (
    <nav className="mb-8 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = pathname === href;

          return (
            <Link
              key={item.labelKey}
              href={href}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
