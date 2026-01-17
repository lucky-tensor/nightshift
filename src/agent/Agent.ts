import { createOpencode, OpencodeClient } from "@opencode-ai/sdk";
import type { AgentConfig, AgentEvent } from "./types";

/**
 * The Agent class wraps the low-level OpenCode SDK client.
 * It is responsible for:
 * 1. Initializing the connection to the local sidecar/server.
 * 2. Managing session lifecycle (create, run, cancel).
 * 3. Translating raw SDK events into a simplified stream of 'AgentEvent' objects
 *    that the UI or other consumers can easily handle.
 */
export class Agent {
    // The raw client instance from the @opencode-ai/sdk.
    // This is null until 'initialize()' is called.
    private client: OpencodeClient | null = null;

    // Handle to the underlying server process.
    // We need this to gracefully shut down the sidecar process when the application exits.
    private server: { close(): void } | null = null;

    // Configuration properties injected at construction time.
    private modelId: string;
    private workingDirectory: string;
    private port: number;

    constructor(config: AgentConfig) {
        this.modelId = config.modelId;
        this.workingDirectory = config.workingDirectory;
        // Port 0 tells the system to select a random available port.
        this.port = config.port || 0;
    }

    /**
     * Bootstraps the agent environment.
     * This starts the sidecar server and establishes the client connection.
     * MUST be called before any other methods.
     */
    async initialize() {
        console.log(`[DEBUG] Initializing Agent with port ${this.port} and model ${this.modelId}`);

        // We use 'createOpencode' to launch the server and get a client in one step.
        // The @ts-ignore is currently necessary due to type mismatches in the alpha SDK version.

        const { client, server } = await createOpencode({
            port: this.port,
            config: {
                model: this.modelId,
            },
            directory: this.workingDirectory,
        } as any);

        this.client = client;
        this.server = server;
        console.log("[DEBUG] Agent initialized and server started.");
    }

    /**
     * Teardown method.
     * Ensures we don't leave zombie processes running on the user's machine.
     */
    async shutdown() {
        if (this.server) {
            this.server.close();
            console.log("[DEBUG] Server shut down.");
        }
    }

    /**
     * Creates a new conversation session.
     * A session represents a persistent context/thread with the LLM.
     * Returns the unique Session ID.
     */
    async createSession(): Promise<string> {
        if (!this.client) throw new Error("Agent not initialized");

        console.log("[DEBUG] Creating session...");

        // We default to a generic title; the SDK might auto-update this later based on context,
        // but for now we just need a valid placeholder to start.
        const response = await this.client.session.create({
            body: {
                title: "Agent Session",
            },
        });

        // SDK responses wrap data and errors. We must explicitly check for the error field.
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

    /**
     * The main execution loop for the agent.
     * It sends a prompt to the session and yields a stream of events (deltas, thinking, tools).
     *
     * @param sessionId The active session to post to.
     * @param prompt The user's input text.
     */
    async *run(sessionId: string, prompt: string): AsyncGenerator<AgentEvent, void, unknown> {
        if (!this.client) throw new Error("Agent not initialized");

        // 1. Subscribe to events FIRST
        // We must subscribe to the event stream before sending the prompt to ensure
        // we don't miss the very first tokens of the response.
        console.log("[DEBUG] Subscribing to events...");
        const eventResult = await this.client.event.subscribe();
        const eventStream = eventResult.stream;
        console.log("[DEBUG] Subscribed.");

        // 2. Send the prompt asynchronously
        // We split the model ID (e.g., "anthropic/claude-3-opus") to extract
        // the provider ("anthropic") and the specific model ("claude-3-opus").
        // This is required by the SDK's strict typing for model identification.
        const parts = this.modelId.split("/");
        const providerId = parts[0];
        const modelIdPart = parts.slice(1).join("/");

        // Construct the strict parameter object expected by the SDK.
        const promptParams = {
            path: { id: sessionId },
            body: {
                model: {
                    providerID: providerId,
                    modelID: modelIdPart || providerId,
                },
                parts: [{ type: "text", text: prompt }],
            },
        };

        console.log("[DEBUG] Sending promptAsync...");
        // We use promptAsync to trigger the generation without blocking.
        // The actual content will flow back through the event stream we subscribed to earlier.
        const promptRes = await this.client.session.promptAsync(promptParams as any);

        if (promptRes.error) {
            console.error("[DEBUG] Prompt error:", promptRes.error);
            yield { type: "error", error: promptRes.error };
            return;
        }
        console.log("[DEBUG] Prompt sent.");

        // 3. Process Stream
        // We iterate over the raw SDK events and transform them into our domain 'AgentEvent' types.
        for await (const event of eventStream) {
            const data = event as any;

            // Filter out noise.
            // These event types happen frequently but aren't relevant to the chat stream UI.
            if (
                data.type !== "file.watcher.updated" &&
                data.type !== "session.updated" &&
                data.type !== "lsp.updated" &&
                data.type !== "todo.updated"
            ) {
                console.log(`[DEBUG] Received event: ${data.type}`);
            }

            // Handle Content (Text) or Thinking (Chain of Thought) deltas.
            if (data.type === "message.part.updated") {
                // Ensure this event belongs to our current session.
                // The event stream is global, so we might receive events from other sessions if multiple are active.
                if (data.properties?.part?.sessionID !== sessionId) continue;

                const part = data.properties.part;

                // Text delta: The actual answer being generated.
                if (part.type === "text" && data.properties.delta) {
                    yield { type: "content_delta", content: data.properties.delta, sessionId };
                }
                // Reasoning delta: Internal thought process (e.g. from O1 or similar models).
                else if (part.type === "reasoning" && data.properties.delta) {
                    yield { type: "thinking_delta", content: data.properties.delta, sessionId };
                }
            }

            // Handle Session Status Updates (Done state).
            if (data.type === "session.updated") {
                // When status becomes 'idle', the model has finished generating.
                if (
                    data.properties.info.id === sessionId &&
                    data.properties.info.status === "idle"
                ) {
                    console.log("[DEBUG] Session idle");
                    yield { type: "done", sessionId };
                    // Note: We don't break here necessarily if we expect post-processing,
                    // but for a simple Request->Response loop, 'idle' signals completion.
                }
            }

            // Handle Errors.
            if (data.type === "session.error" && data.properties.sessionID === sessionId) {
                console.log("[DEBUG] Session error detected");
                yield { type: "error", error: data.properties.error };
                break; // Error is terminal for this run
            }
        }
    }

    /**
     * Interupts the current generation.
     */
    async cancel(sessionId: string) {
        if (!this.client) throw new Error("Agent not initialized");
        console.log("[DEBUG] Cancelling session...");
        await this.client.session.abort({
            path: { id: sessionId },
        } as any);
        console.log("[DEBUG] Cancelled.");
    }
}
