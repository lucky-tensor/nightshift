
import {
    createOpencode,
    OpencodeClient
} from '@opencode-ai/sdk';
import type { AgentConfig, AgentEvent } from './types';

export class Agent {
    private client: OpencodeClient | null = null;
    private server: { close(): void } | null = null;
    private modelId: string;
    private workingDirectory: string;
    private port: number;

    constructor(config: AgentConfig) {
        this.modelId = config.modelId;
        this.workingDirectory = config.workingDirectory;
        this.port = config.port || 0;
    }

    async initialize() {
        console.log(`[DEBUG] Initializing Agent with port ${this.port} and model ${this.modelId}`);
        // @ts-ignore
        const { client, server } = await createOpencode({
            port: this.port,
            config: {
                model: this.modelId,
            },
            directory: this.workingDirectory
        } as any);
        this.client = client;
        this.server = server;
        console.log("[DEBUG] Agent initialized and server started.");
    }

    async shutdown() {
        if (this.server) {
            this.server.close();
            console.log("[DEBUG] Server shut down.");
        }
    }

    async createSession(): Promise<string> {
        if (!this.client) throw new Error("Agent not initialized");

        console.log("[DEBUG] Creating session...");
        const response = await this.client.session.create({
            body: {
                title: 'Agent Session',
            }
        });

        if (response.error) {
            console.error("[DEBUG] Failed to create session:", response.error);
            throw new Error(`Failed to create session: ${JSON.stringify(response.error)}`);
        }

        if (!response.data?.id) {
            console.error("[DEBUG] No session ID returned");
            throw new Error("Session creation returned no ID");
        }
        console.log(`[DEBUG] Session created: ${response.data.id}`);
        return response.data.id;
    }

    async *run(sessionId: string, prompt: string): AsyncGenerator<AgentEvent, void, unknown> {
        if (!this.client) throw new Error("Agent not initialized");

        // 1. Subscribe to events FIRST
        console.log("[DEBUG] Subscribing to events...");
        const eventResult = await this.client.event.subscribe();
        const eventStream = eventResult.stream;
        console.log("[DEBUG] Subscribed.");

        // 2. Send the prompt asynchronously
        const parts = this.modelId.split('/');
        const providerId = parts[0];
        const modelIdPart = parts.slice(1).join('/');

        const promptParams = {
            path: { id: sessionId },
            body: {
                model: {
                    providerID: providerId,
                    modelID: modelIdPart || providerId
                },
                parts: [
                    { type: 'text', text: prompt }
                ]
            }
        };

        console.log("[DEBUG] Sending promptAsync...");
        const promptRes = await this.client.session.promptAsync(promptParams as any);
        if (promptRes.error) {
            console.error("[DEBUG] Prompt error:", promptRes.error);
            yield { type: 'error', error: promptRes.error };
            return;
        }
        console.log("[DEBUG] Prompt sent.");

        // 3. Process Stream
        for await (const event of eventStream) {
            const data = event as any;
            // Debug log raw event structure (once)
            // console.log("[DEBUG] Raw Event Keys:", Object.keys(data));

            // In client.event.subscribe(), 'data' IS the Event object (type, properties)
            // based on observation of SDK types.

            if (data.type !== 'file.watcher.updated' &&
                data.type !== 'session.updated' &&
                data.type !== 'lsp.updated' &&
                data.type !== 'todo.updated') {
                console.log(`[DEBUG] Received event: ${data.type}`);
            }

            if (data.type === 'message.part.updated') {
                // Check session ID
                // properties: { part: { sessionID: ... } }
                if (data.properties?.part?.sessionID !== sessionId) continue;

                const part = data.properties.part;
                if (part.type === 'text' && data.properties.delta) {
                    yield { type: 'content_delta', content: data.properties.delta, sessionId };
                } else if (part.type === 'reasoning' && data.properties.delta) {
                    yield { type: 'thinking_delta', content: data.properties.delta, sessionId };
                }
            }

            if (data.type === 'session.updated') {
                if (data.properties.info.id === sessionId && data.properties.info.status === 'idle') {
                    // Check if we actually received content? 
                    // The idle status comes at the end.
                    // But it also comes at the start?
                    // We should yield 'done' only if we have processed the turn.
                    // But for now, let's just trace.
                    console.log("[DEBUG] Session idle");
                    yield { type: 'done', sessionId };
                    // We break here? If we break, we close the stream.
                    // In multi-turn, we might want to keep open?
                    // But run() is for a single prompt response in this design?
                    // The user's test expects stream to end.
                    // break; 
                    // Wait, if it yields done, the consumer can stop.
                }
            }

            if (data.type === 'session.error' && data.properties.sessionID === sessionId) {
                console.log("[DEBUG] Session error detected");
                yield { type: 'error', error: data.properties.error };
                break; // Error is terminal for this run
            }
        }
    }

    async cancel(sessionId: string) {
        if (!this.client) throw new Error("Agent not initialized");
        console.log("[DEBUG] Cancelling session...");
        await this.client.session.abort({
            path: { id: sessionId }
        } as any);
        console.log("[DEBUG] Cancelled.");
    }
}
