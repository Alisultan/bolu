'use client';

import { useEffect, useState } from 'react';

type Group = {
  id: number;
  name: string;
  created_by: number;
};

export default function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/groups')
      .then((res) => res.json())
      .then((data) => setGroups(data));
  }, []);

  const createGroup = async () => {

    if (groupName.trim().length === 0) {
      alert("Group name cannot be empty");
      return;
    }
    const response = await fetch(
      `http://127.0.0.1:8000/groups?name=${groupName}&created_by=1`,
      {
        method: 'POST',
      }
    );

    const newGroup = await response.json();

    setGroups([...groups, newGroup]);
    setGroupName('');
  };

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end gap-4 mb-6">
          <button>Қазақша</button>
          <button>Русский</button>
          <button>English</button>
        </div>

        <h1 className="text-5xl font-bold mb-8">Bolu</h1>

        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-2xl font-semibold mb-4">Create Group</h2>
          <input
            className="border p-3 rounded w-full"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button
            onClick={createGroup}
            className="mt-3 bg-black text-white px-4 py-2 rounded"
          >
            Create Group
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-4">Your Groups</h2>

          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="border rounded p-4">
                {group.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}