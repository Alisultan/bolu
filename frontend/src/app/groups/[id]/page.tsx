type Props = {
  params: Promise<{ id: string }>;
};

export default async function GroupPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Group #{id}</h1>

        <div className="bg-white p-6 rounded-xl shadow">
          <p>This page will show members, expenses, and balances.</p>
        </div>
      </div>
    </main>
  );
}