
/**
 * WES-135: Standard Delta & Reproducible Events
 * Utility functions for managing Work state transitions and audit trails.
 */

export type DeltaOp =
    | { op: 'set'; path: string; value: any }
    | { op: 'unset'; path: string }
    | { op: 'transition'; toState: string }
    | { op: 'append_event_ref'; ref: string };

export type Delta = DeltaOp[];

export interface WorkState {
    slots: Record<string, any>;
    state: string;
}

/**
 * Applies a list of operations (Delta) to a work state snapshot.
 * MUST be idempotent if called with the same delta on the same state.
 */
export function applyDelta(state: WorkState, delta: Delta): WorkState {
    const nextState = {
        ...state,
        slots: { ...state.slots }
    };

    for (const op of delta) {
        switch (op.op) {
            case 'set':
                nextState.slots[op.path] = op.value;
                break;
            case 'unset':
                delete nextState.slots[op.path];
                break;
            case 'transition':
                nextState.state = op.toState;
                break;
            case 'append_event_ref':
                // Audit only, no change to transient snapshot state
                break;
        }
    }

    return nextState;
}

/**
 * Validates if a delta can be applied based on the current state and WorkDefinition rules.
 * WES-135 / WES-150
 */
export function validateDelta(
    state: WorkState,
    delta: Delta,
    definition: {
        slots: any[],
        fsm?: { transitions: any[] }
    }
): { valid: boolean; error?: string } {
    for (const op of delta) {
        if (op.op === 'set') {
            const slotDef = definition.slots.find(s => s.path === op.path);
            if (!slotDef) {
                return { valid: false, error: `Slot path "${op.path}" not defined in WorkDefinition` };
            }
            // Immutable check: if slot is already set and immutableAfterSet is true
            if (slotDef.immutableAfterSet && state.slots[op.path] !== undefined && state.slots[op.path] !== op.value) {
                return { valid: false, error: `Slot "${op.path}" is immutable and already set` };
            }
        }

        if (op.op === 'transition') {
            if (definition.fsm) {
                const isValid = definition.fsm.transitions.some(t =>
                    (t.from === state.state || t.from === '*') && t.to === op.toState
                );
                if (!isValid) {
                    return { valid: false, error: `Invalid state transition from "${state.state}" to "${op.toState}"` };
                }
            }
        }
    }

    return { valid: true };
}
