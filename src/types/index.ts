// ============================================================================
// GLOBAL CONFIGURATION (~/.config/nightshift/config.yaml)
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
// FACTORY SCOPE (Stored in Factory Root/.nightshift/factory.yaml)
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
    outputDirectory: string;
    status: "active" | "maintenance" | "disabled";
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
    status: "initializing" | "active" | "paused" | "completed" | "failed";
}

export interface SimpleFinanceState {
    totalCost: number;
    totalTokens: number;
    costByModel: Record<string, { tokens: number; cost: number }>;
    currentModel: string;
    lastUpdated: string;
    // Optional legacy fields if needed
    balance?: number;
    transactions?: Transaction[];
}

export interface Transaction {
    id: string;
    amount: number;
    description: string;
    date: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface TaskPrompt {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: number;
    dependencies: string[];
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    assignedSubagent?: string;
    completionConfidence: number;
    verificationNotes: string[];
}

export interface KnowledgeEntry {
    id: string;
    productId: string;
    projectId?: string;
    mergedToMain?: boolean;
    title: string;
    type: "research" | "handbook" | "decision" | "reference";
    // Metadata
    filePath: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
}

export interface Plan {
    id: string;
    productId: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    overview: string;
    goals: string[];
    milestones: Milestone[];
    projects: PlannedProject[];
}

export interface PlannedProject {
    id: string;
    name: string;
    description: string;
    status: "pending" | "ready" | "in_progress" | "completed" | "blocked";
    priority: number;
    estimatedDays: number;
    dependencies: string[];
    // Agent assignments
    plannerAgent?: boolean;
    coderAgent?: boolean;
    curatorAgent?: boolean;
}

export interface Milestone {
    id: string;
    name: string;
    description: string;
    targetDate?: string;
    tasks: PlannedProject[];
}

export type ProductStatus = "concept" | "development" | "released" | "review" | "planning";

export interface Product {
    id: string;
    factoryId: string;
    name: string;
    description: string;
    status: ProductStatus;
    createdAt: string;
    updatedAt: string;
    rootPath: string; // Product root
    repoPath: string; // Git repo root
    prdPath: string; // Path to PRD.md
    planPath: string; // Path to PLAN.md
    remoteUrl?: string;
    mainBranch?: string;
    totalProjects: number;
    completedProjects: number;
    totalCost: number;
    totalTokens: number;
}

export type Factory = FactoryConfig;

// ============================================================================
// ENHANCED GIT WORKFLOW (Brain of the Factory)
// ============================================================================

export interface CommitMetadata {
    prompt: string; // The "Intent": Minimal instructions required to reproduce the change
    diffReconstructionHint: string; // "How": Specific implementation details (e.g. "Use early return for error handling")
    expectedOutcome: string; // "Goal": Functional verification criteria
    filesChanged: string[]; // List of files this prompt is intended to modify
    contextSummary: string; // "Why": Brief architectural context
    agentId?: string;
    sessionId?: string;
}

export interface EnhancedCommitMessage {
    title: string; // Short descriptive title
    metadata: CommitMetadata; // Structured metadata for replay
}

// ============================================================================
// CODE INDEXING SYSTEM
// ============================================================================

export interface CodeIndex {
    embeddings: CodeEmbedding[];
    keywords: KeywordIndex[];
    lastUpdated: string;
}

export interface CodeEmbedding {
    filePath: string;
    contentHash: string;
    embedding: number[]; // Vector representation
    type: "function" | "class" | "interface" | "comment" | "documentation";
}

export interface KeywordIndex {
    keyword: string;
    locations: CodeLocation[];
    frequency: number;
}

export interface CodeLocation {
    filePath: string;
    lineStart: number;
    lineEnd: number;
    type:
    | "definition"
    | "usage"
    | "documentation"
    | "function"
    | "class"
    | "interface"
    | "comment";
}

// ============================================================================
// MULTI-AGENT ARCHITECTURE
// ============================================================================

export type AgentType = "planner" | "coder" | "curator" | "tester" | "reviewer";
export type AgentState = "idle" | "active" | "completed" | "failed";

export interface AgentContext {
    id: string;
    type: AgentType;
    state: AgentState;
    currentTask?: string;
    sharedContext: SharedContext;
}

export interface SharedContext {
    projectId: string;
    sessionId: string;
    codeIndex: CodeIndex;
    recentCommits: EnhancedCommitMessage[];
    activeTasks: TaskPrompt[];
    knowledgeBase: KnowledgeEntry[];
}

export interface AgentCollaboration {
    fromAgentId: string;
    toAgentId: string;
    messageType: "handoff" | "request" | "response" | "status";
    content: string;
    timestamp: string;
}
