import { db, fluxcoreSignals, fluxcoreProjectorCursors, fluxcoreProjectorErrors, eq, gt, asc, sql, and } from '@fluxcore/db';

/**
 * BaseProjector — RFC-0001 §5.9, §5.11
 *
 * THE CLOSURE CONTRACT
 *
 * Every projector in FluxCore must extend this.
 * It ensures that the system is log-driven, not event-driven.
 *
 * Canon Invariants enforced here:
 *   1. Cursor advances ONLY inside the same transaction as the projection write.
 *   2. A failed signal is recorded in fluxcore_projector_errors (attempts++).
 *   3. The loop STOPS on the first failure — the signal will be retried on the
 *      next wakeUp. The system is blocked-but-consistent, never silently wrong.
 *   4. Full replay is possible by resetting cursors.
 *   5. Duplicate wake-ups are harmless (isProcessing guard).
 */
export abstract class BaseProjector {

    protected abstract projectorName: string;

    /**
     * The business logic of the projection.
     * Receives a raw Journal row and a transaction instance.
     * Must be idempotent.
     */
    protected abstract project(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void>;

    private isProcessing = false;

    /**
     * Wakes up the projector to process all pending signals in the Journal.
     *
     * On success: cursor advances atomically with the projection (same tx).
     * On failure: error is recorded in fluxcore_projector_errors, loop stops.
     *             The cursor does NOT advance. Next wakeUp retries from same signal.
     */
    async wakeUp(): Promise<void> {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            const cursor = await this.getCursor();

            const batch = await db.query.fluxcoreSignals.findMany({
                where: gt(fluxcoreSignals.sequenceNumber, cursor),
                orderBy: [asc(fluxcoreSignals.sequenceNumber)],
                limit: 100,
            });

            if (batch.length === 0) {
                return;
            }

            console.log(`[BaseProjector:${this.projectorName}] Processing batch of ${batch.length} signals (Cursor: ${cursor})`);

            for (const signal of batch) {
                try {
                    // Canon Invariant: cursor update and projection write are atomic.
                    await db.transaction(async (tx) => {
                        await this.project(signal, tx);
                        await this.updateCursor(signal.sequenceNumber, tx);
                    });

                    // Resolve any prior error for this signal (it succeeded on retry)
                    await db
                        .update(fluxcoreProjectorErrors)
                        .set({ resolvedAt: new Date() })
                        .where(
                            and(
                                eq(fluxcoreProjectorErrors.projectorName, this.projectorName),
                                eq(fluxcoreProjectorErrors.signalSeq, signal.sequenceNumber),
                            )
                        );

                } catch (signalError) {
                    const errMsg = signalError instanceof Error ? signalError.message : String(signalError);
                    const errStack = signalError instanceof Error ? signalError.stack : undefined;

                    console.error(
                        `[BaseProjector:${this.projectorName}] ⛔ Signal #${signal.sequenceNumber} failed — cursor held, loop stopped. Will retry on next wakeUp.`,
                        signalError,
                    );

                    // Record / increment attempts. Cursor does NOT advance.
                    await db
                        .insert(fluxcoreProjectorErrors)
                        .values({
                            projectorName: this.projectorName,
                            signalSeq: signal.sequenceNumber,
                            errorMessage: errMsg,
                            errorStack: errStack,
                        })
                        .onConflictDoUpdate({
                            target: [
                                fluxcoreProjectorErrors.projectorName,
                                fluxcoreProjectorErrors.signalSeq,
                            ],
                            set: {
                                attempts: sql`${fluxcoreProjectorErrors.attempts} + 1`,
                                lastFailedAt: new Date(),
                                errorMessage: errMsg,
                                errorStack: errStack,
                            },
                        });

                    // Stop processing — the next wakeUp will retry from this signal.
                    return;
                }
            }

            // If batch was full, there may be more signals — trigger another pass.
            if (batch.length === 100) {
                // Schedule non-blocking continuation so we don't block the event loop
                setImmediate(() => this.wakeUp());
            }

        } catch (error) {
            console.error(`[BaseProjector:${this.projectorName}] ❌ CRITICAL PROJECTION FAILURE:`, error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async getCursor(): Promise<number> {
        const existing = await db.query.fluxcoreProjectorCursors.findFirst({
            where: eq(fluxcoreProjectorCursors.projectorName, this.projectorName),
        });

        if (!existing) {
            await db.insert(fluxcoreProjectorCursors).values({
                projectorName: this.projectorName,
                lastSequenceNumber: 0,
            });
            return 0;
        }

        return existing.lastSequenceNumber;
    }

    private async updateCursor(sequence: number, tx?: any): Promise<void> {
        const client = tx || db;
        await client
            .update(fluxcoreProjectorCursors)
            .set({ lastSequenceNumber: sequence })
            .where(eq(fluxcoreProjectorCursors.projectorName, this.projectorName));
    }
}
