'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type User = {
  id: number;
  name: string;
};

type Group = {
  id: number;
  name: string;
  created_by: number;
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

type ConfirmAction =
  | { type: 'delete-member'; userId: number; message: string }
  | { type: 'delete-expense'; expenseId: number; message: string }
  | { type: 'delete-group'; message: string }
  | { type: 'settle'; balance: Balance; message: string };

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);

  const [memberName, setMemberName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );

  const fetchGroup = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}`);
    const data = await res.json();
    setGroup(data);
  };

  const fetchMembers = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/members`);
    const data = await res.json();
    setMembers(data);
  };

  const fetchExpenses = async () => {
    const res = await fetch('http://127.0.0.1:8000/expenses');
    const data = await res.json();

    setExpenses(
      data.filter((expense: Expense) => expense.group_id === Number(groupId))
    );
  };

  const fetchBalances = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/balances`);
    const data = await res.json();
    setBalances(data);
  };

  const addMember = async () => {
    const cleanName = memberName.trim();

    if (cleanName.length === 0) {
      alert('Member name cannot be empty');
      return;
    }

    const userRes = await fetch(
      `http://127.0.0.1:8000/users?name=${cleanName}`,
      { method: 'POST' }
    );

    const newUser = await userRes.json();

    const memberRes = await fetch(
      `http://127.0.0.1:8000/groups/${groupId}/members/${newUser.id}`,
      { method: 'POST' }
    );

    const memberData = await memberRes.json();

    if (memberData.error) {
      alert(memberData.error);
      return;
    }

    setMemberName('');
    fetchMembers();
    fetchBalances();
  };

  const deleteMember = async (userId: number) => {
    const res = await fetch(
      `http://127.0.0.1:8000/groups/${groupId}/members/${userId}`,
      { method: 'DELETE' }
    );

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    fetchMembers();
    fetchExpenses();
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

  const deleteExpense = async (expenseId: number) => {
    await fetch(`http://127.0.0.1:8000/expenses/${expenseId}`, {
      method: 'DELETE',
    });

    setExpenses(expenses.filter((expense) => expense.id !== expenseId));
    fetchBalances();
  };

  const deleteGroup = async () => {
    await fetch(`http://127.0.0.1:8000/groups/${groupId}`, {
      method: 'DELETE',
    });

    router.push('/');
  };

  const settleBalance = async (balance: Balance) => {
    await fetch('http://127.0.0.1:8000/settlements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        group_id: Number(groupId),
        from_user: balance.from_user_id,
        to_user: balance.to_user_id,
        amount: balance.amount,
      }),
    });

    fetchBalances();
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'delete-member') {
      await deleteMember(confirmAction.userId);
    }

    if (confirmAction.type === 'delete-expense') {
      await deleteExpense(confirmAction.expenseId);
    }

    if (confirmAction.type === 'delete-group') {
      await deleteGroup();
    }

    if (confirmAction.type === 'settle') {
      await settleBalance(confirmAction.balance);
    }

    setConfirmAction(null);
  };

  useEffect(() => {
    fetchGroup();
    fetchMembers();
    fetchExpenses();
    fetchBalances();
  }, [groupId]);

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">
            {group ? group.name : `Group #${groupId}`}
          </h1>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Members */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">
              Members ({members.length})
            </h2>

            <div className="space-y-2 mb-4">
              {members.length === 0 && (
                <p className="text-gray-500">No members yet.</p>
              )}

              {members.map((member) => (
                <div
                  key={member.id}
                  className="border rounded-lg p-3 flex justify-between items-center"
                >
                  <span>{member.name}</span>

                  <button
                    onClick={() =>
                      setConfirmAction({
                        type: 'delete-member',
                        userId: member.id,
                        message: `Remove ${member.name} from this group?`,
                      })
                    }
                    className="text-red-600 hover:underline text-sm"
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

          {/* Add Expense */}
          <div className="bg-white p-6 rounded-xl shadow">
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

          {/* Expenses */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">
              Expenses ({expenses.length})
            </h2>

            <div className="space-y-3">
              {expenses.length === 0 && (
                <p className="text-gray-500">No expenses yet.</p>
              )}

              {expenses.map((expense) => {
                const payer = members.find((m) => m.id === expense.paid_by);

                return (
                  <div
                    key={expense.id}
                    className="border rounded-xl p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {expense.description}
                        </h3>

                        <p className="text-sm text-gray-600 mt-1">
                          Paid by:{' '}
                          <span className="font-medium text-black">
                            {payer ? payer.name : `User #${expense.paid_by}`}
                          </span>
                        </p>

                        <p className="text-sm text-gray-600">
                          Amount:{' '}
                          <span className="font-medium text-black">
                            {expense.amount.toLocaleString()} ₸
                          </span>
                        </p>

                        <p className="text-sm text-gray-600">
                          Split between: {members.length} members
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: 'delete-expense',
                            expenseId: expense.id,
                            message: `Delete expense "${expense.description}"?`,
                          })
                        }
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Balances */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Balances</h2>

            <div className="space-y-3">
              {balances.length === 0 && (
                <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  Everyone is settled up.
                </p>
              )}

              {balances.map((balance, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-4 bg-red-50 border-red-200"
                >
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="text-red-700 font-medium">
                        {balance.from_user_name} owes {balance.to_user_name}
                      </p>

                      <p className="text-2xl font-bold text-red-700">
                        {balance.amount.toLocaleString()} ₸
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: 'settle',
                          balance,
                          message: `Settle ${balance.amount.toLocaleString()} ₸ from ${balance.from_user_name} to ${balance.to_user_name}?`,
                        })
                      }
                      className="bg-black text-white px-4 py-2 rounded text-sm"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Delete group at bottom */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() =>
              setConfirmAction({
                type: 'delete-group',
                message:
                  'Delete this group? This action cannot be undone.',
              })
            }
            className="text-red-600 hover:underline text-sm"
          >
            Delete Group
          </button>
        </div>
      </div>

      {/* Custom confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">Are you sure?</h2>

            <p className="text-gray-600 mb-6">{confirmAction.message}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}