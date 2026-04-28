import FriendsClient from './FriendsClient';
import { Trans } from '@/components/language/Trans';

export default function FriendsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text"><Trans k="pages.friendsTitle" /></h1>
        <p className="text-muted text-sm mt-0.5">
          <Trans k="pages.friendsSubtitle" />
        </p>
      </div>

      <FriendsClient />
    </div>
  );
}
