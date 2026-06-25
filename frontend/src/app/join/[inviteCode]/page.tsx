'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useLanguage } from '../../i18n/LanguageProvider';

export default function JoinInvitePage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;

  useEffect(() => {
    router.replace(`/?invite=${encodeURIComponent(inviteCode.toUpperCase())}`);
  }, [inviteCode, router]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-10">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow">
        <p className="text-gray-600">{t('joinGroup')}</p>
      </div>
    </main>
  );
}
