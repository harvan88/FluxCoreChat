import { ActivityIndicator } from './ActivityIndicator';

type ActivityType = 'typing' | 'recording' | 'idle';

interface ParticipantsActivityBarProps {
  activities: Record<string, ActivityType>;
}

export const ParticipantsActivityBar = ({ activities }: ParticipantsActivityBarProps) => {
  const activeParticipants = Object.entries(activities)
    .filter(([_, activity]) => activity !== 'idle');

  console.log('[DEBUG] Participant activities:', {
    activities,
    activeParticipants
  });

  if (activeParticipants.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted text-sm text-muted-foreground border-t">
      {activeParticipants.map(([accountId, activity]) => (
        <div key={accountId} className="flex items-center">
          <span className="font-medium mr-1">{accountId}</span>
          <ActivityIndicator activity={activity} />
        </div>
      ))}
    </div>
  );
};
