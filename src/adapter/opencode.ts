/**
 * OpenCode SDK Adapter - LLM Provider using OpenCode with Antigravity Auth
 * 
 * Uses the OpenCode SDK (@opencode-ai/sdk) with the opencode-google-antigravity-auth
 * plugin to access LLMs through Antigravity's OAuth and quota system.
 */

import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk";
import type { Session } from "@opencode-ai/sdk";
import chalk from "chalk";

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

    /**
     * Initialize the OpenCode server with Antigravity auth plugin
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // Check if server is already running
                const existingUrl = "http://127.0.0.1:4096";
                try {
                    const response = await fetch(`${existingUrl}/health`, { signal: AbortSignal.timeout(1000) });
                    if (response.ok) {
                        console.log(chalk.dim(`[DEBUG] Found existing OpenCode server at ${existingUrl}`));
                        const { createOpenCodeClient } = require("@opencode-ai/sdk");
                        this.client = createOpenCodeClient({ url: existingUrl });
                        this.initialized = true;
                        return;
                    }
                } catch (e) {
                    // Not running, proceed to create
                }

                console.log(chalk.dim("[DEBUG] Starting OpenCode server..."));
                const { client, server } = await createOpencode({
                    // Config will be inherited from current directory opencode.json
                });

                this.client = client;
                this.server = server;
                await this.waitForReady(server.url);
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
     * Poll until OpenCode server is ready
     */
    private async waitForReady(url: string, timeoutMs: number = 10000): Promise<void> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const response = await fetch(`${url}/health`);
                if (response.ok) return;
            } catch (e) {
                // Wait and retry
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error(`Timeout waiting for server to start after ${timeoutMs}ms`);
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
        console.log(chalk.dim(`[DEBUG] OpenCode Request Body: ${JSON.stringify(body)}`));

        // Send prompt
        const result = await this.client.session.prompt({
            path: { id: this.currentSession.id },
            body: body,
        });

        // Debug log full result
        console.log(chalk.dim(`[DEBUG] OpenCode Result Keys: ${Object.keys(result).join(", ")}`));
        if (result.data) console.log(chalk.dim(`[DEBUG] OpenCode Data Keys: ${Object.keys(result.data).join(", ")}`));
        if (result.response) {
            console.log(chalk.dim(`[DEBUG] OpenCode Response Status: ${(result.response as any).status}`));
            console.log(chalk.dim(`[DEBUG] OpenCode Response Keys: ${Object.keys(result.response).join(", ")}`));
            const assistantMsg = (result.response as any).info || (result.response as any).data || result.response;
            if (assistantMsg.tokens) console.log(chalk.dim(`[DEBUG] OpenCode Response Tokens: ${JSON.stringify(assistantMsg.tokens)}`));
        }

        const usage = (result as any).usage || (result as any).data?.usage || (result.response as any)?.tokens || (result.response as any)?.info?.tokens || {};
        console.log(chalk.dim(`[DEBUG] OpenCode Usage Extracted: ${JSON.stringify(usage)}`));

        if (!result || (result as any).error || (result as any).data === undefined) {
            const error = (result as any)?.error;
            const errorStr = JSON.stringify(error) || "";

            if (errorStr.toLowerCase().includes("rate limit") || errorStr.includes("429")) {
                const provider = modelConfig.providerID === 'google' ? 'google' : 'anthropic';
                const { FinanceManager } = require("../managers/finance");
                FinanceManager.markRateLimited(provider);
            }

            console.log(chalk?.dim ? chalk.dim(`[DEBUG] OpenCode result: ${errorStr}`) : `[DEBUG] OpenCode result: ${errorStr}`);
        }

        // Extract content from result
        const content = this.extractContent(result);

        // Extract tools/calls from result
        const toolCalls = this.extractToolCalls(result);

        return {
            content,
            model: options.model || this.getModelNameFromConfig(modelConfig),
            tokensUsed: usage.totalTokens || 0,
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
        return Object.keys(MODEL_MAP);
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
     * Resolve a model alias to OpenCode format
     */
    private resolveModel(
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
        }

        const mapping = MODEL_MAP[modelName];
        if (!mapping) {
            // Unknown model, try to use it directly
            return { providerID: "google", modelID: modelName };
        }

        return mapping;
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
