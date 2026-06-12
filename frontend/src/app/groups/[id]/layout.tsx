import GroupNav from './GroupNav';

type Props = {
  children: React.ReactNode;
};

export default function GroupLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <GroupNav />
        {children}
      </div>
    </main>
  );
}
