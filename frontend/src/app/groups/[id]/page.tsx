'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type User = {
  id: number;
  name: string;
};

type Balance = {
  from_user_id: number;
  from_user_name: string;
  to_user_id: number;
  to_user_name: string;
  amount: number;
};

export default function GroupPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<User[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [memberName, setMemberName] = useState('');

  const fetchMembers = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/members`);
    const data = await res.json();
    setMembers(data);
  };

  const fetchBalances = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/balances`);
    const data = await res.json();
    setBalances(data);
  };

  const addMember = async () => {
    if (memberName.trim().length === 0) {
      alert('Member name cannot be empty');
      return;
    }

    const userRes = await fetch(
      `http://127.0.0.1:8000/users?name=${memberName}`,
      { method: 'POST' }
    );

    const newUser = await userRes.json();

    await fetch(
      `http://127.0.0.1:8000/groups/${groupId}/members/${newUser.id}`,
      { method: 'POST' }
    );

    setMemberName('');
    fetchMembers();
    fetchBalances();
  };

  useEffect(() => {
    fetchMembers();
    fetchBalances();
  }, [groupId]);

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Group #{groupId}</h1>

        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-2xl font-semibold mb-4">Members</h2>

          <div className="space-y-2 mb-4">
            {members.map((member) => (
              <div key={member.id} className="border rounded p-3">
                {member.name}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              className="border p-3 rounded w-full"
              placeholder="Member name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
            />

            <button
              onClick={addMember}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Add
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-4">Balances</h2>

          <div className="space-y-2">
            {balances.length === 0 && (
              <p className="text-gray-500">No balances yet.</p>
            )}

            {balances.map((balance, index) => (
              <div key={index} className="border rounded p-3">
                {balance.from_user_name} owes {balance.to_user_name}{' '}
                {balance.amount} ₸
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}