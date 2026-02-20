import { coreEventBus } from '../events';
import { identityProjector } from '../../services/fluxcore/identity-projector.service';
import { chatProjector } from '../projections/chat-projector';
import { sessionProjector } from '../../services/session-projector.service';

/**
 * ProjectorRunner — RFC-0001 §7.2
 *
 * Orchestrates recovery and subscription of all projectors.
 * On startup: performs cold-start replay (catch up with Journal).
 * On wakeup: triggers all projectors to pull new signals.
 */
export function startProjectors() {
    console.log('[ProjectorRunner] Starting projectors (log-driven mode)');

    const projectors = [
        identityProjector,
        chatProjector,
        sessionProjector,
    ];

    // 1. Cold-start replay — process all pending signals since last cursor
    for (const p of projectors) {
        p.wakeUp();
    }

    // 2. Subscribe to heartbeat for ongoing operations
    coreEventBus.on('kernel:wakeup', () => {
        for (const p of projectors) {
            p.wakeUp();
        }
    });
}
