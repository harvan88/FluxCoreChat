/**
 * Scope Enforcer — Validates that each agent step stays within its allowed limits.
 *
 * Enforces:
 *  - Allowed models (whitelist)
 *  - Max total tokens across all steps
 *  - Max execution time
 *  - Allowed tools (whitelist)
 *  - Sub-agent creation permission
 */

import type { AgentScopes } from '@fluxcore/db';
import type { ContextBus } from './context-bus';

export type ScopeViolation = {
  type: 'model_not_allowed' | 'token_limit_exceeded' | 'time_limit_exceeded' | 'tool_not_allowed' | 'sub_agent_denied';
  message: string;
  detail?: Record<string, any>;
};

export class ScopeEnforcer {
  private readonly scopes: AgentScopes;
  private readonly startedAt: number;

  constructor(scopes: AgentScopes) {
    this.scopes = scopes;
    this.startedAt = Date.now();
  }

  /**
   * Check if a model is allowed by this scope.
   */
  checkModel(model: string): ScopeViolation | null {
    if (this.scopes.allowedModels.length === 0) return null; // empty = allow all
    if (this.scopes.allowedModels.includes(model)) return null;
    return {
      type: 'model_not_allowed',
      message: `Model "${model}" is not in the allowed list: [${this.scopes.allowedModels.join(', ')}]`,
      detail: { model, allowed: this.scopes.allowedModels },
    };
  }

  /**
   * Check if adding tokens would exceed the total limit.
   */
  checkTokens(bus: ContextBus, additionalTokens: number): ScopeViolation | null {
    if (this.scopes.maxTotalTokens <= 0) return null; // 0 = unlimited
    const current = bus.totalTokenUsage().total;
    const projected = current + additionalTokens;
    if (projected <= this.scopes.maxTotalTokens) return null;
    return {
      type: 'token_limit_exceeded',
      message: `Token limit exceeded: ${projected} > ${this.scopes.maxTotalTokens} (current: ${current}, additional: ${additionalTokens})`,
      detail: { current, additional: additionalTokens, projected, limit: this.scopes.maxTotalTokens },
    };
  }

  /**
   * Check if execution time has been exceeded.
   */
  checkTime(): ScopeViolation | null {
    if (this.scopes.maxExecutionTimeMs <= 0) return null; // 0 = unlimited
    const elapsed = Date.now() - this.startedAt;
    if (elapsed <= this.scopes.maxExecutionTimeMs) return null;
    return {
      type: 'time_limit_exceeded',
      message: `Execution time exceeded: ${elapsed}ms > ${this.scopes.maxExecutionTimeMs}ms`,
      detail: { elapsed, limit: this.scopes.maxExecutionTimeMs },
    };
  }

  /**
   * Check if a tool is allowed by this scope.
   */
  checkTool(toolName: string): ScopeViolation | null {
    if (this.scopes.allowedTools.length === 0) return null; // empty = allow all
    if (this.scopes.allowedTools.includes(toolName)) return null;
    return {
      type: 'tool_not_allowed',
      message: `Tool "${toolName}" is not in the allowed list: [${this.scopes.allowedTools.join(', ')}]`,
      detail: { tool: toolName, allowed: this.scopes.allowedTools },
    };
  }

  /**
   * Check if sub-agent creation is allowed.
   */
  checkSubAgent(): ScopeViolation | null {
    if (this.scopes.canCreateSubAgents) return null;
    return {
      type: 'sub_agent_denied',
      message: 'This agent scope does not allow creating sub-agents.',
    };
  }

  /**
   * Run all relevant pre-step checks.
   */
  preStepCheck(bus: ContextBus, opts: { model?: string; tools?: string[] }): ScopeViolation | null {
    // Time check
    const timeViolation = this.checkTime();
    if (timeViolation) return timeViolation;

    // Model check
    if (opts.model) {
      const modelViolation = this.checkModel(opts.model);
      if (modelViolation) return modelViolation;
    }

    // Tool checks
    if (opts.tools) {
      for (const tool of opts.tools) {
        const toolViolation = this.checkTool(tool);
        if (toolViolation) return toolViolation;
      }
    }

    return null;
  }

  /**
   * Post-step token check after we know actual usage.
   */
  postStepCheck(bus: ContextBus): ScopeViolation | null {
    const usage = bus.totalTokenUsage();
    if (this.scopes.maxTotalTokens > 0 && usage.total > this.scopes.maxTotalTokens) {
      return {
        type: 'token_limit_exceeded',
        message: `Token limit exceeded after step: ${usage.total} > ${this.scopes.maxTotalTokens}`,
        detail: { current: usage.total, limit: this.scopes.maxTotalTokens },
      };
    }
    return null;
  }

  getElapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  getRemainingTimeMs(): number {
    if (this.scopes.maxExecutionTimeMs <= 0) return Infinity;
    return Math.max(0, this.scopes.maxExecutionTimeMs - this.getElapsedMs());
  }

  getRemainingTokens(bus: ContextBus): number {
    if (this.scopes.maxTotalTokens <= 0) return Infinity;
    return Math.max(0, this.scopes.maxTotalTokens - bus.totalTokenUsage().total);
  }
}
