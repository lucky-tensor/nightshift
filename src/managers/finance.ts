/**
 * Finance Manager
 * 
 * Tracks costs, manages quotas, and implements fallback logic.
 */

import { getStorage } from "../storage/yaml";
import type { SimpleFinanceState } from "../types";
import chalk from "chalk";

// Rough token costs (USD per 1M tokens) - Placeholder values
const COST_PER_1M_TOKENS: Record<string, { prompt: number, completion: number }> = {
    "gemini-3-pro-high": { prompt: 1.25, completion: 3.75 },
    "gemini-3-pro-low": { prompt: 1.25, completion: 3.75 },
    "gemini-3-flash": { prompt: 0.10, completion: 0.30 },
    "claude-sonnet-thinking": { prompt: 3.00, completion: 15.00 },
    "claude-opus": { prompt: 15.00, completion: 75.00 },
    "default": { prompt: 1.00, completion: 3.00 }
};

export type ModelCategory = 'FAST' | 'THINKING' | 'PREMIUM';

export interface ModelOption {
    id: string;
    provider: 'google' | 'anthropic';
    category: ModelCategory;
}

const MODELS: ModelOption[] = [
    { id: "gemini-3-flash", provider: 'google', category: 'FAST' },
    { id: "gemini-3-pro-high", provider: 'google', category: 'THINKING' },
    { id: "claude-sonnet-thinking", provider: 'anthropic', category: 'THINKING' },
    { id: "claude-opus", provider: 'anthropic', category: 'PREMIUM' }
];

export class FinanceManager {
    public static rateLimitedProviders: Set<string> = new Set();
    public static lastSwitchTime: Record<string, number> = {};

    /**
     * Record the cost of an LLM operation
     */
    recordOperation(model: string, tokens: number): number {
        const storage = getStorage();
        if (!storage) return 0;

        const costConfig = COST_PER_1M_TOKENS[model] || COST_PER_1M_TOKENS.default;

        if (!costConfig) throw new Error("Critical: Default cost config missing");

        const cost = (tokens / 1000000) * ((costConfig.prompt + costConfig.completion) / 2);
        storage.finance.recordCost(model, tokens, cost);
        return cost;
    }

    /**
     * Track rate limits
     */
    static markRateLimited(provider: string) {
        FinanceManager.rateLimitedProviders.add(provider);
        FinanceManager.lastSwitchTime[provider] = Date.now();
        console.log(chalk.yellow(`[Finance] Provider ${provider} is rate limited. Switching groups...`));
    }

    /**
     * Get current project budget status
     */
    getBudgetStatus(): SimpleFinanceState | undefined {
        const storage = getStorage();
        return storage?.finance.getState();
    }

    /**
     * Get the best model based on category and current availability
     */
    getOptimalModel(category: ModelCategory): string {
        const availableModels = MODELS.filter(m =>
            m.category === category && !FinanceManager.rateLimitedProviders.has(m.provider)
        );

        if (availableModels.length > 0) {
            return availableModels[0].id;
        }

        // Fallback logic
        const fallbackModels = MODELS.filter(m => !FinanceManager.rateLimitedProviders.has(m.provider));
        if (fallbackModels.length > 0) {
            const categoryMatch = fallbackModels.find(m => m.category === category);
            if (categoryMatch) return categoryMatch.id;
            return fallbackModels[0].id;
        }

        // Reset rate limits if everyone is blocked
        FinanceManager.rateLimitedProviders.clear();
        return "gemini-3-flash";
    }

    /**
     * Persona to Category mapping
     */
    getCategoryForPersona(persona: string, contextConfused?: boolean): ModelCategory {
        if (persona === 'pm' || persona === 'reviewer' || contextConfused) {
            return 'THINKING';
        }
        return 'FAST';
    }
}
