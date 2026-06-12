import GroupNav from './GroupNav';
import { BackToGroupsLink } from './BackToGroupsLink';
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher';

type Props = {
  children: React.ReactNode;
};

export default function GroupLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <BackToGroupsLink />
          <LanguageSwitcher />
        </div>
        <GroupNav />
        {children}
      </div>
    </main>
  );
}
