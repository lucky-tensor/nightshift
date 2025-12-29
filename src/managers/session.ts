import { v4 as uuid } from "uuid";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { parse, stringify } from "yaml";
import type { Session, Message, FactoryConfig } from "../types";

export class SessionManager {
    private factory: FactoryConfig;

    constructor(factory: FactoryConfig) {
        this.factory = factory;
    }

    private getSessionPath(sessionId: string): string {
        return join(this.factory.rootPath, ".dark-factory", "sessions", `${sessionId}.yaml`);
    }

    private ensureSessionsDir() {
        const dir = join(this.factory.rootPath, ".dark-factory", "sessions");
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    createSession(projectId: string, objective: string): Session {
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
        return session;
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
