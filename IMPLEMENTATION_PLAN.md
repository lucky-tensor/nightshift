# Implementation Plan: Dark Factory

## Overview

This implementation plan breaks down the Dark Factory project into phases, with each phase delivering incremental value. The plan prioritizes core functionality first, then adds sophistication in later phases.

**Estimated Timeline**: 8-12 weeks for MVP (Phases 1-3)

## Phase 0: Project Setup (Week 1)

### Goals
- Set up development environment
- Establish project structure
- Configure tooling and CI/CD

### Tasks

#### 0.1 Repository Setup
- [ ] Initialize TypeScript project with Bun
- [ ] Set up ESLint, Prettier, and TypeScript strict mode
- [ ] Configure Bun test runner
- [ ] Set up GitHub Actions for CI
- [ ] Create initial README with project overview

**Acceptance Criteria**:
- `bun test` runs successfully
- `bun run lint` passes
- `bun run build` produces clean output
- CI pipeline runs on push

#### 0.2 Project Structure
```
dark-factory/
├── src/
│   ├── cli/              # CLI commands
│   ├── core/             # Core orchestration engine
│   ├── managers/         # Project, Finance, Git managers
│   ├── runtime/          # Agent runtime
│   ├── providers/        # LLM provider adapters
│   ├── storage/          # Database and file storage
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Shared utilities
├── personas/             # Persona templates
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                 # Additional documentation
└── examples/             # Example projects
```

- [ ] Create directory structure
- [ ] Set up path aliases in tsconfig.json
- [ ] Create barrel exports for each module

**Acceptance Criteria**:
- All directories exist
- Imports work using path aliases
- No circular dependencies

#### 0.3 Storage Layer Setup
- [ ] Choose YAML library (js-yaml)
- [ ] Design file structure for state storage
- [ ] Create storage manager with type safety
- [ ] Implement atomic file writes

**Acceptance Criteria**:
- Storage directory initializes on first run
- YAML files parse/serialize correctly
- Type-safe storage operations work
- Concurrent writes handled safely

#### 0.4 Development Tools
- [ ] Set up Bun watch mode for development
- [ ] Create bun scripts for common tasks
- [ ] Set up debugging configuration for VS Code
- [ ] Create developer documentation

**Acceptance Criteria**:
- `bun --watch` starts in watch mode
- Debugger attaches successfully
- All scripts documented in package.json

**Files to Create**:
- `src/storage/yaml-storage.ts`
- `tests/unit/storage/yaml-storage.test.ts`

---

## Phase 1: Core Infrastructure (Weeks 2-3)

### Goals
- Implement basic project lifecycle
- Set up git worktree management
- Create simple CLI interface

### Tasks

#### 1.1 Git Manager
- [ ] Implement `createWorktree()`
- [ ] Implement `deleteWorktree()`
- [ ] Implement `createBranch()`
- [ ] Implement `commitChanges()`
- [ ] Implement `preventPush()` (git hooks)
- [ ] Implement `generateBranchName()`
- [ ] Write unit tests for all functions

**Acceptance Criteria**:
- Can create/delete worktrees
- Branch names follow semantic pattern
- Pre-push hook blocks remote pushes
- All tests pass

**Files to Create**:
- `src/managers/git-manager.ts`
- `tests/unit/managers/git-manager.test.ts`

#### 1.2 Project Manager (Basic)
- [ ] Implement `createProject()`
- [ ] Implement `getProject()`
- [ ] Implement `updateProject()`
- [ ] Implement `listProjects()`
- [ ] Implement project status tracking
- [ ] Write unit tests

**Acceptance Criteria**:
- CRUD operations work
- Projects persist to YAML files
- Status transitions validated
- All tests pass

**Files to Create**:
- `src/managers/project-manager.ts`
- `src/storage/project-storage.ts`
- `tests/unit/managers/project-manager.test.ts`

#### 1.3 Task List Manager
- [ ] Implement `getTaskList()`
- [ ] Implement `updateTask()`
- [ ] Implement `addTask()`
- [ ] Implement task dependency validation
- [ ] Write unit tests

**Acceptance Criteria**:
- Tasks stored per project
- Dependencies enforced
- Task status transitions work
- All tests pass

**Files to Create**:
- `src/managers/task-manager.ts`
- `src/storage/task-storage.ts`
- `tests/unit/managers/task-manager.test.ts`

#### 1.4 CLI Foundation
- [ ] Set up Commander.js
- [ ] Implement `df init` command
- [ ] Implement `df list` command
- [ ] Implement `df status` command
- [ ] Add colorful output (chalk)
- [ ] Add progress indicators (ora)

**Acceptance Criteria**:
- CLI commands work
- Help text is clear
- Errors are user-friendly
- Output is well-formatted

**Files to Create**:
- `src/cli/index.ts`
- `src/cli/commands/init.ts`
- `src/cli/commands/list.ts`
- `src/cli/commands/status.ts`

#### 1.5 Integration Test
- [ ] Create end-to-end test: init → status → cleanup
- [ ] Test in temporary directory
- [ ] Verify git worktree created
- [ ] Verify database entries

**Acceptance Criteria**:
- E2E test passes
- Cleanup works properly
- No leftover files or YAML state

**Files to Create**:
- `tests/e2e/basic-lifecycle.test.ts`

---

## Phase 2: LLM Integration (Weeks 4-5)

### Goals
- Implement LLM provider adapters
- Create finance manager
- Enable basic agent execution

### Tasks

#### 2.1 Provider Interface
- [ ] Define `LLMProvider` interface
- [ ] Define `ProviderConfig` type
- [ ] Define `ChatMessage` types
- [ ] Create provider factory

**Acceptance Criteria**:
- Interface supports all required operations
- Type safety enforced
- Factory pattern works

**Files to Create**:
- `src/providers/types.ts`
- `src/providers/factory.ts`

#### 2.2 OpenAI Adapter
- [ ] Implement OpenAI provider
- [ ] Handle streaming responses
- [ ] Implement token counting
- [ ] Implement cost calculation
- [ ] Handle rate limits
- [ ] Write unit tests (with mocks)

**Acceptance Criteria**:
- Can send/receive messages
- Token counting accurate
- Cost tracking works
- Rate limit errors handled
- All tests pass

**Files to Create**:
- `src/providers/openai-provider.ts`
- `tests/unit/providers/openai-provider.test.ts`

#### 2.3 Anthropic Adapter
- [ ] Implement Anthropic provider
- [ ] Handle streaming responses
- [ ] Implement token counting
- [ ] Implement cost calculation
- [ ] Handle rate limits
- [ ] Write unit tests (with mocks)

**Acceptance Criteria**:
- Same as OpenAI adapter
- All tests pass

**Files to Create**:
- `src/providers/anthropic-provider.ts`
- `tests/unit/providers/anthropic-provider.test.ts`

#### 2.4 Finance Manager
- [ ] Implement `addProvider()`
- [ ] Implement `selectProvider()` with scoring algorithm
- [ ] Implement `checkCredits()` via noop probe
- [ ] Implement `switchProvider()`
- [ ] Implement `recordCost()`
- [ ] Write unit tests

**Acceptance Criteria**:
- Provider selection works
- Credit monitoring works
- Provider switching works
- Cost tracking accurate
- All tests pass

**Files to Create**:
- `src/managers/finance-manager.ts`
- `src/storage/finance-storage.ts`
- `tests/unit/managers/finance-manager.test.ts`

#### 2.5 Polling Mode
- [ ] Implement `enterPollingMode()`
- [ ] Implement `exitPollingMode()`
- [ ] Implement periodic probing
- [ ] Implement auto-resume on recovery
- [ ] Write integration test

**Acceptance Criteria**:
- Enters polling when no providers available
- Probes at configured interval
- Resumes when provider available
- Integration test passes

**Files to Create**:
- `src/managers/polling-service.ts`
- `tests/integration/polling-mode.test.ts`

#### 2.6 CLI Provider Commands
- [ ] Implement `df provider add`
- [ ] Implement `df provider list`
- [ ] Implement `df provider remove`
- [ ] Implement `df costs` command

**Acceptance Criteria**:
- Can manage providers via CLI
- API keys encrypted at rest
- Cost reports are clear

**Files to Create**:
- `src/cli/commands/provider.ts`
- `src/cli/commands/costs.ts`

---

## Phase 3: Agent Runtime (Weeks 6-7)

### Goals
- Implement persona system
- Create agent execution engine
- Enable basic autonomous work

### Tasks

#### 3.1 Persona Template Parser
- [ ] Define persona markdown format
- [ ] Implement YAML frontmatter parser
- [ ] Implement template loader
- [ ] Validate acceptance criteria
- [ ] Write unit tests

**Acceptance Criteria**:
- Can parse persona templates
- Validation catches errors
- All tests pass

**Files to Create**:
- `src/runtime/persona-loader.ts`
- `tests/unit/runtime/persona-loader.test.ts`

#### 3.2 Default Personas
- [ ] Create "engineer" persona template
- [ ] Create "tester" persona template
- [ ] Create "reviewer" persona template
- [ ] Document persona format

**Acceptance Criteria**:
- All personas parse successfully
- Acceptance criteria are clear
- Documentation complete

**Files to Create**:
- `personas/engineer.md`
- `personas/tester.md`
- `personas/reviewer.md`
- `docs/persona-guide.md`

#### 3.3 Agent State Manager
- [ ] Implement `createAgent()`
- [ ] Implement `saveAgentState()`
- [ ] Implement `loadAgentState()`
- [ ] Implement conversation history tracking
- [ ] Write unit tests

**Acceptance Criteria**:
- Agent state persists
- Conversation history maintained
- State can be restored
- All tests pass

**Files to Create**:
- `src/runtime/agent-state-manager.ts`
- `src/storage/agent-storage.ts`
- `tests/unit/runtime/agent-state-manager.test.ts`

#### 3.4 Agent Executor
- [ ] Implement `executeAgent()`
- [ ] Implement `sendMessage()`
- [ ] Integrate with LLM providers
- [ ] Implement runtime tracking
- [ ] Implement 12-hour timeout
- [ ] Write integration tests

**Acceptance Criteria**:
- Agent can execute tasks
- Messages sent to LLM
- Runtime tracked accurately
- Timeout enforced
- Integration tests pass

**Files to Create**:
- `src/runtime/agent-executor.ts`
- `tests/integration/agent-execution.test.ts`

#### 3.5 Quality Gates
- [ ] Implement `validateQualityGates()`
- [ ] Implement test runner
- [ ] Implement linter runner
- [ ] Implement formatter runner
- [ ] Implement custom check runner
- [ ] Write unit tests

**Acceptance Criteria**:
- All checks run correctly
- Results captured accurately
- Failures block completion
- All tests pass

**Files to Create**:
- `src/runtime/quality-gates.ts`
- `tests/unit/runtime/quality-gates.test.ts`

#### 3.6 Orchestration Engine
- [ ] Implement `startProject()`
- [ ] Implement `pauseProject()`
- [ ] Implement `resumeProject()`
- [ ] Integrate all managers
- [ ] Implement main execution loop
- [ ] Write integration tests

**Acceptance Criteria**:
- Projects can start/pause/resume
- All managers coordinated
- Execution loop works
- Integration tests pass

**Files to Create**:
- `src/core/orchestration-engine.ts`
- `tests/integration/orchestration.test.ts`

#### 3.7 CLI Execution Commands
- [ ] Implement `df start` command
- [ ] Implement `df pause` command
- [ ] Implement `df resume` command
- [ ] Add real-time status display

**Acceptance Criteria**:
- Commands work end-to-end
- Status updates in real-time
- Errors handled gracefully

**Files to Create**:
- `src/cli/commands/start.ts`
- `src/cli/commands/pause.ts`
- `src/cli/commands/resume.ts`

#### 3.8 End-to-End Test
- [ ] Create full project lifecycle test
- [ ] Test with real LLM (cheap model)
- [ ] Verify quality gates work
- [ ] Verify task list updates
- [ ] Verify cost tracking

**Acceptance Criteria**:
- E2E test completes successfully
- Agent completes simple task
- All quality gates pass
- Costs tracked accurately

**Files to Create**:
- `tests/e2e/full-lifecycle.test.ts`

---

## Phase 4: Decision Branching (Week 8)

### Goals
- Implement decision detection
- Create branch projects
- Enable parallel exploration

### Tasks

#### 4.1 Decision Detection
- [ ] Define decision format in agent responses
- [ ] Implement decision parser
- [ ] Implement confidence threshold logic
- [ ] Write unit tests

**Acceptance Criteria**:
- Can parse decision from agent
- Confidence calculated correctly
- Threshold logic works
- All tests pass

**Files to Create**:
- `src/core/decision-detector.ts`
- `tests/unit/core/decision-detector.test.ts`

#### 4.2 Branch Creation
- [ ] Implement `createBranchProject()`
- [ ] Implement branch naming for decisions
- [ ] Create worktrees for each branch
- [ ] Link parent/child relationships
- [ ] Write unit tests

**Acceptance Criteria**:
- Branch projects created correctly
- Worktrees isolated
- Relationships tracked
- All tests pass

**Files to Create**:
- `src/core/branch-manager.ts`
- `tests/unit/core/branch-manager.test.ts`

#### 4.3 Parallel Execution
- [ ] Implement parallel agent execution
- [ ] Implement resource limits per branch
- [ ] Implement branch status tracking
- [ ] Write integration tests

**Acceptance Criteria**:
- Branches execute in parallel
- Resources managed properly
- Status tracked independently
- Integration tests pass

**Files to Create**:
- `src/core/parallel-executor.ts`
- `tests/integration/parallel-execution.test.ts`

#### 4.4 Branch Comparison
- [ ] Implement comparison report generator
- [ ] Compare code changes
- [ ] Compare quality metrics
- [ ] Compare costs
- [ ] Write unit tests

**Acceptance Criteria**:
- Reports generated correctly
- Comparisons are meaningful
- All tests pass

**Files to Create**:
- `src/core/branch-comparator.ts`
- `tests/unit/core/branch-comparator.test.ts`

#### 4.5 CLI Branch Commands
- [ ] Implement `df branches` command
- [ ] Implement `df compare` command
- [ ] Add visualization of branch tree

**Acceptance Criteria**:
- Can view branch hierarchy
- Comparisons are clear
- Visualization helpful

**Files to Create**:
- `src/cli/commands/branches.ts`
- `src/cli/commands/compare.ts`

#### 4.6 End-to-End Test
- [ ] Create test with decision point
- [ ] Verify branches created
- [ ] Verify parallel execution
- [ ] Verify comparison works

**Acceptance Criteria**:
- E2E test passes
- Branches explore different paths
- Comparison report generated

**Files to Create**:
- `tests/e2e/decision-branching.test.ts`

---

## Phase 5: Project Manager Persona (Week 9)

### Goals
- Implement task auditing
- Create PM persona
- Enable autonomous task management

### Tasks

#### 5.1 Task Audit Algorithm
- [ ] Implement `auditTask()`
- [ ] Implement `auditTaskList()`
- [ ] Detect false positives/negatives
- [ ] Update task status based on audit
- [ ] Write unit tests

**Acceptance Criteria**:
- Audits detect inaccuracies
- Status updates correctly
- All tests pass

**Files to Create**:
- `src/managers/task-auditor.ts`
- `tests/unit/managers/task-auditor.test.ts`

#### 5.2 PM Persona Template
- [ ] Create PM persona template
- [ ] Define PM responsibilities
- [ ] Define audit schedule
- [ ] Define reporting format

**Acceptance Criteria**:
- PM persona parses correctly
- Responsibilities clear
- Schedule configurable

**Files to Create**:
- `personas/project-manager.md`

#### 5.3 PM Integration
- [ ] Integrate PM into orchestration
- [ ] Schedule periodic audits
- [ ] Implement PM interrupts
- [ ] Write integration tests

**Acceptance Criteria**:
- PM runs on schedule
- Audits complete successfully
- Integration tests pass

**Files to Create**:
- `src/core/pm-scheduler.ts`
- `tests/integration/pm-integration.test.ts`

#### 5.4 Task List CLI Enhancements
- [ ] Implement `df tasks` command with filters
- [ ] Show task dependencies
- [ ] Show audit history
- [ ] Add task visualization

**Acceptance Criteria**:
- Task list is comprehensive
- Filters work correctly
- Visualization helpful

**Files to Create**:
- `src/cli/commands/tasks.ts`

#### 5.5 End-to-End Test
- [ ] Create test with PM persona
- [ ] Verify audits run
- [ ] Verify false positives detected
- [ ] Verify task updates

**Acceptance Criteria**:
- E2E test passes
- PM audits work correctly
- Task list stays accurate

**Files to Create**:
- `tests/e2e/pm-persona.test.ts`

---

## Phase 6: Polish & Documentation (Week 10)

### Goals
- Improve error handling
- Add comprehensive logging
- Complete documentation
- Prepare for release

### Tasks

#### 6.1 Error Handling
- [ ] Review all error paths
- [ ] Add user-friendly error messages
- [ ] Implement retry logic where appropriate
- [ ] Add error recovery guides

**Acceptance Criteria**:
- All errors handled gracefully
- Messages are actionable
- Recovery paths documented

#### 6.2 Logging System
- [ ] Implement structured logging
- [ ] Add log levels
- [ ] Implement log rotation
- [ ] Add sensitive data redaction
- [ ] Write tests

**Acceptance Criteria**:
- Logs are structured (YAML or JSON)
- Rotation works
- No sensitive data leaked
- Tests pass

**Files to Create**:
- `src/utils/logger.ts`
- `tests/unit/utils/logger.test.ts`

#### 6.3 Monitoring & Metrics
- [ ] Implement metrics collection
- [ ] Create status dashboard
- [ ] Add health checks
- [ ] Write tests

**Acceptance Criteria**:
- Metrics collected accurately
- Dashboard shows key info
- Health checks work
- Tests pass

**Files to Create**:
- `src/core/metrics-collector.ts`
- `src/cli/commands/dashboard.ts`
- `tests/unit/core/metrics-collector.test.ts`

#### 6.4 Documentation
- [ ] Complete API documentation
- [ ] Write user guide
- [ ] Create tutorial videos/GIFs
- [ ] Document troubleshooting
- [ ] Add examples

**Acceptance Criteria**:
- All public APIs documented
- User guide is comprehensive
- Examples work
- Troubleshooting covers common issues

**Files to Create**:
- `docs/api-reference.md`
- `docs/user-guide.md`
- `docs/troubleshooting.md`
- `examples/simple-feature/`
- `examples/refactoring/`

#### 6.5 CLI Improvements
- [ ] Add `df export` command
- [ ] Add `df logs` command
- [ ] Add `df health` command
- [ ] Improve help text
- [ ] Add command aliases

**Acceptance Criteria**:
- All commands documented
- Help text is clear
- Aliases work

**Files to Create**:
- `src/cli/commands/export.ts`
- `src/cli/commands/logs.ts`
- `src/cli/commands/health.ts`

#### 6.6 Performance Optimization
- [ ] Profile critical paths
- [ ] Optimize YAML file I/O
- [ ] Implement caching
- [ ] Reduce memory usage
- [ ] Write performance tests

**Acceptance Criteria**:
- Project init < 30s
- Provider switch < 2min
- Memory usage reasonable
- Performance tests pass

**Files to Create**:
- `tests/performance/benchmarks.test.ts`

---

## Phase 7: Beta Testing (Week 11)

### Goals
- Test with real projects
- Gather feedback
- Fix bugs
- Improve UX

### Tasks

#### 7.1 Internal Testing
- [ ] Test on 3+ real projects
- [ ] Document all issues
- [ ] Measure success metrics
- [ ] Gather UX feedback

**Acceptance Criteria**:
- All projects complete successfully
- Issues documented
- Metrics collected

#### 7.2 Bug Fixes
- [ ] Fix all critical bugs
- [ ] Fix high-priority bugs
- [ ] Triage remaining bugs

**Acceptance Criteria**:
- No critical bugs remain
- High-priority bugs fixed
- Backlog prioritized

#### 7.3 UX Improvements
- [ ] Implement feedback
- [ ] Improve error messages
- [ ] Add helpful hints
- [ ] Improve CLI output

**Acceptance Criteria**:
- Feedback addressed
- UX measurably improved

#### 7.4 Security Audit
- [ ] Review all security considerations
- [ ] Test git push prevention
- [ ] Test API key encryption
- [ ] Test sandboxing
- [ ] Fix any vulnerabilities

**Acceptance Criteria**:
- Security checklist complete
- No vulnerabilities found
- All protections working

---

## Phase 8: Release (Week 12)

### Goals
- Prepare for public release
- Set up distribution
- Launch

### Tasks

#### 8.1 Package Preparation
- [ ] Set version to 1.0.0
- [ ] Write changelog
- [ ] Update README
- [ ] Add license
- [ ] Prepare npm package

**Acceptance Criteria**:
- Package builds successfully
- All metadata correct
- README complete

#### 8.2 Distribution
- [ ] Publish to npm
- [ ] Create GitHub release
- [ ] Tag version in git
- [ ] Update documentation site

**Acceptance Criteria**:
- Package available on npm
- GitHub release created
- Docs accessible

#### 8.3 Launch
- [ ] Announce on social media
- [ ] Post to relevant communities
- [ ] Monitor for issues
- [ ] Respond to feedback

**Acceptance Criteria**:
- Announcement posted
- Community engaged
- Issues triaged

---

## Post-MVP Roadmap

### Phase 9: Advanced Features
- Multi-repository support
- Custom persona builder UI
- Advanced cost optimization
- Agent collaboration protocols
- Web dashboard

### Phase 10: Enterprise Features
- Team collaboration
- Cloud-hosted orchestration
- SSO integration
- Advanced analytics
- SLA guarantees

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM API changes | Medium | High | Abstract behind provider interface |
| Git worktree issues | Low | High | Extensive testing, fallback to branches |
| Agent infinite loops | Medium | Medium | Hard timeout, resource limits |
| Cost overruns | Medium | Medium | Strict credit monitoring, alerts |
| Quality gate failures | High | Low | Clear error messages, retry logic |

### Schedule Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Strict phase boundaries, MVP focus |
| Integration complexity | Medium | Medium | Early integration tests |
| Testing takes longer | Medium | Low | Allocate buffer time |
| Dependencies delayed | Low | Medium | Minimize external dependencies |

---

## Success Criteria

### MVP Success (End of Phase 8)
- [ ] Can complete simple feature development autonomously
- [ ] Handles API failures gracefully
- [ ] Quality gates prevent bad code
- [ ] Cost tracking accurate
- [ ] Documentation complete
- [ ] 3+ successful real-world projects

### Long-term Success (6 months post-launch)
- [ ] 100+ active users
- [ ] 80%+ autonomous completion rate
- [ ] < 5% cost overrun rate
- [ ] Active community contributions
- [ ] Enterprise interest

---

## Development Practices

### Code Review
- All code reviewed before merge
- Automated checks must pass
- Test coverage maintained > 80%

### Testing
- Write tests first (TDD where appropriate)
- Run full test suite before commit
- E2E tests run in CI

### Documentation
- Document as you code
- Update docs with code changes
- Keep examples working

### Communication
- Daily standups (if team)
- Weekly progress updates
- Document decisions in ADRs

---

## Appendix

### Technology Stack
- **Language**: TypeScript 5.x
- **Runtime**: Bun 1.0+
- **Storage**: YAML files (js-yaml)
- **CLI**: Commander.js
- **Testing**: Bun test
- **Linting**: ESLint
- **Formatting**: Prettier
- **LLM SDKs**: openai, @anthropic-ai/sdk
- **Git**: simple-git
- **Logging**: winston or pino
- **UI**: chalk, ora, cli-table3

### Useful Commands
```bash
# Development
bun --watch src/cli/index.ts  # Watch mode
bun run build                  # Production build
bun test                       # Run all tests
bun test --watch              # Watch mode tests
bun test tests/e2e/           # E2E tests only
bun run lint                  # Lint code
bun run format                # Format code

# Local testing
bun link                      # Link for local testing
df --version         # Verify installation
```

### Key Files
- `src/core/orchestration-engine.ts` - Main orchestrator
- `src/managers/finance-manager.ts` - Cost management
- `src/managers/project-manager.ts` - Project lifecycle
- `src/managers/git-manager.ts` - Git operations
- `src/runtime/agent-executor.ts` - Agent execution
- `src/cli/index.ts` - CLI entry point

### Resources
- [Git Worktree Docs](https://git-scm.com/docs/git-worktree)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Commander.js Docs](https://github.com/tj/commander.js)
- [Better SQLite3 Docs](https://github.com/WiseLibs/better-sqlite3)
