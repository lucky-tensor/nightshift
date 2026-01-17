import { describe, it } from "bun:test";
import { Agent } from "../Agent";

// const MODEL_ID = 'google/gemini-2.0-flash-exp:free';
const MODEL_ID = "opencode/grok-code";

describe("Debug Session", () => {
    it("should inspect session state", async () => {
        const agent = new Agent({ modelId: MODEL_ID, workingDirectory: process.cwd() });
        await agent.initialize();

        const sessionId = await agent.createSession();
        console.log("Session ID:", sessionId);

        const stream = agent.run(sessionId, "Hello?");

        // Consume stream in background
        (async () => {
            try {
                for await (const event of stream) {
                    console.log("Stream Event:", event.type);
                }
            } catch (e) {
                console.error("Stream Error:", e);
            }
        })();

        // Wait 5s
        await new Promise((r) => setTimeout(r, 5000));

        // Inspect Session
        // Access client directly (private but accessible in JS runtime if we cheat, or just use agent method if I add one)
        // I'll add a helper method to Agent.ts temporary?
        // Or just use the fact that I can't access private fields easily in TS test?
        // I'll cast to any.
        const client = (agent as any).client;

        const status = await client.session.status({ path: { id: sessionId } });
        console.log("Session Status:", JSON.stringify(status.data, null, 2));

        const messages = await client.session.messages({ path: { id: sessionId } });
        console.log("Messages:", JSON.stringify(messages.data, null, 2));

        await agent.shutdown();
    }, 60000);
});
