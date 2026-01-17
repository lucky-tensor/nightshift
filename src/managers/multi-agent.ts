/**
 * Multi-Agent Collaboration Manager
 *
 * Orchestrates multiple agents without relying on single agent context/history.
 * Implements shared context and agent handoff mechanisms.
 */

import type {
    AgentContext,
    SharedContext,
    AgentCollaboration,
    Message,
    TaskPrompt,
} from "../types/index";
import { CodeIndexManager } from "./code-index.js";
import { GitManager } from "./git.js";
import { writeFileSync, readFileSync, existsSync } from "fs";

export class MultiAgentManager {
    private agents: Map<string, AgentContext> = new Map();
    private sharedContext: SharedContext;
    private collaborationLog: AgentCollaboration[] = [];
    private codeIndexManager: CodeIndexManager;
    private gitManager: GitManager;

    constructor(projectId: string, projectPath: string, gitManager: GitManager) {
        this.gitManager = gitManager;
        this.codeIndexManager = new CodeIndexManager(projectPath);

        this.sharedContext = {
            projectId,
            sessionId: this.generateSessionId(),
            codeIndex: { embeddings: [], keywords: [], lastUpdated: "" },
            recentCommits: [],
            activeTasks: [],
            knowledgeBase: [],
        };

        this.initializeSharedContext();
    }

    /**
     * Initialize shared context from project state
     */
    private async initializeSharedContext(): Promise<void> {
        // Load code index
        await this.codeIndexManager.indexProject();
        this.sharedContext.codeIndex = {
            embeddings: [],
            keywords: [],
            lastUpdated: new Date().toISOString(),
        };

        // Load recent commits with metadata
        this.sharedContext.recentCommits = this.gitManager.getEnhancedCommitHistory();

        // Initialize default agents
        this.createAgent("planner", "planner");
        this.createAgent("coder", "coder");
        this.createAgent("curator", "curator");
        this.createAgent("tester", "tester");
    }

    /**
     * Create a new agent context
     */
    createAgent(id: string, type: AgentContext["type"]): AgentContext {
        const agent: AgentContext = {
            id,
            type,
            state: "idle",
            sharedContext: this.sharedContext,
        };

        this.agents.set(id, agent);
        return agent;
    }

    /**
     * Get agent by ID
     */
    getAgent(id: string): AgentContext | undefined {
        return this.agents.get(id);
    }

    /**
     * Get all agents of a specific type
     */
    getAgentsByType(type: AgentContext["type"]): AgentContext[] {
        return Array.from(this.agents.values()).filter((agent) => agent.type === type);
    }

    /**
     * Assign task to agent
     */
    assignTask(agentId: string, task: string): boolean {
        const agent = this.agents.get(agentId);
        if (!agent || agent.state !== "idle") {
            return false;
        }

        agent.currentTask = task;
        agent.state = "active";

        // Log task assignment
        this.logCollaboration("system", agentId, "request", `Task assigned: ${task}`);

        return true;
    }

    /**
     * Complete agent task and prepare for handoff
     */
    completeTask(agentId: string, result: string, nextAgentType?: AgentContext["type"]): boolean {
        const agent = this.agents.get(agentId);
        if (!agent || agent.state !== "active") {
            return false;
        }

        agent.state = "completed";

        // Update shared context with results
        this.updateSharedContext(agentId, result);

        // Log completion
        this.logCollaboration(agentId, "system", "response", `Task completed: ${result}`);

        // Auto handoff to next agent if specified
        if (nextAgentType) {
            this.handoff(agentId, nextAgentType);
        }

        return true;
    }

    /**
     * Handoff work from one agent to another
     */
    handoff(fromAgentId: string, toAgentType: AgentContext["type"]): boolean {
        const fromAgent = this.agents.get(fromAgentId);
        if (!fromAgent || fromAgent.state !== "completed") {
            return false;
        }

        // Find available agent of target type
        const availableAgents = this.getAgentsByType(toAgentType).filter(
            (agent) => agent.state === "idle"
        );

        if (availableAgents.length === 0) {
            // Create new agent if none available
            const newAgentId = `${toAgentType}_${Date.now()}`;
            const newAgent = this.createAgent(newAgentId, toAgentType);
            availableAgents.push(newAgent);
        }

        const toAgent = availableAgents[0];
        if (!toAgent) return false;

        // Prepare handoff context
        const handoffContext = this.prepareHandoffContext(fromAgent);

        // Log handoff
        this.logCollaboration(
            fromAgentId,
            toAgent.id,
            "handoff",
            `Handing off context: ${handoffContext.summary}`
        );

        // Reset from agent
        fromAgent.state = "idle";
        fromAgent.currentTask = undefined;

        // Activate to agent
        toAgent.state = "active";
        toAgent.currentTask = handoffContext.nextTask;

        return true;
    }

    /**
     * Prepare handoff context between agents
     */
    private prepareHandoffContext(fromAgent: AgentContext): {
        summary: string;
        nextTask: string;
        context: any;
    } {
        // Get recent work from this agent
        const agentCommits = this.sharedContext.recentCommits
            .filter((commit) => commit.metadata.agentId === fromAgent.id)
            .slice(-5);

        // Get relevant code changes
        const relevantCode = this.getRelevantCodeChanges(fromAgent);

        // Determine next logical task
        const nextTask = this.determineNextTask(fromAgent);

        return {
            summary: `Agent ${fromAgent.type} completed ${fromAgent.currentTask}`,
            nextTask,
            context: {
                recentCommits: agentCommits,
                codeChanges: relevantCode,
                agentType: fromAgent.type,
            },
        };
    }

    /**
     * Get relevant code changes for an agent
     */
    private getRelevantCodeChanges(agent: AgentContext): any[] {
        // This would analyze recent commits and code index changes
        // to identify what this agent worked on
        return [];
    }

    /**
     * Determine next logical task based on agent type and work
     */
    private determineNextTask(agent: AgentContext): string {
        const taskTransitions: Record<AgentContext["type"], string> = {
            planner: "Implement planned features",
            coder: "Review and test implemented code",
            tester: "Fix any identified issues",
            curator: "Document and organize completed work",
            reviewer: "Approve or request changes",
        };

        return taskTransitions[agent.type] || "Continue with next logical step";
    }

    /**
     * Update shared context with agent results
     */
    private updateSharedContext(agentId: string, result: string): void {
        // Update recent commits
        this.sharedContext.recentCommits = this.gitManager.getEnhancedCommitHistory();

        // Update code index if changes were made
        this.codeIndexManager.indexProject();

        // Update active tasks
        this.sharedContext.activeTasks = this.sharedContext.activeTasks.map((task) =>
            task.id === agentId ? { ...task, status: "completed" } : task
        );
    }

    /**
     * Log agent collaboration
     */
    private logCollaboration(
        fromAgentId: string,
        toAgentId: string,
        messageType: AgentCollaboration["messageType"],
        content: string
    ): void {
        const collaboration: AgentCollaboration = {
            fromAgentId,
            toAgentId,
            messageType,
            content,
            timestamp: new Date().toISOString(),
        };

        this.collaborationLog.push(collaboration);

        // Keep log size manageable
        if (this.collaborationLog.length > 1000) {
            this.collaborationLog = this.collaborationLog.slice(-500);
        }
    }

    /**
     * Get collaboration history
     */
    getCollaborationHistory(limit?: number): AgentCollaboration[] {
        return limit ? this.collaborationLog.slice(-limit) : this.collaborationLog;
    }

    /**
     * Search shared context for relevant information
     */
    async searchSharedContext(query: string): Promise<{
        commits: any[];
        code: any[];
        tasks: TaskPrompt[];
    }> {
        // Search recent commits
        const relevantCommits = this.sharedContext.recentCommits.filter(
            (commit) =>
                commit.title.includes(query) ||
                commit.metadata.contextSummary.includes(query) ||
                commit.metadata.expectedOutcome.includes(query)
        );

        // Search code index
        const relevantCode = await this.codeIndexManager.searchByEmbedding(query, 10);

        // Search active tasks
        const relevantTasks = this.sharedContext.activeTasks.filter(
            (task) => task.id.includes(query) || task.status.includes(query)
        );

        return {
            commits: relevantCommits,
            code: relevantCode,
            tasks: relevantTasks,
        };
    }

    /**
     * Get current system state
     */
    getSystemState(): {
        agents: AgentContext[];
        sharedContext: SharedContext;
        collaborationCount: number;
    } {
        return {
            agents: Array.from(this.agents.values()),
            sharedContext: this.sharedContext,
            collaborationCount: this.collaborationLog.length,
        };
    }

    /**
     * Reset all agents to idle state
     */
    resetAgents(): void {
        this.agents.forEach((agent) => {
            agent.state = "idle";
            agent.currentTask = undefined;
        });
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save collaboration log to disk
     */
    saveCollaborationLog(filePath: string): void {
        try {
            writeFileSync(filePath, JSON.stringify(this.collaborationLog, null, 2));
        } catch (error) {
            console.error("Failed to save collaboration log:", error);
        }
    }

    /**
     * Load collaboration log from disk
     */
    loadCollaborationLog(filePath: string): void {
        try {
            if (existsSync(filePath)) {
                const data = readFileSync(filePath, "utf-8");
                this.collaborationLog = JSON.parse(data);
            }
        } catch (error) {
            console.error("Failed to load collaboration log:", error);
        }
    }
}
