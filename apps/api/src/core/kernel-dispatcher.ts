import { db, fluxcoreOutbox, eq, asc } from '@fluxcore/db';
import { coreEventBus } from './events';

/**
 * KernelDispatcher — RFC-0001
 *
 * THE SYSTEM HEARTBEAT
 *
 * Polls the Transactional Outbox for unprocessed entries.
 * Marks them as processed.
 * Emits a single 'kernel:wakeup' interrupt.
 *
 * The Dispatcher does NOT carry data. It only wakes projectors up.
 * Projectors pull directly from the Journal by sequence_number.
 */
export class KernelDispatcher {
    private isRunning = false;
    private pollInterval = 1000; // 1 second

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[KernelDispatcher] Started (wake-up only)');
        this.poll();
    }

    private async poll() {
        while (this.isRunning) {
            try {
                const pending = await db.query.fluxcoreOutbox.findMany({
                    where: eq(fluxcoreOutbox.status, 'pending'),
                    orderBy: [asc(fluxcoreOutbox.id)],
                    limit: 50
                });

                if (pending.length > 0) {
                    // Mark as processed first (at-least-once delivery)
                    for (const record of pending) {
                        await db.update(fluxcoreOutbox)
                            .set({ status: 'sent', sentAt: new Date() })
                            .where(eq(fluxcoreOutbox.id, record.id));
                    }

                    // Emit ONE wakeup for the whole batch
                    coreEventBus.emit('kernel:wakeup');
                }
            } catch (error) {
                console.error('[KernelDispatcher] Outbox poll failure:', error);
            }

            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
    }

    stop() {
        this.isRunning = false;
    }
}

export const kernelDispatcher = new KernelDispatcher();
