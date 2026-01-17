/**
 * Nightshift Core Managers - Unified API
 *
 * This module exports all manager classes and provides a unified
 * interface for the Nightshift system.
 */
import { GitManager } from "./git";
import { CodeIndexManager } from "./code-index";
import { MultiAgentManager } from "./multi-agent";
// Git-Brain System
export { GitManager } from "./git";

// Code Indexing System
export { CodeIndexManager } from "./code-index";

// Multi-Agent System
export { MultiAgentManager } from "./multi-agent";

// Project & Factory Management
export { ProjectManager } from "./project";
export { FactoryManager } from "./factory";
export { FactorySupervisor } from "./supervisor";
export { TaskManager } from "./task";
export { GlobalConfigManager } from "./global-config";

// Agent Continuity & Quality
export { ForwardPromptManager } from "./forward-prompt";
export type { ForwardPrompt } from "./forward-prompt";
export { HooksManager } from "./hooks";
export type { NagStatus, NagCompletion, HookConfig } from "./hooks";
export { CommitPolicyManager } from "./commit-policy";
export type { CommitPolicy, PolicyViolation, DiffStats, CommitHistory } from "./commit-policy";

// Factory Config Types
export type {
    FactoryConfig,
    Project,
    Session,
    Message,
    CommitMetadata,
    EnhancedCommitMessage,
    CodeIndex,
    CodeEmbedding,
    KeywordIndex,
    AgentContext,
    SharedContext,
    AgentCollaboration,
    AgentType,
    AgentState,
} from "../types";

// Convenience function to get all managers
export function createFactorySystem(projectPath: string, mainRepoPath: string) {
    const git = new GitManager(mainRepoPath);
    const codeIndex = new CodeIndexManager(projectPath);
    const multiAgent = new MultiAgentManager("default", projectPath, git);

    return {
        git,
        codeIndex,
        multiAgent,
    };
}
