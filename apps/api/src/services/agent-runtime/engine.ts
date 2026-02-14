/**
 * Agent Runtime Engine — Executes an AgentFlow (graph walker).
 *
 * Walks the flow graph step by step:
 *  1. Resolves step order from flow definition (entry point → sequential or branching)
 *  2. For each step: evaluates condition → executes agent type → writes to context bus
 *  3. Enforces scopes at every step boundary
 *  4. Produces a full execution trace for observability
 *
 * Supports:
 *  - Sequential execution (steps run in order)
 *  - Conditional steps (skipped if condition evaluates to false)
 *  - Router-based branching (router step selects next branch)
 *  - Error handling (step errors are captured, flow can continue or abort)
 */

import type { AgentFlow, AgentFlowStep, AgentScopes } from '@fluxcore/db';
import { ContextBus, type TriggerData } from './context-bus';
import { ScopeEnforcer } from './scope-enforcer';
import { getExecutor, type ExecutorDependencies, type StepResult } from './agent-types';
import { evaluateCondition } from './condition-evaluator';

// ─── Execution Result ───────────────────────────────────────────────────────

export interface StepTrace {
  stepId: string;
  type: string;
  status: 'completed' | 'skipped' | 'error' | 'scope_violation';
  startedAt: number;
  completedAt: number;
  durationMs: number;
  output?: any;
  error?: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
  meta?: Record<string, any>;
}

export interface FlowExecutionResult {
  success: boolean;
  agentId?: string;
  flowName?: string;
  /** Final output — from the last completed step */
  output: any;
  /** All step traces in execution order */
  steps: StepTrace[];
  /** Total token usage across all steps */
  totalTokenUsage: { prompt: number; completion: number; total: number };
  /** Total wall-clock time */
  totalDurationMs: number;
  /** Error message if the flow failed */
  error?: string;
  /** Context bus snapshot for debugging */
  contextSnapshot?: any;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export interface EngineOptions {
  agentId?: string;
  flowName?: string;
  /** If true, abort the flow on the first step error. Default: true */
  abortOnError?: boolean;
  /** Maximum number of steps to execute (safety limit). Default: 50 */
  maxSteps?: number;
}

export async function executeFlow(
  flow: AgentFlow,
  scopes: AgentScopes,
  trigger: TriggerData,
  deps: ExecutorDependencies,
  options: EngineOptions = {},
): Promise<FlowExecutionResult> {
  const abortOnError = options.abortOnError !== false;
  const maxSteps = options.maxSteps || 50;
  const engineStartedAt = Date.now();

  const bus = new ContextBus(trigger, {
    accountId: deps.accountId,
    agentId: options.agentId,
  });
  const enforcer = new ScopeEnforcer(scopes);

  const stepTraces: StepTrace[] = [];
  let lastOutput: any = null;
  let flowError: string | undefined;

  // Build step lookup
  const stepMap = new Map<string, AgentFlowStep>();
  for (const step of flow.steps) {
    stepMap.set(step.id, step);
  }

  if (flow.steps.length === 0) {
    return {
      success: true,
      agentId: options.agentId,
      flowName: options.flowName,
      output: null,
      steps: [],
      totalTokenUsage: { prompt: 0, completion: 0, total: 0 },
      totalDurationMs: Date.now() - engineStartedAt,
    };
  }

  // Determine execution order
  const executionQueue = buildExecutionQueue(flow, stepMap);
  let stepsExecuted = 0;

  for (const stepId of executionQueue) {
    if (stepsExecuted >= maxSteps) {
      flowError = `Max steps limit reached (${maxSteps})`;
      break;
    }

    const step = stepMap.get(stepId);
    if (!step) {
      stepTraces.push({
        stepId,
        type: 'unknown',
        status: 'error',
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        error: `Step "${stepId}" not found in flow definition`,
      });
      if (abortOnError) { flowError = `Step "${stepId}" not found`; break; }
      continue;
    }

    // Pre-step scope check (time)
    const timeViolation = enforcer.checkTime();
    if (timeViolation) {
      stepTraces.push({
        stepId: step.id,
        type: step.type,
        status: 'scope_violation',
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        error: timeViolation.message,
      });
      flowError = timeViolation.message;
      break;
    }

    // Evaluate condition (if present)
    if (step.condition) {
      const ctx = bus.toResolutionContext();
      const conditionMet = evaluateCondition(step.condition, ctx);
      if (!conditionMet) {
        stepTraces.push({
          stepId: step.id,
          type: step.type,
          status: 'skipped',
          startedAt: Date.now(),
          completedAt: Date.now(),
          durationMs: 0,
          meta: { condition: step.condition, result: false },
        });
        continue;
      }
    }

    // Execute step
    const executor = getExecutor(step.type);
    if (!executor) {
      const err = `No executor registered for type "${step.type}"`;
      stepTraces.push({
        stepId: step.id,
        type: step.type,
        status: 'error',
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        error: err,
      });
      if (abortOnError) { flowError = err; break; }
      continue;
    }

    const stepStartedAt = Date.now();
    let result: StepResult;

    try {
      result = await executor.execute(step, bus, enforcer, deps);
    } catch (e: any) {
      result = { output: null, error: e?.message || 'Executor threw an exception' };
    }

    const stepCompletedAt = Date.now();
    const durationMs = stepCompletedAt - stepStartedAt;

    // Write to context bus
    bus.write({
      stepId: step.id,
      type: step.type,
      output: result.output,
      startedAt: stepStartedAt,
      completedAt: stepCompletedAt,
      tokenUsage: result.tokenUsage,
      error: result.error,
    });

    const hasError = !!result.error;
    stepTraces.push({
      stepId: step.id,
      type: step.type,
      status: hasError ? 'error' : 'completed',
      startedAt: stepStartedAt,
      completedAt: stepCompletedAt,
      durationMs,
      output: result.output,
      error: result.error,
      tokenUsage: result.tokenUsage,
      meta: result.meta,
    });

    if (!hasError) {
      lastOutput = result.output;
    }

    stepsExecuted++;

    // Post-step token check
    const tokenViolation = enforcer.postStepCheck(bus);
    if (tokenViolation) {
      flowError = tokenViolation.message;
      break;
    }

    // Handle router branching
    if (step.type === 'router' && result.nextBranch) {
      // Insert the branched step(s) into the execution queue
      const branchStepId = result.nextBranch;
      if (stepMap.has(branchStepId)) {
        // Continue from the branch target — find it in the remaining queue
        // or execute it next if it's not in the queue
        const branchChain = buildChainFrom(branchStepId, flow, stepMap);
        // Insert branch chain right after current position in a new sub-queue
        const remainingQueue = branchChain.filter(id => !bus.hasStep(id));
        for (const nextId of remainingQueue) {
          const nextStep = stepMap.get(nextId);
          if (!nextStep) continue;

          // Recursive-ish: just add to the execution inline
          // We break out of the outer loop and handle branching
          // For simplicity in v1, we execute the branch chain sequentially
          executionQueue.push(nextId);
        }
      }
    }

    if (hasError && abortOnError) {
      flowError = result.error;
      break;
    }
  }

  const totalDurationMs = Date.now() - engineStartedAt;

  return {
    success: !flowError,
    agentId: options.agentId,
    flowName: options.flowName,
    output: lastOutput,
    steps: stepTraces,
    totalTokenUsage: bus.totalTokenUsage(),
    totalDurationMs,
    error: flowError,
    contextSnapshot: bus.snapshot(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build the initial execution queue from the flow definition.
 * For now: simple sequential order based on the steps array.
 * Router steps dynamically modify the queue at runtime.
 */
function buildExecutionQueue(flow: AgentFlow, stepMap: Map<string, AgentFlowStep>): string[] {
  // If entryPoint is specified, start from there and follow `next` pointers
  if (flow.entryPoint && stepMap.has(flow.entryPoint)) {
    return buildChainFrom(flow.entryPoint, flow, stepMap);
  }

  // Default: steps in array order
  return flow.steps.map(s => s.id);
}

/**
 * Build a chain of step IDs starting from a given step, following `next` pointers.
 * Falls back to array order if no `next` is defined.
 */
function buildChainFrom(startId: string, flow: AgentFlow, stepMap: Map<string, AgentFlowStep>): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = startId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    chain.push(currentId);

    const step = stepMap.get(currentId);
    if (!step) break;

    // Determine next step
    if (typeof step.next === 'string') {
      currentId = step.next;
    } else if (Array.isArray(step.next) && step.next.length > 0) {
      // For sequential arrays, add all and stop following
      for (const nextId of step.next) {
        if (!visited.has(nextId)) {
          chain.push(nextId);
          visited.add(nextId);
        }
      }
      break;
    } else {
      // No explicit next — try to find the next step in array order
      const idx = flow.steps.findIndex(s => s.id === currentId);
      if (idx >= 0 && idx + 1 < flow.steps.length) {
        currentId = flow.steps[idx + 1].id;
      } else {
        break;
      }
    }
  }

  return chain;
}
