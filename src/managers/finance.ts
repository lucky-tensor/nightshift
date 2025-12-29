/**
 * Finance Manager
 *
 * Tracks costs, manages quotas, and implements fallback logic.
 *
 * ## Quota Probing Strategy
 *
 * This manager uses TWO types of probes:
 *
 * 1. **Quota-Only Probe** (Lightweight):
 *    - Fast check to see if model has quota available
 *    - Does NOT validate generative responses
 *    - Use for periodic monitoring (every 60s)
 *    - Method: `probeQuotaOnly(adapter)`
 *
 * 2. **Liveness Probe** (Expensive):
 *    - Validates service returns proper AI responses
 *    - Consumes quota (sends actual generation request)
 *    - Use SPARINGLY - only when planning to switch models
 *    - Methods: `validateModelSwitch()`, `probeLiveness()`
 *
 * ## When to Use Each Probe
 *
 * - **Quota-only**: Periodic monitoring, dashboard updates
 * - **Liveness**: Before redirecting agent to new model
 *
 * Example usage:
 * ```typescript
 * // Periodic monitoring (runs every 60s)
 * if (FinanceManager.shouldProbeQuota()) {
 *     await FinanceManager.probeQuotaOnly(adapter);
 * }
 *
 * // Before switching models
 * const canSwitch = await FinanceManager.validateModelSwitch(
 *     currentModel,
 *     targetModel,
 *     adapter
 * );
 * ```
 */

import { getStorage } from "../storage/yaml";
import type { SimpleFinanceState } from "../types";
import { logInfo, logSuccess, logWarning, logError } from "../utils/helpers";

// Rough token costs (USD per 1M tokens) - Placeholder values
const COST_PER_1M_TOKENS: Record<string, { prompt: number; completion: number }> = {
    "gemini-3-pro-high": { prompt: 1.25, completion: 3.75 },
    "gemini-3-pro-low": { prompt: 1.25, completion: 3.75 },
    "gemini-3-flash": { prompt: 0.1, completion: 0.3 },
    "claude-sonnet-thinking": { prompt: 3.0, completion: 15.0 },
    "claude-opus": { prompt: 15.0, completion: 75.0 },
    default: { prompt: 1.0, completion: 3.0 },
};

export type ModelCategory = "FAST" | "THINKING" | "PREMIUM";

export interface ModelOption {
    id: string;
    provider: "google" | "anthropic";
    category: ModelCategory;
}

const MODELS: ModelOption[] = [
    { id: "gemini-3-flash", provider: "google", category: "FAST" },
    { id: "gemini-3-pro-high", provider: "google", category: "THINKING" },
    { id: "claude-sonnet-thinking", provider: "anthropic", category: "THINKING" },
    { id: "claude-opus", provider: "anthropic", category: "PREMIUM" },
];

export interface QuotaStatus {
    available: boolean;
    error?: string;
    lastChecked: number;
}

export class FinanceManager {
    /** Set of providers currently rate-limited */
    public static rateLimitedProviders: Set<string> = new Set();

    /** Timestamp of last rate limit switch per provider */
    public static lastSwitchTime: Record<string, number> = {};

    /** Current quota status for each model */
    public static modelQuotaStatus: Record<string, QuotaStatus> = {};

    /** Timestamp of last quota probe */
    private static lastProbeTime = 0;

    /** Minimum time between quota probes (milliseconds) */
    private static readonly PROBE_INTERVAL_MS = 60000; // Re-probe every 60 seconds

    /**
     * Record the cost of an LLM operation
     *
     * Updates the global finance state with token usage and estimated cost.
     * Cost is calculated based on rough pricing estimates for each model.
     *
     * @param model - Model identifier (e.g., "claude-sonnet")
     * @param tokens - Number of tokens used
     * @returns Calculated cost in USD
     *
     * @example
     * ```typescript
     * const finance = new FinanceManager();
     * const cost = finance.recordOperation("gemini-3-flash", 1000);
     * console.log(`Cost: $${cost.toFixed(4)}`);
     * ```
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
     * Mark a provider as rate-limited
     *
     * Adds the provider to the rate-limited set and records the timestamp.
     * This triggers fallback logic to use alternative providers.
     *
     * @param provider - Provider identifier ("google" or "anthropic")
     */
    static markRateLimited(provider: string) {
        FinanceManager.rateLimitedProviders.add(provider);
        FinanceManager.lastSwitchTime[provider] = Date.now();
        logWarning(`[Finance] Provider ${provider} is rate limited. Switching groups...`);
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
    /**
     * Get the optimal model for a given category based on quota availability
     *
     * @param category - Model category (FAST, THINKING, or PREMIUM)
     * @returns Model ID string
     *
     * Implements fallback logic:
     * 1. Try to find available model in requested category
     * 2. Fall back to any available model
     * 3. Reset rate limits and use default if all blocked
     */
    getOptimalModel(category: ModelCategory): string {
        const availableModels = MODELS.filter(
            (m) => m.category === category && !FinanceManager.rateLimitedProviders.has(m.provider)
        );

        const firstAvailable = availableModels[0];
        if (firstAvailable) {
            return firstAvailable.id;
        }

        // Fallback logic
        const fallbackModels = MODELS.filter(
            (m) => !FinanceManager.rateLimitedProviders.has(m.provider)
        );
        if (fallbackModels.length > 0) {
            const categoryMatch = fallbackModels.find((m) => m.category === category);
            if (categoryMatch) return categoryMatch.id;

            const firstFallback = fallbackModels[0];
            if (firstFallback) return firstFallback.id;
        }

        // Reset rate limits if everyone is blocked
        FinanceManager.rateLimitedProviders.clear();
        return "gemini-3-flash";
    }

    /**
     * Map a persona to the appropriate model category
     *
     * Different personas require different model capabilities:
     * - PM/Reviewer: Need reasoning capabilities (THINKING)
     * - Engineer/Tester: Can use faster models (FAST)
     * - Context confused: Upgrade to THINKING for better reasoning
     *
     * @param persona - Persona name (e.g., "engineer", "pm", "reviewer")
     * @param contextConfused - If true, upgrades to THINKING category
     * @returns Model category to use
     */
    getCategoryForPersona(persona: string, contextConfused?: boolean): ModelCategory {
        if (persona === "pm" || persona === "reviewer" || contextConfused) {
            return "THINKING";
        }
        return "FAST";
    }

    /**
     * Update quota status from probe results
     *
     * Updates the internal quota tracking state based on probe results.
     * Also marks providers as rate-limited if quota is exhausted.
     *
     * @param results - Map of model name to availability status
     */
    static updateQuotaStatus(results: Record<string, { available: boolean; error?: string }>) {
        const now = Date.now();
        for (const [model, result] of Object.entries(results)) {
            FinanceManager.modelQuotaStatus[model] = {
                ...result,
                lastChecked: now,
            };

            // Update rate limited providers based on quota status
            if (!result.available) {
                // Extract provider from model name (basic heuristic)
                const provider =
                    model.includes("claude") || model.includes("gpt")
                        ? "google" // All Antigravity models come through google provider
                        : "google";
                FinanceManager.rateLimitedProviders.add(provider);
            }
        }
        FinanceManager.lastProbeTime = now;
    }

    /**
     * Get list of models with available quota
     *
     * @returns Array of model identifiers that have available quota
     */
    static getAvailableModels(): string[] {
        return Object.entries(FinanceManager.modelQuotaStatus)
            .filter(([_, status]) => status.available)
            .map(([model, _]) => model);
    }

    /**
     * Get list of models with exhausted quota
     *
     * @returns Array of model identifiers that are quota-exhausted
     */
    static getExhaustedModels(): string[] {
        return Object.entries(FinanceManager.modelQuotaStatus)
            .filter(([_, status]) => !status.available)
            .map(([model, _]) => model);
    }

    /**
     * Check if enough time has passed to re-probe quota
     *
     * Returns true if it's been more than PROBE_INTERVAL_MS since last probe.
     * This prevents excessive quota checking.
     *
     * @returns true if probe is needed, false otherwise
     */
    static shouldProbeQuota(): boolean {
        const now = Date.now();
        return now - FinanceManager.lastProbeTime > FinanceManager.PROBE_INTERVAL_MS;
    }

    /**
     * Get quota status for all models
     *
     * @returns Copy of the quota status map
     */
    static getQuotaStatus(): Record<string, QuotaStatus> {
        return { ...FinanceManager.modelQuotaStatus };
    }

    /**
     * Get the best available model with quota
     */
    /**
     * Get the best available model with quota for a given category
     *
     * @param category - Model category (FAST, THINKING, or PREMIUM)
     * @returns Model ID if available, null if no models have quota
     *
     * Priority:
     * 1. Category-matched models with available quota
     * 2. Any model with available quota
     * 3. null if no quota available
     */
    static getBestModelWithQuota(category: ModelCategory): string | null {
        const availableModels = FinanceManager.getAvailableModels();

        // Filter by category
        const categoryModels = MODELS.filter(
            (m) => m.category === category && availableModels.includes(m.id)
        );

        const firstCategoryModel = categoryModels[0];
        if (firstCategoryModel) {
            return firstCategoryModel.id;
        }

        // Fallback: any available model from same category
        const anyAvailable = MODELS.filter((m) => availableModels.includes(m.id));
        const fallback = anyAvailable.find((m) => m.category === category);

        if (fallback) return fallback.id;

        const firstAnyAvailable = anyAvailable[0];
        return firstAnyAvailable?.id || null;
    }

    /**
     * Check if we should switch models and validate the target model
     *
     * Use this before switching to a different model. It will:
     * 1. Check if current model still has quota
     * 2. If switching, run liveness check on target model
     *
     * @param currentModel - The model currently in use
     * @param targetModel - The model we want to switch to
     * @param adapter - OpenCode adapter for probing
     * @returns true if safe to switch, false if target is not live
     */
    static async validateModelSwitch(
        currentModel: string,
        targetModel: string,
        adapter: any // OpenCodeAdapter type
    ): Promise<boolean> {
        // If same model, no switch needed
        if (currentModel === targetModel) return true;

        logInfo(`[Finance] Considering switch from ${currentModel} to ${targetModel}`);

        // Run liveness check ONLY on the target model we're switching to
        const livenessResult = await adapter.probeModelLiveness(targetModel);

        if (!livenessResult.available) {
            logError(`[Finance] ✗ Cannot switch to ${targetModel}: ${livenessResult.error}`);
            return false;
        }

        logSuccess(`[Finance] ✓ ${targetModel} is live and ready`);
        return true;
    }

    /**
     * Probe all models for quota (lightweight, no liveness checks)
     *
     * Use this for periodic quota monitoring. Does NOT validate generative responses.
     */
    static async probeQuotaOnly(adapter: any): Promise<void> {
        const results = await adapter.probeAllModels({ checkLiveness: false });
        FinanceManager.updateQuotaStatus(results);
    }

    /**
     * Probe specific models with liveness check
     *
     * Use this sparingly - only when planning to switch to these models.
     */
    static async probeLiveness(adapter: any, models: string[]): Promise<void> {
        const results = await adapter.probeAllModels({ livenessModels: models });
        FinanceManager.updateQuotaStatus(results);
    }
}
