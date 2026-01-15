/**
 * Usage & Billing Service
 * 
 * Tracking de uso de recursos y gestión de créditos.
 * RAG-010: Billing y Usage Tracking
 */

import { db } from '@fluxcore/db';
import {
    fluxcoreUsageLogs,
    fluxcoreAccountCredits,
    fluxcoreCreditTransactions,
    type NewFluxcoreUsageLog,
    type FluxcoreAccountCredits,
    type ResourceType,
    type UsageSummary,
    type AccountBillingInfo,
    type PlanType,
} from '@fluxcore/db';
import { eq, and, gte, sql } from 'drizzle-orm';

// ════════════════════════════════════════════════════════════════════════════
// Plan Limits
// ════════════════════════════════════════════════════════════════════════════

const PLAN_LIMITS: Record<PlanType, { monthlyCredits: number; dailyCredits: number }> = {
    free: { monthlyCredits: 100, dailyCredits: 10 },
    starter: { monthlyCredits: 1000, dailyCredits: 100 },
    pro: { monthlyCredits: 10000, dailyCredits: 1000 },
    enterprise: { monthlyCredits: Infinity, dailyCredits: Infinity },
};

// ════════════════════════════════════════════════════════════════════════════
// Main Service
// ════════════════════════════════════════════════════════════════════════════

export class UsageService {
    /**
     * Registra uso de un recurso y descuenta créditos
     */
    async logUsage(
        accountId: string,
        resourceType: ResourceType,
        operation: string,
        metrics: {
            tokensUsed?: number;
            chunksProcessed?: number;
            processingTimeMs?: number;
            provider?: string;
            model?: string;
            resourceId?: string;
        }
    ): Promise<{ logId: string; creditsUsed: number; remainingBalance: number }> {
        // Calcular costo basado en tokens
        const costPerToken = this.getCostPerToken(resourceType, metrics.provider);
        const creditsUsed = (metrics.tokensUsed || 0) * costPerToken;

        // Crear log
        const [log] = await db.insert(fluxcoreUsageLogs).values({
            accountId,
            resourceType,
            operation,
            tokensUsed: metrics.tokensUsed || 0,
            chunksProcessed: metrics.chunksProcessed || 0,
            processingTimeMs: metrics.processingTimeMs || 0,
            costCredits: String(creditsUsed),
            provider: metrics.provider,
            model: metrics.model,
            resourceId: metrics.resourceId,
        }).returning();

        // Descontar créditos
        const credits = await this.deductCredits(accountId, creditsUsed, log.id);

        return {
            logId: log.id,
            creditsUsed,
            remainingBalance: credits.remainingBalance,
        };
    }

    /**
     * Obtiene o crea registro de créditos para una cuenta
     */
    async getOrCreateCredits(accountId: string): Promise<FluxcoreAccountCredits> {
        let [credits] = await db
            .select()
            .from(fluxcoreAccountCredits)
            .where(eq(fluxcoreAccountCredits.accountId, accountId))
            .limit(1);

        if (!credits) {
            [credits] = await db.insert(fluxcoreAccountCredits).values({
                accountId,
                balanceCredits: '100', // Créditos iniciales gratis
                planType: 'free',
                monthlyLimitCredits: String(PLAN_LIMITS.free.monthlyCredits),
                dailyLimitCredits: String(PLAN_LIMITS.free.dailyCredits),
            }).returning();
        }

        return credits;
    }

    /**
     * Obtiene información de billing de una cuenta
     */
    async getBillingInfo(accountId: string): Promise<AccountBillingInfo> {
        const credits = await this.getOrCreateCredits(accountId);

        const balance = parseFloat(credits.balanceCredits || '0');
        const usedThisMonth = parseFloat(credits.usedThisMonth || '0');
        const monthlyLimit = credits.monthlyLimitCredits
            ? parseFloat(credits.monthlyLimitCredits)
            : undefined;

        return {
            accountId,
            planType: credits.planType as PlanType,
            balanceCredits: balance,
            usedThisMonth,
            monthlyLimit,
            usagePercentage: monthlyLimit ? (usedThisMonth / monthlyLimit) * 100 : 0,
        };
    }

    /**
     * Añade créditos a una cuenta (compra o bonus)
     */
    async addCredits(
        accountId: string,
        amount: number,
        type: 'purchase' | 'bonus' | 'refund',
        description?: string,
        stripePaymentIntentId?: string
    ): Promise<{ newBalance: number }> {
        const credits = await this.getOrCreateCredits(accountId);
        const currentBalance = parseFloat(credits.balanceCredits || '0');
        const newBalance = currentBalance + amount;

        // Actualizar saldo
        await db.update(fluxcoreAccountCredits)
            .set({ balanceCredits: String(newBalance) })
            .where(eq(fluxcoreAccountCredits.accountId, accountId));

        // Registrar transacción
        await db.insert(fluxcoreCreditTransactions).values({
            accountId,
            transactionType: type,
            amountCredits: String(amount),
            description: description || `${type}: ${amount} créditos`,
            stripePaymentIntentId,
            balanceAfter: String(newBalance),
        });

        return { newBalance };
    }

    /**
     * Obtiene resumen de uso del mes actual
     */
    async getMonthlyUsage(accountId: string): Promise<UsageSummary[]> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const result = await db
            .select({
                resourceType: fluxcoreUsageLogs.resourceType,
                totalTokens: sql<number>`SUM(${fluxcoreUsageLogs.tokensUsed})`,
                totalCost: sql<number>`SUM(${fluxcoreUsageLogs.costCredits})`,
                operationCount: sql<number>`COUNT(*)`,
            })
            .from(fluxcoreUsageLogs)
            .where(and(
                eq(fluxcoreUsageLogs.accountId, accountId),
                gte(fluxcoreUsageLogs.createdAt, startOfMonth)
            ))
            .groupBy(fluxcoreUsageLogs.resourceType);

        return result.map(r => ({
            resourceType: r.resourceType as ResourceType,
            totalTokens: Number(r.totalTokens) || 0,
            totalCost: Number(r.totalCost) || 0,
            operationCount: Number(r.operationCount) || 0,
        }));
    }

    /**
     * Verifica si la cuenta tiene créditos suficientes
     */
    async hasCredits(accountId: string, requiredCredits = 0): Promise<boolean> {
        const credits = await this.getOrCreateCredits(accountId);
        const balance = parseFloat(credits.balanceCredits || '0');
        return balance >= requiredCredits;
    }

    /**
     * Verifica límites de uso
     */
    async checkLimits(accountId: string): Promise<{
        withinLimits: boolean;
        monthlyUsagePercent: number;
        dailyUsagePercent: number;
    }> {
        const credits = await this.getOrCreateCredits(accountId);

        const monthlyLimit = parseFloat(credits.monthlyLimitCredits || '0');
        const dailyLimit = parseFloat(credits.dailyLimitCredits || '0');
        const usedMonth = parseFloat(credits.usedThisMonth || '0');
        const usedToday = parseFloat(credits.usedToday || '0');

        const monthlyUsagePercent = monthlyLimit > 0 ? (usedMonth / monthlyLimit) * 100 : 0;
        const dailyUsagePercent = dailyLimit > 0 ? (usedToday / dailyLimit) * 100 : 0;

        return {
            withinLimits: monthlyUsagePercent < 100 && dailyUsagePercent < 100,
            monthlyUsagePercent,
            dailyUsagePercent,
        };
    }

    /**
     * Resetea uso diario (llamar via cron job a medianoche)
     */
    async resetDailyUsage(): Promise<void> {
        await db.update(fluxcoreAccountCredits)
            .set({ usedToday: '0' });
    }

    /**
     * Resetea uso mensual (llamar via cron job el 1ro del mes)
     */
    async resetMonthlyUsage(): Promise<void> {
        await db.update(fluxcoreAccountCredits)
            .set({ usedThisMonth: '0' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private
    // ──────────────────────────────────────────────────────────────────────────

    private getCostPerToken(resourceType: ResourceType, provider?: string): number {
        // Precios por defecto (en créditos por token)
        const prices: Record<string, number> = {
            'embedding:openai': 0.0001,
            'embedding:cohere': 0.00008,
            'embedding:default': 0.0001,
            'retrieval:default': 0.0002,
            'document_processing:default': 0.0001,
            'storage:default': 0,
            'api_call:default': 0,
        };

        const key = provider ? `${resourceType}:${provider}` : `${resourceType}:default`;
        return prices[key] || prices[`${resourceType}:default`] || 0;
    }

    private async deductCredits(
        accountId: string,
        amount: number,
        usageLogId: string
    ): Promise<{ remainingBalance: number }> {
        const credits = await this.getOrCreateCredits(accountId);
        const currentBalance = parseFloat(credits.balanceCredits || '0');
        const usedMonth = parseFloat(credits.usedThisMonth || '0');
        const usedToday = parseFloat(credits.usedToday || '0');

        const newBalance = Math.max(0, currentBalance - amount);

        await db.update(fluxcoreAccountCredits)
            .set({
                balanceCredits: String(newBalance),
                usedThisMonth: String(usedMonth + amount),
                usedToday: String(usedToday + amount),
            })
            .where(eq(fluxcoreAccountCredits.accountId, accountId));

        // Registrar transacción
        await db.insert(fluxcoreCreditTransactions).values({
            accountId,
            transactionType: 'usage',
            amountCredits: String(-amount),
            usageLogId,
            balanceAfter: String(newBalance),
        });

        return { remainingBalance: newBalance };
    }
}

// Singleton export
export const usageService = new UsageService();
