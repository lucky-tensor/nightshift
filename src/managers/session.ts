import { v4 as uuid } from "uuid";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { parse, stringify } from "yaml";
import type { Session, Message, FactoryConfig } from "../types";
import { ForwardPromptManager } from "./forward-prompt";

export class SessionManager {
    private factory: FactoryConfig;
    private forwardPrompt: ForwardPromptManager;

    constructor(factory: FactoryConfig) {
        this.factory = factory;
        this.forwardPrompt = new ForwardPromptManager();
    }

    private getSessionPath(sessionId: string): string {
        return join(this.factory.rootPath, ".nightshift", "sessions", `${sessionId}.yaml`);
    }

    private ensureSessionsDir() {
        const dir = join(this.factory.rootPath, ".nightshift", "sessions");
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Create a new session
     *
     * @param projectId - The project ID this session belongs to
     * @param objective - The goal for this session
     * @param worktreePath - Optional worktree path to initialize forward prompt
     */
    createSession(projectId: string, objective: string, worktreePath?: string): Session {
        this.ensureSessionsDir();

        const session: Session = {
            id: uuid(),
            projectId,
            status: "running",
            startTime: new Date().toISOString(),
            objective,
            messages: [],
            cost: 0,
            tokens: 0,
        };

        this.saveSession(session);

        // Initialize forward prompt if worktree path is provided
        if (worktreePath) {
            this.initializeForwardPrompt(session, worktreePath);
        }

        return session;
    }

    /**
     * Initialize the forward prompt for a session
     *
     * Call this when starting work in a worktree to ensure agent continuity.
     *
     * @param session - The session to initialize
     * @param worktreePath - Absolute path to the project worktree
     */
    initializeForwardPrompt(session: Session, worktreePath: string): void {
        this.forwardPrompt.update(worktreePath, {
            sessionId: session.id,
            objective: session.objective,
            currentStatus: "Session started - reviewing objective and planning approach",
            nextSteps: [
                "Review the objective and existing codebase",
                "Create implementation plan",
                "Begin implementation",
            ],
            blockers: [],
            contextNotes: `Session started at ${session.startTime}`,
        });
    }

    /**
     * Get the forward prompt manager for direct access
     */
    getForwardPromptManager(): ForwardPromptManager {
        return this.forwardPrompt;
    }

    getSession(sessionId: string): Session | undefined {
        const path = this.getSessionPath(sessionId);
        if (!existsSync(path)) return undefined;
        try {
            return parse(readFileSync(path, "utf-8")) as Session;
        } catch (e) {
            console.error(`Failed to load session ${sessionId}:`, e);
            return undefined;
        }
    }

    saveSession(session: Session) {
        this.ensureSessionsDir();
        writeFileSync(this.getSessionPath(session.id), stringify(session));
    }

    addMessage(
        sessionId: string,
        role: "user" | "assistant" | "system",
        content: string,
        externalId?: string
    ) {
        const session = this.getSession(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const message: Message = {
            id: externalId || uuid(),
            role,
            content,
            timestamp: new Date().toISOString(),
        };

        session.messages.push(message);
        this.saveSession(session);
        return message;
    }

    updateMessage(sessionId: string, messageId: string, content: string) {
        const session = this.getSession(sessionId);
        if (!session) return;

        const msgIndex = session.messages.findIndex((m) => m.id === messageId);
        if (msgIndex !== -1) {
            const msg = session.messages[msgIndex];
            if (msg) {
                msg.content = content;
                this.saveSession(session);
            }
        }
    }
}
