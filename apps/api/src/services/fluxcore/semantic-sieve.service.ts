import { templateSemanticService } from './template-semantic.service';

export interface SieveResult {
    id: string;
    score: number;
}

/**
 * SemanticSieveService — FluxCore Phase 3
 * 
 * Standalone element for reality filtering.
 * Determines which resources are relevant for a given turn.
 */
export class SemanticSieveService {
    private readonly MINIMUM_TEMPLATE_SCORE = 0.10;

    /**
     * Filters templates semantically for a given query.
     */
    async sieveTemplates(params: {
        query: string;
        accountId: string;
        limit?: number;
        minScore?: number;
    }): Promise<SieveResult[]> {
        const { query, accountId, limit = 10, minScore = this.MINIMUM_TEMPLATE_SCORE } = params;

        const results = await templateSemanticService.searchRelevantTemplatesWithScores(
            query,
            accountId,
            limit
        );

        // Apply deterministic threshold
        return results.filter(r => r.score >= minScore);
    }
}

export const semanticSieveService = new SemanticSieveService();
