/**
 * Dark Factory Comprehensive Demo
 *
 * Demonstrates all features working together:
 * 1. Git-Brain commit with metadata
 * 2. Code indexing and search
 * 3. Multi-agent collaboration
 * 4. Blackboard architecture
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { GitManager } from "../src/managers/git";
import { CodeIndexManager } from "../src/managers/code-index";
import { MultiAgentManager } from "../src/managers/multi-agent";
import { AgentContext } from "../src/types";

const DEMO_DIR = "/tmp/dark-factory-demo";

interface DemoStep {
    name: string;
    run: () => Promise<void>;
}

async function main() {
    console.log("=".repeat(70));
    console.log("     DARK FACTORY COMPREHENSIVE DEMO");
    console.log("     Integrating Git-Brain, Code Index, Multi-Agent, and Blackboard");
    console.log("=".repeat(70));

    // Cleanup
    if (fs.existsSync(DEMO_DIR)) {
        execSync(`rm -rf "${DEMO_DIR}"`);
    }
    fs.mkdirSync(DEMO_DIR, { recursive: true });

    // Initialize git repo
    execSync("git init", { cwd: DEMO_DIR, stdio: "pipe" });
    execSync('git config user.email "demo@dark-factory"', { cwd: DEMO_DIR, stdio: "pipe" });
    execSync('git config user.name "Dark Factory Demo"', { cwd: DEMO_DIR, stdio: "pipe" });

    fs.writeFileSync(path.join(DEMO_DIR, "README.md"), "# Dark Factory Demo Project\n");
    execSync("git add .", { cwd: DEMO_DIR, stdio: "pipe" });
    execSync('git commit -m "Initial commit" --no-verify', { cwd: DEMO_DIR, stdio: "pipe" });

    const git = new GitManager(DEMO_DIR);
    const codeIndex = new CodeIndexManager(DEMO_DIR);
    const multiAgent = new MultiAgentManager("demo-project", DEMO_DIR, git);

    // ========================================
    // STEP 1: Git-Brain Workflow
    // ========================================
    console.log("\n📝 STEP 1: Git-Brain Workflow");
    console.log("-".repeat(50));

    const worktreePath = await git.createWorktree("feature-demo");

    // Create code with documentation
    const authCode = `/**
 * Authentication Service
 * 
 * Handles user authentication, token generation, and validation.
 * Uses JWT tokens for stateless authentication.
 */

export class AuthService {
    private secretKey: string;
    private tokenExpiry: number = 86400000; // 24 hours

    constructor(secretKey: string) {
        this.secretKey = secretKey;
    }

    /**
     * Authenticate user with email and password
     * Returns JWT token on success
     */
    async login(email: string, password: string): Promise<string | null> {
        const user = await this.validateCredentials(email, password);
        if (!user) {
            throw new Error("Invalid credentials");
        }
        return this.generateToken(user);
    }

    /**
     * Validate user credentials against database
     */
    private async validateCredentials(email: string, password: string): Promise<User | null> {
        // In production, this would query a database
        return { id: "1", email, role: "user" };
    }

    /**
     * Generate JWT token for authenticated user
     */
    private generateToken(user: User): string {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            exp: Date.now() + this.tokenExpiry
        };
        // Simplified token generation
        return Buffer.from(JSON.stringify(payload)).toString("base64");
    }

    /**
     * Validate JWT token
     */
    async validateToken(token: string): Promise<boolean> {
        try {
            const payload = JSON.parse(Buffer.from(token, "base64").toString());
            return payload.exp > Date.now();
        } catch {
            return false;
        }
    }
}

interface User {
    id: string;
    email: string;
    role: string;
}`;

    fs.writeFileSync(path.join(worktreePath, "src/auth.ts"), authCode);

    // Create Diff-Brain commit
    await git.commitWithMetadata(worktreePath, "Add authentication service", {
        prompt: "Create AuthService class with login, token generation, and validation",
        expectedOutcome: "JWT-based authentication system with 24h token expiry",
        contextSummary: "Adding core authentication feature for user management",
        agentId: "coder-alpha",
        sessionId: "session-001",
    });

    console.log("✅ Created worktree with AuthService");
    console.log("✅ Committed with Git-Brain metadata");

    // Show enhanced commit history
    const history = git.getEnhancedCommitHistory(worktreePath, 5);
    console.log(`📜 Found ${history.length} commits with metadata`);
    history.forEach((commit, i) => {
        console.log(`   [${i + 1}] ${commit.title}`);
        console.log(`       Intent: ${commit.metadata.prompt.slice(0, 50)}...`);
    });

    // ========================================
    // STEP 2: Code Indexing
    // ========================================
    console.log("\n🔍 STEP 2: Code Indexing");
    console.log("-".repeat(50));

    await codeIndex.indexProject();

    const stats = codeIndex.getIndexStats();
    console.log(`✅ Indexed ${stats.totalEmbeddings} code elements`);
    console.log(`✅ Indexed ${stats.totalKeywords} keywords`);

    // Search by keyword
    const kwResults = codeIndex.searchByKeyword("token");
    console.log(`\n🔑 Keyword search for 'token': found ${kwResults.length} matches`);
    kwResults.forEach((r) => {
        console.log(`   - ${r.filePath}:${r.lineStart} (${r.type})`);
    });

    // Semantic search
    const semResults = await codeIndex.searchByEmbedding("authentication flow", 3);
    console.log(`\n🧠 Semantic search for 'authentication flow':`);
    semResults.forEach((r) => {
        console.log(`   - ${r.filePath} (similarity: ${(r.similarity * 100).toFixed(1)}%)`);
    });

    // ========================================
    // STEP 3: Multi-Agent Collaboration
    // ========================================
    console.log("\n🤖 STEP 3: Multi-Agent Collaboration");
    console.log("-".repeat(50));

    const state = multiAgent.getSystemState();
    console.log(`✅ Initialized ${state.agents.length} agents:`);
    state.agents.forEach((agent) => {
        console.log(`   - ${agent.type} (${agent.id})`);
    });

    // Assign tasks
    multiAgent.assignTask("planner", "Plan feature improvements");
    console.log("\n📋 Assigned task to planner");

    // Complete planner task and handoff to coder
    const planner = multiAgent.getAgent("planner");
    if (planner) {
        planner.state = "completed";
        multiAgent.handoff("planner", "coder");
        console.log("✅ Handoff: Planner → Coder");
    }

    const coder = multiAgent.getAgent("coder");
    if (coder) {
        console.log(`   Coder status: ${coder.state}, task: ${coder.currentTask}`);
    }

    // Show collaboration history
    const collabHistory = multiAgent.getCollaborationHistory();
    console.log(`\n📊 Collaboration log: ${collabHistory.length} entries`);
    collabHistory.slice(-3).forEach((entry) => {
        console.log(`   [${entry.messageType}] ${entry.fromAgentId} → ${entry.toAgentId}`);
    });

    // ========================================
    // STEP 4: System State Summary
    // ========================================
    console.log("\n📈 STEP 4: System State Summary");
    console.log("-".repeat(50));

    const finalState = multiAgent.getSystemState();
    console.log(`Agents: ${finalState.agents.length} active`);
    console.log(`Collaboration events: ${finalState.collaborationCount}`);
    console.log(`Code embeddings: ${finalState.sharedContext.codeIndex.embeddings.length}`);
    console.log(`Recent commits: ${finalState.sharedContext.recentCommits.length}`);

    // ========================================
    // Cleanup
    // ========================================
    console.log("\n🧹 Cleanup...");
    await git.removeWorktree("feature-demo");
    execSync(`rm -rf "${DEMO_DIR}"`);

    console.log("\n" + "=".repeat(70));
    console.log("     DEMO COMPLETE");
    console.log("     All systems integrated and working!");
    console.log("=".repeat(70));
}

main().catch(console.error);
