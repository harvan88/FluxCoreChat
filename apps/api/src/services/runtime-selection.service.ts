import { runtimeConfigService } from './runtime-config.service';

export type RuntimeStrategy = 'assistants' | 'fluxi';
export type RuntimeSelectionState = 'active' | 'inactive';

export interface RuntimeSelection {
    accountId: string;
    strategy: RuntimeStrategy;
    state: RuntimeSelectionState;
    activeRuntimeId: string;
    reason?: string;
}

class RuntimeSelectionService {
    async resolve(accountId: string): Promise<RuntimeSelection> {
        const config = await runtimeConfigService.getRuntime(accountId);
        const activeRuntimeId = config.activeRuntimeId || '@fluxcore/asistentes';

        if (activeRuntimeId === '@fluxcore/inactive') {
            return {
                accountId,
                strategy: 'assistants',
                state: 'inactive',
                activeRuntimeId,
                reason: 'Runtime strategy is inactive for this account',
            };
        }

        if (activeRuntimeId === '@fluxcore/fluxi' || activeRuntimeId === '@fluxcore/wes') {
            return {
                accountId,
                strategy: 'fluxi',
                state: 'active',
                activeRuntimeId: '@fluxcore/fluxi',
            };
        }

        return {
            accountId,
            strategy: 'assistants',
            state: 'active',
            activeRuntimeId: '@fluxcore/asistentes',
        };
    }
}

export const runtimeSelectionService = new RuntimeSelectionService();
