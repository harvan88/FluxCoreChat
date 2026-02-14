
import { describe, it, expect, mock, spyOn } from 'bun:test';
import { wesInterpreterService } from './wes-interpreter.service';
import { workEngineService } from './work-engine.service';
import { workDefinitionService } from './work-definition.service';
import { aiService } from './ai.service';
import { metricsService } from './metrics.service';
import { aiCircuitBreaker } from './ai-circuit-breaker.service';

// Mock DB interactions for WorkEngine if possible, or assume integration env
// For this test, we will focus on the Interpreter logic and Circuit Breaker

describe('WES Integration Flow', () => {

    const mockAccountId = 'acc-' + Date.now();
    const mockConversationId = 'conv-' + Date.now();
    const mockText = 'Quiero agendar una cita para mañana';

    // Mock Definitions
    spyOn(workDefinitionService, 'listLatest').mockResolvedValue([
        {
            id: 'def-123',
            accountId: mockAccountId,
            typeId: 'appointment_scheduler',
            version: '1.0.0',
            definitionJson: {
                bindingAttribute: 'intent_to_schedule',
                slots: [
                    { path: 'date', type: 'string', required: true }
                ],
                fsm: {
                    initial: 'SCORING',
                    states: ['SCORING', 'SCHEDULED'],
                    transitions: []
                },
                policies: {
                    bindingAttribute: 'intent_to_schedule'
                }
            } as any
        }
    ]);

    // Mock Metrics
    spyOn(metricsService, 'increment');
    spyOn(metricsService, 'recordTiming');

    it('should interpret intent and fail gracefully if LLM fails (Circuit Breaker)', async () => {
        // Mock LLM failure
        const rawCompletionSpy = spyOn(aiService as any, 'rawCompletion').mockRejectedValue(new Error('LLM Timeout'));

        // 1. First failure
        const result1 = await wesInterpreterService.interpret(mockAccountId, mockConversationId, mockText);
        expect(result1).toBeNull();
        expect(metricsService.increment).toHaveBeenCalledWith('wes.interpreter.errors', expect.any(Number), expect.any(Object));

        // 2. Report failure to CB
        const state = aiCircuitBreaker.getState('wes-interpreter:groq'); // or 'wes-interpreter'
        // Note: In our implementation we used 'wes-interpreter'

        // 3. Trip Breaker (assuming threshold is low or we force it)
        aiCircuitBreaker.recordFailure('wes-interpreter');
        aiCircuitBreaker.recordFailure('wes-interpreter');
        aiCircuitBreaker.recordFailure('wes-interpreter'); // Threshold is 3

        // 4. Next call should skip LLM
        rawCompletionSpy.mockClear();
        const result2 = await wesInterpreterService.interpret(mockAccountId, mockConversationId, mockText);
        expect(result2).toBeNull();
        expect(rawCompletionSpy).not.toHaveBeenCalled(); // Should be skipped
        expect(metricsService.increment).toHaveBeenCalledWith('wes.interpreter.skipped', 1, { reason: 'circuit_open' });
    });

    it('should successfully interpret and return analysis', async () => {
        // Reset CB
        aiCircuitBreaker.reset('wes-interpreter');

        // Mock LLM Success
        spyOn(aiService as any, 'rawCompletion').mockResolvedValue({
            content: JSON.stringify({
                match: true,
                workDefinitionId: 'appointment_scheduler',
                intent: 'User wants to schedule',
                confidence: 0.95,
                slots: [
                    { path: 'date', value: 'tomorrow', evidence: 'mañana' }
                ]
            })
        });

        const result = await wesInterpreterService.interpret(mockAccountId, mockConversationId, mockText);

        expect(result).not.toBeNull();
        expect(result?.workDefinitionId).toBe('def-123'); // Mapped from typeId
        expect(result?.intent).toBe('User wants to schedule');
        expect(metricsService.increment).toHaveBeenCalledWith('wes.interpreter.matches', 1, expect.any(Object));

        // Verify Circuit Breaker recorded success
        const cbState = aiCircuitBreaker.getState('wes-interpreter');
        expect(cbState.state).toBe('closed');
        expect(cbState.totalSuccesses).toBeGreaterThan(0);
    });
});
