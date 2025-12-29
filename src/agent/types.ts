
export interface AgentConfig {
    modelId: string;
    workingDirectory: string;
    port?: number;
}

export type AgentEventType = 'content_delta' | 'thinking_delta' | 'tool_call' | 'tool_result' | 'error' | 'done';

export interface AgentEvent {
    type: AgentEventType;
    content?: string;
    toolCall?: any; // To be refined based on SDK
    error?: any;
    sessionId?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content?: string;
    toolCalls?: any[];
    toolResults?: any[];
}

export interface Session {
    id: string;
    messages: Message[];
}
