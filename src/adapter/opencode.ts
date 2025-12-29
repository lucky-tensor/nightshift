/**
 * OpenCode SDK Adapter - LLM Provider using OpenCode with Antigravity Auth
 * 
 * Uses the OpenCode SDK (@opencode-ai/sdk) with the opencode-google-antigravity-auth
 * plugin to access LLMs through Antigravity's OAuth and quota system.
 */

import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk";
import type { Session } from "@opencode-ai/sdk";
import chalk from "chalk";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { FinanceManager } from "../managers/finance";

// Model mapping from friendly names to OpenCode provider/model format
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
    private availableModels: Record<string, { providerID: string; modelID: string }> = { ...MODEL_MAP };

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
                    port: options.port
                });

                this.client = client;
                this.server = server;
                // Read local config for model definitions
                try {
                    const configPath = path.join(os.homedir(), ".config/opencode/opencode.json");
                    const configFile = await fs.readFile(configPath, "utf-8");
                    const config = JSON.parse(configFile);

                    if (config.provider?.google?.models) {
                        for (const [id, model] of Object.entries(config.provider.google.models)) {
                            // In the config file, keys are the model IDs used by the SDK
                            const modelConfig = {
                                providerID: "google",
                                modelID: id
                            };

                            // Helper to safely store mapping
                            const setMapping = (alias: string) => {
                                this.availableModels[alias] = modelConfig;
                            };

                            // Store by ID (exact match)
                            setMapping(id);

                            // Map friendly aliases
                            const idLower = id.toLowerCase();

                            // Claude Sonnet logic
                            if (idLower.includes("claude-sonnet")) {
                                // Prefer base 4.5 version for the generic alias, avoid thinking/high if possible
                                if (idLower.includes("4-5") && !idLower.includes("thinking") && !idLower.includes("high")) {
                                    setMapping("claude-sonnet");
                                } else if (!this.availableModels["claude-sonnet"]) {
                                    // Fallback if we haven't found a better one yet
                                    setMapping("claude-sonnet");
                                }
                            }

                            // Claude Opus
                            if (idLower.includes("claude-opus")) setMapping("claude-opus");

                            // Gemini Flash
                            if (idLower.includes("gemini-3-flash")) setMapping("gemini-3-flash");
                            if (idLower.includes("gemini-1.5-flash")) setMapping("gemini-1.5-flash");

                            // Gemini Pro
                            if (idLower.includes("gemini-3-pro")) {
                                if (idLower.includes("high")) setMapping("gemini-3-pro-high");
                                else if (idLower.includes("low")) setMapping("gemini-3-pro-low");
                                else if (!this.availableModels["gemini-3-pro"]) setMapping("gemini-3-pro");
                            }
                        }
                    }

                    console.log(chalk.blue(`[INFO] Loaded ${Object.keys(this.availableModels).length} model mappings from local config`));
                    if (this.availableModels["gemini-3-flash"]) {
                        console.log(chalk.blue(`[INFO] Mapping gemini-3-flash -> ${JSON.stringify(this.availableModels["gemini-3-flash"])}`));
                    }
                    if (this.availableModels["claude-sonnet"]) {
                        console.log(chalk.blue(`[INFO] Mapping claude-sonnet -> ${JSON.stringify(this.availableModels["claude-sonnet"])}`));
                    }
                } catch (configError) {
                    console.warn(chalk.yellow(`[WARN] Failed to load local opencode config: ${configError}`));
                    console.warn(chalk.yellow(`[WARN] Falling back to default static mappings`));
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
    resolveModel(
        model?: string,
        persona?: string
    ): { providerID: string; modelID: string } {
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
    async sendMessage(
        message: string,
        options: SendMessageOptions = {}
    ): Promise<LLMResponse> {
        if (!this.client) {
            throw new Error("OpenCode not initialized. Call initialize() first.");
        }

        // Create session if needed
        if (!this.currentSession) {
            const res = await this.client.session.create({
                body: { title: `Dark Factory Session ${Date.now()}` },
            });
            if (res.error) throw new Error(`Failed to create session: ${JSON.stringify(res.error)}`);
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

        if (!result || (result as any).error || (result as any).data === undefined || Object.keys((result as any).data || {}).length === 0) {
            const error = (result as any)?.error || (result as any).data?.info?.error || (result as any).data?.error;
            const errorStr = error ? JSON.stringify(error) : "Empty response from OpenCode";

            if (errorStr.toLowerCase().includes("rate limit") || errorStr.includes("429")) {
                const provider = modelConfig.providerID === 'google' ? 'google' : 'anthropic';
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
        for (const [name, mapping] of Object.entries(MODEL_MAP)) {
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
