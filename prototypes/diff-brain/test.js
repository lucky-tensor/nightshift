/**
 * Diff-Brain Prototype - JavaScript Test Harness
 *
 * Run with: node prototypes/diff-brain/test.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const WORKTREE_PATH = "/tmp/diff-brain-prototype";

console.log("=".repeat(60));
console.log("  Diff-Brain Prototype: High-Fidelity Commit Replay");
console.log("=".repeat(60));

// Cleanup
if (fs.existsSync(WORKTREE_PATH)) {
    execSync(`rm -rf "${WORKTREE_PATH}"`);
}
execSync(`mkdir -p "${WORKTREE_PATH}"`);

// Initialize git
execSync("git init", { cwd: WORKTREE_PATH });
execSync("git config user.email 'test@test.com'", { cwd: WORKTREE_PATH });
execSync("git config user.name 'Test'", { cwd: WORKTREE_PATH });

// Create baseline
fs.writeFileSync(path.join(WORKTREE_PATH, "README.md"), "# Test Project\n");
execSync("git add .", { cwd: WORKTREE_PATH });
execSync('git commit -m "Initial commit" --no-verify', { cwd: WORKTREE_PATH });

console.log("\n✅ Initialized git worktree at:", WORKTREE_PATH);

// Create a file
fs.writeFileSync(
    path.join(WORKTREE_PATH, "src/validator.js"),
    `// Original validator
function validate(user) {
    console.log("Validating user");
    return true;
}

module.exports = { validate };
`
);

execSync("git add .", { cwd: WORKTREE_PATH });
execSync('git commit -m "Add validator" --no-verify', { cwd: WORKTREE_PATH });

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

const metadata = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    intent,
    reconstruction,
    verification: {
        unitTests: ["testNullUser", "testMissingEmail", "testUnderage"],
        invariants: ["validate never returns false"],
    },
    context: {
        architecturalLayer: "application",
        affectedComponents: ["src/validator.js"],
    },
};

const commitMessage = `${metadata.intent.title}\n\n${metadata.intent.summary}\n\n<!-- DIFF_BRAIN_V1\n${JSON.stringify(metadata, null, 2)}\n-->`;

// Update file
fs.writeFileSync(
    path.join(WORKTREE_PATH, "src/validator.js"),
    `// Updated validator with Diff-Brain metadata
function validate(user) {
    if (!user) throw new Error("User is required");
    if (!user.email) throw new Error("Email is required");
    if (user.age < 18) throw new AuthError("Must be 18+");
}

module.exports = { validate };
`
);

execSync("git add .", { cwd: WORKTREE_PATH });
execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}" --no-verify`, {
    cwd: WORKTREE_PATH,
});

console.log("✅ Diff-Brain commit created");

// Show commit
console.log("\n📜 Commit Message:");
const log = execSync(`git log --oneline -1`, { cwd: WORKTREE_PATH }).toString();
console.log("  " + log.trim());

const fullLog = execSync(`git log --format="%B" -1`, { cwd: WORKTREE_PATH }).toString();
const metadataMatch = fullLog.match(/<!-- DIFF_BRAIN_V1\n([\s\S]*?)\n-->/);
if (metadataMatch) {
    console.log("\n📋 Extracted Metadata:");
    const parsed = JSON.parse(metadataMatch[1]);
    console.log("  Intent:", parsed.intent.title);
    console.log("  Pattern:", parsed.reconstruction.pattern);
    console.log("  Constraints:", parsed.reconstruction.constraints.length);
}

// Replay simulation
console.log("\n🔄 Replay Simulation:");
console.log("  1. Check out to parent commit...");
execSync("git checkout HEAD^ -- src/validator.js", { cwd: WORKTREE_PATH });

const revertedContent = fs.readFileSync(path.join(WORKTREE_PATH, "src/validator.js"), "utf-8");
console.log("  Reverted content length:", revertedContent.length, "bytes");

console.log("\n  2. Apply Diff-Brain metadata prompt...");
const prompt = `${metadata.intent.minimalPrompt}\n\nConstraints: ${metadata.reconstruction.constraints.join(", ")}`;
console.log("  Prompt:", prompt.slice(0, 80), "...");

console.log("\n  3. Simulate model replay...");
const mockReplay = `function validate(user) {
    if (!user) throw new Error("User is required");
    if (!user.email) throw new Error("Email is required");
    if (user.age < 18) throw new AuthError("Must be 18+");
}`;

console.log("  Generated:", mockReplay.length, "bytes");

console.log("\n  4. Compare fidelity...");
const fidelity = revertedContent === mockReplay ? 1.0 : 0.0;
console.log("  Fidelity:", (fidelity * 100).toFixed(1), "%");

// Cleanup
execSync("git checkout HEAD -- .", { cwd: WORKTREE_PATH });

console.log("\n✅ Replay simulation complete");
console.log("\n" + "=".repeat(60));
console.log("  Prototype Complete!");
console.log("=".repeat(60));

// Cleanup
execSync(`rm -rf "${WORKTREE_PATH}"`);
