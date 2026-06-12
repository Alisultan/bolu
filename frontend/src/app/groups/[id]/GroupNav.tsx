'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const navItems = [
  { label: 'Overview', href: '' },
  { label: 'Expenses', href: '/expenses' },
  { label: 'Settlements', href: '/settlements' },
  { label: 'Members', href: '/members' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Settings', href: '/settings' },
];

export default function GroupNav() {
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
              key={item.label}
              href={href}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
