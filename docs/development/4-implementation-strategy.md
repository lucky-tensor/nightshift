# Implementation Strategy

## Current Status: MVP Phase 1 (Core Types & Storage)

We have established the basic types (`Factory`, `Product`, `Plan`) and storage mechanisms.

## Roadmap

### Phase 2: Product & Repo Management (Next)

- Implement `ProductManager`.
- Build git repo initialization logic (local + remote).
- Automate `PRD.md` and `PLAN.md` generation from user prompts.

### Phase 3: Agent System

- Build the Supervisor/Worker agent framework.
- Implement the `Agent` class based on the TypeScript Plan.
- Develop the Knowledge Base Curator logic.

### Phase 4: CLI & Workflow

- Wire up the TUI commands to the backend Managers.
- Implement `df product plan` and `df product work`.

### Phase 5: Hardening

- End-to-end testing.
- Security audit (sandbox validation).
