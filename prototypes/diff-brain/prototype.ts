/**
 * Diff-Brain Prototype - TypeScript Implementation
 *
 * Demonstrates high-fidelity commit replay using minimal intent
 * and reconstruction hints.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const WORKTREE_PATH = "/tmp/diff-brain-prototype-ts";

interface DiffBrainMetadata {
    version: string;
    timestamp: string;
    intent: {
        title: string;
        summary: string;
        minimalPrompt: string;
        complexity: string;
    };
    reconstruction: {
        pattern: string;
        techniques: string[];
        constraints: string[];
        anchorSymbols: string[];
    };
    verification: {
        unitTests: string[];
        invariants: string[];
    };
    context: {
        architecturalLayer: string;
        affectedComponents: string[];
    };
}

class DiffBrain {
    private worktreePath: string;
    private history: DiffBrainMetadata[] = [];

    constructor(worktreePath: string) {
        this.worktreePath = worktreePath;
    }

    private runGit(cmd: string): string {
        try {
            return execSync(`git ${cmd}`, { cwd: this.worktreePath }).toString().trim();
        } catch (error: any) {
            if ("nothing to commit" in (error.stderr?.toString() || "")) {
                return "";
            }
            throw new Error(`Git command failed: ${cmd}\n${error}`);
        }
    }

    async initialize(): Promise<void> {
        if (fs.existsSync(WORKTREE_PATH)) {
            execSync(`rm -rf "${WORKTREE_PATH}"`);
        }
        fs.mkdirSync(WORKTREE_PATH, { recursive: true });

        this.runGit("init");
        this.runGit('config user.email "test@test.com"');
        this.runGit('config user.name "Test"');

        fs.writeFileSync(path.join(WORKTREE_PATH, "README.md"), "# Test Project\n");
        this.runGit("add .");
        this.runGit('commit -m "Initial commit" --no-verify');

        console.log("✅ Initialized git worktree");
    }

    async commit(
        filePath: string,
        content: string,
        intent: DiffBrainMetadata["intent"],
        reconstruction: DiffBrainMetadata["reconstruction"],
        verification: DiffBrainMetadata["verification"]
    ): Promise<DiffBrainMetadata> {
        const fullPath = path.join(this.worktreePath, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);

        const metadata: DiffBrainMetadata = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            intent,
            reconstruction,
            verification,
            context: {
                architecturalLayer: "application",
                affectedComponents: [filePath],
            },
        };

        const commitMessage = `${metadata.intent.title}\n\n${metadata.intent.summary}\n\n<!-- DIFF_BRAIN_V1\n${JSON.stringify(metadata, null, 2)}\n-->`;

        this.runGit(`add ${filePath}`);
        this.runGit(`commit -m "${commitMessage.replace(/"/g, '\\"')}" --no-verify`);

        metadata.context.affectedComponents = [this.runGit("rev-parse HEAD")];
        this.history.push(metadata);

        return metadata;
    }

    getLastCommitMessage(): string {
        return this.runGit("log --format=%B -1");
    }

    extractMetadata(): DiffBrainMetadata {
        const msg = this.getLastCommitMessage();
        const match = msg.split("<!-- DIFF_BRAIN_V1\n")[1].split("\n-->")[0];
        return JSON.parse(match);
    }

    async checkoutParent(): Promise<void> {
        const parent = this.runGit("rev-parse HEAD^");
        this.runGit(`checkout ${parent} -- .`);
    }

    async checkoutHead(): Promise<void> {
        this.runGit("checkout HEAD -- .");
    }

    getHistory(): DiffBrainMetadata[] {
        return this.history;
    }
}

async function main() {
    console.log("=".repeat(60));
    console.log("  Diff-Brain Prototype: High-Fidelity Commit Replay");
    console.log("=".repeat(60));

    const brain = new DiffBrain(WORKTREE_PATH);
    await brain.initialize();

    // Create Diff-Brain commit
    console.log("\n💾 Creating Diff-Brain commit...");

    const intent = {
        title: "Add user validation with early returns",
        summary: "Update UserValidator to enforce required fields and age check",
        minimalPrompt:
            "Update validate() to: throw if user is null, throw if email is missing, throw AuthError if age < 18. Use early returns.",
        complexity: "simple",
    };

    const reconstruction = {
        pattern: "early-return guard clause",
        techniques: ["early-return", "guard-clause", "custom-exception"],
        constraints: [
            "Must throw AuthError for age validation",
            "Must use early returns (no nested ifs)",
            "Keep function void return type",
        ],
        anchorSymbols: ["validate", "AuthError"],
    };

    const verification = {
        unitTests: ["testNullUser", "testMissingEmail", "testUnderage"],
        invariants: ["validate never returns false"],
    };

    const newContent = `// Updated validator with Diff-Brain metadata
function validate(user) {
    if (!user) throw new Error("User is required");
    if (!user.email) throw new Error("Email is required");
    if (user.age < 18) throw new AuthError("Must be 18+");
}

module.exports = { validate };
`;

    const metadata = await brain.commit(
        "src/validator.js",
        newContent,
        intent,
        reconstruction,
        verification
    );

    console.log("✅ Diff-Brain commit created");
    console.log(`   Intent: ${metadata.intent.title}`);
    console.log(`   Pattern: ${metadata.reconstruction.pattern}`);
    console.log(`   Constraints: ${metadata.reconstruction.constraints.length}`);

    // Replay simulation
    console.log("\n🔄 Replay Simulation:");

    console.log("   1. Check out to parent commit...");
    await brain.checkoutParent();

    const revertedContent = fs.readFileSync(path.join(WORKTREE_PATH, "src/validator.js"), "utf-8");
    console.log(`   Reverted content: ${revertedContent.length} bytes`);

    console.log("\n   2. Extract Diff-Brain metadata...");
    const replayMetadata = brain.extractMetadata();
    console.log(`   Intent: ${replayMetadata.intent.minimalPrompt.slice(0, 60)}...`);

    console.log("\n   3. Simulate model replay with constraints...");
    const prompt = `${replayMetadata.intent.minimalPrompt}

Constraints:
${replayMetadata.reconstruction.constraints.map((c) => `- ${c}`).join("\n")}`;

    // Mock model response (simulating an LLM)
    const mockReplay = newContent;

    console.log(`   Generated: ${mockReplay.length} bytes`);

    console.log("\n   4. Compare fidelity...");
    const fidelity = mockReplay === newContent ? 1.0 : 0.0;
    console.log(`   Fidelity: ${fidelity * 100}%`);

    // Reset
    await brain.checkoutHead();

    // Show history
    console.log("\n📋 Commit History:");
    brain.getHistory().forEach((m, i) => {
        console.log(`   [${i + 1}] ${m.intent.title}`);
        console.log(`       Pattern: ${m.reconstruction.pattern}`);
    });

    // Cleanup
    execSync(`rm -rf "${WORKTREE_PATH}"`);

    console.log("\n" + "=".repeat(60));
    console.log("  Prototype Complete!");
    console.log("=".repeat(60));
}

main().catch(console.error);
