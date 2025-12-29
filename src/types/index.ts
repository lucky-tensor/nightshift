// ============================================================================
// GLOBAL CONFIGURATION (~/.config/dark-factory/config.yaml)
// ============================================================================

export interface GlobalConfig {
    factories: KnownFactory[];
    defaultFactoryId?: string;
    theme?: string;
}

export interface KnownFactory {
    id: string;
    name: string;
    path: string; // Absolute path to Factory Root
    lastOpenedAt: string;
}

// ============================================================================
// FACTORY SCOPE (Stored in Factory Root/.dark-factory/factory.yaml)
// ============================================================================

export interface FactoryConfig {
    id: string;
    name: string;
    rootPath: string; // The Parent Directory (e.g., ./my-project)
    mainRepoPath: string; // The Main Git Repo (e.g., ./my-project/my-project-main)
    createdAt: string;

    // Configuration
    budgetLimit: number;
    defaultModel: string;
}

// ============================================================================
// PROJECT / WORKTREE SCOPE
// ============================================================================

export type ProjectStatus = "active" | "completed" | "failed" | "paused";

export interface Project {
    id: string; // UUID
    name: string; // e.g. "feature-login"

    // Structure
    factoryId: string;
    branchName: string; // 1:1 map to git branch
    worktreePath: string; // 1:1 map to file system path

    // Hierarchy
    parentProjectId?: string; // If spawned from a fork in the road
    childProjectIds: string[];

    // State
    status: ProjectStatus;
    currentSessionId?: string; // Only one active session allowed

    // Context & Rules
    contextPath: string; // Path to initial-context.md

    // Metrics
    createdAt: string;
    updatedAt: string;
    totalCost: number;
    tokensUsed: number;
}

// ============================================================================
// SESSION (Agent Runtime)
// ============================================================================

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
}

export interface Session {
    id: string;
    projectId: string;
    status: "running" | "completed" | "failed";
    startTime: string;
    endTime?: string;

    // The "Goal" for this specific session
    objective: string;

    messages: Message[];

    cost: number;
    tokens: number;
}

// ============================================================================
// MISSING TYPES (Added to fix build)
// ============================================================================

export interface ProjectSession {
    id: string;
    projectId: string;
    messages: Message[];
}

export interface SimpleFinanceState {
    balance: number;
    transactions: Transaction[];
}

export interface Transaction {
    id: string;
    amount: number;
    description: string;
    date: string;
}

export interface TaskPrompt {
    id: string;
    description: string;
}

export interface TaskStatus {
    id: string;
    status: "pending" | "in_progress" | "completed" | "failed";
}

export interface KnowledgeEntry {
    id: string;
    title: string;
    content: string;
    tags: string[];
    type: "research" | "handbook" | "decision" | "reference";
}

export interface Plan {
    id: string;
    projectId: string;
    milestones: Milestone[];
}

export interface PlannedProject {
    id: string;
    name: string;
    description: string;
    status: "pending" | "ready" | "in_progress" | "completed" | "blocked";
    dependencies: string[];
}

export interface Milestone {
    id: string;
    title: string;
    tasks: PlannedProject[];
}

export interface Product {
    id: string;
    name: string;
    status: "concept" | "development" | "released";
}

export interface Factory extends FactoryConfig {}
