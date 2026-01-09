/**
 * Nightshift Core Managers - Unified API
 *
 * This module exports all manager classes and provides a unified
 * interface for the Nightshift system.
 */

// Git-Brain System
export { GitManager, CommitMetadata, EnhancedCommitMessage } from "./git";

// Code Indexing System
export { CodeIndexManager, CodeIndex, CodeEmbedding, KeywordIndex } from "./code-index";

// Multi-Agent System
export {
    MultiAgentManager,
    AgentContext,
    SharedContext,
    AgentCollaboration,
    AgentType,
    AgentState,
} from "./multi-agent";

// Project & Factory Management
export { ProjectManager } from "./project";
export { FactoryManager } from "./factory";
export { FactorySupervisor } from "./supervisor";
export { TaskManager } from "./task";
export { GlobalConfigManager } from "./global-config";

// Factory Config Types
export type { FactoryConfig, Project, Session, Message } from "../types";

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
