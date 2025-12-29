export type ProjectStatus =
    | "initializing"
    | "active"
    | "paused"
    | "waiting_for_credits"
    | "completed"
    | "failed"
    | "timeout";

export interface ProjectSession {
    id: string; // UUID
    name: string; // Human-readable name
    description: string; // Initial task description
    status: ProjectStatus;
    createdAt: string; // ISO Date
    updatedAt: string; // ISO Date
    maxRuntime: number; // Milliseconds (default: 12 hours)

    // Git information
    baseBranch: string; // e.g., "main"
    workBranch: string; // e.g., "df/task/[uuid]"
    worktreePath: string; // Absolute path to worktree

    // Session information
    sessionId?: string; // Persistent session ID for this project

    // Subagents
    subagents: SubagentConfig[]; // Active subagents for this project

    // Parent/child relationships (for decision branches)
    parentProjectId?: string;
    childProjectIds: string[];
    decisionContext?: DecisionContext;

    // Metrics
    totalCost: number; // USD
    tokensUsed: number;
    startTime?: string; // ISO Date
    endTime?: string; // ISO Date
}

export interface SubagentConfig {
    templateName: string; // e.g., "engineer", "tester"
    templatePath: string; // Path to .md file
    acceptanceCriteria: AcceptanceCriteria;
    priority: number; // Execution order
}

export interface AcceptanceCriteria {
    testsPass: boolean;
    lintPass: boolean;
    formatPass: boolean;
    customChecks: CustomCheck[];
}

export interface CustomCheck {
    name: string;
    command: string; // Shell command to run
    expectedExitCode: number;
}

export interface DecisionContext {
    question: string; // The decision being explored
    option: string; // Which option this branch represents
    confidence: number; // 0-1, agent's confidence in this path
    createdAt: string; // ISO Date
}

// Task List Schema
export type TaskStatus = "pending" | "in_progress" | "blocked" | "completed" | "failed" | "skipped";

export interface TaskList {
    projectId: string;
    tasks: TaskPrompt[];
    lastAuditedAt: string; // ISO Date
    version: number; // Incremented on each update
}

export interface TaskPrompt {
    id: string; // UUID
    title: string;
    description: string;
    status: TaskStatus;
    priority: number; // 1-5, 1 = highest
    dependencies: string[]; // Task IDs that must complete first
    assignedSubagent?: string; // Which subagent is working on this

    createdAt: string; // ISO Date
    startedAt?: string; // ISO Date
    completedAt?: string; // ISO Date

    // Audit trail
    completionConfidence: number; // 0-1, how confident we are it's done
    lastVerifiedAt?: string; // ISO Date
    verificationNotes: string[];
}

// Finance State Schema
export type SwitchReason = "credits_exhausted" | "rate_limit" | "api_error" | "timeout" | "manual";

export interface FinanceState {
    projectId: string;
    providers: ProviderConfig[];
    currentProviderId: string;
    totalSpent: number; // USD

    // Polling state
    pollingMode: boolean;
    pollingInterval: number; // Milliseconds
    lastProbeAt: string; // ISO Date

    // History
    providerSwitches: ProviderSwitch[];
    costHistory: CostEntry[];
}

export interface ProviderConfig {
    id: string;
    name: string; // "openai", "anthropic", etc.
    model?: string; // "gpt-4", "claude-3-opus", etc.
    apiKey?: string; // Encrypted or env var name

    // New: Antigravity specific
    profile?: string; // Antigravity Profile Name

    // Limits
    creditsAvailable: number; // USD
    rateLimit: RateLimit;

    // Priority
    priority: number; // Lower = preferred
    enabled: boolean;

    // Health
    lastSuccessAt?: string; // ISO Date
    lastFailureAt?: string; // ISO Date
    consecutiveFailures: number;
}

export interface RateLimit {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
}

export interface ProviderSwitch {
    timestamp: string; // ISO Date
    fromProvider: string;
    toProvider: string;
    reason: SwitchReason;
}

export interface CostEntry {
    timestamp: string; // ISO Date
    provider: string;
    model: string;
    tokensUsed: number;
    cost: number; // USD
    operation: string; // "chat", "noop_probe", etc.
}

// Alias for storage compatibility
export type TaskItem = TaskPrompt;

// Simplified finance state for OpenCode-based storage
export interface SimpleFinanceState {
    totalCost: number;
    totalTokens: number;
    costByModel: Record<string, { tokens: number; cost: number }>;
    currentModel: string;
    lastUpdated: string; // ISO Date
}

// ============================================================================
// FACTORY MVP TYPES
// ============================================================================

/**
 * Factory - Top-level singleton that produces software products
 */
export interface Factory {
    id: string; // UUID
    name: string; // Factory name
    description: string;
    createdAt: string; // ISO Date
    updatedAt: string; // ISO Date

    // Configuration
    defaultModel: string;
    budgetLimit: number; // USD
    outputDirectory: string; // Where to create product repos

    // Metrics
    totalProducts: number;
    totalCost: number;
    totalTokens: number;

    // State
    status: "active" | "paused" | "shutdown";
}

/**
 * Product - A software product being built by the factory
 */
export interface Product {
    id: string; // UUID
    factoryId: string;
    name: string; // Product name (e.g., "task-manager-app")
    description: string; // High-level product description

    // Repository
    repoPath: string; // Local git repo path
    remoteUrl?: string; // Optional remote git URL
    mainBranch: string; // Usually "main"

    // Documents
    prdPath: string; // Path to PRD.md
    planPath: string; // Path to PLAN.md

    // Status
    status: ProductStatus;
    createdAt: string; // ISO Date
    updatedAt: string; // ISO Date

    // Metrics
    totalProjects: number;
    completedProjects: number;
    totalCost: number;
    totalTokens: number;
}

export type ProductStatus =
    | "planning" // PRD and PLAN being created
    | "in_progress" // Projects being executed
    | "review" // Ready for review
    | "completed" // All projects done
    | "paused"
    | "cancelled";

/**
 * Plan - Implementation plan for a product (stored in PLAN.md)
 */
export interface Plan {
    productId: string;
    version: number; // Incremented when plan is updated
    createdAt: string; // ISO Date
    updatedAt: string; // ISO Date

    // Plan content
    overview: string;
    goals: string[];
    milestones: Milestone[];
    projects: PlannedProject[]; // Ordered list of projects
}

export interface Milestone {
    name: string;
    description: string;
    targetDate?: string; // ISO Date
    projectIds: string[]; // Projects that contribute to this milestone
}

/**
 * PlannedProject - A project defined in the plan (before execution)
 */
export interface PlannedProject {
    id: string; // UUID
    name: string;
    description: string;
    priority: number; // 1-5, 1 = highest
    estimatedDays: number;
    dependencies: string[]; // IDs of projects that must complete first

    // Assigned agents
    plannerAgent?: boolean; // Needs planning breakdown
    coderAgent?: boolean; // Needs implementation
    curatorAgent?: boolean; // Needs documentation

    // State
    status: "pending" | "ready" | "in_progress" | "completed" | "blocked";
}

/**
 * Agent Role Types
 */
export type AgentRole =
    // Supervisors
    | "pm-supervisor"
    | "git-supervisor"
    | "finance-supervisor"
    // Workers
    | "planner"
    | "coder"
    | "curator";

/**
 * Agent Assignment - Links an agent role to a project/task
 */
export interface AgentAssignment {
    id: string; // UUID
    role: AgentRole;
    projectId?: string;
    taskId?: string;
    status: "assigned" | "active" | "completed" | "failed";
    assignedAt: string; // ISO Date
    completedAt?: string; // ISO Date
    cost: number; // USD
    tokens: number;
}

/**
 * Knowledge Base Entry
 */
export interface KnowledgeEntry {
    id: string; // UUID
    projectId: string;
    productId: string;
    type: "research" | "handbook" | "decision" | "reference";
    title: string;
    filePath: string; // Relative to project or product docs/
    createdAt: string; // ISO Date
    updatedAt: string; // ISO Date
    mergedToMain: boolean; // Whether this has been merged to product root
}
