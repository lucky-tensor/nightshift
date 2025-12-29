# Technical Specification: Dark Factory

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Dark Factory CLI                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Engine                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Project    │  │   Finance    │  │     Git      │      │
│  │   Manager    │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent Runtime                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Persona    │  │   Execution  │  │   Quality    │      │
│  │   Loader     │  │   Sandbox    │  │   Gates      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM Provider Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Antigravity  │  │   OpenAI     │  │  Anthropic   │      │
│  │ CLI Adapter  │  │   Adapter    │  │   Adapter    │      │
│  │  (Primary)   │  └──────────────┘  └──────────────┘      │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Git Repo    │  │     YAML     │  │   File       │      │
│  │  (Worktrees) │  │   (State)    │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

#### Orchestration Engine
- Manages project lifecycle
- Coordinates between managers
- Handles decision branching logic
- Enforces 12-hour runtime limits

#### Project Manager
- Maintains task lists
- Audits task completion
- Generates progress reports
- Triggers agent check-ins

#### Finance Manager
- Monitors API credits
- Detects rate limits/overages
- Switches between providers
- Implements polling mode
- Tracks costs

#### Git Manager
- Creates semantic branches
- Manages worktrees
- Prevents remote pushes
- Handles branch lineage

#### Agent Runtime
- Loads persona templates
- Executes agent workflows
- Enforces acceptance criteria
- Manages agent state

#### Quality Gates
- Runs tests
- Executes linters/formatters
- Validates acceptance criteria
- Blocks incomplete work

## 2. Data Models

### 2.1 Project Schema

```typescript
interface Project {
  id: string;                    // UUID
  name: string;                  // Human-readable name
  description: string;           // Initial task description
  status: ProjectStatus;         // active | paused | completed | failed
  createdAt: Date;
  updatedAt: Date;
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
  startTime?: Date;
  endTime?: Date;
}

type ProjectStatus = 
  | 'initializing'
  | 'active'
  | 'paused'
  | 'waiting_for_credits'
  | 'completed'
  | 'failed'
  | 'timeout';

interface PersonaConfig {
  templateName: string;          // e.g., "engineer", "tester"
  templatePath: string;          // Path to .md file
  acceptanceCriteria: AcceptanceCriteria;
  priority: number;              // Execution order
}

interface AcceptanceCriteria {
  testsPass: boolean;
  lintPass: boolean;
  formatPass: boolean;
  customChecks: CustomCheck[];
}

interface CustomCheck {
  name: string;
  command: string;               // Shell command to run
  expectedExitCode: number;
}

interface DecisionContext {
  question: string;              // The decision being explored
  option: string;                // Which option this branch represents
  confidence: number;            // 0-1, agent's confidence in this path
  createdAt: Date;
}
```

### 2.2 Task List Schema

```typescript
interface TaskList {
  projectId: string;
  tasks: Task[];
  lastAuditedAt: Date;
  version: number;               // Incremented on each update
}

interface Task {
  id: string;                    // UUID
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;              // 1-5, 1 = highest
  dependencies: string[];        // Task IDs that must complete first
  assignedPersona?: string;      // Which persona is working on this
  
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Audit trail
  completionConfidence: number;  // 0-1, how confident we are it's done
  lastVerifiedAt?: Date;
  verificationNotes: string[];
}

type TaskStatus = 
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'skipped';
```

### 2.3 Finance State Schema

```typescript
interface FinanceState {
  projectId: string;
  providers: ProviderConfig[];
  currentProviderId: string;
  totalSpent: number;            // USD
  
  // Polling state
  pollingMode: boolean;
  pollingInterval: number;       // Milliseconds
  lastProbeAt: Date;
  
  // History
  providerSwitches: ProviderSwitch[];
  costHistory: CostEntry[];
}

interface ProviderConfig {
  id: string;
  name: string;                  // "openai", "anthropic", etc.
  model: string;                 // "gpt-4", "claude-3-opus", etc.
  apiKey: string;                // Encrypted
  
  // Limits
  creditsAvailable: number;      // USD
  rateLimit: RateLimit;
  
  // Priority
  priority: number;              // Lower = preferred
  enabled: boolean;
  
  // Health
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
}

interface RateLimit {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
}

interface ProviderSwitch {
  timestamp: Date;
  fromProvider: string;
  toProvider: string;
  reason: SwitchReason;
}

type SwitchReason = 
  | 'credits_exhausted'
  | 'rate_limit'
  | 'api_error'
  | 'timeout'
  | 'manual';

interface CostEntry {
  timestamp: Date;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;                  // USD
  operation: string;             // "chat", "noop_probe", etc.
}
```

### 2.4 Agent State Schema

```typescript
interface AgentState {
  projectId: string;
  personaName: string;
  
  // Execution state
  status: AgentStatus;
  currentTask?: string;          // Task ID
  conversationHistory: Message[];
  
  // Runtime tracking
  startedAt: Date;
  lastActivityAt: Date;
  runtimeMs: number;             // Total runtime
  
  // Decision tracking
  pendingDecisions: Decision[];
  madeDecisions: Decision[];
}

type AgentStatus = 
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting_for_quality'
  | 'blocked'
  | 'completed';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens: number;
  cost: number;
}

interface Decision {
  id: string;
  question: string;
  options: DecisionOption[];
  confidence: number;            // 0-1, overall confidence
  madeAt?: Date;
  selectedOption?: string;
}

interface DecisionOption {
  label: string;
  description: string;
  confidence: number;            // 0-1, confidence in this option
  estimatedEffort: string;       // "low", "medium", "high"
}
```

## 3. Core Algorithms

### 3.1 Provider Selection Algorithm

```typescript
/**
 * Selects the best available LLM provider based on:
 * - Available credits
 * - Priority ranking
 * - Recent failure rate
 * - Rate limit headroom
 */
function selectProvider(
  providers: ProviderConfig[],
  requiredTokens: number
): ProviderConfig | null {
  
  // Filter to enabled providers with credits
  const viable = providers.filter(p => 
    p.enabled && 
    p.creditsAvailable > 0 &&
    p.consecutiveFailures < 3
  );
  
  if (viable.length === 0) return null;
  
  // Score each provider
  const scored = viable.map(p => ({
    provider: p,
    score: calculateProviderScore(p, requiredTokens)
  }));
  
  // Sort by score (higher is better)
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].provider;
}

function calculateProviderScore(
  provider: ProviderConfig,
  requiredTokens: number
): number {
  let score = 0;
  
  // Priority (inverted, lower priority number = higher score)
  score += (10 - provider.priority) * 10;
  
  // Credits available
  score += Math.min(provider.creditsAvailable * 10, 50);
  
  // Rate limit headroom
  const headroom = provider.rateLimit.tokensPerMinute - requiredTokens;
  score += Math.min(headroom / 1000, 20);
  
  // Penalize recent failures
  score -= provider.consecutiveFailures * 15;
  
  // Bonus for recent success
  if (provider.lastSuccessAt) {
    const hoursSinceSuccess = 
      (Date.now() - provider.lastSuccessAt.getTime()) / (1000 * 60 * 60);
    score += Math.max(10 - hoursSinceSuccess, 0);
  }
  
  return score;
}
```

### 3.2 Decision Branching Algorithm

```typescript
/**
 * Determines if a decision point warrants branching
 * and creates child projects if needed
 */
async function handleDecisionPoint(
  agent: AgentState,
  decision: Decision,
  project: Project
): Promise<Project[]> {
  
  const CONFIDENCE_THRESHOLD = 0.7;
  const MIN_OPTIONS = 2;
  const MAX_BRANCHES = 2;
  
  // Don't branch if high confidence
  if (decision.confidence >= CONFIDENCE_THRESHOLD) {
    return [project]; // Continue with current project
  }
  
  // Don't branch if not enough viable options
  const viableOptions = decision.options.filter(
    opt => opt.confidence > 0.2
  );
  
  if (viableOptions.length < MIN_OPTIONS) {
    return [project]; // Continue with best guess
  }
  
  // Select top N options
  const topOptions = viableOptions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_BRANCHES);
  
  // Create child projects
  const childProjects = await Promise.all(
    topOptions.map(option => 
      createBranchProject(project, decision, option)
    )
  );
  
  // Pause parent project
  await pauseProject(project.id);
  
  // Link relationships
  project.childProjectIds = childProjects.map(p => p.id);
  await updateProject(project);
  
  return childProjects;
}

async function createBranchProject(
  parent: Project,
  decision: Decision,
  option: DecisionOption
): Promise<Project> {
  
  const branchName = generateBranchName(
    parent.workBranch,
    decision.question,
    option.label
  );
  
  const worktreePath = await createWorktree(
    parent.worktreePath,
    branchName
  );
  
  return {
    id: generateUUID(),
    name: `${parent.name} - ${option.label}`,
    description: `Exploring: ${decision.question}\nOption: ${option.description}`,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    maxRuntime: parent.maxRuntime,
    
    baseBranch: parent.workBranch, // Branch from parent's work
    workBranch: branchName,
    worktreePath,
    
    personas: [...parent.personas], // Clone personas
    
    parentProjectId: parent.id,
    childProjectIds: [],
    decisionContext: {
      question: decision.question,
      option: option.label,
      confidence: option.confidence,
      createdAt: new Date()
    },
    
    totalCost: 0,
    tokensUsed: 0
  };
}
```

### 3.3 Task Audit Algorithm

```typescript
/**
 * Audits task list for false positives/negatives
 * by having the agent verify each task
 */
async function auditTaskList(
  project: Project,
  taskList: TaskList,
  agent: AgentState
): Promise<TaskList> {
  
  const auditResults: TaskAuditResult[] = [];
  
  for (const task of taskList.tasks) {
    const result = await auditTask(task, project, agent);
    auditResults.push(result);
    
    // Update task based on audit
    if (result.shouldUpdate) {
      task.status = result.newStatus;
      task.completionConfidence = result.confidence;
      task.lastVerifiedAt = new Date();
      task.verificationNotes.push(result.note);
    }
  }
  
  taskList.lastAuditedAt = new Date();
  taskList.version++;
  
  await saveTaskList(taskList);
  
  return taskList;
}

interface TaskAuditResult {
  taskId: string;
  shouldUpdate: boolean;
  newStatus: TaskStatus;
  confidence: number;
  note: string;
}

async function auditTask(
  task: Task,
  project: Project,
  agent: AgentState
): Promise<TaskAuditResult> {
  
  // Build audit prompt
  const prompt = `
You are auditing task completion status.

Task: ${task.title}
Description: ${task.description}
Current Status: ${task.status}

Review the codebase in ${project.worktreePath} and determine:
1. Is this task actually complete? (yes/no/partial)
2. What evidence supports your conclusion?
3. Confidence level (0-1)

Respond in JSON format:
{
  "complete": boolean,
  "evidence": string,
  "confidence": number
}
  `.trim();
  
  const response = await sendToAgent(agent, prompt);
  const audit = JSON.parse(response);
  
  // Determine if status should change
  const currentlyComplete = task.status === 'completed';
  const shouldBeComplete = audit.complete;
  
  if (currentlyComplete === shouldBeComplete) {
    return {
      taskId: task.id,
      shouldUpdate: false,
      newStatus: task.status,
      confidence: audit.confidence,
      note: `Audit confirmed status. ${audit.evidence}`
    };
  }
  
  // Status mismatch - update needed
  return {
    taskId: task.id,
    shouldUpdate: true,
    newStatus: shouldBeComplete ? 'completed' : 'in_progress',
    confidence: audit.confidence,
    note: `Status changed during audit. ${audit.evidence}`
  };
}
```

### 3.4 Quality Gate Validation

```typescript
/**
 * Validates all acceptance criteria before marking work complete
 */
async function validateQualityGates(
  project: Project,
  persona: PersonaConfig
): Promise<QualityReport> {
  
  const results: CheckResult[] = [];
  const criteria = persona.acceptanceCriteria;
  
  // Run tests
  if (criteria.testsPass) {
    const testResult = await runCommand(
      project.worktreePath,
      'npm test'
    );
    results.push({
      name: 'Tests',
      passed: testResult.exitCode === 0,
      output: testResult.stdout,
      required: true
    });
  }
  
  // Run linter
  if (criteria.lintPass) {
    const lintResult = await runCommand(
      project.worktreePath,
      'npm run lint'
    );
    results.push({
      name: 'Linter',
      passed: lintResult.exitCode === 0,
      output: lintResult.stdout,
      required: true
    });
  }
  
  // Run formatter check
  if (criteria.formatPass) {
    const formatResult = await runCommand(
      project.worktreePath,
      'npm run format:check'
    );
    results.push({
      name: 'Formatter',
      passed: formatResult.exitCode === 0,
      output: formatResult.stdout,
      required: true
    });
  }
  
  // Run custom checks
  for (const check of criteria.customChecks) {
    const result = await runCommand(
      project.worktreePath,
      check.command
    );
    results.push({
      name: check.name,
      passed: result.exitCode === check.expectedExitCode,
      output: result.stdout,
      required: true
    });
  }
  
  const allPassed = results.every(r => r.passed || !r.required);
  
  return {
    passed: allPassed,
    checks: results,
    timestamp: new Date()
  };
}

interface CheckResult {
  name: string;
  passed: boolean;
  output: string;
  required: boolean;
}

interface QualityReport {
  passed: boolean;
  checks: CheckResult[];
  timestamp: Date;
}
```

## 4. API Specifications

### 4.1 CLI Commands

```bash
# Initialize new project
df init <project-name> \
  --description "Task description" \
  --persona engineer,tester \
  --max-runtime 12h

# Start project
df start <project-id>

# Pause project
df pause <project-id>

# Resume project
df resume <project-id>

# Get project status
df status <project-id>

# List all projects
df list [--status active|paused|completed]

# View task list
df tasks <project-id>

# View cost breakdown
df costs <project-id>

# Configure LLM provider
df provider add \
  --name openai \
  --model gpt-4 \
  --api-key $OPENAI_KEY \
  --credits 100 \
  --priority 1

# List providers
df provider list

# View decision branches
df branches <project-id>

# Compare branches
df compare <project-id-1> <project-id-2>

# Export project report
df export <project-id> --format markdown|json
```

### 4.2 Persona Template Format

```markdown
---
name: engineer
version: 1.0.0
description: Software engineer persona for feature development
acceptance_criteria:
  tests_pass: true
  lint_pass: true
  format_pass: true
  custom_checks:
    - name: "Build succeeds"
      command: "npm run build"
      expected_exit_code: 0
---

# Engineer Persona

You are an experienced software engineer working autonomously on a project.

## Your Responsibilities

1. Implement features according to the task list
2. Write comprehensive tests for all new code
3. Ensure code passes linting and formatting checks
4. Document your work clearly
5. Commit logical units of work with descriptive messages

## Work Process

1. Review the current task list
2. Select the highest priority unblocked task
3. Implement the task following best practices
4. Write tests to verify correctness
5. Run quality checks (tests, lint, format)
6. Update task list to mark task complete
7. Commit your work
8. Move to next task

## Decision Making

When you encounter a decision point where you have low confidence (<70%):
- Clearly articulate the decision and options
- Provide confidence levels for each option
- The orchestrator will create branches to explore options in parallel

## Quality Standards

- All code must have test coverage
- Follow existing code style and patterns
- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and focused

## Communication

Update the task list regularly with:
- Progress notes
- Blockers encountered
- Decisions made
- Questions for human review

## Constraints

- You cannot push to remote repositories
- You have a 12-hour maximum runtime
- Work in the assigned git worktree only
- Follow the acceptance criteria strictly
```

### 4.3 Internal APIs

```typescript
// Orchestration Engine API
interface OrchestrationEngine {
  // Project lifecycle
  createProject(config: ProjectConfig): Promise<Project>;
  startProject(projectId: string): Promise<void>;
  pauseProject(projectId: string): Promise<void>;
  resumeProject(projectId: string): Promise<void>;
  terminateProject(projectId: string, reason: string): Promise<void>;
  
  // Decision branching
  createBranches(projectId: string, decision: Decision): Promise<Project[]>;
  mergeBranch(childId: string, parentId: string): Promise<void>;
  
  // Monitoring
  getProjectStatus(projectId: string): Promise<ProjectStatus>;
  getProjectMetrics(projectId: string): Promise<ProjectMetrics>;
}

// Finance Manager API
interface FinanceManager {
  // Provider management
  addProvider(config: ProviderConfig): Promise<void>;
  removeProvider(providerId: string): Promise<void>;
  updateProvider(providerId: string, updates: Partial<ProviderConfig>): Promise<void>;
  
  // Credit monitoring
  checkCredits(providerId: string): Promise<number>;
  probeProvider(providerId: string): Promise<boolean>;
  
  // Provider selection
  selectProvider(requiredTokens: number): Promise<ProviderConfig | null>;
  switchProvider(reason: SwitchReason): Promise<ProviderConfig | null>;
  
  // Polling mode
  enterPollingMode(): Promise<void>;
  exitPollingMode(): Promise<void>;
  
  // Cost tracking
  recordCost(entry: CostEntry): Promise<void>;
  getCostSummary(projectId: string): Promise<CostSummary>;
}

// Project Manager API
interface ProjectManager {
  // Task management
  getTaskList(projectId: string): Promise<TaskList>;
  updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<void>;
  addTask(projectId: string, task: Omit<Task, 'id'>): Promise<Task>;
  
  // Auditing
  auditTaskList(projectId: string): Promise<TaskList>;
  scheduleAudit(projectId: string, intervalMs: number): Promise<void>;
  
  // Reporting
  generateProgressReport(projectId: string): Promise<ProgressReport>;
}

// Git Manager API
interface GitManager {
  // Worktree management
  createWorktree(basePath: string, branchName: string): Promise<string>;
  deleteWorktree(worktreePath: string): Promise<void>;
  
  // Branch operations
  createBranch(worktreePath: string, branchName: string): Promise<void>;
  commitChanges(worktreePath: string, message: string): Promise<string>;
  
  // Safety
  preventPush(worktreePath: string): Promise<void>;
  validateWorktree(worktreePath: string): Promise<boolean>;
  
  // Lineage
  getBranchLineage(branchName: string): Promise<string[]>;
  generateBranchName(parent: string, context: string): string;
}

// Agent Runtime API
interface AgentRuntime {
  // Persona management
  loadPersona(templatePath: string): Promise<PersonaTemplate>;
  instantiateAgent(project: Project, persona: PersonaConfig): Promise<AgentState>;
  
  // Execution
  executeAgent(agentId: string): Promise<void>;
  sendMessage(agentId: string, message: string): Promise<string>;
  
  // State management
  saveAgentState(agentId: string): Promise<void>;
  loadAgentState(agentId: string): Promise<AgentState>;
  
  // Quality gates
  validateQualityGates(agentId: string): Promise<QualityReport>;
}

// LLM Provider API
interface LLMProvider {
  // Provider metadata
  getName(): string;
  getModel(): string;
  
  // Chat operations
  sendMessage(message: string, context?: ConversationContext): Promise<LLMResponse>;
  streamMessage(message: string, context?: ConversationContext): AsyncIterator<LLMStreamChunk>;
  
  // Health and quota
  probe(): Promise<ProviderHealth>;
  checkQuota(): Promise<QuotaInfo>;
  
  // Cost tracking
  estimateCost(tokens: number): number;
  
  // Conversation management
  exportConversation(): Promise<ConversationExport>;
  importConversation(data: ConversationExport): Promise<void>;
}

interface ConversationContext {
  history: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface LLMResponse {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}

interface LLMStreamChunk {
  content: string;
  done: boolean;
}

interface ProviderHealth {
  available: boolean;
  quotaRemaining?: number;
  error?: string;
  responseTimeMs: number;
}

interface QuotaInfo {
  remaining: number;      // USD or tokens remaining
  total: number;          // Total quota
  resetAt?: Date;         // When quota resets
  unit: 'usd' | 'tokens'; // What unit quota is measured in
}

interface ConversationExport {
  provider: string;
  model: string;
  messages: Message[];
  metadata: {
    exportedAt: Date;
    totalTokens: number;
    totalCost: number;
  };
}

```

### 4.4 Antigravity CLI Adapter

The Antigravity CLI adapter is the **primary LLM provider** for Dark Factory. It interfaces with Antigravity IDE via its command-line interface.

#### 4.4.1 Adapter Implementation

```typescript
class AntigravityCLIAdapter implements LLMProvider {
  private cliPath: string = '/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity';
  private conversationHistory: Message[] = [];
  
  getName(): string {
    return 'antigravity';
  }
  
  getModel(): string {
    // Antigravity uses Gemini models
    // TODO: Determine how to query current model
    return 'gemini-pro';
  }
  
  async sendMessage(message: string, context?: ConversationContext): Promise<LLMResponse> {
    // Build command
    const args = ['chat', '--mode', 'agent'];
    
    // Add context files if specified
    if (context?.history) {
      // TODO: Determine how to maintain conversation context
      // Option 1: Use --reuse-window flag
      // Option 2: Re-send conversation history
      // Option 3: Export/import conversation state
    }
    
    // Execute command
    const result = await this.executeCommand(args, message);
    
    // Parse response
    return this.parseResponse(result);
  }
  
  async probe(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Minimal request to check availability
      const result = await this.executeCommand(
        ['chat', '--mode', 'ask'],
        'test'
      );
      
      const responseTimeMs = Date.now() - startTime;
      
      // Check for quota errors
      const quotaExhausted = this.detectQuotaError(result.stderr);
      
      return {
        available: !quotaExhausted && result.exitCode === 0,
        quotaRemaining: undefined, // TODO: Determine how to check quota
        error: quotaExhausted ? 'Quota exhausted' : undefined,
        responseTimeMs
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        responseTimeMs: Date.now() - startTime
      };
    }
  }
  
  async checkQuota(): Promise<QuotaInfo> {
    // TODO: CRITICAL - Determine how to check quota
    // Possible approaches:
    // 1. Check for quota API/command
    // 2. Parse error messages
    // 3. Track usage locally
    throw new Error('Not implemented - see TECHNICAL_QUESTIONS.md Q1');
  }
  
  private detectQuotaError(stderr: string): boolean {
    // TODO: CRITICAL - Determine quota error patterns
    // Need to test what error message appears when quota exhausted
    const quotaPatterns = [
      /quota.*exceeded/i,
      /rate.*limit/i,
      /insufficient.*credits/i,
      // Add more patterns based on investigation
    ];
    
    return quotaPatterns.some(pattern => pattern.test(stderr));
  }
  
  async exportConversation(): Promise<ConversationExport> {
    // TODO: Determine how to export conversation state
    // See TECHNICAL_QUESTIONS.md Q3
    return {
      provider: 'antigravity',
      model: this.getModel(),
      messages: this.conversationHistory,
      metadata: {
        exportedAt: new Date(),
        totalTokens: this.calculateTotalTokens(),
        totalCost: this.calculateTotalCost()
      }
    };
  }
  
  async importConversation(data: ConversationExport): Promise<void> {
    // TODO: Determine how to import conversation state
    // Options:
    // 1. Re-send all messages to establish context
    // 2. Use Antigravity's conversation import (if exists)
    this.conversationHistory = data.messages;
  }
  
  private async executeCommand(args: string[], input: string): Promise<CommandResult> {
    // Execute antigravity CLI command
    // Handle stdin for piped input
    // Capture stdout, stderr, exit code
    // See TECHNICAL_QUESTIONS.md Q4 for exit code mapping
  }
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

#### 4.4.2 Critical Requirements

**BLOCKER: Quota Detection (Q1)**
- Must detect when Antigravity quota is exhausted
- Required for Finance Manager to trigger provider switching
- Investigation needed: Error patterns, quota API, noop probe behavior

**BLOCKER: Provider Switching (Q2)**
- Must support switching to different provider mid-conversation
- Required for autonomous operation when quota exhausted
- Investigation needed: Conversation export/import, context preservation

**HIGH PRIORITY: State Management (Q3)**
- Should persist conversation state across restarts
- Needed for pause/resume functionality
- Investigation needed: Conversation storage location, programmatic access

**HIGH PRIORITY: Error Handling (Q4)**
- Must classify different error types (quota, network, invalid input)
- Needed for appropriate error recovery
- Investigation needed: Exit codes, error message patterns

#### 4.4.3 Antigravity CLI Usage

```bash
# Basic agent invocation
antigravity chat --mode agent "Implement feature X"

# With file context
antigravity chat --mode agent "Fix bug" -a src/file.ts

# Piped input
cat error.log | antigravity chat --mode agent "Debug this" -

# Window management
antigravity chat --reuse-window "Continue task"
antigravity chat --new-window "New task"
```

#### 4.4.4 Configuration

```yaml
# ~/.dark-factory/providers.yaml
providers:
  - id: antigravity-primary
    name: antigravity
    type: cli
    enabled: true
    priority: 1
    config:
      cli_path: /Applications/Antigravity.app/Contents/Resources/app/bin/antigravity
      mode: agent
      window_strategy: reuse  # reuse | new
      
  - id: openai-fallback
    name: openai
    model: gpt-4
    enabled: true
    priority: 2
    config:
      api_key: encrypted:...
      
  - id: anthropic-fallback
    name: anthropic
    model: claude-3-opus
    enabled: true
    priority: 3
    config:
      api_key: encrypted:...
```

#### 4.4.5 Open Questions

See [TECHNICAL_QUESTIONS.md](./TECHNICAL_QUESTIONS.md) for detailed investigation plan:

1. **Q1: Quota Detection** 🔴 BLOCKER
   - How to detect quota exhaustion?
   - Can we check remaining quota?
   - Do noop probes work reliably?

2. **Q2: Provider Switching** 🔴 BLOCKER
   - Can we switch providers mid-conversation?
   - How to preserve conversation context?
   - What's the provider configuration mechanism?

3. **Q3: State Management** 🟡 HIGH PRIORITY
   - Where is conversation state stored?
   - Can we save/restore programmatically?
   - Does state persist across restarts?

4. **Q4: Exit Codes** 🟡 HIGH PRIORITY
   - What exit codes does Antigravity use?
   - How to distinguish error types?
   - What error patterns exist?

5. **Q5: Performance** 🟢 MEDIUM PRIORITY
   - What are typical response times?
   - What are rate limit thresholds?
   - How to optimize noop probes?

## 5. Security Considerations

### 5.1 Git Safety
- **Pre-push hooks**: Install hooks that block all pushes to remote
- **Worktree isolation**: Each project in separate worktree
- **Branch validation**: Validate branch names match expected patterns
- **Commit signing**: Optional GPG signing for audit trail

### 5.2 API Key Management
- **Encryption at rest**: Encrypt all API keys in database
- **Environment variables**: Support loading from env vars
- **Key rotation**: Support updating keys without project restart
- **Least privilege**: Each provider gets minimal permissions

### 5.3 Code Execution
- **Sandboxing**: Run all quality checks in isolated environment
- **Timeout enforcement**: Hard timeouts on all command execution
- **Resource limits**: CPU/memory limits on spawned processes
- **Path validation**: Validate all file paths are within worktree

### 5.4 Data Privacy
- **Local storage**: All data stored locally, no cloud sync
- **Conversation logs**: Optionally encrypt conversation history
- **PII detection**: Warn if API keys/secrets detected in code
- **Audit logs**: Comprehensive logging of all actions

## 6. Performance Optimization

### 6.1 Caching Strategy
- **Persona templates**: Cache parsed templates in memory
- **Git operations**: Cache branch lineage lookups
- **Provider health**: Cache provider health checks (5 min TTL)
- **Task lists**: Cache in memory, persist on changes

### 6.2 Concurrency
- **Parallel branches**: Execute decision branches in parallel
- **Async operations**: Non-blocking I/O for all external calls
- **Worker threads**: Use workers for CPU-intensive operations
- **Connection pooling**: Reuse HTTP connections to LLM APIs

### 6.3 Resource Management
- **Memory limits**: Monitor and limit memory usage per agent
- **Disk cleanup**: Auto-cleanup old worktrees
- **Log rotation**: Rotate logs to prevent disk fill
- **Database optimization**: Index frequently queried fields

## 7. Error Handling

### 7.1 Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| API rate limit | 429 status code | Switch provider or wait |
| API timeout | Request timeout | Retry with exponential backoff |
| Out of credits | Overage message | Switch provider or poll |
| Git operation fails | Non-zero exit code | Retry once, then fail project |
| Quality gate fails | Test/lint failure | Block completion, notify agent |
| Agent timeout | 12-hour limit | Gracefully terminate, save state |
| Disk full | Write failure | Cleanup old data, alert user |
| Network outage | Connection error | Retry with backoff, then poll |

### 7.2 Retry Logic

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## 8. Monitoring & Observability

### 8.1 Metrics to Track
- **Project metrics**: Active projects, completion rate, avg runtime
- **Cost metrics**: Total spend, cost per project, cost per provider
- **Quality metrics**: Test pass rate, lint pass rate, acceptance criteria pass rate
- **Provider metrics**: Switch frequency, failure rate, avg response time
- **Agent metrics**: Tasks completed, decisions made, branches created

### 8.2 Logging Strategy
- **Structured logs**: JSON format for easy parsing
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **Context**: Include projectId, agentId, timestamp in all logs
- **Rotation**: Daily rotation, keep 30 days
- **Sensitive data**: Redact API keys, tokens from logs

### 8.3 Health Checks
- **Database**: Check SQLite connection
- **Git**: Validate worktrees exist and are clean
- **Providers**: Periodic health probes
- **Disk space**: Alert if < 10% free
- **Memory**: Alert if > 80% used

## 9. Testing Strategy

### 9.1 Unit Tests
- Test each manager independently
- Mock external dependencies (LLM APIs, git)
- Aim for >80% code coverage
- Fast execution (< 10s total)

### 9.2 Integration Tests
- Test manager interactions
- Use real git operations (in temp dirs)
- Mock LLM APIs with fixtures
- Test error scenarios

### 9.3 End-to-End Tests
- Full project lifecycle tests
- Use cheap LLM provider (or mocks)
- Validate quality gates work
- Test decision branching

### 9.4 Performance Tests
- Measure project initialization time
- Measure provider switch time
- Test with multiple concurrent projects
- Memory leak detection

## 10. Deployment

### 10.1 Installation
```bash
bun install -g @dark-factory/cli

# Initialize config
df setup

# Configure first provider
df provider add --name openai --model gpt-4 --api-key $KEY
```

### 10.2 Configuration Files

**~/.dark-factory/config.yaml**
```yaml
dataDir: ~/.dark-factory/data
defaultMaxRuntime: 12h
defaultPersonas:
  - engineer
pollingInterval: 5m
auditInterval: 30m
logLevel: info
```

**~/.dark-factory/providers.yaml**
```yaml
providers:
  - id: openai-gpt4
    name: openai
    model: gpt-4
    apiKey: encrypted:...
    creditsAvailable: 100
    priority: 1
    enabled: true
```

### 10.3 System Requirements
- **OS**: macOS, Linux (Windows WSL)
- **Bun**: >= 1.0.0
- **Git**: >= 2.25.0 (for worktree support)
- **Disk**: 10GB minimum free space
- **Memory**: 4GB minimum

## 11. Future Enhancements

### 11.1 Phase 2
- Web dashboard for monitoring
- Slack/Discord notifications
- Custom persona builder UI
- Multi-repository support
- Advanced cost optimization (model routing)

### 11.2 Phase 3
- Cloud-hosted orchestration
- Team collaboration features
- Agent-to-agent communication
- Automated code review agents
- CI/CD pipeline integration
