
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';

export interface WorkDefinition {
    id: string;
    accountId: string;
    typeId: string;
    version: string;
    definitionJson: {
        slots: Array<{
            path: string;
            type: string;
            required?: boolean;
            immutableAfterSet?: boolean;
        }>;
        fsm: {
            states: string[];
            initial: string;
            transitions: Array<{ from: string; to: string; when?: string }>;
        };
        policies: {
            expiration?: { ttlSeconds: number };
            allowConcurrentActiveWorksPerConversation?: boolean;
            allowsNegotiation?: boolean;
            negotiableFields?: string[];
        };
        bindingAttribute: string;
        requiresSemanticCommit?: string[];
    };
}

class WorkDefinitionService {
    /**
     * Gets a specific version of a WorkDefinition
     */
    async get(accountId: string, typeId: string, version: string): Promise<WorkDefinition | null> {
        const result = await db.query.fluxcoreWorkDefinitions.findFirst({
            where: and(
                eq(fluxcoreWorkDefinitions.accountId, accountId),
                eq(fluxcoreWorkDefinitions.typeId, typeId),
                eq(fluxcoreWorkDefinitions.version, version)
            )
        });
        return result as any;
    }

    /**
     * Gets the latest version of a WorkDefinition by typeId
     */
    async getLatest(accountId: string, typeId: string): Promise<WorkDefinition | null> {
        const result = await db.query.fluxcoreWorkDefinitions.findFirst({
            where: and(
                eq(fluxcoreWorkDefinitions.accountId, accountId),
                eq(fluxcoreWorkDefinitions.typeId, typeId)
            ),
            orderBy: [desc(fluxcoreWorkDefinitions.version)] // Simple string sort for now, better logic in future
        });
        return result as any;
    }

    /**
     * Lists the latest version of all WorkDefinitions for an account.
     */
    async listLatest(accountId: string): Promise<WorkDefinition[]> {
        const allDefinitions = await db.query.fluxcoreWorkDefinitions.findMany({
            where: eq(fluxcoreWorkDefinitions.accountId, accountId),
            orderBy: [desc(fluxcoreWorkDefinitions.version)]
        });

        const latestMap = new Map<string, any>();
        for (const def of allDefinitions) {
            if (!latestMap.has(def.typeId)) {
                latestMap.set(def.typeId, def);
            }
        }

        return Array.from(latestMap.values());
    }

    /**
     * Registers a new WorkDefinition.
     * If the version already exists, it might fail due to unique constraint.
     */
    async register(accountId: string, definition: Omit<WorkDefinition, 'id' | 'accountId'>): Promise<WorkDefinition> {
        const [inserted] = await db.insert(fluxcoreWorkDefinitions).values({
            accountId,
            typeId: definition.typeId,
            version: definition.version,
            definitionJson: definition.definitionJson as any,
        }).returning();

        return inserted as any;
    }
}

export const workDefinitionService = new WorkDefinitionService();
