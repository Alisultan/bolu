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

type SplitType = 'equal' | 'percentage' | 'exact';

type ExpenseParticipant = {
  user_id: number;
  user_name?: string;
  share_amount: number;
};

type Expense = {
  id: number;
  group_id: number;
  paid_by: number;
  amount: number;
  description: string;
  split_type: SplitType;
  participants: ExpenseParticipant[];
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
  | { type: 'delete-group'; message: string };

type SettlementMode = 'full' | 'partial';

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
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitValues, setSplitValues] = useState<Record<number, string>>({});
  // Expense editing
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editSplitType, setEditSplitType] = useState<SplitType>('equal');
  const [editSplitValues, setEditSplitValues] = useState<
    Record<number, string>
  >({});

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );
  const [settlementBalance, setSettlementBalance] = useState<Balance | null>(
    null
  );
  const [settlementMode, setSettlementMode] =
    useState<SettlementMode>('full');
  const [partialSettlementAmount, setPartialSettlementAmount] = useState('');

  const splitTypeLabels: Record<SplitType, string> = {
    equal: 'Equal',
    percentage: 'Percentage',
    exact: 'Exact',
  };

  const formatMoney = (value: number) =>
    value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });

  const getMemberName = (userId: number) => {
    const member = members.find((currentMember) => currentMember.id === userId);
    return member ? member.name : `User #${userId}`;
  };

  const resetSplitValues = () => {
    setSplitValues({});
  };

  const resetEditSplitValues = () => {
    setEditSplitValues({});
  };

  const buildParticipantsPayload = (
    currentSplitType: SplitType,
    values: Record<number, string>
  ) => {
    if (currentSplitType === 'equal') {
      return members.map((member) => member.id);
    }

    return members.map((member) => ({
      user_id: member.id,
      ...(currentSplitType === 'exact'
        ? { amount: Number(values[member.id] || 0) }
        : { percentage: Number(values[member.id] || 0) }),
    }));
  };

  const validateSplit = (
    currentAmount: string,
    currentSplitType: SplitType,
    values: Record<number, string>
  ) => {
    if (currentSplitType === 'equal') return true;

    const total = members.reduce(
      (sum, member) => sum + Number(values[member.id] || 0),
      0
    );

    if (
      currentSplitType === 'percentage' &&
      Math.round(total * 100) / 100 !== 100
    ) {
      alert('Percentages must add up to 100');
      return false;
    }

    if (
      currentSplitType === 'exact' &&
      Math.round(total * 100) / 100 !==
        Math.round(Number(currentAmount) * 100) / 100
    ) {
      alert('Exact split amounts must add up to the expense amount');
      return false;
    }

    return true;
  };

  // Fetch members of current group
  const fetchMembers = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/members`);
    const data = await res.json();
    setMembers(data);
  };

  // Fetch expenses and filter by current group
  const fetchExpenses = async () => {
    const res = await fetch('http://127.0.0.1:8000/expenses');
    const data = await res.json();

    setExpenses(
      data.filter((expense: Expense) => expense.group_id === Number(groupId))
    );
  };

  // Fetch balances from backend
  const fetchBalances = async () => {
    const res = await fetch(`http://127.0.0.1:8000/groups/${groupId}/balances`);
    const data = await res.json();
    setBalances(data);
  };

  // Add new member
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

  // Delete member
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

  // Add expense
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

    if (!validateSplit(amount, splitType, splitValues)) {
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
        split_type: splitType,
        participants: buildParticipantsPayload(splitType, splitValues),
      }),
    });

    const newExpense = await response.json();

    if (newExpense.detail || newExpense.error) {
      alert(newExpense.detail || newExpense.error);
      return;
    }

    setExpenses([...expenses, newExpense]);
    setDescription('');
    setAmount('');
    setPaidBy('');
    setSplitType('equal');
    resetSplitValues();
    fetchBalances();
  };

  // Delete expense
  const deleteExpense = async (expenseId: number) => {
    await fetch(`http://127.0.0.1:8000/expenses/${expenseId}`, {
      method: 'DELETE',
    });

    setExpenses(expenses.filter((expense) => expense.id !== expenseId));
    fetchBalances();
  };

  const startEditingExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toString());
    setEditPaidBy(expense.paid_by.toString());
    setEditSplitType(expense.split_type || 'equal');
    setEditSplitValues(
      expense.participants.reduce<Record<number, string>>(
        (values, participant) => {
          values[participant.user_id] =
            expense.split_type === 'percentage'
              ? ((participant.share_amount / expense.amount) * 100).toFixed(2)
              : participant.share_amount.toString();
          return values;
        },
        {}
      )
    );
  };

  const cancelExpenseEdit = () => {
    setEditingExpenseId(null);
    resetEditSplitValues();
  };

  const saveExpenseEdit = async () => {
    if (editingExpenseId === null) return;

    if (editDescription.trim().length === 0) {
      alert('Description cannot be empty');
      return;
    }

    if (!editAmount || Number(editAmount) <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    if (!editPaidBy) {
      alert('Please select who paid');
      return;
    }

    if (!validateSplit(editAmount, editSplitType, editSplitValues)) {
      return;
    }

    const response = await fetch(
      `http://127.0.0.1:8000/expenses/${editingExpenseId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: editDescription,
          amount: Number(editAmount),
          paid_by: Number(editPaidBy),
          split_type: editSplitType,
          participants: buildParticipantsPayload(editSplitType, editSplitValues),
        }),
      }
    );

    const updatedExpense = await response.json();

    if (updatedExpense.detail || updatedExpense.error) {
      alert(updatedExpense.detail || updatedExpense.error);
      return;
    }

    setEditingExpenseId(null);
    resetEditSplitValues();

    fetchExpenses();
    fetchBalances();
  };

  // Delete group and return home
  const deleteGroup = async () => {
    await fetch(`http://127.0.0.1:8000/groups/${groupId}`, {
      method: 'DELETE',
    });

    router.push('/');
  };

  // Settle debt
  const openSettlementModal = (balance: Balance) => {
    setSettlementBalance(balance);
    setSettlementMode('full');
    setPartialSettlementAmount('');
  };

  const closeSettlementModal = () => {
    setSettlementBalance(null);
    setSettlementMode('full');
    setPartialSettlementAmount('');
  };

  const settleBalance = async () => {
    if (!settlementBalance) return;

    const settlementAmount =
      settlementMode === 'full'
        ? settlementBalance.amount
        : Number(partialSettlementAmount);

    if (settlementAmount <= 0) {
      alert('Amount to settle must be greater than 0');
      return;
    }

    if (settlementAmount > settlementBalance.amount) {
      alert('Partial amount cannot be greater than the total balance');
      return;
    }

    const response = await fetch('http://127.0.0.1:8000/settlements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        group_id: Number(groupId),
        from_user: settlementBalance.from_user_id,
        to_user: settlementBalance.to_user_id,
        amount: settlementAmount,
      }),
    });

    const settlementData = await response.json();

    if (settlementData.detail || settlementData.error) {
      alert(settlementData.detail || settlementData.error);
      return;
    }

    closeSettlementModal();
    fetchBalances();
  };

  // Run selected confirmation action
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

    setConfirmAction(null);
  };

  // Load data when page opens
  useEffect(() => {
    const loadGroupPage = async () => {
      const [groupRes, membersRes, expensesRes, balancesRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/groups/${groupId}`),
        fetch(`http://127.0.0.1:8000/groups/${groupId}/members`),
        fetch('http://127.0.0.1:8000/expenses'),
        fetch(`http://127.0.0.1:8000/groups/${groupId}/balances`),
      ]);

      const [groupData, membersData, expensesData, balancesData] =
        await Promise.all([
          groupRes.json(),
          membersRes.json(),
          expensesRes.json(),
          balancesRes.json(),
        ]);

      setGroup(groupData);
      setMembers(membersData);
      setExpenses(
        expensesData.filter(
          (expense: Expense) => expense.group_id === Number(groupId)
        )
      );
      setBalances(balancesData);
    };

    loadGroupPage();
  }, [groupId]);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">
            {group ? group.name : `Group #${groupId}`}
          </h1>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Members */}
          <section className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-2xl font-semibold mb-4">
              Members ({members.length})
            </h2>

            <div className="space-y-3 mb-5">
              {members.length === 0 && (
                <p className="text-gray-500">No members yet.</p>
              )}

              {members.map((member) => (
                <div
                  key={member.id}
                  className="border rounded-xl p-4 flex justify-between items-center"
                >
                  <span className="font-medium">{member.name}</span>

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
                className="border p-3 rounded-xl w-full"
                placeholder="Member name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />

              <button
                onClick={addMember}
                className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800"
              >
                Add
              </button>
            </div>
          </section>

          {/* Add Expense */}
          <section className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Add Expense</h2>

            <input
              className="border p-3 rounded-xl w-full mb-3"
              placeholder="Description, e.g. Dinner"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              className="border p-3 rounded-xl w-full mb-3"
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <select
              className="border p-3 rounded-xl w-full mb-3"
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

            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">Split type</label>
              <select
                className="border p-3 rounded-xl w-full"
                value={splitType}
                onChange={(e) => {
                  setSplitType(e.target.value as SplitType);
                  resetSplitValues();
                }}
              >
                <option value="equal">Equal split</option>
                <option value="percentage">Percentage split</option>
                <option value="exact">Exact split</option>
              </select>
            </div>

            {splitType !== 'equal' && (
              <div className="border rounded-xl p-4 mb-3 bg-gray-50 space-y-3">
                {members.map((member) => (
                  <div key={member.id}>
                    <label className="block text-sm font-medium mb-1">
                      {member.name}
                    </label>
                    <input
                      className="border p-3 rounded-xl w-full bg-white"
                      placeholder={splitType === 'exact' ? 'Amount' : 'Percentage'}
                      type="number"
                      value={splitValues[member.id] || ''}
                      onChange={(e) =>
                        setSplitValues({
                          ...splitValues,
                          [member.id]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addExpense}
              className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800"
            >
              Add Expense
            </button>
          </section>

          {/* Expenses */}
          <section className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-2xl font-semibold mb-4">
              Expenses ({expenses.length})
            </h2>

            <div className="space-y-4">
              {expenses.length === 0 && (
                <p className="text-gray-500">No expenses yet.</p>
              )}

              {expenses.map((expense) => {
                const payer = members.find((m) => m.id === expense.paid_by);
                const isEditing = editingExpenseId === expense.id;

                return (
                  <div
                    key={expense.id}
                    className="border rounded-2xl px-5 pt-4 pb-5 bg-gray-50"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          className="border p-3 rounded-xl w-full bg-white"
                          placeholder="Description"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />

                        <input
                          className="border p-3 rounded-xl w-full bg-white"
                          placeholder="Amount"
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />

                        <select
                          className="border p-3 rounded-xl w-full bg-white"
                          value={editPaidBy}
                          onChange={(e) => setEditPaidBy(e.target.value)}
                        >
                          <option value="">Who paid?</option>

                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>

                        <select
                          className="border p-3 rounded-xl w-full bg-white"
                          value={editSplitType}
                          onChange={(e) => {
                            setEditSplitType(e.target.value as SplitType);
                            resetEditSplitValues();
                          }}
                        >
                          <option value="equal">Equal split</option>
                          <option value="percentage">Percentage split</option>
                          <option value="exact">Exact split</option>
                        </select>

                        {editSplitType !== 'equal' && (
                          <div className="border rounded-xl p-4 bg-white space-y-3">
                            {members.map((member) => (
                              <div key={member.id}>
                                <label className="block text-sm font-medium mb-1">
                                  {member.name}
                                </label>
                                <input
                                  className="border p-3 rounded-xl w-full"
                                  placeholder={
                                    editSplitType === 'exact'
                                      ? 'Amount'
                                      : 'Percentage'
                                  }
                                  type="number"
                                  value={editSplitValues[member.id] || ''}
                                  onChange={(e) =>
                                    setEditSplitValues({
                                      ...editSplitValues,
                                      [member.id]: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end gap-3">
                          <button
                            onClick={cancelExpenseEdit}
                            className="border px-4 py-2 rounded-xl hover:bg-gray-100 text-sm"
                          >
                            Cancel
                          </button>

                          <button
                            onClick={saveExpenseEdit}
                            className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 text-sm"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {expense.description}
                          </h3>

                          <div className="mt-3 space-y-1 text-sm text-gray-600">
                            <p>
                              Total:{' '}
                              <span className="font-medium text-black">
                                {formatMoney(expense.amount)} ₸
                              </span>
                            </p>

                            <p>
                              Paid by:{' '}
                              <span className="font-medium text-black">
                                {payer ? payer.name : `User #${expense.paid_by}`}
                              </span>
                            </p>
                          </div>

                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-900">
                              Shares:
                            </p>

                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              {expense.participants.map((participant) => (
                                <p key={participant.user_id}>
                                  {participant.user_name ||
                                    getMemberName(participant.user_id)}{' '}
                                  -{' '}
                                  <span className="font-medium text-black">
                                    {formatMoney(participant.share_amount)} ₸
                                  </span>
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-5 pt-1">
                          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                            {splitTypeLabels[expense.split_type || 'equal']}
                          </span>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => startEditingExpense(expense)}
                              className="text-blue-600 hover:underline text-sm leading-none"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                setConfirmAction({
                                  type: 'delete-expense',
                                  expenseId: expense.id,
                                  message: `Delete expense "${expense.description}"?`,
                                })
                              }
                              className="text-red-600 hover:underline text-sm leading-none"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Balances */}
          <section className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Balances</h2>

            <div className="space-y-4">
              {balances.length === 0 && (
                <p className="text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
                  Everyone is settled up.
                </p>
              )}

              {balances.map((balance, index) => (
                <div
                  key={index}
                  className="border border-red-200 rounded-2xl p-5 bg-red-50"
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
                      onClick={() => openSettlementModal(balance)}
                      className="bg-black text-white px-5 py-2 rounded-xl text-sm hover:bg-gray-800"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Delete group */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() =>
              setConfirmAction({
                type: 'delete-group',
                message: 'Delete this group? This action cannot be undone.',
              })
            }
            className="text-red-600 hover:underline text-sm"
          >
            Delete Group
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">Are you sure?</h2>

            <p className="text-gray-600 mb-6">{confirmAction.message}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="border px-5 py-2 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {settlementBalance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">Settle balance</h2>

            <p className="text-gray-600 mb-1">
              {settlementBalance.from_user_name} owes{' '}
              {settlementBalance.to_user_name}
            </p>

            <p className="text-2xl font-bold mb-6">
              {formatMoney(settlementBalance.amount)} ₸
            </p>

            <div className="space-y-3 mb-5">
              <label className="flex items-center gap-3 border rounded-xl p-3 cursor-pointer">
                <input
                  type="radio"
                  name="settlementMode"
                  value="full"
                  checked={settlementMode === 'full'}
                  onChange={() => setSettlementMode('full')}
                />
                <span className="font-medium">Full amount</span>
              </label>

              <label className="flex items-center gap-3 border rounded-xl p-3 cursor-pointer">
                <input
                  type="radio"
                  name="settlementMode"
                  value="partial"
                  checked={settlementMode === 'partial'}
                  onChange={() => setSettlementMode('partial')}
                />
                <span className="font-medium">Partial amount</span>
              </label>
            </div>

            {settlementMode === 'partial' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Amount to settle
                </label>

                <input
                  className="border p-3 rounded-xl w-full"
                  type="number"
                  min="0"
                  max={settlementBalance.amount}
                  placeholder="Amount to settle"
                  value={partialSettlementAmount}
                  onChange={(e) => setPartialSettlementAmount(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeSettlementModal}
                className="border px-5 py-2 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={settleBalance}
                className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800"
              >
                Confirm settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
