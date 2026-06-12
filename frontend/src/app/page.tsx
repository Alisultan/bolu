'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { FeedbackMessage, useFeedback } from './components/useFeedback';
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
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);
  const groupFormFeedback = useFeedback();
  const groupListFeedback = useFeedback();

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
      groupFormFeedback.showError(t('groupNameCannotBeEmpty'));
      return;
    }

    setCreatingGroup(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/groups?name=${encodeURIComponent(cleanName)}&created_by=1`,
        {
          method: 'POST',
        }
      );

      const newGroup = await response.json();

      if (newGroup.error || newGroup.detail) {
        groupFormFeedback.showError(newGroup.error || newGroup.detail);
        return;
      }

      setGroups([...groups, newGroup]);
      setGroupName('');
      groupFormFeedback.showSuccess(t('groupCreated'));
    } finally {
      setCreatingGroup(false);
    }
  };

  const deleteGroup = async (groupId: number) => {
    const confirmed = confirm(
      t('deleteGroupConfirmation')
    );

    if (!confirmed) return;

    setDeletingGroupId(groupId);

    try {
      await fetch(`http://127.0.0.1:8000/groups/${groupId}`, {
        method: 'DELETE',
      });

      fetchGroups();
      groupListFeedback.showSuccess(t('groupDeleted'));
    } finally {
      setDeletingGroupId(null);
    }
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
            disabled={creatingGroup}
            className="mt-3 bg-black text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {creatingGroup ? t('creating') : t('createGroup')}
          </button>

          <div className="mt-3">
            <FeedbackMessage feedback={groupFormFeedback.feedback} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-4">
            {t('yourGroups')} ({groups.length})
          </h2>

          <div className="mb-4">
            <FeedbackMessage feedback={groupListFeedback.feedback} />
          </div>

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
                  disabled={deletingGroupId === group.id}
                  className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {deletingGroupId === group.id ? t('deleting') : t('delete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
