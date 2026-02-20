/**
 * RuntimeGateway — FluxCore v8.2
 * 
 * Canon §4.2: Registry of sovereign runtimes.
 * 
 * Responsibilities:
 * 1. Register RuntimeAdapters at startup
 * 2. Route invocations to the correct runtime by ID
 * 3. Enforce timeout and error boundaries
 * 
 * This service does NOT decide WHICH runtime to call — that's the
 * CognitiveDispatcher's job using PolicyContext.
 */

import type { RuntimeAdapter, RuntimeInput, ExecutionAction } from '../../core/fluxcore-types';

class RuntimeGatewayService {
    private runtimes = new Map<string, RuntimeAdapter>();
    private readonly DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds

    /**
     * Register a runtime adapter. Called at system startup.
     */
    register(runtime: RuntimeAdapter): void {
        if (this.runtimes.has(runtime.runtimeId)) {
            console.warn(`[RuntimeGateway] ⚠️ Runtime "${runtime.runtimeId}" already registered, overwriting.`);
        }
        this.runtimes.set(runtime.runtimeId, runtime);
        console.log(`[RuntimeGateway] ✅ Registered runtime: ${runtime.displayName} (${runtime.runtimeId})`);
    }

    /**
     * List all registered runtime IDs.
     */
    listRegistered(): string[] {
        return Array.from(this.runtimes.keys());
    }

    /**
     * Invoke a runtime by ID with the given input.
     * 
     * Enforces timeout and catches runtime errors gracefully.
     */
    async invoke(runtimeId: string, input: RuntimeInput): Promise<ExecutionAction[]> {
        const runtime = this.runtimes.get(runtimeId);
        if (!runtime) {
            throw new Error(`Runtime "${runtimeId}" not found. Registered: [${this.listRegistered().join(', ')}]`);
        }

        const startTime = Date.now();
        console.log(`[RuntimeGateway] 🧠 Invoking runtime "${runtime.displayName}" for conversation ${input.policyContext.conversationId}`);

        try {
            // Race between runtime execution and timeout
            const actions = await Promise.race<ExecutionAction[]>([
                runtime.handleMessage(input),
                this.timeout(this.DEFAULT_TIMEOUT_MS, runtimeId),
            ]);

            const durationMs = Date.now() - startTime;
            console.log(`[RuntimeGateway] ✅ Runtime "${runtime.displayName}" completed in ${durationMs}ms, returned ${actions.length} action(s)`);

            return actions;
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            console.error(`[RuntimeGateway] ❌ Runtime "${runtime.displayName}" failed after ${durationMs}ms:`, error.message);

            return [{
                type: 'no_action',
                reason: `Runtime error: ${error.message}`,
            }];
        }
    }

    private timeout(ms: number, runtimeId: string): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Runtime "${runtimeId}" exceeded timeout of ${ms}ms`));
            }, ms);
        });
    }
}

export const runtimeGateway = new RuntimeGatewayService();
