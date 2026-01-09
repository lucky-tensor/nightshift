import { v4 as uuid } from "uuid";
import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk";
import { ToolExecutor } from "./tools";
import { SessionManager } from "../managers/session";
import type { FactoryConfig, Project } from "../types";

export class AgentRuntime {
    private factory: FactoryConfig;
    private client: any;
    private toolExecutor!: ToolExecutor;
    private sessionManager: SessionManager;
    private serverSessionId: string | null = null;
    private currentSessionId: string | null = null;
    private messageMap = new Map<string, string>();

    constructor(factory: FactoryConfig) {
        this.factory = factory;
        this.sessionManager = new SessionManager(factory);
    }

    async start(project: Project, sessionId: string) {
        this.currentSessionId = sessionId;

        try {
            // Try to connect to existing server first
            try {
                const existingClient = createOpencodeClient({
                    baseUrl: "http://127.0.0.1:4096",
                });
                // Simple health check
                await existingClient.config.get();
                this.client = existingClient;
                this.sessionManager.addMessage(
                    sessionId,
                    "system",
                    "[Debug] Connected to existing OpenCode Server."
                );
            } catch (e) {
                // If failed, start new server
                this.sessionManager.addMessage(
                    sessionId,
                    "system",
                    "[Debug] Spawning new OpenCode Server..."
                );
                const { client } = await createOpencode();
                this.client = client;
            }

            this.toolExecutor = new ToolExecutor(project.worktreePath);

            // Subscribe to events first
            this.setupEventStream();

            // Create Server Session
            const sessionRes = await this.client.session.create({
                body: { title: `Nightshift: ${project.name} - ${sessionId}` },
            });
            this.serverSessionId = sessionRes.data.id;

            this.sessionManager.addMessage(
                sessionId,
                "system",
                `[Debug] Connected to OpenCode Server: ${this.serverSessionId}`
            );

            this.runLoop(project, sessionId);
        } catch (e) {
            console.error(e);
            this.sessionManager.addMessage(
                sessionId,
                "system",
                `[Error] Failed to start runtime: ${e}`
            );
        }
    }

    private async setupEventStream() {
        try {
            this.sessionManager.addMessage(
                this.currentSessionId!,
                "system",
                "[Debug] Setting up event stream..."
            );
            const result = await this.client.event.subscribe();
            if (!result || !result.stream) {
                this.sessionManager.addMessage(
                    this.currentSessionId!,
                    "system",
                    "[Error] Event stream empty"
                );
                console.error("Event stream not available in result:", result);
                return;
            }
            this.sessionManager.addMessage(
                this.currentSessionId!,
                "system",
                "[Debug] Event stream connected."
            );
            const stream = result.stream;
            for await (const event of stream) {
                // this.sessionManager.addMessage(this.currentSessionId!, "system", `[Debug] Raw Event: ${event.type}`);
                this.handleEvent(event);
            }
        } catch (e) {
            this.sessionManager.addMessage(
                this.currentSessionId!,
                "system",
                `[Error] Event stream failed: ${e}`
            );
            console.error("Stream error:", e);
        }
    }

    private async handleEvent(event: any) {
        if (!this.currentSessionId || !this.serverSessionId) return;
        const { type, properties } = event;

        // Log all events for debugging
        // console.log("[Debug] Event:", type);

        if (type === "session.error") {
            this.sessionManager.addMessage(
                this.currentSessionId,
                "system",
                `[Error] Server reported error: ${JSON.stringify(properties.error)}`
            );
            return;
        }

        // 1. Message Created

        if (type === "message.created") {
            const info = properties.info;
            if (info.sessionID === this.serverSessionId && info.role === "assistant") {
                const localMsg = this.sessionManager.addMessage(
                    this.currentSessionId,
                    "assistant",
                    ""
                );
                this.messageMap.set(info.id, localMsg.id);
            }
        }

        // 2. Message Part Updated (Streaming)
        if (type === "message.part.updated") {
            const { part, delta } = properties;
            if (
                part.sessionID === this.serverSessionId &&
                (part.type === "text" || part.type === "reasoning") &&
                delta
            ) {
                let localMsgId = this.messageMap.get(part.messageID);

                if (!localMsgId) {
                    const localMsg = this.sessionManager.addMessage(
                        this.currentSessionId,
                        "assistant",
                        ""
                    );
                    this.messageMap.set(part.messageID, localMsg.id);
                    localMsgId = localMsg.id;
                }

                const session = this.sessionManager.getSession(this.currentSessionId);
                const msg = session?.messages.find((m) => m.id === localMsgId);
                if (msg) {
                    this.sessionManager.updateMessage(
                        this.currentSessionId,
                        localMsgId,
                        msg.content + delta
                    );
                }
            }
        }

        // 3. Message Updated (Finished)
        if (type === "message.updated") {
            const info = properties.info;
            if (
                info.sessionID === this.serverSessionId &&
                info.role === "assistant" &&
                info.finish
            ) {
                await this.handleToolCalls(info.id);
            }
        }
    }

    private async handleToolCalls(serverMessageId: string) {
        try {
            const msgRes = await this.client.session.message({
                path: { id: this.serverSessionId!, messageID: serverMessageId },
            });
            if (msgRes.error || !msgRes.data) return;

            const parts = msgRes.data.parts || [];
            let toolsExecuted = false;

            for (const part of parts) {
                if (part.type === "tool") {
                    this.sessionManager.addMessage(
                        this.currentSessionId!,
                        "system",
                        `[Executing Tool: ${part.tool}]`
                    );

                    let args = {};
                    if (
                        part.state &&
                        (part.state.status === "pending" ||
                            part.state.status === "running" ||
                            part.state.status === "completed")
                    ) {
                        args = part.state.input;
                    }

                    try {
                        const result = this.toolExecutor.execute(part.tool, args);
                        this.sessionManager.addMessage(
                            this.currentSessionId!,
                            "system",
                            `[Tool Output]\n${result}`
                        );
                        toolsExecuted = true;
                    } catch (e) {
                        this.sessionManager.addMessage(
                            this.currentSessionId!,
                            "system",
                            `[Error] Tool execution failed: ${e}`
                        );
                        toolsExecuted = true;
                    }
                }
            }

            if (toolsExecuted) {
                await this.step(this.currentSessionId!);
            }
        } catch (e) {
            console.error("Tool handling error:", e);
        }
    }

    private async runLoop(project: Project, sessionId: string) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) return;

        if (session.messages.length === 0) {
            let context = "";
            try {
                context = this.toolExecutor.execute("read", { filePath: "initial-context.md" });
            } catch {}

            const systemPrompt = `You are an autonomous engineer working on: ${project.name}.
Context:
${context}

Objective: ${session.objective}

You have access to tools: bash, read, write, edit, glob.
Use them to explore and implement the task.
Always output your thinking process.
`;
            this.sessionManager.addMessage(sessionId, "system", systemPrompt);

            // Send system prompt to server
            // We use promptAsync with system field.
            await this.client.session.promptAsync({
                path: { id: this.serverSessionId! },
                body: {
                    system: systemPrompt,
                    parts: [],
                },
            });
        } else {
            await this.step(sessionId);
        }
    }

    public async step(sessionId: string) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session || session.messages.length === 0) return;

        const lastMsg = session.messages[session.messages.length - 1];
        if (!lastMsg) return;

        // Only respond to user messages to avoid loops on system logs
        if (lastMsg.role === "user") {
            await this.generateResponse(sessionId, lastMsg.content);
        }
    }

    private async generateResponse(sessionId: string, text: string) {
        if (!this.serverSessionId) return;

        try {
            await this.client.session.promptAsync({
                path: { id: this.serverSessionId },
                body: {
                    model: this.getModelConfig(),
                    parts: [{ type: "text", text: text }],
                    tools: {
                        bash: true,
                        read: true,
                        write: true,
                        edit: true,
                        glob: true,
                    },
                },
            });
        } catch (e) {
            this.sessionManager.addMessage(sessionId, "system", `[Error] ${e}`);
        }
    }

    public async runTask(
        project: Project,
        task: { id: string; name: string },
        subagent: string
    ): Promise<{ success: boolean; message: string }> {
        // Create a new session for this task
        const sessionId = uuid();

        // This is a simplified version of runTask that reuses existing infrastructure
        // ideally we would spawn a specific subagent.
        // For MVP, we'll just run a step in the main loop or similar.

        // Let's create a session and run one turn for now.
        const session = this.sessionManager.createSession(project.id, `Execute task: ${task.name}`);

        try {
            await this.start(project, session.id);
            // In a real subagent call we'd probably wait for a specific "done" signal.
            // For now, we return success to satisfy the interface.
            return { success: true, message: "Task started in session " + session.id };
        } catch (e) {
            return { success: false, message: String(e) };
        }
    }

    private getModelConfig() {
        const defaultModel = this.factory.defaultModel || "gemini-pro";
        return { providerID: "google", modelID: "gemini-1.5-flash" };
    }
}
