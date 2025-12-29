export type ProjectStatus =
  | 'initializing'
  | 'active'
  | 'paused'
  | 'waiting_for_credits'
  | 'completed'
  | 'failed'
  | 'timeout';

export interface Project {
  id: string;                    // UUID
  name: string;                  // Human-readable name
  description: string;           // Initial task description
  status: ProjectStatus;
  createdAt: string;             // ISO Date
  updatedAt: string;             // ISO Date
  maxRuntime: number;            // Milliseconds (default: 12 hours)

  // Git information
  baseBranch: string;            // e.g., "main"
  workBranch: string;            // e.g., "df/feature-auth/2025-12-26"
  worktreePath: string;          // Absolute path to worktree

  // Personas
  personas: PersonaConfig[];     // Active personas for this project

  // Parent/child relationships (for decision branches)
  parentProjectId?: string;
  childProjectIds: string[];
  decisionContext?: DecisionContext;

  // Metrics
  totalCost: number;             // USD
  tokensUsed: number;
  startTime?: string;            // ISO Date
  endTime?: string;              // ISO Date
}

export interface PersonaConfig {
  templateName: string;          // e.g., "engineer", "tester"
  templatePath: string;          // Path to .md file
  acceptanceCriteria: AcceptanceCriteria;
  priority: number;              // Execution order
}

export interface AcceptanceCriteria {
  testsPass: boolean;
  lintPass: boolean;
  formatPass: boolean;
  customChecks: CustomCheck[];
}

export interface CustomCheck {
  name: string;
  command: string;               // Shell command to run
  expectedExitCode: number;
}

export interface DecisionContext {
  question: string;              // The decision being explored
  option: string;                // Which option this branch represents
  confidence: number;            // 0-1, agent's confidence in this path
  createdAt: string;             // ISO Date
}

// Task List Schema
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface TaskList {
  projectId: string;
  tasks: Task[];
  lastAuditedAt: string;         // ISO Date
  version: number;               // Incremented on each update
}

export interface Task {
  id: string;                    // UUID
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;              // 1-5, 1 = highest
  dependencies: string[];        // Task IDs that must complete first
  assignedPersona?: string;      // Which persona is working on this

  createdAt: string;             // ISO Date
  startedAt?: string;            // ISO Date
  completedAt?: string;          // ISO Date

  // Audit trail
  completionConfidence: number;  // 0-1, how confident we are it's done
  lastVerifiedAt?: string;       // ISO Date
  verificationNotes: string[];
}

// Finance State Schema
export type SwitchReason =
  | 'credits_exhausted'
  | 'rate_limit'
  | 'api_error'
  | 'timeout'
  | 'manual';

export interface FinanceState {
  projectId: string;
  providers: ProviderConfig[];
  currentProviderId: string;
  totalSpent: number;            // USD

  // Polling state
  pollingMode: boolean;
  pollingInterval: number;       // Milliseconds
  lastProbeAt: string;           // ISO Date

  // History
  providerSwitches: ProviderSwitch[];
  costHistory: CostEntry[];
}

export interface ProviderConfig {
  id: string;
  name: string;                  // "openai", "anthropic", etc.
  model?: string;                // "gpt-4", "claude-3-opus", etc.
  apiKey?: string;               // Encrypted or env var name

  // New: Antigravity specific
  profile?: string;              // Antigravity Profile Name

  // Limits
  creditsAvailable: number;      // USD
  rateLimit: RateLimit;

  // Priority
  priority: number;              // Lower = preferred
  enabled: boolean;

  // Health
  lastSuccessAt?: string;        // ISO Date
  lastFailureAt?: string;        // ISO Date
  consecutiveFailures: number;
}

export interface RateLimit {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
}

export interface ProviderSwitch {
  timestamp: string;             // ISO Date
  fromProvider: string;
  toProvider: string;
  reason: SwitchReason;
}

export interface CostEntry {
  timestamp: string;             // ISO Date
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;                  // USD
  operation: string;             // "chat", "noop_probe", etc.
}

// Alias for storage compatibility
export type TaskItem = Task;

// Simplified finance state for OpenCode-based storage
export interface SimpleFinanceState {
  totalCost: number;
  totalTokens: number;
  costByModel: Record<string, { tokens: number; cost: number }>;
  currentModel: string;
  lastUpdated: string;           // ISO Date
}

