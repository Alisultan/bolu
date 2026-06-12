'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useLanguage } from './i18n/LanguageProvider';
import { LanguageSwitcher } from './i18n/LanguageSwitcher';

type Group = {
  id: number;
  name: string;
  created_by: number;
};

export default function Home() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');

  const fetchGroups = async () => {
    const res = await fetch('http://127.0.0.1:8000/groups');
    const data = await res.json();

    setGroups(data);
  };

  useEffect(() => {
    const loadGroups = async () => {
      const res = await fetch('http://127.0.0.1:8000/groups');
      const data = await res.json();

      setGroups(data);
    };

    loadGroups();
  }, []);

  const createGroup = async () => {
    const cleanName = groupName.trim();

    if (cleanName.length === 0) {
      alert(t('groupNameCannotBeEmpty'));
      return;
    }

    const response = await fetch(
      `http://127.0.0.1:8000/groups?name=${cleanName}&created_by=1`,
      {
        method: 'POST',
      }
    );

    const newGroup = await response.json();

    if (newGroup.error) {
      alert(newGroup.error);
      return;
    }

    setGroups([...groups, newGroup]);
    setGroupName('');
  };

  const deleteGroup = async (groupId: number) => {
    const confirmed = confirm(
      t('deleteGroupConfirmation')
    );

    if (!confirmed) return;

    await fetch(`http://127.0.0.1:8000/groups/${groupId}`, {
      method: 'DELETE',
    });

    fetchGroups();
  };

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <LanguageSwitcher />
        </div>

        <h1 className="text-5xl font-bold mb-8">Bolu</h1>

        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-2xl font-semibold mb-4">{t('createGroup')}</h2>

          <input
            className="border p-3 rounded w-full"
            placeholder={t('groupName')}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <button
            onClick={createGroup}
            className="mt-3 bg-black text-white px-4 py-2 rounded"
          >
            {t('createGroup')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-4">
            {t('yourGroups')} ({groups.length})
          </h2>

          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="border rounded p-4 flex justify-between items-center"
              >
                <Link href={`/groups/${group.id}`} className="flex-1">
                  {group.name}
                </Link>

                <button
                  onClick={() => deleteGroup(group.id)}
                  className="text-red-600 hover:underline"
                >
                  {t('delete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
