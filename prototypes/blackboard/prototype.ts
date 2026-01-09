/**
 * Blackboard Architecture Prototype - TypeScript Implementation
 *
 * Demonstrates asynchronous shared memory for agent collaboration.
 */

import { EventEmitter } from "events";

type EntryType = "goal" | "finding" | "blocker" | "solution" | "review" | "artifact";
type EntryStatus = "open" | "in_progress" | "resolved" | "superseded";
type EntryPriority = "low" | "medium" | "high" | "critical";

interface BlackboardEntry {
    id: string;
    entryType: EntryType;
    author: string;
    title: string;
    content: string;
    tags: string[];
    parentId?: string;
    createdAt: string;
    status: EntryStatus;
    priority: EntryPriority;
}

interface AgentDefinition {
    agentId: string;
    role: string;
    interests: EntryType[];
}

class Blackboard extends EventEmitter {
    private entries: Map<string, BlackboardEntry> = new Map();
    private agents: Map<string, AgentDefinition> = new Map();
    private subscriptions: Map<string, Set<EntryType>> = new Map();

    registerAgent(agent: AgentDefinition): void {
        this.agents.set(agent.agentId, agent);

        if (!this.subscriptions.has(agent.agentId)) {
            this.subscriptions.set(agent.agentId, new Set());
        }
        agent.interests.forEach((interest) => {
            this.subscriptions.get(agent.agentId)!.add(interest);
        });

        console.log(`[Blackboard] Registered agent: ${agent.role} (${agent.agentId})`);
    }

    post(entry: Omit<BlackboardEntry, "id" | "createdAt">): BlackboardEntry {
        const fullEntry: BlackboardEntry = {
            ...entry,
            id: `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            createdAt: new Date().toISOString(),
        };

        this.entries.set(fullEntry.id, fullEntry);
        this.emit("posted", fullEntry);

        this.notifySubscribers(fullEntry);

        console.log(
            `[Blackboard] Posted: [${fullEntry.entryType.toUpperCase()}] ${fullEntry.title}`
        );

        return fullEntry;
    }

    update(id: string, status: EntryStatus): BlackboardEntry | null {
        const entry = this.entries.get(id);
        if (!entry) return null;

        const updated = { ...entry, status };
        this.entries.set(id, updated);
        this.emit("updated", updated);

        console.log(`[Blackboard] Updated: ${entry.title} -> ${status}`);

        return updated;
    }

    getByType(type: EntryType): BlackboardEntry[] {
        return Array.from(this.entries.values()).filter((e) => e.entryType === type);
    }

    getByStatus(status: EntryStatus): BlackboardEntry[] {
        return Array.from(this.entries.values()).filter((e) => e.status === status);
    }

    getForAgent(agentId: string): BlackboardEntry[] {
        const interests = this.subscriptions.get(agentId);
        if (!interests) return [];

        return Array.from(this.entries.values()).filter(
            (e) => interests.has(e.entryType) && e.status === "open"
        );
    }

    query(criteria: {
        type?: EntryType;
        status?: EntryStatus;
        tags?: string[];
        author?: string;
        priority?: EntryPriority;
    }): BlackboardEntry[] {
        return Array.from(this.entries.values()).filter((entry) => {
            if (criteria.type && entry.entryType !== criteria.type) return false;
            if (criteria.status && entry.status !== criteria.status) return false;
            if (criteria.author && entry.author !== criteria.author) return false;
            if (criteria.priority && entry.priority !== criteria.priority) return false;
            if (criteria.tags && !criteria.tags.some((t) => entry.tags.includes(t))) return false;
            return true;
        });
    }

    getStats(): Record<string, number> {
        const stats: Record<string, number> = {
            total: this.entries.size,
            open: 0,
            resolved: 0,
            inProgress: 0,
        };

        this.entries.forEach((e) => {
            stats[e.status] = (stats[e.status] || 0) + 1;
            stats[e.entryType] = (stats[e.entryType] || 0) + 1;
        });

        return stats;
    }

    private notifySubscribers(entry: BlackboardEntry): void {
        this.subscriptions.forEach((interests, agentId) => {
            if (interests.has(entry.entryType)) {
                this.emit("notification", { agentId, entry });
            }
        });
    }
}

class BlackboardAgent extends EventEmitter {
    id: string;
    role: string;
    blackboard: Blackboard;
    state: "idle" | "working" | "waiting";
    currentWork: string | null = null;

    constructor(id: string, role: string, blackboard: Blackboard) {
        super();
        this.id = id;
        this.role = role;
        this.blackboard = blackboard;
        this.state = "idle";

        this.blackboard.on(
            "notification",
            ({ agentId, entry }: { agentId: string; entry: BlackboardEntry }) => {
                if (agentId === this.id) {
                    this.handleNotification(entry);
                }
            }
        );
    }

    private handleNotification(entry: BlackboardEntry): void {
        console.log(`[${this.role}] Received notification: ${entry.title}`);

        if (entry.priority === "high" && entry.status === "open") {
            this.workOn(entry);
        }
    }

    postGoal(title: string, content: string, priority: EntryPriority = "medium"): void {
        this.blackboard.post({
            entryType: "goal",
            author: this.id,
            title,
            content,
            tags: [this.role],
            status: "open",
            priority,
        });
        console.log(`[${this.role}] Posted goal: ${title}`);
    }

    postFinding(title: string, content: string, parentId?: string): void {
        this.blackboard.post({
            entryType: "finding",
            author: this.id,
            title,
            content,
            tags: [this.role],
            status: "open",
            priority: "medium",
            parentId,
        });
    }

    postBlocker(title: string, content: string): void {
        this.blackboard.post({
            entryType: "blocker",
            author: this.id,
            title,
            content,
            tags: [this.role],
            status: "open",
            priority: "high",
        });
        console.log(`[${this.role}] Posted blocker: ${title}`);
    }

    workOn(entry: BlackboardEntry): void {
        if (this.state !== "idle") {
            console.log(`[${this.role}] Cannot work - already busy`);
            return;
        }

        console.log(`[${this.role}] Starting work on: ${entry.title}`);
        this.state = "working";
        this.currentWork = entry.id;

        this.blackboard.update(entry.id, "in_progress");

        setTimeout(() => {
            this.postFinding(
                `Completed: ${entry.title}`,
                `Finished processing ${entry.title}. Result: success`,
                entry.id
            );

            this.blackboard.update(entry.id, "resolved");

            this.state = "idle";
            this.currentWork = null;
            console.log(`[${this.role}] Completed: ${entry.title}`);
        }, 500);
    }

    checkForWork(): void {
        const available = this.blackboard.getForAgent(this.id);
        if (available.length > 0 && this.state === "idle") {
            this.workOn(available[0]);
        }
    }
}

async function main() {
    console.log("=".repeat(60));
    console.log("  Blackboard Architecture Prototype");
    console.log("=".repeat(60));

    const blackboard = new Blackboard();

    // Register agents
    const planner = new BlackboardAgent("agent-planner", "Planner", blackboard);
    const coder = new BlackboardAgent("agent-coder", "Coder", blackboard);
    const tester = new BlackboardAgent("agent-tester", "Tester", blackboard);

    blackboard.registerAgent({
        agentId: planner.id,
        role: "Planner",
        interests: ["goal", "blocker"],
    });

    blackboard.registerAgent({
        agentId: coder.id,
        role: "Coder",
        interests: ["goal", "blocker", "finding"],
    });

    blackboard.registerAgent({
        agentId: tester.id,
        role: "Tester",
        interests: ["finding", "artifact"],
    });

    console.log("\n📋 Starting workflow...\n");

    // Planner posts a goal
    planner.postGoal(
        "Implement User Authentication",
        "Create login/logout functionality with JWT tokens",
        "high"
    );

    // Coder sees goal and starts working
    coder.checkForWork();

    // Coder posts a finding
    setTimeout(() => {
        coder.postFinding(
            "JWT Implementation Complete",
            "Used jsonwebtoken library, tokens expire in 24h"
        );

        // Tester sees finding and starts reviewing
        tester.checkForWork();
    }, 200);

    // Coder encounters blocker
    setTimeout(() => {
        coder.postBlocker(
            "Rate Limiting Issue",
            "Need to implement rate limiting for login endpoint"
        );

        // Planner posts solution for blocker
        setTimeout(() => {
            blackboard.post({
                entryType: "solution",
                author: planner.id,
                title: "Use express-rate-limit",
                content: "Recommended package: express-rate-limit",
                tags: ["solution"],
                status: "open",
                priority: "medium",
            });
        }, 100);
    }, 400);

    // Show statistics
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log("\n📊 Blackboard Statistics:");
    const stats = blackboard.getStats();
    console.log(`   Total Entries: ${stats.total}`);
    console.log(
        `   Open: ${stats.open}, In Progress: ${stats.inProgress}, Resolved: ${stats.resolved}`
    );

    // Show all entries
    console.log("\n📝 All Entries:");
    blackboard.query({}).forEach((entry) => {
        const icon =
            entry.status === "resolved" ? "✅" : entry.status === "in_progress" ? "🔄" : "📌";
        console.log(`   ${icon} [${entry.entryType}] ${entry.title} (${entry.author})`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("  Prototype Complete!");
    console.log("=".repeat(60));
}

main().catch(console.error);
