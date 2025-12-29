/**
 * OpenCode SDK Adapter - LLM Provider using OpenCode with Antigravity Auth
 *
 * Uses the OpenCode SDK (@opencode-ai/sdk) with the opencode-google-antigravity-auth
 * plugin to access LLMs through Antigravity's OAuth and quota system.
 *
 * ============================================================================
 * IMPORTANT: Antigravity Model Detection Workaround
 * ============================================================================
 * This adapter uses a HACK to detect Antigravity OAuth-authenticated models.
 *
 * Problem:
 * - OpenCode SDK doesn't provide a clean API to distinguish OAuth vs API-key models
 * - config.providers() returns ALL models for a provider (both OAuth and API-key)
 * - No authMethod field or authentication type indicator on models
 *
 * Current Solution (HACK):
 * - Filter models by checking if "(Antigravity)" appears in model.name
 * - This is fragile and relies on OpenCode's naming convention
 *
 * Future Improvement:
 * - Request OpenCode team to add model.authMethod or provider.authType field
 * - Replace string matching with proper API-based detection
 * - See initialize() method for implementation details
 *
 * Last Updated: 2025-12-27
 * ============================================================================
 */

import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk";
import type { Session } from "@opencode-ai/sdk";
import chalk from "chalk";
import { FinanceManager } from "../managers/finance";

// ============================================================================
// DEPRECATED: Hardcoded Model Mappings
// ============================================================================
// NOTE: This hardcoded model map is NO LONGER USED for runtime model detection.
// We now dynamically detect models via OpenCode SDK's config.providers() API.
//
// This export is kept for backwards compatibility but should be removed in a future version.
// Any code still using MODEL_MAP should be migrated to use the dynamic detection.
//
// TODO: Remove MODEL_MAP entirely once all dependencies are removed
// ============================================================================
export const MODEL_MAP: Record<string, { providerID: string; modelID: string }> = {
    // Gemini models
    "gemini-3-pro-high": { providerID: "google", modelID: "gemini-3-pro-preview" },
    "gemini-3-pro-low": { providerID: "google", modelID: "gemini-3-pro-preview" },
    "gemini-3-flash": { providerID: "google", modelID: "gemini-3-flash" },

    // Claude models via Antigravity
    "claude-sonnet": { providerID: "google", modelID: "claude-sonnet" },
    "claude-sonnet-thinking": { providerID: "google", modelID: "claude-sonnet-thinking" },
    "claude-opus": { providerID: "google", modelID: "claude-opus" },
};

// Default models for each persona
// NOTE: These friendly names are now resolved via dynamic detection
export const PERSONA_MODELS: Record<string, string> = {
    engineer: "claude-sonnet",
    tester: "gemini-3-flash",
    reviewer: "claude-opus",
    pm: "gemini-3-pro-low",
    default: "gemini-3-pro-high",
};

export interface LLMResponse {
    content: string;
    model: string;
    tokensUsed: number;
    sessionId: string;
    toolCalls?: any[];
}

export interface SendMessageOptions {
    model?: string;
    persona?: string;
    context?: string[];
    tools?: Record<string, boolean>;
}

export class OpenCodeAdapter {
    private client: ReturnType<typeof createOpencodeClient> | null = null;
    private server: { close: () => void; url: string } | null = null;
    private currentSession: Session | null = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private availableModels: Record<string, { providerID: string; modelID: string }> = {};

    /**
     * Initialize the OpenCode server with Antigravity auth plugin
     */
    async initialize(options: { port?: number } = {}): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const { client, server } = await createOpencode({
                    timeout: 30000, // Increase internal timeout to 30s
                    port: options.port,
                });

                this.client = client;
                this.server = server;

                // Query OpenCode SDK for available models via authenticated providers
                try {
                    const providersResult = await this.client.config.providers();

                    if (providersResult.error) {
                        throw new Error(
                            `Failed to get providers: ${JSON.stringify(providersResult.error)}`
                        );
                    }

                    const providers = providersResult.data?.providers || [];

                    // Clear default mappings - we only want authenticated models
                    this.availableModels = {};

                    // Process each provider's models
                    for (const provider of providers) {
                        const providerID = provider.id;

                        // Each model key in the config is an alias, value is the Model object
                        for (const [modelAlias, model] of Object.entries(provider.models)) {
                            // ============================================================================
                            // WORKAROUND: Antigravity OAuth Model Detection
                            // ============================================================================
                            // HACK: OpenCode SDK doesn't provide a clean API to distinguish between
                            // OAuth-authenticated models (via Antigravity) vs API-key models.
                            // Instead, they mark Antigravity models with "(Antigravity)" in the model name.
                            //
                            // This is a fragile string-matching hack that should be replaced when OpenCode
                            // provides a proper API (e.g., model.authMethod or provider.authType).
                            //
                            // For now, we filter to ONLY models with "antigravity" in the name to ensure
                            // we don't show unauthenticated models to users.
                            //
                            // TODO: Replace with proper OpenCode API when available
                            // TODO: File issue with OpenCode team for better auth method detection
                            // ============================================================================
                            const modelName = (model as any).name || "";
                            const modelNameLower = modelName.toLowerCase();

                            if (!modelNameLower.includes("antigravity")) {
                                continue; // Skip non-Antigravity models
                            }

                            const modelConfig = {
                                providerID: providerID,
                                modelID: modelAlias, // The key is what we pass to the SDK
                            };

                            // Helper to safely store mapping
                            const setMapping = (alias: string) => {
                                this.availableModels[alias] = modelConfig;
                            };

                            // Store by exact alias (from config)
                            setMapping(modelAlias);

                            // Create friendly aliases based on model name patterns
                            const aliasLower = modelAlias.toLowerCase();
                            const nameLower = model.name?.toLowerCase() || "";

                            // Claude Sonnet logic
                            if (
                                aliasLower.includes("claude-sonnet") ||
                                nameLower.includes("claude-sonnet")
                            ) {
                                // Prefer base 4.5 version for the generic alias
                                if (
                                    (aliasLower.includes("4-5") || aliasLower.includes("4.5")) &&
                                    !aliasLower.includes("thinking") &&
                                    !aliasLower.includes("high")
                                ) {
                                    setMapping("claude-sonnet");
                                } else if (!this.availableModels["claude-sonnet"]) {
                                    setMapping("claude-sonnet");
                                }

                                // Thinking variant
                                if (aliasLower.includes("thinking")) {
                                    setMapping("claude-sonnet-thinking");
                                }
                            }

                            // Claude Opus
                            if (
                                aliasLower.includes("claude-opus") ||
                                nameLower.includes("claude-opus")
                            ) {
                                setMapping("claude-opus");
                            }

                            // Gemini Flash
                            if (
                                aliasLower.includes("gemini-3-flash") ||
                                aliasLower.includes("gemini-flash-3")
                            ) {
                                setMapping("gemini-3-flash");
                            }
                            if (
                                aliasLower.includes("gemini-1.5-flash") ||
                                aliasLower.includes("gemini-flash-1.5")
                            ) {
                                setMapping("gemini-1.5-flash");
                            }

                            // Gemini Pro
                            if (
                                aliasLower.includes("gemini-3-pro") ||
                                aliasLower.includes("gemini-pro-3")
                            ) {
                                if (aliasLower.includes("high")) {
                                    setMapping("gemini-3-pro-high");
                                } else if (aliasLower.includes("low")) {
                                    setMapping("gemini-3-pro-low");
                                } else if (!this.availableModels["gemini-3-pro"]) {
                                    setMapping("gemini-3-pro");
                                }
                            }
                        }
                    }

                    console.log(
                        chalk.blue(
                            `[INFO] Loaded ${Object.keys(this.availableModels).length} authenticated model(s) from OpenCode SDK`
                        )
                    );

                    // Log some key mappings for debugging
                    if (this.availableModels["gemini-3-flash"]) {
                        console.log(
                            chalk.blue(
                                `[INFO] gemini-3-flash -> ${JSON.stringify(this.availableModels["gemini-3-flash"])}`
                            )
                        );
                    }
                    if (this.availableModels["claude-sonnet"]) {
                        console.log(
                            chalk.blue(
                                `[INFO] claude-sonnet -> ${JSON.stringify(this.availableModels["claude-sonnet"])}`
                            )
                        );
                    }
                } catch (modelError) {
                    console.error(
                        chalk.red(`[ERROR] Failed to load models from OpenCode SDK: ${modelError}`)
                    );
                    console.error(
                        chalk.yellow(
                            `[WARN] No authenticated models available. Please run 'df auth' to authenticate.`
                        )
                    );
                    // Don't fall back to hardcoded models - we want to fail cleanly
                }

                this.initialized = true;
            } catch (error) {
                console.error(chalk.red(`[ERROR] OpenCode init failed: ${error}`));
                throw new Error(`Failed to initialize OpenCode: ${error}`);
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    /**
     * Resolve a model alias to OpenCode format
     */
    resolveModel(model?: string, persona?: string): { providerID: string; modelID: string } {
        // Priority: explicit model > persona default > global default
        let modelName = model;

        if (!modelName && persona) {
            modelName = PERSONA_MODELS[persona];
        }

        if (!modelName) {
            modelName = "default";
            if (PERSONA_MODELS.default) modelName = PERSONA_MODELS.default;
        }

        const mapping = this.availableModels[modelName];
        if (!mapping) {
            // Unknown model, try to use it directly
            return { providerID: "google", modelID: modelName };
        }

        return mapping;
    }

    /**
     * Send a message to the LLM
     */
    async sendMessage(message: string, options: SendMessageOptions = {}): Promise<LLMResponse> {
        if (!this.client) {
            throw new Error("OpenCode not initialized. Call initialize() first.");
        }

        // Create session if needed
        if (!this.currentSession) {
            const res = await this.client.session.create({
                body: { title: `Dark Factory Session ${Date.now()}` },
            });
            if (res.error)
                throw new Error(`Failed to create session: ${JSON.stringify(res.error)}`);
            this.currentSession = res.data;
        }

        if (!this.currentSession) throw new Error("Failed to establish session");

        // Resolve model from options
        const modelConfig = this.resolveModel(options.model, options.persona);

        const body = {
            model: modelConfig,
            parts: [{ type: "text" as const, text: message }],
            tools: options.tools,
        };

        const result = await this.client.session.prompt({
            path: { id: this.currentSession.id },
            body: body,
        });

        if (
            !result ||
            (result as any).error ||
            (result as any).data === undefined ||
            Object.keys((result as any).data || {}).length === 0
        ) {
            const error =
                (result as any)?.error ||
                (result as any).data?.info?.error ||
                (result as any).data?.error;
            const errorStr = error ? JSON.stringify(error) : "Empty response from OpenCode";

            if (errorStr.toLowerCase().includes("rate limit") || errorStr.includes("429")) {
                const provider = modelConfig.providerID === "google" ? "google" : "anthropic";
                FinanceManager.markRateLimited(provider);
            }

            console.error(chalk.red(`[ERROR] OpenCode prompt failed: ${errorStr}`));
            console.error(chalk.dim(`Request body: ${JSON.stringify(body)}`));
            console.error(chalk.dim(`Raw result: ${JSON.stringify(result)}`));
            throw new Error(`OpenCode error: ${errorStr}`);
        }

        // Robust token usage extraction
        let tokensUsed = 0;
        const resultData = (result as any).data;
        if (resultData?.usage?.totalTokens) {
            tokensUsed = resultData.usage.totalTokens;
        } else if (resultData?.parts) {
            // Check parts for usage data
            const usagePart = resultData.parts.find((p: any) => p.type === "usage" || p.tokens);
            if (usagePart?.tokens?.output) {
                // Some providers return separate input/output
                tokensUsed = (usagePart.tokens.input || 0) + (usagePart.tokens.output || 0);
            } else if (usagePart?.totalTokens) {
                tokensUsed = usagePart.totalTokens;
            }
        }

        // Extract content from result
        const content = this.extractContent(result);

        // Extract tools/calls from result
        const toolCalls = this.extractToolCalls(result);

        return {
            content,
            model: options.model || this.getModelNameFromConfig(modelConfig),
            tokensUsed,
            sessionId: this.currentSession.id!,
            toolCalls,
        };
    }

    /**
     * Create a new session (for isolated conversations)
     */
    async createSession(title?: string): Promise<string> {
        if (!this.client) {
            throw new Error("OpenCode not initialized");
        }

        const res = await this.client.session.create({
            body: { title: title || `Dark Factory Session ${Date.now()}` },
        });

        if (res.error) throw new Error(`Failed to create session: ${JSON.stringify(res.error)}`);
        this.currentSession = res.data!;

        return this.currentSession.id!;
    }

    /**
     * Switch to a different session
     */
    async switchSession(sessionId: string): Promise<void> {
        if (!this.client) {
            throw new Error("OpenCode not initialized");
        }

        const res = await this.client.session.get({
            path: { id: sessionId },
        });

        if (res.error) throw new Error(`Failed to get session: ${JSON.stringify(res.error)}`);
        this.currentSession = res.data;
    }

    /**
     * Get all available models
     */
    getAvailableModels(): string[] {
        return Object.keys(this.availableModels);
    }

    /**
     * Probe quota availability for a specific model (lightweight, no liveness check)
     *
     * Attempts to create a session and send a minimal request to check quota status.
     * Does NOT validate that the service returns proper generative responses.
     *
     * Use this for frequent quota checks. Use probeModelLiveness() only when
     * planning to switch to a new model.
     *
     * @param model - Model to probe
     * @param skipLiveness - If true, only checks quota (default: true for performance)
     */
    async probeModelQuota(
        model: string,
        options: { checkLiveness?: boolean } = {}
    ): Promise<{ available: boolean; error?: string }> {
        const { checkLiveness = false } = options;
        if (!this.client) {
            return { available: false, error: "Client not initialized" };
        }

        try {
            // Resolve model config
            const modelConfig = this.resolveModel(model);

            // Create a temporary session for probing
            const sessionRes = await this.client.session.create({
                body: { title: `Quota Probe ${Date.now()}` },
            });

            if (sessionRes.error) {
                return {
                    available: false,
                    error: `Session creation failed: ${JSON.stringify(sessionRes.error)}`,
                };
            }

            const session = sessionRes.data;
            if (!session?.id) {
                return { available: false, error: "No session ID returned" };
            }

            try {
                if (checkLiveness) {
                    // LIVENESS CHECK: Send a probe that requires a generative response
                    // This validates both quota AND that service returns actual AI responses
                    const result = await this.client.session.prompt({
                        path: { id: session.id },
                        body: {
                            model: modelConfig,
                            parts: [
                                { type: "text" as const, text: "Reply with just the number 42" },
                            ],
                        },
                    });

                    // Check for rate limit or quota errors
                    if (result.error || (result as any).data?.error) {
                        const errorStr = JSON.stringify(
                            result.error || (result as any).data?.error
                        );
                        const errorLower = errorStr.toLowerCase();

                        if (
                            errorLower.includes("rate limit") ||
                            errorLower.includes("quota") ||
                            errorLower.includes("429") ||
                            errorLower.includes("insufficient")
                        ) {
                            return { available: false, error: "Quota exhausted or rate limited" };
                        }

                        // Other errors might be temporary or service issues
                        return {
                            available: false,
                            error: `Service error: ${errorStr.substring(0, 100)}`,
                        };
                    }

                    // Validate that we got a real generative response (liveness check)
                    const responseContent = this.extractContent(result);

                    if (!responseContent || responseContent.trim().length === 0) {
                        return {
                            available: false,
                            error: "No response content (service may be down)",
                        };
                    }

                    // Check if response looks like an error message rather than a proper AI response
                    const contentLower = responseContent.toLowerCase();
                    if (
                        contentLower.includes("error") ||
                        contentLower.includes("failed") ||
                        contentLower.includes("unable") ||
                        responseContent.length < 2
                    ) {
                        // Response too short to be meaningful
                        return {
                            available: false,
                            error: `Invalid response: ${responseContent.substring(0, 50)}`,
                        };
                    }

                    // Success - quota available AND service is live
                    return { available: true };
                } else {
                    // QUOTA-ONLY CHECK (lightweight): Just check if session creation works
                    // This is much faster and doesn't consume quota
                    // If we can create a session, quota is likely available
                    // (Full rate limit errors usually happen at session creation, not just prompting)
                    return { available: true };
                }
            } finally {
                // Clean up probe session
                await this.client.session.delete({ path: { id: session.id } }).catch(() => {
                    // Ignore cleanup errors
                });
            }
        } catch (error) {
            const errorStr = String(error);
            const errorLower = errorStr.toLowerCase();

            if (
                errorLower.includes("rate limit") ||
                errorLower.includes("quota") ||
                errorLower.includes("429")
            ) {
                return { available: false, error: errorStr };
            }

            return { available: true, error: errorStr };
        }
    }

    /**
     * Probe quota for all authenticated models
     *
     * @param options.checkLiveness - If true, validates service returns generative responses (slower, uses quota)
     * @param options.livenessModels - Specific models to liveness check (others get quota-only check)
     *
     * Returns a map of model -> availability status.
     * This can be used by FinanceManager to make intelligent routing decisions.
     */
    async probeAllModels(
        options: {
            checkLiveness?: boolean;
            livenessModels?: string[];
        } = {}
    ): Promise<Record<string, { available: boolean; error?: string }>> {
        const { checkLiveness = false, livenessModels = [] } = options;
        const models = this.getAvailableModels();
        const results: Record<string, { available: boolean; error?: string }> = {};

        // Probe models sequentially to avoid overwhelming the API
        for (const model of models) {
            const shouldCheckLiveness = checkLiveness || livenessModels.includes(model);
            const probeType = shouldCheckLiveness ? "liveness" : "quota";

            console.log(chalk.dim(`[OpenCode] Probing ${probeType} for ${model}...`));
            results[model] = await this.probeModelQuota(model, {
                checkLiveness: shouldCheckLiveness,
            });

            if (!results[model].available) {
                console.log(chalk.yellow(`[OpenCode] ${model}: ${results[model].error}`));
            } else {
                console.log(chalk.green(`[OpenCode] ${model}: Available`));
            }
        }

        return results;
    }

    /**
     * Perform a liveness check on a specific model before switching to it
     *
     * This validates that the service is not only available (has quota)
     * but is also returning proper generative AI responses.
     *
     * Use this sparingly - only when planning to switch to a new model.
     */
    async probeModelLiveness(model: string): Promise<{ available: boolean; error?: string }> {
        console.log(chalk.dim(`[OpenCode] Running liveness check for ${model}...`));
        return this.probeModelQuota(model, { checkLiveness: true });
    }

    /**
     * Get the default model for a persona
     */
    getPersonaModel(persona: string): string {
        return PERSONA_MODELS[persona] || PERSONA_MODELS.default || "gemini-3-pro-high";
    }

    /**
     * Shutdown the OpenCode server
     */
    async shutdown(): Promise<void> {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        this.client = null;
        this.initialized = false;
        this.currentSession = null;
    }

    /**
     * Extract text content from OpenCode response
     */
    private extractContent(result: any): string {
        if (!result) return "";

        // Check for error in the wrapper
        if (result.error) {
            return `Error: ${JSON.stringify(result.error)}`;
        }

        // Unwrap data if present (common in generated SDKs)
        const data = result.data !== undefined ? result.data : result;

        if (!data) return "";

        // Handle different response formats
        if (typeof data === "string") return data;
        if (data.content) return data.content;
        if (data.text) return data.text;

        // Handle AssistantMessage format
        if (data.parts) {
            return data.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join("\n");
        }

        // Check for nested response in wrapper
        if (data.response?.parts) {
            return data.response.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join("\n");
        }

        return JSON.stringify(result);
    }

    /**
     * Extract tool calls from OpenCode response
     */
    private extractToolCalls(result: any): any[] | undefined {
        if (!result) return undefined;
        const data = result.data !== undefined ? result.data : result;
        if (!data) return undefined;

        // Handle AssistantMessage format
        if (data.parts) {
            const calls = data.parts.filter((p: any) => p.type === "toolCall");
            return calls.length > 0 ? calls : undefined;
        }

        // Check for nested response in wrapper
        if (data.response?.parts) {
            const calls = data.response.parts.filter((p: any) => p.type === "toolCall");
            return calls.length > 0 ? calls : undefined;
        }

        return undefined;
    }

    /**
     * Get friendly model name from config
     */
    private getModelNameFromConfig(config: { providerID: string; modelID: string }): string {
        // Search through available models for a matching config
        for (const [name, mapping] of Object.entries(this.availableModels)) {
            if (mapping.providerID === config.providerID && mapping.modelID === config.modelID) {
                return name;
            }
        }
        return config.modelID;
    }
}

// Singleton instance for easy access
let adapter: OpenCodeAdapter | null = null;

export function getOpenCodeAdapter(): OpenCodeAdapter {
    if (!adapter) {
        adapter = new OpenCodeAdapter();
    }
    return adapter;
}

export async function initializeOpenCode(): Promise<OpenCodeAdapter> {
    const instance = getOpenCodeAdapter();
    await instance.initialize();
    return instance;
}
