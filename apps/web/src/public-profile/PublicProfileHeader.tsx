import { Avatar } from '../components/ui/Avatar';

interface PublicProfileHeaderProfile {
  id: string;
  displayName: string;
  alias: string;
  accountType: string;
  bio: string | null;
  avatarUrl: string | null;
  actorId?: string | null;
}

interface PublicProfileHeaderProps {
  profile: PublicProfileHeaderProfile;
  isConnected: boolean;
}

export function PublicProfileHeader({ profile, isConnected }: PublicProfileHeaderProps) {
  return (
    <div className="bg-surface border-b border-subtle px-6 py-5">
      <div className="flex items-center gap-4 max-w-2xl mx-auto">
        <Avatar
          src={profile.avatarUrl || undefined}
          name={profile.displayName}
          size="xl"
          status={isConnected ? 'online' : 'offline'}
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-primary truncate">
            {profile.displayName}
          </h1>
          <p className="text-sm text-muted truncate">@{profile.alias}</p>
          {profile.bio && (
            <p className="text-sm text-secondary mt-1 line-clamp-2">{profile.bio}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-muted'}`}
            />
            <span className="text-xs text-muted">
              {isConnected ? 'Disponible' : 'Conectando...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
