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
    "gemini-3-flash-high": { providerID: "google", modelID: "gemini-3-flash" },

    // Claude models via Antigravity
    "claude-sonnet": { providerID: "google", modelID: "gemini-claude-sonnet-4-5-thinking" },
    "claude-sonnet-thinking": { providerID: "google", modelID: "gemini-claude-sonnet-4-5-thinking" },
    "claude-opus": { providerID: "google", modelID: "gemini-claude-opus-4-5-thinking" },
    "claude-opus-thinking": { providerID: "google", modelID: "gemini-claude-opus-4-5-thinking" },
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
}

export interface SendMessageOptions {
    model?: string;
    persona?: string;
    context?: string[];
}

export class OpenCodeAdapter {
    private client: ReturnType<typeof createOpencodeClient> | null = null;
    private server: { close: () => void; url: string } | null = null;
    private currentSession: Session | null = null;
    private initialized = false;

    /**
     * Initialize the OpenCode server with Antigravity auth plugin
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const { client, server } = await createOpencode({
                config: {
                    // The antigravity auth plugin will be loaded from the user's opencode config
                    // User needs to run `opencode auth login` first to set up OAuth
                },
            });

            this.client = client;
            this.server = server;
            this.initialized = true;
        } catch (error) {
            throw new Error(`Failed to initialize OpenCode: ${error}`);
        }
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

        // Send prompt
        const result = await this.client.session.prompt({
            path: { id: this.currentSession.id },
            body: {
                model: modelConfig,
                parts: [{ type: "text", text: message }],
            },
        });

        // Debug log if result looks empty or contains error
        if (!result || (result as any).error || (result as any).data === undefined) {
            console.log(chalk?.dim ? chalk.dim(`[DEBUG] OpenCode result: ${JSON.stringify(result)}`) : `[DEBUG] OpenCode result: ${JSON.stringify(result)}`);
        }

        // Extract content from result
        const content = this.extractContent(result);

        const usage = (result as any).usage || (result as any).data?.usage || {};

        return {
            content,
            model: options.model || this.getModelNameFromConfig(modelConfig),
            tokensUsed: usage.totalTokens || 0,
            sessionId: this.currentSession.id!,
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
