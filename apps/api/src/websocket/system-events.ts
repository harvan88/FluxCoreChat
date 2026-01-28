import { broadcastAll } from './ws-handler';

export function broadcastSystemEvent(payload: Record<string, unknown>) {
  broadcastAll(payload);
}
