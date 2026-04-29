import type { ExecutionAction, SendTemplateAction } from '../../core/fluxcore-types';

export interface ParseParams {
    text: string;
    conversationId: string;
    authorizedContext: any;
}

/**
 * CognitiveParserService — FluxCore Phase 3
 * 
 * Standalone element for intention extraction.
 * Translates raw LLM text into structured ExecutionActions.
 */
export class CognitiveParserService {
    /**
     * Main entry point for parsing.
     * Combines multiple matchers to build the final action list.
     */
    parse(params: ParseParams): ExecutionAction[] {
        const { text, conversationId, authorizedContext } = params;
        const actions: ExecutionAction[] = [];

        // 1. Template Call Matcher
        const templateActions = this.matchTemplateCalls(text, conversationId, authorizedContext);
        actions.push(...templateActions);

        // 2. Future matchers can be added here...
        
        return actions;
    }

    private matchTemplateCalls(text: string, conversationId: string, authorizedContext: any): SendTemplateAction[] {
        const markerRegex = /(?:CALL|Call)[_\s]*TEMPLATE:\s*([a-f\d-]+)/ig;
        const templateActions: SendTemplateAction[] = [];
        const authorizedTemplateIds = new Set(authorizedContext.authorizedTemplates || []);
        
        let match: RegExpExecArray | null;
        while ((match = markerRegex.exec(text)) !== null) {
            const templateId = match[1];
            if (!templateId) continue;

            const markerEnd = match.index + match[0].length;
            const variables = this.extractJsonObject(text, markerEnd) || {};

            if (authorizedTemplateIds.has(templateId)) {
                templateActions.push({
                    type: 'send_template',
                    templateId,
                    conversationId,
                    variables
                });
            } else {
                console.warn(`[CognitiveParser] ⚠️ Unauthorized template detected: ${templateId}`);
            }
        }

        return this.dedupeTemplateActions(templateActions);
    }

    private extractJsonObject(text: string, startIndex: number): Record<string, string> | null {
        const cursor = this.getNextNonWhitespaceIndex(text, startIndex);
        if (cursor >= text.length || text[cursor] !== '{') return null;

        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let i = cursor; i < text.length; i++) {
            const char = text[i];
            if (escaped) { escaped = false; continue; }
            if (char === '\\' && inString) { escaped = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (inString) continue;

            if (char === '{') depth++;
            else if (char === '}') {
                depth--;
                if (depth === 0) {
                    try {
                        return JSON.parse(text.slice(cursor, i + 1));
                    } catch {
                        return null;
                    }
                }
            }
        }
        return null;
    }

    private getNextNonWhitespaceIndex(text: string, startIndex: number): number {
        let i = startIndex;
        while (i < text.length && /\s/.test(text[i])) i++;
        return i;
    }

    private dedupeTemplateActions(actions: SendTemplateAction[]): SendTemplateAction[] {
        const seen = new Set<string>();
        return actions.filter(a => {
            const signature = `${a.templateId}:${JSON.stringify(a.variables)}`;
            if (seen.has(signature)) return false;
            seen.add(signature);
            return true;
        });
    }
}

export const cognitiveParserService = new CognitiveParserService();
