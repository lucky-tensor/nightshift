import { AgentRuntime } from "../src/runtime/agent";
import type { FactoryConfig, Project, Session } from "../src/types";
import { v4 as uuid } from "uuid";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { createOpencodeClient } from "@opencode-ai/sdk";

// Mock Data
const factory: FactoryConfig = {
    id: "test-factory",
    name: "Test Factory",
    rootPath: process.cwd(),
    mainRepoPath: process.cwd(),
    createdAt: new Date().toISOString(),
    budgetLimit: 100,
    defaultModel: "gemini-pro",
};

const project: Project = {
    id: "test-project",
    name: "Test Project",
    factoryId: factory.id,
    branchName: "master",
    worktreePath: process.cwd(),
    childProjectIds: [],
    status: "active",
    contextPath: "initial-context.md",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalCost: 0,
    tokensUsed: 0,
};

// Ensure .nightshift directory exists for SessionManager
const sessionDir = join(process.cwd(), ".nightshift", "sessions");
if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
}

async function runTest() {
    console.log("=== Starting Agent Runtime Test ===");

    const runtime = new AgentRuntime(factory);
    const sessionId = uuid();

    console.log(`[Test] Session ID: ${sessionId}`);

    // Create a mock session object manually to ensure it exists for the runtime to use
    // In the real app, SessionManager.createSession does this, but runtime.start() also expects it?
    // Actually runtime.runLoop calls sessionManager.getSession(sessionId)
    // So we need to create it first using the manager inside the runtime,
    // OR manually create the file.

    // Let's use the internal session manager if we can, or just mock the file.
    // Since sessionManager is private, we can't access it directly.
    // BUT, AgentRuntime.runTask creates a session.
    // AgentRuntime.start() expects an existing session ID but doesn't create the local session file itself?
    // Wait, check runtime.start code...

    // In runtime.start():
    // 1. It does NOT create a local session.
    // 2. In runLoop, it calls `this.sessionManager.getSession(sessionId)`.

    // So we MUST create the local session first.
    // We can use the SessionManager class directly.

    const { SessionManager } = require("../src/managers/session");
    const sessionManager = new SessionManager(factory);
    const session = sessionManager.createSession(project.id, "Test Objective: Learn Python");
    console.log(`[Test] Created Local Session: ${session.id}`);

    // Start the Runtime
    console.log("[Test] Initializing Runtime...");
    // We'll use the session ID we just created
    await runtime.start(project, session.id);

    // Check available models via the client exposed on runtime (we need to cast to access private client or make it public/add a method)
    // For this test script, we can't easily access private 'client' on runtime.
    // But we can create a separate client to query info.
    const testClient = createOpencodeClient({ baseUrl: "http://127.0.0.1:4096" });

    try {
        const providers = await testClient.provider.list();
        if (providers.data) {
            console.log("[Test] scanning all models for 'antigravity' (full provider dump)...");
            for (const provider of providers.data.all) {
                // If the provider ID itself looks like antigravity or related
                if (provider.id.includes("antigravity")) {
                    console.log(`[MATCH PROVIDER] ${provider.id}`, provider.models);
                }
            }
        }
    } catch (e) {
        console.error("[Test] Failed to list providers:", e);
    }

    console.log("[Test] Runtime started. Waiting for connection...");

    // Give it a moment to connect and send the system prompt
    await new Promise((r) => setTimeout(r, 2000));

    console.log("[Test] Sending Prompt: 'What is Python?'");
    // We can simulate a user message by adding it to the session manager
    // and then triggering a step?
    // The runtime.step() checks for the last message role.

    sessionManager.addMessage(session.id, "user", "What is Python?");

    // Manually trigger a step since we don't have the UI loop running
    await runtime.step(session.id);

    console.log("[Test] Message sent. Listening for updates...");

    // Poll for updates to the session file
    let lastContent = "";
    const startTime = Date.now();

    while (Date.now() - startTime < 30000) {
        // Run for 30 seconds
        const currentSession = sessionManager.getSession(session.id);
        const lastMsg = currentSession.messages[currentSession.messages.length - 1];

        if (lastMsg && lastMsg.role === "assistant") {
            if (lastMsg.content !== lastContent) {
                console.log(`[Stream] ${lastMsg.content.substring(lastContent.length)}`);
                lastContent = lastMsg.content;
            }

            // If it seems "done" (we can't easily tell from here without the 'finish' event which is internal)
            // But if we see a good amount of text, we can assume success.
            if (lastMsg.content.length > 50) {
                console.log("\n[Test] SUCCESS: Received substantial response.");
                break;
            }
        }
        await new Promise((r) => setTimeout(r, 500));
    }

    if (lastContent.length === 0) {
        console.error("[Test] FAILED: No response received after 30 seconds.");
    }

    console.log("=== Test Complete ===");
    process.exit(0);
}

runTest().catch((e) => {
    console.error(e);
    process.exit(1);
});
