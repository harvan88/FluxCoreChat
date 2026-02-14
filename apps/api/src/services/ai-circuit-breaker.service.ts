/**
 * AI Circuit Breaker — Per-provider fault tolerance.
 * If a provider fails N times consecutively, mark it as "open" and skip it
 * for a cooldown period. After cooldown, allow one "half-open" probe.
 */

type CircuitState = 'closed' | 'open' | 'half-open';

interface ProviderCircuit {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureAt: number;
  openedAt: number;
  totalFailures: number;
  totalSuccesses: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // consecutive failures before opening
  cooldownMs: number;          // how long to keep circuit open
  halfOpenMaxProbes: number;   // probes allowed in half-open state
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  cooldownMs: 60_000,          // 1 minute
  halfOpenMaxProbes: 1,
};

class AICircuitBreaker {
  private circuits: Map<string, ProviderCircuit> = new Map();
  private config: CircuitBreakerConfig = DEFAULT_CONFIG;

  /**
   * Check if a provider is available (circuit closed or half-open probe allowed).
   */
  isAvailable(provider: string): boolean {
    const circuit = this.circuits.get(provider);
    if (!circuit) return true; // no circuit = never failed = available

    const now = Date.now();

    switch (circuit.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if cooldown has passed → transition to half-open
        if (now - circuit.openedAt >= this.config.cooldownMs) {
          circuit.state = 'half-open';
          return true;
        }
        return false;

      case 'half-open':
        // Allow limited probes
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful call to a provider. Resets circuit to closed.
   */
  recordSuccess(provider: string): void {
    const circuit = this.getOrCreate(provider);
    circuit.state = 'closed';
    circuit.consecutiveFailures = 0;
    circuit.totalSuccesses += 1;
  }

  /**
   * Record a failed call to a provider. May trip the circuit open.
   */
  recordFailure(provider: string): void {
    const circuit = this.getOrCreate(provider);
    const now = Date.now();

    circuit.consecutiveFailures += 1;
    circuit.lastFailureAt = now;
    circuit.totalFailures += 1;

    if (circuit.state === 'half-open') {
      // Half-open probe failed → reopen
      circuit.state = 'open';
      circuit.openedAt = now;
      return;
    }

    if (circuit.consecutiveFailures >= this.config.failureThreshold) {
      circuit.state = 'open';
      circuit.openedAt = now;
      console.warn(`[circuit-breaker] Provider '${provider}' circuit OPENED after ${circuit.consecutiveFailures} consecutive failures`);
    }
  }

  /**
   * Get the current state of a provider's circuit.
   */
  getState(provider: string): { state: CircuitState; consecutiveFailures: number; totalFailures: number; totalSuccesses: number } {
    const circuit = this.circuits.get(provider);
    if (!circuit) {
      return { state: 'closed', consecutiveFailures: 0, totalFailures: 0, totalSuccesses: 0 };
    }
    // Re-evaluate open → half-open transition
    if (circuit.state === 'open' && Date.now() - circuit.openedAt >= this.config.cooldownMs) {
      circuit.state = 'half-open';
    }
    return {
      state: circuit.state,
      consecutiveFailures: circuit.consecutiveFailures,
      totalFailures: circuit.totalFailures,
      totalSuccesses: circuit.totalSuccesses,
    };
  }

  /**
   * Get all provider states (for admin/monitoring).
   */
  getAllStates(): Record<string, ReturnType<AICircuitBreaker['getState']>> {
    const result: Record<string, ReturnType<AICircuitBreaker['getState']>> = {};
    for (const provider of this.circuits.keys()) {
      result[provider] = this.getState(provider);
    }
    return result;
  }

  /**
   * Manually reset a provider's circuit (from admin panel).
   */
  reset(provider: string): void {
    this.circuits.delete(provider);
  }

  /**
   * Update config (from admin panel or entitlements).
   */
  setConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private getOrCreate(provider: string): ProviderCircuit {
    let circuit = this.circuits.get(provider);
    if (!circuit) {
      circuit = {
        state: 'closed',
        consecutiveFailures: 0,
        lastFailureAt: 0,
        openedAt: 0,
        totalFailures: 0,
        totalSuccesses: 0,
      };
      this.circuits.set(provider, circuit);
    }
    return circuit;
  }
}

export const aiCircuitBreaker = new AICircuitBreaker();
