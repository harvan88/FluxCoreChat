/**
 * Smart Delay Service for AI Auto-Reply
 * 
 * Implements intelligent debounce mechanism:
 * - Wait 15 seconds before sending to AI
 * - If new message arrives, reset timer
 * - Show typing state, wait 5 seconds before sending
 */

type UserActivity = 'typing' | 'recording' | 'idle' | 'cancel';

interface DelayedRequest {
  conversationId: string;
  accountId: string;
  suggestionId?: string;
  lastMessageText: string;
  attemptCount: number;
  timer?: NodeJS.Timeout;
  typingTimer?: NodeJS.Timeout;
  onTypingStart?: () => void;
  onProcess: () => Promise<void>;
  lastActivityAt: number;
  lastActivityType: UserActivity | 'system';
}

class SmartDelayService {
  private pendingRequests = new Map<string, DelayedRequest>();
  private readonly INITIAL_DELAY = 15000; // 15 seconds
  private readonly TYPING_DELAY = 5000; // 5 seconds
  private readonly RECORDING_EXTENSION = 15000; // additional wait when recording
  private readonly IDLE_DELAY = 5000; // grace after idle before typing
  private readonly MAX_ATTEMPTS = 5; // Max resets before forcing

  /**
   * Schedule an AI response with smart delay
   */
  scheduleResponse(params: {
    conversationId: string;
    accountId: string;
    suggestionId?: string;
    lastMessageText: string;
    onProcess: () => Promise<void>;
    onTypingStart?: () => void;
  }): void {
    const key = `${params.accountId}:${params.conversationId}`;
    
    // Cancel existing request if any
    const existing = this.pendingRequests.get(key);
    if (existing) {
      if (existing.timer) clearTimeout(existing.timer);
      if (existing.typingTimer) clearTimeout(existing.typingTimer);
      
      // Increment attempt count
      existing.attemptCount++;
      existing.lastMessageText = params.lastMessageText;
      
      // Force send if too many resets
      if (existing.attemptCount >= this.MAX_ATTEMPTS) {
        console.log(`[SmartDelay] Max attempts reached for ${key}, processing immediately`);
        this.processRequest(key);
        return;
      }
    }

    // Create or update request
    const request: DelayedRequest = existing || {
      conversationId: params.conversationId,
      accountId: params.accountId,
      suggestionId: params.suggestionId,
      lastMessageText: params.lastMessageText,
      attemptCount: 0,
      onProcess: params.onProcess,
      onTypingStart: params.onTypingStart,
      lastActivityAt: Date.now(),
      lastActivityType: 'system',
    };

    request.onTypingStart = params.onTypingStart;
    request.lastMessageText = params.lastMessageText;
    request.suggestionId = params.suggestionId;

    this.startInitialDelay(request, key, this.INITIAL_DELAY);
    console.log(`[SmartDelay] Scheduled response for ${key} (attempt ${request.attemptCount + 1})`);
  }

  /**
   * Cancel a pending request
   */
  cancel(conversationId: string, accountId: string): { cancelled: boolean; suggestionId?: string } {
    const key = `${accountId}:${conversationId}`;
    const request = this.pendingRequests.get(key);
    
    if (request) {
      this.clearTimers(request);
      this.pendingRequests.delete(key);
      console.log(`[SmartDelay] Cancelled request for ${key}`);
      return { cancelled: true, suggestionId: request.suggestionId };
    }
    
    return { cancelled: false };
  }

  /**
   * Check if a request is pending
   */
  isPending(conversationId: string, accountId: string): boolean {
    const key = `${accountId}:${conversationId}`;
    return this.pendingRequests.has(key);
  }

  /**
   * Get status of pending request
   */
  getStatus(conversationId: string, accountId: string): {
    isPending: boolean;
    isTyping: boolean;
    attemptCount: number;
  } | null {
    const key = `${accountId}:${conversationId}`;
    const request = this.pendingRequests.get(key);
    
    if (!request) return null;
    
    return {
      isPending: true,
      isTyping: !request.timer && !!request.typingTimer,
      attemptCount: request.attemptCount,
    };
  }

  /**
   * Process a pending request
   */
  private async processRequest(key: string): Promise<void> {
    const request = this.pendingRequests.get(key);
    if (!request) return;
    
    // Clean up timers
    if (request.timer) clearTimeout(request.timer);
    if (request.typingTimer) clearTimeout(request.typingTimer);
    
    // Remove from pending
    this.pendingRequests.delete(key);
    
    // Execute callback
    try {
      await request.onProcess();
      console.log(`[SmartDelay] Successfully processed request for ${key}`);
    } catch (error) {
      console.error(`[SmartDelay] Failed to process request for ${key}:`, error);
    }
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    for (const [, request] of this.pendingRequests) {
      this.clearTimers(request);
    }
    this.pendingRequests.clear();
    console.log('[SmartDelay] Cleared all pending requests');
  }

  /**
   * Registrar actividad del usuario para pausar/reanudar timers
   */
  touchActivity(params: {
    conversationId: string;
    accountId: string;
    activity: UserActivity;
  }): { result: 'ignored' | 'reset' | 'resumed' | 'cancelled'; suggestionId?: string } {
    const key = `${params.accountId}:${params.conversationId}`;
    const request = this.pendingRequests.get(key);

    if (!request) {
      return { result: 'ignored' };
    }

    request.lastActivityAt = Date.now();
    request.lastActivityType = params.activity;

    if (params.activity === 'cancel') {
      const { cancelled, suggestionId } = this.cancel(params.conversationId, params.accountId);
      return cancelled ? { result: 'cancelled', suggestionId } : { result: 'ignored' };
    }

    if (params.activity === 'typing') {
      this.startInitialDelay(request, key, this.INITIAL_DELAY);
      return { result: 'reset', suggestionId: request.suggestionId };
    }

    if (params.activity === 'recording') {
      this.startInitialDelay(request, key, this.INITIAL_DELAY + this.RECORDING_EXTENSION);
      return { result: 'reset', suggestionId: request.suggestionId };
    }

    // activity === 'idle'
    this.startInitialDelay(request, key, this.IDLE_DELAY);
    return { result: 'resumed', suggestionId: request.suggestionId };
  }

  private startInitialDelay(request: DelayedRequest, key: string, delayMs: number): void {
    this.clearTimers(request);

    request.timer = setTimeout(() => {
      request.timer = undefined;
      console.log(`[SmartDelay] Initial delay complete for ${key}, showing typing...`);

      request.onTypingStart?.();

      request.typingTimer = setTimeout(() => {
        request.typingTimer = undefined;
        console.log(`[SmartDelay] Typing delay complete for ${key}, processing...`);
        this.processRequest(key);
      }, this.TYPING_DELAY);
    }, delayMs);

    this.pendingRequests.set(key, request);
  }

  private clearTimers(request: DelayedRequest): void {
    if (request.timer) {
      clearTimeout(request.timer);
      request.timer = undefined;
    }
    if (request.typingTimer) {
      clearTimeout(request.typingTimer);
      request.typingTimer = undefined;
    }
  }
}

// Singleton export
export const smartDelayService = new SmartDelayService();
