/**
 * Agent Types — Step executors for the Agent Runtime Engine.
 *
 * Each agent type implements the AgentExecutor interface:
 *   execute(step, bus, enforcer) → StepResult
 *
 * Types:
 *   - LLMAgent: Calls an LLM with system prompt + inputs
 *   - RAGAgent: Searches vector stores
 *   - DeterministicAgent: Rules-based if/then/else
 *   - ToolAgent: Executes a registered tool
 *   - RouterAgent: Decides which branch to follow
 *   - TransformAgent: Transforms data (map, filter, extract)
 */

import type { AgentFlowStep } from '@fluxcore/db';
import type { ContextBus } from './context-bus';
import type { ScopeEnforcer, ScopeViolation } from './scope-enforcer';
import { resolveTemplate } from './condition-evaluator';

// ─── Shared types ───────────────────────────────────────────────────────────

export interface StepResult {
  output: any;
  tokenUsage?: { prompt: number; completion: number; total: number };
  error?: string;
  /** For router agents: the ID of the next branch to take */
  nextBranch?: string;
  /** Metadata for tracing */
  meta?: Record<string, any>;
}

export interface AgentExecutor {
  type: string;
  execute(
    step: AgentFlowStep,
    bus: ContextBus,
    enforcer: ScopeEnforcer,
    deps: ExecutorDependencies,
  ): Promise<StepResult>;
}

/**
 * Dependencies injected into executors from the engine.
 * Avoids coupling executors to concrete service implementations.
 */
export interface ExecutorDependencies {
  /** Call an LLM. Returns { content, usage }. */
  callLLM: (params: {
    model: string;
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
    providerOrder?: any[];
  }) => Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }>;

  /** Search vector stores (RAG). Returns chunks. */
  searchKnowledge: (params: {
    query: string;
    vectorStoreIds: string[];
    topK?: number;
    minScore?: number;
    accountId: string;
  }) => Promise<{
    chunks: Array<{ content: string; score: number; source?: string }>;
    totalTokens: number;
  }>;

  /** Execute a registered tool by name. */
  executeTool: (params: {
    toolName: string;
    input: Record<string, any>;
    accountId: string;
  }) => Promise<{ output: any; error?: string }>;

  /** Account ID for the current execution */
  accountId: string;

  /** Provider order for LLM calls */
  providerOrder?: any[];
}

// ─── Resolve step inputs ────────────────────────────────────────────────────

function resolveInputs(
  inputs: Record<string, string> | undefined,
  bus: ContextBus,
): Record<string, any> {
  if (!inputs) return {};
  const ctx = bus.toResolutionContext();
  const resolved: Record<string, any> = {};
  for (const [key, template] of Object.entries(inputs)) {
    resolved[key] = resolveTemplate(template, ctx);
  }
  return resolved;
}

// ─── LLM Agent ──────────────────────────────────────────────────────────────

export class LLMAgent implements AgentExecutor {
  type = 'llm';

  async execute(
    step: AgentFlowStep,
    bus: ContextBus,
    enforcer: ScopeEnforcer,
    deps: ExecutorDependencies,
  ): Promise<StepResult> {
    const cfg = step.config || {};
    const model = cfg.model || 'llama-3.1-8b-instant';
    const systemPrompt = cfg.systemPrompt || '';
    const temperature = typeof cfg.temperature === 'number' ? cfg.temperature : 0.7;
    const maxTokens = typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 256;
    const responseFormat = cfg.responseFormat === 'json' ? 'json' as const : 'text' as const;

    // Scope check
    const violation = enforcer.preStepCheck(bus, { model });
    if (violation) return { output: null, error: violation.message };

    // Resolve inputs
    const inputs = resolveInputs(step.inputs, bus);

    // Build user message from resolved inputs
    const inputText = Object.entries(inputs)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n');

    // Resolve systemPrompt templates
    const ctx = bus.toResolutionContext();
    const resolvedSystemPrompt = resolveTemplate(systemPrompt, ctx);

    try {
      const result = await deps.callLLM({
        model,
        systemPrompt: String(resolvedSystemPrompt),
        messages: [{ role: 'user', content: inputText }],
        temperature,
        maxTokens,
        responseFormat,
        providerOrder: deps.providerOrder,
      });

      let output: any = result.content;

      // Try to parse JSON if response format is json
      if (responseFormat === 'json') {
        try { output = JSON.parse(result.content); } catch { /* keep as string */ }
      }

      // Also try parsing if there's an outputSchema defined
      if (cfg.outputSchema && typeof output === 'string') {
        try { output = JSON.parse(output); } catch { /* keep as string */ }
      }

      return {
        output,
        tokenUsage: {
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens,
          total: result.usage.totalTokens,
        },
        meta: { model, temperature, maxTokens, responseFormat },
      };
    } catch (e: any) {
      return { output: null, error: e?.message || 'LLM call failed' };
    }
  }
}

// ─── RAG Agent ──────────────────────────────────────────────────────────────

export class RAGAgent implements AgentExecutor {
  type = 'rag';

  async execute(
    step: AgentFlowStep,
    bus: ContextBus,
    enforcer: ScopeEnforcer,
    deps: ExecutorDependencies,
  ): Promise<StepResult> {
    const cfg = step.config || {};
    const vectorStoreIds = cfg.vectorStoreIds || [];
    const topK = typeof cfg.topK === 'number' ? cfg.topK : 5;
    const minScore = typeof cfg.minScore === 'number' ? cfg.minScore : 0.3;

    // Scope check (time only for RAG)
    const violation = enforcer.preStepCheck(bus, {});
    if (violation) return { output: null, error: violation.message };

    // Resolve query from inputs or fallback to trigger content
    const inputs = resolveInputs(step.inputs, bus);
    const query = inputs.query || inputs.user_message || bus.getTrigger().content || '';

    if (!query) {
      return { output: { chunks: [], context: '' }, error: 'No query provided for RAG search' };
    }

    try {
      const result = await deps.searchKnowledge({
        query: String(query),
        vectorStoreIds,
        topK,
        minScore,
        accountId: deps.accountId,
      });

      const context = result.chunks.map(c => c.content).join('\n\n');

      return {
        output: {
          chunks: result.chunks,
          context,
          chunksFound: result.chunks.length,
          totalTokens: result.totalTokens,
        },
        tokenUsage: { prompt: 0, completion: 0, total: result.totalTokens },
        meta: { vectorStoreIds, topK, minScore, chunksFound: result.chunks.length },
      };
    } catch (e: any) {
      return { output: { chunks: [], context: '' }, error: e?.message || 'RAG search failed' };
    }
  }
}

// ─── Deterministic Agent ────────────────────────────────────────────────────

export class DeterministicAgent implements AgentExecutor {
  type = 'deterministic';

  async execute(
    step: AgentFlowStep,
    bus: ContextBus,
    _enforcer: ScopeEnforcer,
    _deps: ExecutorDependencies,
  ): Promise<StepResult> {
    const cfg = step.config || {};
    const checks: Array<{ rule: string; action: string; value?: any }> = cfg.checks || [];

    const ctx = bus.toResolutionContext();
    const inputs = resolveInputs(step.inputs, bus);
    const evalCtx = { ...ctx, ...inputs };

    const results: Array<{ rule: string; matched: boolean; action: string }> = [];
    let finalAction = 'pass';
    let finalValue: any = null;

    for (const check of checks) {
      const { evaluateCondition } = await import('./condition-evaluator');
      const matched = evaluateCondition(check.rule, evalCtx);
      results.push({ rule: check.rule, matched, action: check.action });
      if (matched) {
        finalAction = check.action;
        finalValue = check.value ?? null;
        break; // First matching rule wins
      }
    }

    return {
      output: { action: finalAction, value: finalValue, evaluations: results },
      meta: { checksCount: checks.length, matchedAction: finalAction },
    };
  }
}

// ─── Tool Agent ─────────────────────────────────────────────────────────────

export class ToolAgent implements AgentExecutor {
  type = 'tool';

  async execute(
    step: AgentFlowStep,
    bus: ContextBus,
    enforcer: ScopeEnforcer,
    deps: ExecutorDependencies,
  ): Promise<StepResult> {
    const cfg = step.config || {};
    const toolName = cfg.tool || cfg.toolName || '';

    if (!toolName) {
      return { output: null, error: 'No tool name specified in step config' };
    }

    // Scope check
    const violation = enforcer.preStepCheck(bus, { tools: [toolName] });
    if (violation) return { output: null, error: violation.message };

    // Resolve params
    const inputs = resolveInputs(step.inputs, bus);
    const params = cfg.params ? { ...cfg.params } : {};

    // Resolve template values in params
    const ctx = bus.toResolutionContext();
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string') {
        params[k] = resolveTemplate(v, ctx);
      }
    }

    try {
      const result = await deps.executeTool({
        toolName,
        input: { ...params, ...inputs },
        accountId: deps.accountId,
      });

      if (result.error) {
        return { output: result.output, error: result.error };
      }

      return {
        output: result.output,
        meta: { tool: toolName },
      };
    } catch (e: any) {
      return { output: null, error: e?.message || `Tool "${toolName}" execution failed` };
    }
  }
}

// ─── Router Agent ───────────────────────────────────────────────────────────

export class RouterAgent implements AgentExecutor {
  type = 'router';

  async execute(
    step: AgentFlowStep,
    bus: ContextBus,
    enforcer: ScopeEnforcer,
    deps: ExecutorDependencies,
  ): Promise<StepResult> {
    const cfg = step.config || {};
    const routingMode = cfg.routingMode || 'condition'; // 'condition' | 'llm'

    if (routingMode === 'llm') {
      return this.routeByLLM(step, bus, enforcer, deps);
    }

    return this.routeByCondition(step, bus);
  }

  private async routeByCondition(step: AgentFlowStep, bus: ContextBus): Promise<StepResult> {
    const cfg = step.config || {};
    const routes: Array<{ condition: string; target: string }> = cfg.routes || [];
    const defaultTarget = cfg.defaultTarget || null;

    const ctx = bus.toResolutionContext();
    const { evaluateCondition } = await import('./condition-evaluator');

    for (const route of routes) {
      if (evaluateCondition(route.condition, ctx)) {
        return {
          output: { selectedRoute: route.target, matchedCondition: route.condition },
          nextBranch: route.target,
          meta: { routingMode: 'condition', selectedRoute: route.target },
        };
      }
    }

    // No match — use default
    return {
      output: { selectedRoute: defaultTarget, matchedCondition: null },
      nextBranch: defaultTarget || undefined,
      meta: { routingMode: 'condition', selectedRoute: defaultTarget, fallback: true },
    };
  }

  private async routeByLLM(
    step: AgentFlowStep,
    bus: ContextBus,
    enforcer: ScopeEnforcer,
    deps: ExecutorDependencies,
  ): Promise<StepResult> {
    const cfg = step.config || {};
    const model = cfg.model || 'llama-3.1-8b-instant';
    const branches = cfg.branches || [];
    const temperature = typeof cfg.temperature === 'number' ? cfg.temperature : 0.1;

    const violation = enforcer.preStepCheck(bus, { model });
    if (violation) return { output: null, error: violation.message };

    const inputs = resolveInputs(step.inputs, bus);
    const inputText = Object.entries(inputs)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n');

    const branchList = branches.map((b: any) => `- "${b.id}": ${b.description || b.id}`).join('\n');
    const systemPrompt = `You are a router. Based on the input, select exactly one branch from the list below.
Respond with ONLY the branch ID, nothing else.

Available branches:
${branchList}`;

    try {
      const result = await deps.callLLM({
        model,
        systemPrompt,
        messages: [{ role: 'user', content: inputText }],
        temperature,
        maxTokens: 50,
        providerOrder: deps.providerOrder,
      });

      const selectedBranch = result.content.trim().replace(/['"]/g, '');
      const validBranch = branches.find((b: any) => b.id === selectedBranch);

      return {
        output: { selectedRoute: validBranch?.id || selectedBranch, raw: result.content },
        nextBranch: validBranch?.id || selectedBranch,
        tokenUsage: {
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens,
          total: result.usage.totalTokens,
        },
        meta: { routingMode: 'llm', model, selectedRoute: validBranch?.id || selectedBranch },
      };
    } catch (e: any) {
      return { output: null, error: e?.message || 'Router LLM call failed' };
    }
  }
}

// ─── Transform Agent ────────────────────────────────────────────────────────

export class TransformAgent implements AgentExecutor {
  type = 'transform';

  async execute(
    step: AgentFlowStep,
    bus: ContextBus,
    _enforcer: ScopeEnforcer,
    _deps: ExecutorDependencies,
  ): Promise<StepResult> {
    const cfg = step.config || {};
    const operation = cfg.operation || 'passthrough'; // 'passthrough' | 'extract' | 'merge' | 'format'

    const inputs = resolveInputs(step.inputs, bus);

    try {
      let output: any;

      switch (operation) {
        case 'extract': {
          // Extract a specific field from inputs
          const field = cfg.field || 'value';
          output = inputs[field] ?? null;
          break;
        }

        case 'merge': {
          // Merge all inputs into a single object
          output = { ...inputs };
          break;
        }

        case 'format': {
          // Format inputs into a string using a template
          const tmpl = cfg.template || '';
          const ctx = bus.toResolutionContext();
          output = resolveTemplate(tmpl, { ...ctx, ...inputs });
          break;
        }

        case 'passthrough':
        default: {
          // Pass inputs through unchanged
          output = Object.keys(inputs).length === 1
            ? Object.values(inputs)[0]
            : inputs;
          break;
        }
      }

      return { output, meta: { operation } };
    } catch (e: any) {
      return { output: null, error: e?.message || 'Transform failed' };
    }
  }
}

// ─── Registry ───────────────────────────────────────────────────────────────

const executorRegistry: Record<string, AgentExecutor> = {
  llm: new LLMAgent(),
  rag: new RAGAgent(),
  deterministic: new DeterministicAgent(),
  tool: new ToolAgent(),
  router: new RouterAgent(),
  transform: new TransformAgent(),
};

export function getExecutor(type: string): AgentExecutor | null {
  return executorRegistry[type] || null;
}

export function registerExecutor(type: string, executor: AgentExecutor): void {
  executorRegistry[type] = executor;
}
