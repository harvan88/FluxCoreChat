import { aiTemplateService } from './ai-template.service';
import { templateService } from './template.service';

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters?: Record<string, any>;
        strict?: boolean;
    };
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface ToolOutput {
    tool_call_id: string;
    output: string;
}

export class AIToolService {
    /**
     * Defines the available tools for the AI
     */
    getTools(): ToolDefinition[] {
        return [
            {
                type: 'function',
                function: {
                    name: 'send_template',
                    description: 'Sends a pre-approved message template to the user. Use this when the user intent matches one of the available templates. Returns the sent message details.',
                    parameters: {
                        type: 'object',
                        properties: {
                            template_id: {
                                type: 'string',
                                description: 'The exact ID of the template to send.',
                            },
                            variables: {
                                type: 'object',
                                description: 'Optional dictionary of variable values to replace in the template content (e.g. { "name": "Juan" })',
                                additionalProperties: { type: 'string' }
                            }
                        },
                        required: ['template_id'],
                        additionalProperties: false,
                    },
                    strict: true,
                },
            },
            {
                type: 'function',
                function: {
                    name: 'list_available_templates',
                    description: 'Lists all templates that are authorized for AI use. Call this to find the correct template_id before sending.',
                    parameters: {
                        type: 'object',
                        properties: {},
                        additionalProperties: false
                    },
                    strict: true
                }
            }
        ];
    }

    /**
     * Executes a tool call
     */
    async executeTool(
        toolCall: ToolCall,
        context: { accountId: string; conversationId: string }
    ): Promise<string> {
        const { name, arguments: argsString } = toolCall.function;
        const { accountId, conversationId } = context;

        console.log(`[AIToolService] Executing tool: ${name}`, { args: argsString, context });

        try {
            let args: any = {};
            try {
                args = JSON.parse(argsString);
            } catch (e) {
                throw new Error(`Invalid JSON arguments for tool ${name}`);
            }

            switch (name) {
                case 'send_template':
                    return await this.executeSendTemplate(args, accountId, conversationId);
                case 'list_available_templates':
                    return await this.executeListTemplates(accountId);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error: any) {
            console.error(`[AIToolService] Error executing ${name}:`, error);
            return JSON.stringify({ error: error.message });
        }
    }

    private async executeSendTemplate(
        args: { template_id: string; variables?: Record<string, string> },
        accountId: string,
        conversationId: string
    ): Promise<string> {
        if (!args.template_id) {
            throw new Error('Missing template_id');
        }

        const message = await aiTemplateService.sendAuthorizedTemplate({
            templateId: args.template_id,
            accountId,
            conversationId,
            variables: args.variables,
        });

        return JSON.stringify({
            success: true,
            message_id: message.messageId,
            status: 'sent',
            info: 'Template sent successfully to the user conversation.'
        });
    }

    private async executeListTemplates(accountId: string): Promise<string> {
        const templates = await templateService.listAITemplates(accountId);

        const simplified = templates.map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            content_preview: t.content.substring(0, 50) + '...',
            variables: t.variables.map(v => v.name)
        }));

        return JSON.stringify(simplified);
    }
}

export const aiToolService = new AIToolService();
