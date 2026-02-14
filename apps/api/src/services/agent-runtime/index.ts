/**
 * Agent Runtime Engine — Barrel export
 *
 * Fase 3: Multi-agent orchestration system.
 */

export { ContextBus, type TriggerData, type ContextEntry } from './context-bus';
export { evaluateCondition, resolveTemplate, evaluateExpression } from './condition-evaluator';
export { ScopeEnforcer, type ScopeViolation } from './scope-enforcer';
export {
  type AgentExecutor,
  type StepResult,
  type ExecutorDependencies,
  getExecutor,
  registerExecutor,
  LLMAgent,
  RAGAgent,
  DeterministicAgent,
  ToolAgent,
  RouterAgent,
  TransformAgent,
} from './agent-types';
export { executeFlow, type FlowExecutionResult, type StepTrace, type EngineOptions } from './engine';
export { flowRegistryService } from './flow-registry';
