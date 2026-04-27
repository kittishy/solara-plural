import FriendsClient from './FriendsClient';

export default function FriendsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Friends</h1>
        <p className="text-muted text-sm mt-0.5">
          Connect systems and singlets in a warm, consent-first way.
        </p>
      </div>

      <FriendsClient />
    </div>
  );
}
