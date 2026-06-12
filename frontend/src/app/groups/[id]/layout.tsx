import Link from 'next/link';

import GroupNav from './GroupNav';

type Props = {
  children: React.ReactNode;
};

export default function GroupLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-block mb-4 text-sm font-medium text-gray-600 hover:text-black"
        >
          Back to groups
        </Link>

        <GroupNav />
        {children}
      </div>
    </main>
  );
}
