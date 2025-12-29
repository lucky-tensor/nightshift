# TypeScript Agent Implementation Plan

This document outlines the plan to implement the OpenCode Agent's `Run` logic in TypeScript, utilizing the `@opencode-ai/sdk` and `ink` for the TUI. This implementation mirrors the functionality of the Go-based `agent.Run()` method found in `internal/llm/agent/agent.go`.

## 1. Core Architecture

The Agent will be a class responsible for managing the conversation loop, interacting with the LLM provider, executing tools, and persisting state.

### Key Components
- **Agent Class**: Manages session state, cancellation, and the main execution loop.
- **Provider Interface**: Wrapper around `@opencode-ai/sdk` to standardize LLM interactions (streaming, tool calling).
- **Tool Registry**: Manger for available tools (Bash, Git, etc.).
- **Persistence Layer**: Abstraction for saving sessions and messages (likely SQLite).
- **PubSub/Event Emitter**: Mechanism to broadcast progress to the UI.

## 2. Implementation Logic: `Agent.run()`

The `run` method is the entry point. It should accept a `sessionId` and user `content`.

```typescript
async run(sessionId: string, content: string, attachments: Attachment[] = []): Promise<void> {
    // 1. Check Busy State
    if (this.isSessionBusy(sessionId)) {
        throw new Error("Session is busy");
    }

    // 2. Cancellation Context
    const abortController = new AbortController();
    this.activeRequests.set(sessionId, abortController);

    try {
        // 3. Persist User Message
        await this.messages.create({
            sessionId,
            role: 'user',
            content,
            attachments
        });

        // 4. Start Generation Loop (The "ReAct" Loop)
        await this.processGeneration(sessionId, abortController.signal);

    } finally {
        this.activeRequests.delete(sessionId);
    }
}
```

## 3. The Generation Loop: `processGeneration`

This is the heart of the agent, corresponding to `streamAndHandleEvents` in the Go code. It loops until the LLM stops calling tools.

```typescript
async processGeneration(sessionId: string, signal: AbortSignal) {
    // Load history
    let history = await this.messages.list(sessionId);

    while (!signal.aborted) {
        // 1. Stream from LLM
        const stream = await this.provider.streamResponse(history, this.tools);
        
        // 2. Create Placeholder Assistant Message
        let assistantMsg = await this.messages.create({
            sessionId,
            role: 'assistant',
            content: '' 
        });

        // 3. Process Stream Events
        for await (const event of stream) {
            if (signal.aborted) break;

            if (event.type === 'content_delta') {
                // Update local accumulation & DB
                assistantMsg.content += event.content;
                this.emit('data', { sessionId, content: event.content });
                await this.messages.update(assistantMsg);
            } 
            else if (event.type === 'tool_call') {
                 // Accumulate tool calls
                 assistantMsg.toolCalls.push(event.toolCall);
                 await this.messages.update(assistantMsg);
            }
        }

        // 4. Handle Tool Execution
        if (assistantMsg.toolCalls.length > 0) {
            const toolResults = await this.executeTools(assistantMsg.toolCalls, signal);
            
            // Create Tool Message with results
            const toolMsg = await this.messages.create({
                sessionId,
                role: 'tool',
                toolResults
            });

            // Update history and CONTINUE loop
            history.push(assistantMsg);
            history.push(toolMsg);
            continue; 
        }

        // 5. No tools? We are done.
        break;
    }
}
```

## 4. Tool Execution Logic

Tools should be executed sequentially or in parallel depending on dependencies, but the Go implementation iterates them. We will simply iterate and await.

```typescript
async executeTools(toolCalls: ToolCall[], signal: AbortSignal): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
        if (signal.aborted) {
            results.push({ id: call.id, error: "Cancelled" });
            continue;
        }

        const tool = this.tools.get(call.name);
        try {
            const output = await tool.execute(call.input);
            results.push({ id: call.id, content: output });
        } catch (err) {
            results.push({ id: call.id, error: err.message });
        }
    }
    return results;
}
```

## 5. State Management & Cancellation

- **Active Requests**: A `Map<string, AbortController>` stores the controller for each session.
- **Cancellation**: `agent.cancel(sessionId)` looks up the controller and calls `abort()`.
- **Signal Passing**: The `AbortSignal` is passed to the LLM provider and tool execution methods to ensure operations stop immediately.

## 6. Integration with TUI (Ink)

- The TUI component will subscribe to the Agent's event emitter (`on('data')`, `on('tool_start')`, etc.).
- React state in Ink will update to reflect the streaming content.
- `useInput` hook in Ink will listen for `Esc` to trigger `agent.cancel()`.

## 7. Next Steps

1.  Review `@opencode-ai/sdk` documentation (or types) to confirm the streaming interface.
2.  Implement the `Agent` class skeleton.
3.  Set up the `SQLite` database schema matching the Go version.
4.  Implement the `activeRequests` map and `cancel` method.
