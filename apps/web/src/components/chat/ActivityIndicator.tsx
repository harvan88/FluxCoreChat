import { Mic } from 'lucide-react';

type ActivityType = 'typing' | 'recording' | 'idle';

interface ActivityIndicatorProps {
  activity: ActivityType;
}

export const ActivityIndicator = ({ activity }: ActivityIndicatorProps) => {
  if (activity === 'idle') return null;

  return (
    <div className="flex items-center gap-1 text-muted-foreground text-xs">
      {activity === 'typing' && (
        <>
          <span className="animate-typing-pulse">•</span>
          <span className="animate-typing-pulse delay-150">•</span>
          <span className="animate-typing-pulse delay-300">•</span>
          <span className="ml-1">Escribiendo...</span>
        </>
      )}
      
      {activity === 'recording' && (
        <>
          <Mic size={14} className="animate-recording-pulse" />
          <span className="ml-1">Grabando...</span>
        </>
      )}
    </div>
  );
};
