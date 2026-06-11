'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

export default function GroupPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);

  const [memberName, setMemberName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const fetchMembers = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/members`);
    const data = await res.json();
    setMembers(data);
  };

  const fetchExpenses = async () => {
    const res = await fetch('http://127.0.0.1:8000/expenses');
    const data = await res.json();
    setExpenses(data.filter((expense: Expense) => expense.group_id === Number(groupId)));
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

  const deleteExpense = async (expenseId: number) => {
    await fetch(`http://127.0.0.1:8000/expenses/${expenseId}`, {
        method: 'DELETE',
    });

    setExpenses(expenses.filter((expense) => expense.id !== expenseId));
    fetchBalances();
};

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

  useEffect(() => {
    fetchMembers();
    fetchExpenses();
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

        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-2xl font-semibold mb-4">Expenses</h2>

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
                    {expense.description} — {expense.amount.toLocaleString()} ₸ paid by{' '}
                    {payer ? payer.name : `User #${expense.paid_by}`}
                </div>

                <button
                onClick={() => {
                    const confirmed = confirm(
                    'Are you sure you want to delete this expense?'
                    );

                    if (!confirmed) {
                    return;
                    }
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