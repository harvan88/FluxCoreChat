import { useWebSocket } from '../../hooks/useWebSocket';

export function ActivityTest() {
  const { status } = useWebSocket({
    onActivityState: (event) => {
      console.log('[TEST] Activity event received:', event);
    }
  });

  return (
    <div style={{ position: 'fixed', top: 10, right: 10, background: 'white', padding: 10, zIndex: 1000 }}>
      WebSocket Status: {status}
    </div>
  );
}
