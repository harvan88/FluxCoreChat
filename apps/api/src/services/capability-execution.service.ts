export interface CapabilityExecutionContext {
  accountId: string;
  conversationId: string;
  userMessage: string;
  vectorStoreIds?: string[];
  authorizedTemplates?: string[];
}

import { ExecutionAction } from '../core/fluxcore-types';
import { scheduleService } from './schedule.service';
import { db, accountLocations } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export interface CapabilityExecutionResult {
  outcome: 'success' | 'not_found' | 'error';
  data?: Record<string, any>;
  actions?: ExecutionAction[];
  message?: string;
  meta?: Record<string, any>;
}

export interface CapabilityExecutionDeps {
  fetchRagContext: (accountId: string, query: string, vectorStoreIds?: string[]) => Promise<any>;
  listTemplates: (accountId: string) => Promise<Array<{ id: string; name?: string; category?: string; variables?: string[]; instructions?: string | null }>>;
  sendTemplate: (params: {
    accountId: string;
    conversationId: string;
    templateId: string;
    variables?: Record<string, string>;
  }) => Promise<{ messageId?: string; status?: string } | null>;
}

class CapabilityExecutionService {
  constructor(private readonly deps: CapabilityExecutionDeps) {}

  async executeTool(toolId: string, params: any, context: CapabilityExecutionContext): Promise<CapabilityExecutionResult> {
    try {
      switch (toolId) {
        case 'search_knowledge': {
          const query = params.query ?? context.userMessage;
          const ragResult = await this.deps.fetchRagContext(
            context.accountId,
            query,
            context.vectorStoreIds
          );

          if (!ragResult) {
            return { outcome: 'not_found', message: 'Knowledge base unavailable' };
          }

          return {
            outcome: 'success',
            data: {
              context: ragResult.context,
              sources: ragResult.sources || [],
              chunksUsed: ragResult.chunksUsed,
              totalTokens: ragResult.totalTokens,
            },
            meta: {
              ragContext: ragResult,
            },
          };
        }

        case 'send_template': {
          const templateId = params.templateId;
          if (!templateId) {
            return { outcome: 'error', message: 'templateId is required' };
          }

          if (!context.authorizedTemplates?.includes(templateId)) {
            return { outcome: 'error', message: `Template ${templateId} is not authorized` };
          }

          return {
            outcome: 'success',
            data: {
              templateId,
              status: 'queued',
            },
            actions: [
              {
                type: 'send_template',
                templateId,
                conversationId: context.conversationId,
                variables: params.variables || {},
              },
            ],
          };
        }

        case 'list_available_templates': {
          const templates = await this.deps.listTemplates(context.accountId);

          return {
            outcome: 'success',
            data: {
              templates,
            },
          };
        }

        case 'is_business_open': {
          let ownerId = params.locationId;
          let ownerType = 'location';

          // Si no se especifica sucursal, buscar la principal de la cuenta
          if (!ownerId) {
            const [mainLoc] = await db
              .select({ id: accountLocations.id })
              .from(accountLocations)
              .where(and(
                eq(accountLocations.accountId, context.accountId),
                eq(accountLocations.isDefault, true)
              ))
              .limit(1);
            
            if (mainLoc) {
              ownerId = mainLoc.id;
            } else {
              // Si no hay default, usar la primera activa
              const [anyLoc] = await db
                .select({ id: accountLocations.id })
                .from(accountLocations)
                .where(and(
                  eq(accountLocations.accountId, context.accountId),
                  eq(accountLocations.status, 'active')
                ))
                .limit(1);
              
              if (anyLoc) {
                ownerId = anyLoc.id;
              }
            }
          }

          if (!ownerId) {
            return { outcome: 'not_found', message: 'No location found for this account' };
          }

          const atDate = params.at ? new Date(params.at) : undefined;
          const result = await scheduleService.isBusinessOpen(ownerType, ownerId, atDate);

          return {
            outcome: 'success',
            data: result
          };
        }

        default:
          return { outcome: 'error', message: `Unknown tool: ${toolId}` };
      }
    } catch (error: any) {
      return { outcome: 'error', message: error?.message || 'Tool execution failed' };
    }
  }
}

export const createCapabilityExecutionService = (deps: CapabilityExecutionDeps) => new CapabilityExecutionService(deps);
