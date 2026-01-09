/**
 * Multi-Agent Collaboration Prototype - TypeScript Implementation
 *
 * Demonstrates specialized agents with structured handoff protocols.
 */

import { EventEmitter } from "events";

type AgentType = "planner" | "coder" | "tester" | "curator" | "reviewer";
type AgentState = "idle" | "working" | "completed" | "failed";

interface AgentMessage {
    fromAgent: string;
    toAgent: string;
    msgType: "handoff" | "request" | "response" | "status" | "escalation";
    content: Record<string, any>;
    timestamp: string;
}

interface SharedContext {
    projectId: string;
    sessionId: string;
    artifacts: Map<string, any>;
    knowledge: Map<string, string>;
    decisions: Array<{ question: string; answer: string; rationale: string }>;
}

abstract class BaseAgent extends EventEmitter {
    id: string;
    type: AgentType;
    state: AgentState = "idle";
    currentTask: string | null = null;
    sharedContext: SharedContext;
    messageLog: AgentMessage[] = [];

    constructor(id: string, type: AgentType, sharedContext: SharedContext) {
        super();
        this.id = id;
        this.type = type;
        this.sharedContext = sharedContext;
    }

    log(action: string, message: string): void {
        console.log(`[${this.type.toUpperCase()}-${this.id.slice(0, 4)}] ${action}: ${message}`);
    }

    receiveHandoff(fromAgent: BaseAgent, task: string, context: Record<string, any>): void {
        this.log("handoff", `Received from ${fromAgent.id}`);
        this.currentTask = task;
        this.state = "working";

        if (context.artifacts) {
            Object.assign(this.sharedContext.artifacts, context.artifacts);
        }
        if (context.knowledge) {
            Object.assign(this.sharedContext.knowledge, context.knowledge);
        }
    }

    sendMessage(
        toType: AgentType,
        msgType: AgentMessage["msgType"],
        content: Record<string, any>
    ): void {
        const message: AgentMessage = {
            fromAgent: this.id,
            toAgent: `${toType}-manager`,
            msgType,
            content,
            timestamp: new Date().toISOString(),
        };
        this.messageLog.push(message);
    }

    complete(result: any, nextType?: AgentType): any {
        this.state = "completed";
        this.sharedContext.artifacts.set(this.id, result);

        if (nextType) {
            this.sendMessage(nextType, "handoff", {
                fromAgent: this.id,
                task: this.currentTask,
                result,
                artifacts: Object.fromEntries(this.sharedContext.artifacts),
            });
        }

        return result;
    }

    abstract execute(task: string): any;
}

class PlannerAgent extends BaseAgent {
    constructor(sharedContext: SharedContext) {
        super("planner-1", "planner", sharedContext);
    }

    execute(task: string): any {
        this.log("execute", `Planning: ${task}`);

        const plan = {
            steps: [
                { id: "1", task: "Set up project structure", agent: "coder" },
                { id: "2", task: "Implement core logic", agent: "coder" },
                { id: "3", task: "Write unit tests", agent: "tester" },
                { id: "4", task: "Document the implementation", agent: "curator" },
            ],
            estimatedTime: "4 hours",
            complexity: "moderate",
        };

        this.sharedContext.decisions.push({
            question: task,
            answer: "Break into 4 sequential steps",
            rationale: "Standard feature implementation pattern",
        });

        return plan;
    }
}

class CoderAgent extends BaseAgent {
    constructor(sharedContext: SharedContext) {
        super("coder-1", "coder", sharedContext);
    }

    execute(task: string): any {
        this.log("execute", `Implementing: ${task}`);

        const code = {
            files: {
                "src/index.js": "export class App { run() { console.log('Hello'); } }",
                "src/types.js": "export interface User { id: string; name: string; }",
            },
            testsWritten: 2,
        };

        return code;
    }
}

class TesterAgent extends BaseAgent {
    constructor(sharedContext: SharedContext) {
        super("tester-1", "tester", sharedContext);
    }

    execute(task: string): any {
        this.log("execute", `Testing: ${task}`);

        const results = {
            testsRun: 5,
            passed: 4,
            failed: 1,
            coverage: "85%",
        };

        if (results.failed > 0) {
            this.state = "failed";
            this.sendMessage("coder", "escalation", {
                issue: `${results.failed} test(s) failing`,
                details: "Edge case not handled",
            });
        }

        return results;
    }
}

class CuratorAgent extends BaseAgent {
    constructor(sharedContext: SharedContext) {
        super("curator-1", "curator", sharedContext);
    }

    execute(task: string): any {
        this.log("execute", `Documenting: ${task}`);

        const docs = {
            readme: "# Project Documentation\n\nGenerated by Nightshift",
            architecture: "## Architecture\n\nMicroservice pattern with REST API",
            decisions: this.sharedContext.decisions,
        };

        this.sharedContext.knowledge.set("architecture", docs.architecture);

        return docs;
    }
}

class AgentManager {
    private agents: Map<string, BaseAgent> = new Map();
    private sharedContext: SharedContext;

    constructor(projectId: string) {
        this.sharedContext = {
            projectId,
            sessionId: `session-${Date.now()}`,
            artifacts: new Map(),
            knowledge: new Map(),
            decisions: [],
        };

        this.initializeAgents();
    }

    private initializeAgents(): void {
        this.agents.set("planner-1", new PlannerAgent(this.sharedContext));
        this.agents.set("coder-1", new CoderAgent(this.sharedContext));
        this.agents.set("tester-1", new TesterAgent(this.sharedContext));
        this.agents.set("curator-1", new CuratorAgent(this.sharedContext));
    }

    startWorkflow(initialTask: string): any {
        console.log("\n🚀 Starting Multi-Agent Workflow:");
        console.log(`   Task: ${initialTask}`);
        console.log(`   Session: ${this.sharedContext.sessionId}`);

        // Step 1: Planner creates plan
        const planner = this.agents.get("planner-1")!;
        const plan = planner.execute(initialTask);
        planner.complete(plan, "coder");

        // Step 2: Coder implements
        const coder = this.agents.get("coder-1")!;
        coder.receiveHandoff(planner, "Implement feature", { artifacts: { plan } });
        const code = coder.execute("Implement feature");
        coder.complete(code, "tester");

        // Step 3: Tester tests
        const tester = this.agents.get("tester-1")!;
        tester.receiveHandoff(coder, "Test implementation", { artifacts: { code } });
        const testResults = tester.execute("Test implementation");

        if (testResults.failed > 0) {
            console.log("\n⚠️ Tests failed - Escalating to Coder");
        } else {
            tester.complete(testResults, "curator");

            // Step 4: Curator documents
            const curator = this.agents.get("curator-1")!;
            curator.receiveHandoff(tester, "Document implementation", {
                artifacts: { code, testResults },
            });
            const docs = curator.execute("Document implementation");
            curator.complete(docs);
        }

        return {
            plan,
            code,
            testResults,
            artifacts: Object.fromEntries(this.sharedContext.artifacts),
            decisions: this.sharedContext.decisions,
        };
    }

    getAgentStates(): Array<{ id: string; type: AgentType; state: AgentState }> {
        return Array.from(this.agents.values()).map((a) => ({
            id: a.id,
            type: a.type,
            state: a.state,
        }));
    }

    getMessageCount(): number {
        return Array.from(this.agents.values()).reduce((sum, a) => sum + a.messageLog.length, 0);
    }
}

async function main() {
    console.log("=".repeat(60));
    console.log("  Multi-Agent Collaboration Prototype");
    console.log("=".repeat(60));

    const manager = new AgentManager("project-alpha");

    const result = manager.startWorkflow("Implement user authentication system");

    console.log("\n📊 Workflow Results:");

    console.log("\n  Agent States:");
    manager.getAgentStates().forEach((agent) => {
        const icon = agent.state === "completed" ? "✅" : agent.state === "failed" ? "❌" : "⏳";
        console.log(`     ${icon} ${agent.type}: ${agent.state}`);
    });

    console.log(`\n  Messages Exchanged: ${manager.getMessageCount()}`);

    console.log("\n  Decisions Made:");
    result.decisions.forEach((d, i) => {
        console.log(`     ${i + 1}. Q: ${d.question.slice(0, 40)}...`);
        console.log(`        A: ${d.answer}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("  Prototype Complete!");
    console.log("=".repeat(60));
}

main().catch(console.error);
