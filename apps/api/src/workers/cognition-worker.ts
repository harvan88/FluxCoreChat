/**
 * CognitionWorker — FluxCore v8.2
 * 
 * Canon §4.5: The Turn-Window Clock
 * 
 * THE HEARTBEAT OF FLUXCORE.
 * 
 * This worker polls `fluxcore_cognition_queue` for turns whose
 * window has expired (the user stopped typing/sending).
 * When a turn is ready, it locks it (FOR UPDATE SKIP LOCKED)
 * and delegates to the CognitiveDispatcher.
 * 
 * Processing Flow:
 * 1. Find entries WHERE processed_at IS NULL AND turn_window_expires_at < NOW()
 * 2. Lock with FOR UPDATE SKIP LOCKED (safe for concurrent workers)
 * 3. Delegate to CognitiveDispatcher.dispatch()
 * 4. Mark processed_at on success
 * 5. Log errors and increment attempts on failure
 * 6. Back off exponentially on repeated failures
 * 
 * SmartDelay v8.2:
 * - Each new message EXTENDS the turn window (ChatProjector does this)
 * - Each typing signal ALSO extends the window (ChatProjector.projectStateChange)
 * - This worker only fires when SILENCE is detected
 * - Result: the AI waits for the complete human thought before responding
 */

import { db, fluxcoreCognitionQueue } from '@fluxcore/db';
import { sql, eq } from 'drizzle-orm';
import { cognitiveDispatcher } from '../services/fluxcore/cognitive-dispatcher.service';
import { coreEventBus } from '../core/events';

const MAX_ATTEMPTS = 3;            // Max retries before giving up
const BACKOFF_BASE_MS = 2000;      // Base backoff between retries
const SAFEGUARD_INTERVAL_MS = 30000; // Backup poll interval (30s)

class CognitionWorkerService {
    private running = false;
    private isProcessing = false;
    private safeguardInterval: NodeJS.Timeout | null = null;
    private wakeupHandler: (() => void) | null = null;

    /**
     * Start the worker loop.
     * Called once at system startup.
     */
    start(): void {
        if (this.running) {
            console.warn('[CognitionWorker] Already running');
            return;
        }

        this.running = true;
        console.log('[CognitionWorker] 🧠 Started — event-driven + 30s safeguard poll');

        this.wakeupHandler = () => {
            this.processReadyTurns().catch((err) => {
                console.error('[CognitionWorker] Error en wakeup handler:', err);
            });
        };

        coreEventBus.on('kernel:cognition:wakeup', this.wakeupHandler);

        this.safeguardInterval = setInterval(() => {
            this.processReadyTurns().catch(() => {});
        }, SAFEGUARD_INTERVAL_MS);
    }

    /**
     * Gracefully stop the worker.
     */
    stop(): void {
        if (!this.running) return;
        this.running = false;

        if (this.safeguardInterval) {
            clearInterval(this.safeguardInterval);
            this.safeguardInterval = null;
        }

        if (this.wakeupHandler) {
            coreEventBus.off('kernel:cognition:wakeup', this.wakeupHandler);
            this.wakeupHandler = null;
        }

        console.log('[CognitionWorker] 🛑 Stopped');
    }

    /**
     * Process ready turns (idempotent).
     */
    private async processReadyTurns(): Promise<void> {
        if (!this.running || this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        // Use raw SQL for FOR UPDATE SKIP LOCKED — Drizzle doesn't support this natively
        try {
            const readyEntries = await db.execute(sql`
                SELECT id, conversation_id, account_id, target_account_id, last_signal_seq, attempts
                FROM fluxcore_cognition_queue
                WHERE processed_at IS NULL
                  AND turn_window_expires_at < NOW()
                  AND attempts < ${MAX_ATTEMPTS}
                ORDER BY turn_window_expires_at ASC
                LIMIT 5
                FOR UPDATE SKIP LOCKED
            `);

            const rows = (readyEntries as any).rows ?? readyEntries;

            if (!rows || rows.length === 0) {
                return;
            }

            console.log(`[CognitionWorker] � Found ${rows.length} ready turn(s)`);

            // Process each turn sequentially (within this worker instance)
            for (const row of rows) {
                await this.processTurn(row);
            }
        } catch (error: any) {
            console.error('[CognitionWorker] ❌ Turn processing error:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single turn from the cognition queue.
     */
    private async processTurn(entry: {
        id: number | string;
        conversation_id: string;
        account_id: string;
        target_account_id?: string | null;
        last_signal_seq: number | null;
        attempts: number;
    }): Promise<void> {
        const entryId = Number(entry.id);

        console.log(`[FluxPipeline] 🔄 TURN  conv=${entry.conversation_id.slice(0,7)} account=${entry.account_id.slice(0,7)} attempt=${entry.attempts + 1}/${MAX_ATTEMPTS}`);

        try {
            // 1. Increment attempt counter
            await db.update(fluxcoreCognitionQueue)
                .set({ attempts: entry.attempts + 1 })
                .where(eq(fluxcoreCognitionQueue.id, entryId));

            // 2. Delegate to CognitiveDispatcher
            // account_id = quien RESPONDE (Patricia)
            // target_account_id = a quien responder (Harold) — solo para routing posterior
            const result = await cognitiveDispatcher.dispatch({
                turnId: entryId,
                conversationId: entry.conversation_id,
                accountId: entry.account_id,
                targetAccountId: entry.target_account_id,
                lastSignalSeq: entry.last_signal_seq,
            });

            if (result.success) {
                // 3. Success logged by Dispatcher/Executor. 
                //    ActionExecutor is now responsible for marking processedAt.
                console.log(`[CognitionWorker] ✅ Turn delegation complete: conversation ${entry.conversation_id}, runtime=${result.runtimeUsed}`);
            } else {
                // 3b. Log error and Handle Backoff (PRINCIPLE: Resilience)
                const errorMsg = result.error || 'Unknown dispatch error';
                const isConfigError = errorMsg.includes('not found') ||
                    errorMsg.includes('not registered');

                // If it's a missing runtime, we don't burn an execution "attempt", 
                // but we wait longer (backing off) to allow the system to recover or deploy.
                const nextRetryMs = isConfigError ? 60000 : 5000;
                const incrementalAttempt = isConfigError ? 0 : 1;

                await db.update(fluxcoreCognitionQueue)
                    .set({
                        attempts: entry.attempts + incrementalAttempt,
                        lastError: errorMsg,
                        turnWindowExpiresAt: new Date(Date.now() + nextRetryMs),
                    })
                    .where(eq(fluxcoreCognitionQueue.id, entryId));

                const status = isConfigError ? 'BACKOFF' : 'RETRY';
                console.warn(`[CognitionWorker] ⚠️ Turn ${status}: ${errorMsg}. Next try in ${nextRetryMs / 1000}s`);
            }

        } catch (error: any) {
            // Catastrophic failure — log and move on
            console.error(`[CognitionWorker] ❌ Catastrophic failure for conversation ${entry.conversation_id}:`, error.message);

            await db.update(fluxcoreCognitionQueue)
                .set({
                    lastError: error.message,
                    turnWindowExpiresAt: new Date(Date.now() + BACKOFF_BASE_MS * Math.pow(2, entry.attempts)),
                })
                .where(eq(fluxcoreCognitionQueue.id, entryId))
                .catch(() => { }); // Don't let meta-error crash the worker
        }
    }
}

export const cognitionWorker = new CognitionWorkerService();
