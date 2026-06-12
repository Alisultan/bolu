'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Types for data coming from backend
type User = {
  id: number;
  name: string;
};

type Expense = {
  id: number;
  group_id: number;
  paid_by: number;
  amount: number;
  description: string;
};

type Balance = {
  from_user_id: number;
  from_user_name: string;
  to_user_id: number;
  to_user_name: string;
  amount: number;
};

type Group = {
  id: number;
  name: string;
  created_by: number;
};

export default function GroupPage() {
  // Get group id from URL: /groups/[id]
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);

  // Backend data states
  const [members, setMembers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);

  // Form input states
  const [memberName, setMemberName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');

  // Load members of this group
  const fetchMembers = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/members`);
    const data = await res.json();

    setMembers(data);
  };

  // Load all expenses, then keep only expenses for this group
  const fetchExpenses = async () => {
    const res = await fetch('http://127.0.0.1:8000/expenses');
    const data = await res.json();

    setExpenses(
      data.filter((expense: Expense) => expense.group_id === Number(groupId))
    );
  };

  // Load calculated balances for this group
  const fetchBalances = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/balances`);
    const data = await res.json();

    setBalances(data);
  };

  // Add a new member to the current group
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

  // Remove a member from the current group
  const deleteMember = async (userId: number) => {
    await fetch(`http://127.0.0.1:8000/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });

    fetchMembers();
    fetchExpenses();
    fetchBalances();
  };

  const deleteGroup = async () => {
    await fetch(`http://127.0.0.1:8000/groups/${groupId}`, {
        method: 'DELETE',
    });

    router.push('/');
  };

  // Add a new expense to the current group
  const addExpense = async () => {
    if (description.trim().length === 0) {
      alert('Description cannot be empty');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    if (!paidBy) {
      alert('Please select who paid');
      return;
    }

    if (members.length === 0) {
      alert('Add members first');
      return;
    }

    const response = await fetch('http://127.0.0.1:8000/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        group_id: Number(groupId),
        paid_by: Number(paidBy),
        amount: Number(amount),
        description,
        participants: members.map((member) => member.id),
      }),
    });

    const newExpense = await response.json();

    setExpenses([...expenses, newExpense]);
    setDescription('');
    setAmount('');
    setPaidBy('');

    fetchBalances();
  };

  // Delete an expense from the current group
  const deleteExpense = async (expenseId: number) => {
    await fetch(`http://127.0.0.1:8000/expenses/${expenseId}`, {
      method: 'DELETE',
    });

    setExpenses(expenses.filter((expense) => expense.id !== expenseId));
    fetchBalances();
  };


  const fetchGroup = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}`);
    const data = await res.json();

    setGroup(data);
};

  // Load group data when page opens or groupId changes
  useEffect(() => {
    fetchGroup();
    fetchMembers();
    fetchExpenses();
    fetchBalances();
  }, [groupId]);

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
            {group ? group.name : `Group #${groupId}`}
        </h1>

        <button
        onClick={() => {
            const confirmed = confirm(
            'Are you sure you want to delete this group? This action cannot be undone.'
            );

            if (!confirmed) return;

            deleteGroup();
        }}
        className="text-red-600 hover:underline mb-6"
        >
        Delete Group
        </button>

        {/* Members section */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            Members ({members.length})
          </h2>

          <div className="space-y-2 mb-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <span>{member.name}</span>

                <button
                  onClick={() => {
                    const confirmed = confirm(
                      'Are you sure you want to remove this member from the group?'
                    );

                    if (!confirmed) return;

                    deleteMember(member.id);
                  }}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
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

        {/* Add expense section */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-2xl font-semibold mb-4">Add Expense</h2>

          <input
            className="border p-3 rounded w-full mb-3"
            placeholder="Description, e.g. Dinner"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            className="border p-3 rounded w-full mb-3"
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <select
            className="border p-3 rounded w-full mb-3"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            <option value="">Who paid?</option>

            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          <button
            onClick={addExpense}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Add Expense
          </button>
        </div>

        {/* Expenses section */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            Expenses ({expenses.length})
          </h2>

          <div className="space-y-2">
            {expenses.length === 0 && (
              <p className="text-gray-500">No expenses yet.</p>
            )}

            {expenses.map((expense) => {
              const payer = members.find((m) => m.id === expense.paid_by);

              return (
                <div
                  key={expense.id}
                  className="border rounded p-3 flex justify-between items-center"
                >
                  <div>
                    {expense.description} —{' '}
                    {expense.amount.toLocaleString()} ₸ paid by{' '}
                    {payer ? payer.name : `User #${expense.paid_by}`}
                  </div>

                  <button
                    onClick={() => {
                      const confirmed = confirm(
                        'Are you sure you want to delete this expense?'
                      );

                      if (!confirmed) return;

                      deleteExpense(expense.id);
                    }}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Balances section */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-semibold mb-4">Balances</h2>

          <div className="space-y-2">
            {balances.length === 0 && (
              <p className="text-gray-500">No balances yet.</p>
            )}

            {balances.map((balance, index) => (
              <div key={index} className="border rounded p-3">
                {balance.from_user_name} owes {balance.to_user_name}{' '}
                {balance.amount.toLocaleString()} ₸
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}