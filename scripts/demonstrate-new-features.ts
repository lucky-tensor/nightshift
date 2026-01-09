/**
 * Demonstration of new features:
 * 1. Git-Brain Workflow
 * 2. Code Indexing System
 * 3. Multi-Agent Architecture
 */

import { GitManager } from "../src/managers/git";
import { CodeIndexManager } from "../src/managers/code-index";
import { MultiAgentManager } from "../src/managers/multi-agent";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { execSync } from "child_process";

async function main() {
    const testDir = join(process.cwd(), "temp-demo-factory");
    const mainRepoPath = join(testDir, "demo-main");

    // Cleanup and setup
    if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(mainRepoPath, { recursive: true });

    console.log("--- 1. Setting up Demo Git Repository ---");
    execSync("git init", { cwd: mainRepoPath });
    writeFileSync(join(mainRepoPath, "README.md"), "# Demo Factory\n\nInitial state.");
    execSync("git add .", { cwd: mainRepoPath });
    execSync('git commit -m "Initial commit"', { cwd: mainRepoPath });
    execSync("git branch -M master", { cwd: mainRepoPath });

    const git = new GitManager(mainRepoPath);

    console.log("\n--- 2. Git-Brain Workflow: Enhanced Commit ---");
    const worktreePath = await git.createWorktree("demo-task-123");
    console.log(`Created worktree at: ${worktreePath}`);

    writeFileSync(join(worktreePath, "feature.ts"), "export const hello = () => 'world';");

    await git.commitWithMetadata(worktreePath, "Add hello world feature", {
        prompt: "Create a hello world function exported as hello",
        expectedOutcome: "A feature.ts file with a hello function returning 'world'",
        contextSummary: "Initial feature implementation",
        agentId: "coder-alpha",
        sessionId: "session-789",
    });

    console.log("Commit with metadata successful.");

    const history = git.getEnhancedCommitHistory(worktreePath);
    console.log("Retrieved Enhanced History:");
    console.log(JSON.stringify(history, null, 2));

    console.log("\n--- 3. Code Indexing System ---");
    const indexer = new CodeIndexManager(worktreePath);
    await indexer.indexProject();

    console.log("Index Stats:", indexer.getIndexStats());

    console.log("Search by keyword 'hello':");
    const keywordResults = indexer.searchByKeyword("hello");
    console.log(keywordResults);

    console.log("Semantic search for 'greeting function':");
    const semanticResults = await indexer.searchByEmbedding("greeting function");
    console.log(
        semanticResults.map((r) => ({
            filePath: r.filePath,
            similarity: r.similarity,
            type: r.type,
        }))
    );

    console.log("\n--- 4. Multi-Agent Architecture ---");
    const multiAgent = new MultiAgentManager("demo-project", worktreePath, git);

    console.log("Initial System State:");
    const state = multiAgent.getSystemState();
    console.log(`Agents: ${state.agents.map((a) => `${a.id} (${a.type})`).join(", ")}`);

    console.log("Assigning task to Planner...");
    multiAgent.assignTask("planner", "Plan the user authentication system");

    console.log("Completing Planner task and handing off to Coder...");
    multiAgent.completeTask(
        "planner",
        "Authentication plan ready: 1. Login, 2. Logout, 3. Register",
        "coder"
    );

    const newState = multiAgent.getSystemState();
    const coder = newState.agents.find((a) => a.type === "coder");
    console.log(`Coder Status: ${coder?.state}, Task: ${coder?.currentTask}`);

    console.log("\n--- Demo Complete ---");

    // Cleanup
    // git.removeWorktree("demo-task-123");
    // rmSync(testDir, { recursive: true, force: true });
}

main().catch(console.error);
