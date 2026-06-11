"use client";

const members = ["Alissultan", "Dias", "Amir"];

const expenses = [
  {
    id: 1,
    title: "Dinner",
    amount: 12000,
    paidBy: "Alissultan",
  },
  {
    id: 2,
    title: "Taxi",
    amount: 4500,
    paidBy: "Dias",
  },
];

const balances = [
  "Dias owes Alissultan 2500 ₸",
  "Amir owes Alissultan 4000 ₸",
];

type Props = {
  groupId: string;
};

export default function GroupClient({ groupId }: Props) {
  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Group #{groupId}</h1>
        <p className="text-gray-600 mb-8">
          Manage members, expenses, and balances.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">Members</h2>

            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member}
                  className="border rounded-lg px-4 py-2 bg-gray-50"
                >
                  {member}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">Expenses</h2>

            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="border rounded-lg px-4 py-3 bg-gray-50"
                >
                  <p className="font-medium">{expense.title}</p>
                  <p className="text-sm text-gray-600">
                    {expense.amount.toLocaleString()} ₸ paid by {expense.paidBy}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">Balances</h2>

            <div className="space-y-3">
              {balances.map((balance) => (
                <div
                  key={balance}
                  className="border rounded-lg px-4 py-2 bg-gray-50 text-sm"
                >
                  {balance}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}