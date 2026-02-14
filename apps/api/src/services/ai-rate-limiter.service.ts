/**
 * AI Rate Limiter — Per-account request throttling.
 * In-memory sliding window. Future: Redis-backed for horizontal scaling.
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  cooldownAfterBurstMs: number;
}

const DEFAULT_LIMITS: RateLimitConfig = {
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  cooldownAfterBurstMs: 5000,
};

interface AccountWindow {
  minuteTimestamps: number[];
  hourTimestamps: number[];
  cooldownUntil: number;
}

class AIRateLimiter {
  private windows: Map<string, AccountWindow> = new Map();
  private overrides: Map<string, Partial<RateLimitConfig>> = new Map();

  /**
   * Check if an account can make a request. Returns null if allowed,
   * or a block reason string if rate-limited.
   */
  check(accountId: string): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    const now = Date.now();
    const limits = this.getLimits(accountId);
    const window = this.getOrCreateWindow(accountId);

    // Check cooldown
    if (window.cooldownUntil > now) {
      return {
        allowed: false,
        retryAfterMs: window.cooldownUntil - now,
        reason: 'cooldown',
      };
    }

    // Prune old entries
    const oneMinuteAgo = now - 60_000;
    const oneHourAgo = now - 3_600_000;
    window.minuteTimestamps = window.minuteTimestamps.filter((t) => t > oneMinuteAgo);
    window.hourTimestamps = window.hourTimestamps.filter((t) => t > oneHourAgo);

    // Check per-minute
    if (window.minuteTimestamps.length >= limits.maxRequestsPerMinute) {
      window.cooldownUntil = now + limits.cooldownAfterBurstMs;
      return {
        allowed: false,
        retryAfterMs: limits.cooldownAfterBurstMs,
        reason: 'rate_limit_minute',
      };
    }

    // Check per-hour
    if (window.hourTimestamps.length >= limits.maxRequestsPerHour) {
      const oldest = window.hourTimestamps[0];
      const retryAfterMs = oldest + 3_600_000 - now;
      return {
        allowed: false,
        retryAfterMs: Math.max(retryAfterMs, 1000),
        reason: 'rate_limit_hour',
      };
    }

    return { allowed: true };
  }

  /**
   * Record a request for the given account.
   * Call this AFTER check() returns allowed: true.
   */
  record(accountId: string): void {
    const now = Date.now();
    const window = this.getOrCreateWindow(accountId);
    window.minuteTimestamps.push(now);
    window.hourTimestamps.push(now);
  }

  /**
   * Set custom rate limits for a specific account (from admin panel / entitlements).
   */
  setOverride(accountId: string, config: Partial<RateLimitConfig>): void {
    this.overrides.set(accountId, config);
  }

  /**
   * Get current usage stats for an account.
   */
  getStats(accountId: string): { requestsLastMinute: number; requestsLastHour: number; cooldownUntil: number | null } {
    const now = Date.now();
    const window = this.windows.get(accountId);
    if (!window) return { requestsLastMinute: 0, requestsLastHour: 0, cooldownUntil: null };

    const oneMinuteAgo = now - 60_000;
    const oneHourAgo = now - 3_600_000;

    return {
      requestsLastMinute: window.minuteTimestamps.filter((t) => t > oneMinuteAgo).length,
      requestsLastHour: window.hourTimestamps.filter((t) => t > oneHourAgo).length,
      cooldownUntil: window.cooldownUntil > now ? window.cooldownUntil : null,
    };
  }

  private getLimits(accountId: string): RateLimitConfig {
    const override = this.overrides.get(accountId);
    if (!override) return DEFAULT_LIMITS;
    return { ...DEFAULT_LIMITS, ...override };
  }

  private getOrCreateWindow(accountId: string): AccountWindow {
    let window = this.windows.get(accountId);
    if (!window) {
      window = { minuteTimestamps: [], hourTimestamps: [], cooldownUntil: 0 };
      this.windows.set(accountId, window);
    }
    return window;
  }
}

export const aiRateLimiter = new AIRateLimiter();
