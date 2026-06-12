'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { FeedbackMessage, useFeedback } from '../../components/useFeedback';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import { apiUrl } from '../../lib/api';

type User = {
  id: number;
  name: string;
};

type Group = {
  id: number;
  name: string;
  created_by: number;
  categories_enabled: boolean;
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
  category: string;
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

type Settlement = {
  id: number;
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
type GroupSection =
  | 'overview'
  | 'expenses'
  | 'settlements'
  | 'members'
  | 'analytics'
  | 'settings';

type Props = {
  section: GroupSection;
};

const expenseCategories = [
  { value: 'Food', labelKey: 'food' },
  { value: 'Transport', labelKey: 'transport' },
  { value: 'Rent', labelKey: 'rent' },
  { value: 'Entertainment', labelKey: 'entertainment' },
  { value: 'Shopping', labelKey: 'shopping' },
  { value: 'Other', labelKey: 'other' },
] satisfies { value: string; labelKey: TranslationKey }[];

export default function GroupWorkspace({ section }: Props) {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [memberName, setMemberName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [category, setCategory] = useState('Other');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitValues, setSplitValues] = useState<Record<number, string>>({});
  // Expense editing
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editCategory, setEditCategory] = useState('Other');
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
  const [categoriesEnabled, setCategoriesEnabled] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [recordingSettlement, setRecordingSettlement] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const memberFeedback = useFeedback();
  const expenseFormFeedback = useFeedback();
  const expenseListFeedback = useFeedback();
  const settlementFeedback = useFeedback();
  const settingsFeedback = useFeedback();
  const pageFeedback = useFeedback();
  const showPageError = pageFeedback.showError;

  const splitTypeLabels: Record<SplitType, string> = {
    equal: t('equal'),
    percentage: t('percentage'),
    exact: t('exact'),
  };

  const getCategoryLabel = (value: string) =>
    t(
      expenseCategories.find((expenseCategory) => expenseCategory.value === value)
        ?.labelKey || 'other'
    );

  const formatMoney = (value: number) =>
    value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });

  const getMemberName = (userId: number) => {
    const member = members.find((currentMember) => currentMember.id === userId);
    return member ? member.name : `User #${userId}`;
  };

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalOutstanding = balances.reduce(
    (sum, balance) => sum + balance.amount,
    0
  );
  const totalSettled = settlements.reduce(
    (sum, settlement) => sum + settlement.amount,
    0
  );
  const recentExpenses = expenses.slice(-3).reverse();
  const recentSettlements = settlements.slice(0, 3);

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
    values: Record<number, string>,
    showError: (message: string) => void
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
      showError(t('percentagesMustAddTo100'));
      return false;
    }

    if (
      currentSplitType === 'exact' &&
      Math.round(total * 100) / 100 !==
        Math.round(Number(currentAmount) * 100) / 100
    ) {
      showError(t('exactSplitMustMatchAmount'));
      return false;
    }

    return true;
  };

  // Fetch members of current group
  const fetchMembers = async () => {
    const res = await fetch(apiUrl(`/groups/${groupId}/members`));
    const data = await res.json();
    setMembers(data);
  };

  // Fetch expenses and filter by current group
  const fetchExpenses = async () => {
    const res = await fetch(apiUrl('/expenses'));
    const data = await res.json();

    setExpenses(
      data.filter((expense: Expense) => expense.group_id === Number(groupId))
    );
  };

  // Fetch balances from backend
  const fetchBalances = async () => {
    const res = await fetch(apiUrl(`/groups/${groupId}/balances`));
    const data = await res.json();
    setBalances(data);
  };

  // Fetch settlement history for current group
  const fetchSettlements = async () => {
    const res = await fetch(
      apiUrl(`/groups/${groupId}/settlements`)
    );
    const data = await res.json();
    setSettlements(data);
  };

  // Add new member
  const addMember = async () => {
    const cleanName = memberName.trim();

    if (cleanName.length === 0) {
      memberFeedback.showError(t('memberNameCannotBeEmpty'));
      return;
    }

    setAddingMember(true);

    try {
      const userRes = await fetch(
        apiUrl(`/users?name=${encodeURIComponent(cleanName)}`),
        { method: 'POST' }
      );

      const newUser = await userRes.json();

      const memberRes = await fetch(
        apiUrl(`/groups/${groupId}/members/${newUser.id}`),
        { method: 'POST' }
      );

      const memberData = await memberRes.json();

      if (memberData.error || memberData.detail) {
        memberFeedback.showError(memberData.error || memberData.detail);
        return;
      }

      setMemberName('');
      memberFeedback.showSuccess(t('memberAdded'));
      fetchMembers();
      fetchBalances();
    } catch {
      memberFeedback.showError(t('apiRequestFailed'));
    } finally {
      setAddingMember(false);
    }
  };

  // Delete member
  const deleteMember = async (userId: number) => {
    try {
      const res = await fetch(
        apiUrl(`/groups/${groupId}/members/${userId}`),
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (data.error || data.detail) {
        memberFeedback.showError(data.error || data.detail);
        return;
      }

      memberFeedback.showSuccess(t('memberRemoved'));
      fetchMembers();
      fetchExpenses();
      fetchBalances();
    } catch {
      memberFeedback.showError(t('apiRequestFailed'));
    }
  };

  // Add expense
  const addExpense = async () => {
    if (description.trim().length === 0) {
      expenseFormFeedback.showError(t('descriptionCannotBeEmpty'));
      return;
    }

    if (!amount || Number(amount) <= 0) {
      expenseFormFeedback.showError(t('amountMustBeGreaterThanZero'));
      return;
    }

    if (!paidBy) {
      expenseFormFeedback.showError(t('pleaseSelectWhoPaid'));
      return;
    }

    if (members.length === 0) {
      expenseFormFeedback.showError(t('addMembersFirst'));
      return;
    }

    if (
      !validateSplit(
        amount,
        splitType,
        splitValues,
        expenseFormFeedback.showError
      )
    ) {
      return;
    }

    setAddingExpense(true);

    try {
      const response = await fetch(apiUrl('/expenses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: Number(groupId),
          paid_by: Number(paidBy),
          amount: Number(amount),
          description,
          category,
          split_type: splitType,
          participants: buildParticipantsPayload(splitType, splitValues),
        }),
      });

      const newExpense = await response.json();

      if (newExpense.detail || newExpense.error) {
        expenseFormFeedback.showError(newExpense.detail || newExpense.error);
        return;
      }

      setExpenses([...expenses, newExpense]);
      setDescription('');
      setAmount('');
      setPaidBy('');
      setCategory('Other');
      setSplitType('equal');
      resetSplitValues();
      expenseFormFeedback.showSuccess(t('expenseSaved'));
      fetchBalances();
    } catch {
      expenseFormFeedback.showError(t('apiRequestFailed'));
    } finally {
      setAddingExpense(false);
    }
  };

  // Delete expense
  const deleteExpense = async (expenseId: number) => {
    try {
      await fetch(apiUrl(`/expenses/${expenseId}`), {
        method: 'DELETE',
      });

      setExpenses(expenses.filter((expense) => expense.id !== expenseId));
      expenseListFeedback.showSuccess(t('expenseDeleted'));
      fetchBalances();
    } catch {
      expenseListFeedback.showError(t('apiRequestFailed'));
    }
  };

  const startEditingExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toString());
    setEditPaidBy(expense.paid_by.toString());
    setEditCategory(expense.category || 'Other');
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
      expenseListFeedback.showError(t('descriptionCannotBeEmpty'));
      return;
    }

    if (!editAmount || Number(editAmount) <= 0) {
      expenseListFeedback.showError(t('amountMustBeGreaterThanZero'));
      return;
    }

    if (!editPaidBy) {
      expenseListFeedback.showError(t('pleaseSelectWhoPaid'));
      return;
    }

    if (
      !validateSplit(
        editAmount,
        editSplitType,
        editSplitValues,
        expenseListFeedback.showError
      )
    ) {
      return;
    }

    setSavingExpense(true);

    try {
      const response = await fetch(
        apiUrl(`/expenses/${editingExpenseId}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: editDescription,
            amount: Number(editAmount),
            paid_by: Number(editPaidBy),
            category: editCategory,
            split_type: editSplitType,
            participants: buildParticipantsPayload(
              editSplitType,
              editSplitValues
            ),
          }),
        }
      );

      const updatedExpense = await response.json();

      if (updatedExpense.detail || updatedExpense.error) {
        expenseListFeedback.showError(
          updatedExpense.detail || updatedExpense.error
        );
        return;
      }

      setEditingExpenseId(null);
      resetEditSplitValues();
      expenseListFeedback.showSuccess(t('expenseUpdated'));

      fetchExpenses();
      fetchBalances();
    } catch {
      expenseListFeedback.showError(t('apiRequestFailed'));
    } finally {
      setSavingExpense(false);
    }
  };

  // Delete group and return home
  const deleteGroup = async () => {
    try {
      await fetch(apiUrl(`/groups/${groupId}`), {
        method: 'DELETE',
      });

      router.push('/');
    } catch {
      settingsFeedback.showError(t('apiRequestFailed'));
    }
  };

  const saveGroupSettings = async () => {
    setSavingSettings(true);

    try {
      const response = await fetch(
        apiUrl(`/groups/${groupId}/settings`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categories_enabled: categoriesEnabled,
          }),
        }
      );

      const updatedGroup = await response.json();

      if (updatedGroup.error || updatedGroup.detail) {
        settingsFeedback.showError(updatedGroup.error || updatedGroup.detail);
        return;
      }

      setGroup(updatedGroup);
      setCategoriesEnabled(updatedGroup.categories_enabled);
      settingsFeedback.showSuccess(t('settingsSaved'));
    } catch {
      settingsFeedback.showError(t('apiRequestFailed'));
    } finally {
      setSavingSettings(false);
    }
  };

  // Settle debt
  const openSettlementModal = (balance: Balance) => {
    settlementFeedback.clearFeedback();
    setSettlementBalance(balance);
    setSettlementMode('full');
    setPartialSettlementAmount('');
  };

  const closeSettlementModal = () => {
    settlementFeedback.clearFeedback();
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
      settlementFeedback.showError(t('amountMustBeGreaterThanZero'));
      return;
    }

    if (settlementAmount > settlementBalance.amount) {
      settlementFeedback.showError(t('partialAmountTooHigh'));
      return;
    }

    setRecordingSettlement(true);

    try {
      const response = await fetch(apiUrl('/settlements'), {
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
        settlementFeedback.showError(
          settlementData.detail || settlementData.error
        );
        return;
      }

      closeSettlementModal();
      settlementFeedback.showSuccess(t('settlementRecorded'));
      fetchBalances();
      fetchSettlements();
    } catch {
      settlementFeedback.showError(t('apiRequestFailed'));
    } finally {
      setRecordingSettlement(false);
    }
  };

  // Run selected confirmation action
  const handleConfirm = async () => {
    if (!confirmAction) return;

    setConfirmingAction(true);

    try {
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
    } finally {
      setConfirmingAction(false);
    }
  };

  // Load data when page opens
  useEffect(() => {
    const loadGroupPage = async () => {
      try {
        const [groupRes, membersRes, expensesRes, balancesRes, settlementsRes] =
          await Promise.all([
            fetch(apiUrl(`/groups/${groupId}`)),
            fetch(apiUrl(`/groups/${groupId}/members`)),
            fetch(apiUrl('/expenses')),
            fetch(apiUrl(`/groups/${groupId}/balances`)),
            fetch(apiUrl(`/groups/${groupId}/settlements`)),
          ]);

        const [
          groupData,
          membersData,
          expensesData,
          balancesData,
          settlementsData,
        ] = await Promise.all([
          groupRes.json(),
          membersRes.json(),
          expensesRes.json(),
          balancesRes.json(),
          settlementsRes.json(),
        ]);

        setGroup(groupData);
        setCategoriesEnabled(Boolean(groupData.categories_enabled));
        setMembers(membersData);
        setExpenses(
          expensesData.filter(
            (expense: Expense) => expense.group_id === Number(groupId)
          )
        );
        setBalances(balancesData);
        setSettlements(settlementsData);
      } catch {
        showPageError(t('unableToLoadGroup'));
      }
    };

    loadGroupPage();
  }, [groupId, showPageError, t]);

  return (
    <>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">
            {group ? group.name : `Group #${groupId}`}
          </h1>
          <div className="mt-4">
            <FeedbackMessage feedback={pageFeedback.feedback} />
          </div>
        </div>

        {section === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow">
                <p className="text-sm text-gray-500">{t('totalSpent')}</p>
                <p className="text-3xl font-bold mt-2">
                  {formatMoney(totalSpent)} ₸
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow">
                <p className="text-sm text-gray-500">{t('outstanding')}</p>
                <p className="text-3xl font-bold mt-2">
                  {formatMoney(totalOutstanding)} ₸
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow">
                <p className="text-sm text-gray-500">{t('settled')}</p>
                <p className="text-3xl font-bold mt-2">
                  {formatMoney(totalSettled)} ₸
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white p-6 rounded-2xl shadow">
                <h2 className="text-2xl font-semibold mb-4">{t('balances')}</h2>

                <div className="space-y-4">
                  {balances.length === 0 && (
                    <p className="text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
                      {t('everyoneSettled')}
                    </p>
                  )}

                  {balances.slice(0, 3).map((balance, index) => (
                    <div
                      key={index}
                      className="border border-red-200 rounded-2xl p-5 bg-red-50"
                    >
                      <p className="text-red-700 font-medium">
                        {balance.from_user_name} {t('owes')}{' '}
                        {balance.to_user_name}
                      </p>

                      <p className="text-2xl font-bold text-red-700">
                        {formatMoney(balance.amount)} ₸
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-6 rounded-2xl shadow">
                <h2 className="text-2xl font-semibold mb-4">
                  {t('recentExpenses')}
                </h2>

                <div className="space-y-4">
                  {recentExpenses.length === 0 && (
                    <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      {t('noExpensesYet')}
                    </p>
                  )}

                  {recentExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border rounded-2xl p-5 bg-gray-50"
                    >
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatMoney(expense.amount)} ₸
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-6 rounded-2xl shadow">
                <h2 className="text-2xl font-semibold mb-4">
                  {t('recentSettlements')}
                </h2>

                <div className="space-y-4">
                  {recentSettlements.length === 0 && (
                    <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      {t('noSettlementsYet')}
                    </p>
                  )}

                  {recentSettlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="border rounded-2xl p-5 bg-gray-50"
                    >
                      <p className="font-medium">
                        {settlement.from_user_name ||
                          getMemberName(settlement.from_user_id)}{' '}
                        {t('paid')}{' '}
                        {settlement.to_user_name ||
                          getMemberName(settlement.to_user_id)}
                      </p>

                      <p className="text-2xl font-bold mt-2">
                        {formatMoney(settlement.amount)} ₸
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {section === 'members' && (
          <section className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-2xl font-semibold mb-4">
              {t('members')} ({members.length})
            </h2>

            <div className="space-y-3 mb-5">
              {members.length === 0 && (
                <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  {t('noMembersYet')}
                </p>
              )}

              {members.map((member) => (
                <div
                  key={member.id}
                  className="border rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{member.name}</span>

                  <button
                    onClick={() =>
                      setConfirmAction({
                        type: 'delete-member',
                        userId: member.id,
                        message:
                          `${t('removeMemberConfirmationPrefix')} ${member.name} ${t('removeMemberConfirmationSuffix')}`.trim(),
                      })
                    }
                    className="text-red-600 hover:underline text-sm"
                  >
                    {t('delete')}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="border p-3 rounded-xl w-full"
                placeholder={t('memberName')}
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />

              <button
                onClick={addMember}
                disabled={addingMember}
                className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {addingMember ? t('adding') : t('add')}
              </button>
            </div>

            <div className="mt-4">
              <FeedbackMessage feedback={memberFeedback.feedback} />
            </div>
          </section>
        )}

        {section === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-2xl font-semibold mb-4">
                {t('addExpense')}
              </h2>

              <input
                className="border p-3 rounded-xl w-full mb-3"
                placeholder={t('descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <input
                className="border p-3 rounded-xl w-full mb-3"
                placeholder={t('amount')}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <select
                className="border p-3 rounded-xl w-full mb-3"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                <option value="">{t('whoPaid')}</option>

                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>

              {group?.categories_enabled && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">
                    {t('category')}
                  </label>
                  <select
                    className="border p-3 rounded-xl w-full"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {expenseCategories.map((expenseCategory) => (
                      <option
                        key={expenseCategory.value}
                        value={expenseCategory.value}
                      >
                        {t(expenseCategory.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">
                  {t('splitType')}
                </label>
                <select
                  className="border p-3 rounded-xl w-full"
                  value={splitType}
                  onChange={(e) => {
                    setSplitType(e.target.value as SplitType);
                    resetSplitValues();
                  }}
                >
                  <option value="equal">{t('equalSplit')}</option>
                  <option value="percentage">{t('percentageSplit')}</option>
                  <option value="exact">{t('exactSplit')}</option>
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
                        placeholder={
                          splitType === 'exact' ? t('amount') : t('percentage')
                        }
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
                disabled={addingExpense}
                className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {addingExpense ? t('adding') : t('addExpense')}
              </button>

              <div className="mt-4">
                <FeedbackMessage feedback={expenseFormFeedback.feedback} />
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-2xl font-semibold mb-4">
                {t('expenses')} ({expenses.length})
              </h2>

              <div className="mb-4">
                <FeedbackMessage feedback={expenseListFeedback.feedback} />
              </div>

              <div className="space-y-4">
                {expenses.length === 0 && (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    {t('noExpensesYet')}
                  </p>
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
                            placeholder={t('descriptionPlaceholder')}
                            value={editDescription}
                            onChange={(e) =>
                              setEditDescription(e.target.value)
                            }
                          />

                          <input
                            className="border p-3 rounded-xl w-full bg-white"
                            placeholder={t('amount')}
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                          />

                          <select
                            className="border p-3 rounded-xl w-full bg-white"
                            value={editPaidBy}
                            onChange={(e) => setEditPaidBy(e.target.value)}
                          >
                            <option value="">{t('whoPaid')}</option>

                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>

                          {group?.categories_enabled && (
                            <select
                              className="border p-3 rounded-xl w-full bg-white"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                            >
                              {expenseCategories.map((expenseCategory) => (
                                <option
                                  key={expenseCategory.value}
                                  value={expenseCategory.value}
                                >
                                  {t(expenseCategory.labelKey)}
                                </option>
                              ))}
                            </select>
                          )}

                          <select
                            className="border p-3 rounded-xl w-full bg-white"
                            value={editSplitType}
                            onChange={(e) => {
                              setEditSplitType(e.target.value as SplitType);
                              resetEditSplitValues();
                            }}
                          >
                            <option value="equal">{t('equalSplit')}</option>
                            <option value="percentage">
                              {t('percentageSplit')}
                            </option>
                            <option value="exact">{t('exactSplit')}</option>
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
                                        ? t('amount')
                                        : t('percentage')
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
                              disabled={savingExpense}
                              className="border px-4 py-2 rounded-xl hover:bg-gray-100 text-sm"
                            >
                              {t('cancel')}
                            </button>

                            <button
                              onClick={saveExpenseEdit}
                              disabled={savingExpense}
                              className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 text-sm disabled:cursor-not-allowed disabled:bg-gray-400"
                            >
                              {savingExpense ? t('saving') : t('save')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {expense.description}
                            </h3>

                            <div className="mt-3 space-y-1 text-sm text-gray-600">
                              <p>
                                {t('total')}:{' '}
                                <span className="font-medium text-black">
                                  {formatMoney(expense.amount)} ₸
                                </span>
                              </p>

                              <p>
                                {t('paidBy')}:{' '}
                                <span className="font-medium text-black">
                                  {payer
                                    ? payer.name
                                    : `User #${expense.paid_by}`}
                                  </span>
                              </p>

                              {group?.categories_enabled && (
                                <p>
                                  {t('category')}:{' '}
                                  <span className="font-medium text-black">
                                    {getCategoryLabel(expense.category)}
                                  </span>
                                </p>
                              )}
                            </div>

                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-900">
                                {t('shares')}:
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

                          <div className="flex shrink-0 flex-wrap items-center gap-4 pt-1 sm:gap-5">
                            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                              {splitTypeLabels[expense.split_type || 'equal']}
                            </span>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => startEditingExpense(expense)}
                                disabled={confirmingAction}
                                className="text-blue-600 hover:underline text-sm leading-none"
                              >
                                {t('edit')}
                              </button>

                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    type: 'delete-expense',
                                    expenseId: expense.id,
                                    message: `${t('delete')} "${expense.description}"?`,
                                  })
                                }
                                disabled={confirmingAction}
                                className="text-red-600 hover:underline text-sm leading-none"
                              >
                                {t('delete')}
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
          </div>
        )}

        {section === 'settlements' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-2xl font-semibold mb-4">{t('balances')}</h2>

              <div className="mb-4">
                <FeedbackMessage feedback={settlementFeedback.feedback} />
              </div>

              <div className="space-y-4">
                {balances.length === 0 && (
                  <p className="text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
                    {t('everyoneSettled')}
                  </p>
                )}

                {balances.map((balance, index) => (
                  <div
                    key={index}
                    className="border border-red-200 rounded-2xl p-5 bg-red-50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-red-700 font-medium">
                          {balance.from_user_name} {t('owes')}{' '}
                          {balance.to_user_name}
                        </p>

                        <p className="text-2xl font-bold text-red-700">
                          {formatMoney(balance.amount)} ₸
                        </p>
                      </div>

                      <button
                        onClick={() => openSettlementModal(balance)}
                        disabled={recordingSettlement}
                        className="bg-black text-white px-5 py-2 rounded-xl text-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {t('settle')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-2xl font-semibold mb-4">
                {t('settlementHistory')}
              </h2>

              <div className="space-y-4">
                {settlements.length === 0 && (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    {t('noSettlementsYet')}
                  </p>
                )}

                {settlements.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="border rounded-2xl p-5 bg-gray-50"
                  >
                    <p className="font-medium">
                      {settlement.from_user_name ||
                        getMemberName(settlement.from_user_id)}{' '}
                      {t('paid')}{' '}
                      {settlement.to_user_name ||
                        getMemberName(settlement.to_user_id)}
                    </p>

                    <p className="text-2xl font-bold mt-2">
                      {formatMoney(settlement.amount)} ₸
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {section === 'analytics' && (
          <div className="space-y-4">
            {expenses.length === 0 && settlements.length === 0 && (
              <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow">
                {t('noAnalyticsYet')}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow">
                <p className="text-sm text-gray-500">{t('totalSpent')}</p>
                <p className="text-3xl font-bold mt-2">
                  {formatMoney(totalSpent)} ₸
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow">
                <p className="text-sm text-gray-500">{t('expenses')}</p>
                <p className="text-3xl font-bold mt-2">{expenses.length}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow">
                <p className="text-sm text-gray-500">{t('settled')}</p>
                <p className="text-3xl font-bold mt-2">
                  {formatMoney(totalSettled)} ₸
                </p>
              </div>
            </div>
          </div>
        )}

        {section === 'settings' && (
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-2xl font-semibold mb-2">
                {t('expenseCategories')}
              </h2>
              <p className="text-gray-600 mb-5">
                {t('expenseCategoriesDescription')}
              </p>

              <label className="flex items-center gap-3 mb-5">
                <input
                  type="checkbox"
                  checked={categoriesEnabled}
                  onChange={(e) => setCategoriesEnabled(e.target.checked)}
                />
                <span className="font-medium">
                  {t('enableCategories')}
                </span>
              </label>

              <div className="flex items-center gap-4">
                <button
                  onClick={saveGroupSettings}
                  disabled={savingSettings}
                  className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {savingSettings ? t('saving') : t('saveSettings')}
                </button>
              </div>

              <div className="mt-4">
                <FeedbackMessage feedback={settingsFeedback.feedback} />
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-2xl font-semibold mb-2">
                {t('groupSettings')}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('manageGroupActions')}
              </p>

              <button
                onClick={() =>
                  setConfirmAction({
                    type: 'delete-group',
                    message: t('deleteGroupConfirmation'),
                  })
                }
                disabled={confirmingAction}
                className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {confirmingAction ? t('deleting') : t('deleteGroup')}
              </button>
            </section>
          </div>
        )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">{t('areYouSure')}</h2>

            <p className="text-gray-600 mb-6">{confirmAction.message}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={confirmingAction}
                className="border px-5 py-2 rounded-xl hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                {t('cancel')}
              </button>

              <button
                onClick={handleConfirm}
                disabled={confirmingAction}
                className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {confirmingAction ? t('deleting') : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {settlementBalance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">{t('settleBalance')}</h2>

            <p className="text-gray-600 mb-1">
              {settlementBalance.from_user_name} {t('owes')}{' '}
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
                <span className="font-medium">{t('fullAmount')}</span>
              </label>

              <label className="flex items-center gap-3 border rounded-xl p-3 cursor-pointer">
                <input
                  type="radio"
                  name="settlementMode"
                  value="partial"
                  checked={settlementMode === 'partial'}
                  onChange={() => setSettlementMode('partial')}
                />
                <span className="font-medium">{t('partialAmount')}</span>
              </label>
            </div>

            {settlementMode === 'partial' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  {t('amountToSettle')}
                </label>

                <input
                  className="border p-3 rounded-xl w-full"
                  type="number"
                  min="0"
                  max={settlementBalance.amount}
                  placeholder={t('amountToSettle')}
                  value={partialSettlementAmount}
                  onChange={(e) => setPartialSettlementAmount(e.target.value)}
                />
              </div>
            )}

            <div className="mb-4">
              <FeedbackMessage feedback={settlementFeedback.feedback} />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeSettlementModal}
                disabled={recordingSettlement}
                className="border px-5 py-2 rounded-xl hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                {t('cancel')}
              </button>

              <button
                onClick={settleBalance}
                disabled={recordingSettlement}
                className="bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {recordingSettlement ? t('recording') : t('confirmSettlement')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
