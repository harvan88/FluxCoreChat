/**
 * Context Bus — Shared state between agents in a flow execution.
 *
 * Immutable, append-only. Each agent writes its output keyed by step ID.
 * Subsequent agents read from the bus via template expressions.
 *
 * The bus also carries the original trigger data and global metadata.
 */

export interface ContextEntry {
  stepId: string;
  type: string;
  output: any;
  startedAt: number;
  completedAt: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
  error?: string;
}

export interface TriggerData {
  type: 'message_received' | 'manual' | 'scheduled' | 'webhook';
  content?: string;
  messageId?: string;
  conversationId?: string;
  senderAccountId?: string;
  recipientAccountId?: string;
  metadata?: Record<string, any>;
}

export class ContextBus {
  private entries: Map<string, ContextEntry> = new Map();
  private readonly trigger: TriggerData;
  private readonly globalMeta: Record<string, any>;

  constructor(trigger: TriggerData, globalMeta: Record<string, any> = {}) {
    this.trigger = Object.freeze({ ...trigger });
    this.globalMeta = Object.freeze({ ...globalMeta });
  }

  /**
   * Write a step's output to the bus. Throws if stepId already exists (immutable).
   */
  write(entry: ContextEntry): void {
    if (this.entries.has(entry.stepId)) {
      throw new Error(`[ContextBus] Step "${entry.stepId}" already has an entry. Context is append-only.`);
    }
    this.entries.set(entry.stepId, Object.freeze({ ...entry }));
  }

  /**
   * Read a step's output. Returns undefined if step hasn't run yet.
   */
  read(stepId: string): ContextEntry | undefined {
    return this.entries.get(stepId);
  }

  /**
   * Get the output value of a specific step.
   */
  getOutput(stepId: string): any {
    return this.entries.get(stepId)?.output;
  }

  /**
   * Get the trigger data.
   */
  getTrigger(): TriggerData {
    return this.trigger;
  }

  /**
   * Get global metadata.
   */
  getGlobalMeta(): Record<string, any> {
    return this.globalMeta;
  }

  /**
   * Check if a step has completed.
   */
  hasStep(stepId: string): boolean {
    return this.entries.has(stepId);
  }

  /**
   * Get all completed step IDs.
   */
  completedSteps(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Accumulated token usage across all steps.
   */
  totalTokenUsage(): { prompt: number; completion: number; total: number } {
    let prompt = 0, completion = 0, total = 0;
    for (const entry of this.entries.values()) {
      if (entry.tokenUsage) {
        prompt += entry.tokenUsage.prompt;
        completion += entry.tokenUsage.completion;
        total += entry.tokenUsage.total;
      }
    }
    return { prompt, completion, total };
  }

  /**
   * Total elapsed time across all steps (sum of individual durations).
   */
  totalElapsedMs(): number {
    let sum = 0;
    for (const entry of this.entries.values()) {
      sum += entry.completedAt - entry.startedAt;
    }
    return sum;
  }

  /**
   * Build a resolution context object for template expressions.
   * Shape: { trigger: TriggerData, context: globalMeta, [stepId]: stepOutput, ... }
   */
  toResolutionContext(): Record<string, any> {
    const ctx: Record<string, any> = {
      trigger: this.trigger,
      context: this.globalMeta,
    };
    for (const [stepId, entry] of this.entries) {
      ctx[stepId] = entry.output;
    }
    return ctx;
  }

  /**
   * Snapshot of all entries for trace/debug purposes.
   */
  snapshot(): { trigger: TriggerData; globalMeta: Record<string, any>; entries: ContextEntry[] } {
    return {
      trigger: this.trigger,
      globalMeta: this.globalMeta,
      entries: Array.from(this.entries.values()),
    };
  }
}
