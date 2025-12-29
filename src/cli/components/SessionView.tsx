import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { SessionManager } from "../../managers/session";
import { AgentRuntime } from "../../runtime/agent";
import type { FactoryConfig, Project, Session, Message } from "../../types";

interface SessionViewProps {
    factory: FactoryConfig;
    project: Project;
    onBack: () => void;
}

const SessionView: React.FC<SessionViewProps> = ({ factory, project, onBack }) => {
    const sessionManager = new SessionManager(factory);
    const agentRuntimeRef = useRef<AgentRuntime | null>(null);

    const [session, setSession] = useState<Session | null>(null);
    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    // Initialize Runtime
    useEffect(() => {
        const runtime = new AgentRuntime(factory);
        agentRuntimeRef.current = runtime;
    }, [factory]);

    // Load or Create Session & Start Agent
    useEffect(() => {
        let timer: NodeJS.Timeout;

        const initSession = async () => {
            let currentSession: Session | undefined;

            if (project.currentSessionId) {
                currentSession = sessionManager.getSession(project.currentSessionId);
            }

            if (!currentSession) {
                try {
                    const objective = `Work on task: ${project.name}`;
                    currentSession = sessionManager.createSession(project.id, objective);

                    const { ProjectManager } = require("../../managers/project");
                    const pm = new ProjectManager(factory);
                    pm.updateProject(project.id, { currentSessionId: currentSession.id });
                } catch (e) {
                    setError(String(e));
                    return;
                }
            }

            if (currentSession) {
                setSession(currentSession);
                // Start the agent runtime for this session
                if (agentRuntimeRef.current) {
                    // This initializes the client and runs the first step if needed (e.g. system prompt)
                    agentRuntimeRef.current
                        .start(project, currentSession.id)
                        .catch((e) => console.error(e));
                }
            }
        };

        initSession();

        // Poll for updates
        timer = setInterval(() => {
            if (project.currentSessionId) {
                const updated = sessionManager.getSession(project.currentSessionId);
                if (updated) {
                    setSession(updated);
                    // Check if last message is assistant to turn off "Thinking" indicator
                    const lastMsg = updated.messages[updated.messages.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.length > 0) {
                        setIsThinking(false);
                    }
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [project.currentSessionId]);

    const handleSubmit = async () => {
        if (!input.trim() || !session || !agentRuntimeRef.current) return;

        try {
            // User message
            sessionManager.addMessage(session.id, "user", input);
            setIsThinking(true);
            setInput("");

            // Trigger Agent Step
            await (agentRuntimeRef.current as any).step(session.id);
        } catch (e) {
            setError(String(e));
            setIsThinking(false);
        }
    };

    useInput((_, key) => {
        if (key.escape) {
            onBack();
        }
    });

    if (error) {
        return (
            <Box flexDirection="column" borderColor="red" borderStyle="round" padding={1}>
                <Text color="red">Error: {error}</Text>
                <Text color="gray">Press [Esc] to go back</Text>
            </Box>
        );
    }

    if (!session) {
        return <Text>Loading Session...</Text>;
    }

    // Display last 15 messages to fill screen
    const displayMessages = session.messages.slice(-15);

    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan" height={30}>
            <Box
                borderStyle="single"
                borderColor="gray"
                marginBottom={1}
                paddingX={1}
                justifyContent="space-between"
            >
                <Box>
                    <Text bold>Session: {project.name}</Text>
                    <Text color="gray"> ({session.id.slice(0, 8)})</Text>
                </Box>
                {isThinking && <Text color="yellow"> ⏳ Thinking...</Text>}
            </Box>

            <Box flexDirection="column" flexGrow={1} overflowY="hidden">
                {displayMessages.length === 0 ? (
                    <Text italic color="gray">
                        No messages yet. Start the conversation.
                    </Text>
                ) : (
                    displayMessages.map((msg, index) => (
                        <Box key={`${msg.id}-${index}`} flexDirection="column" marginBottom={1}>
                            <Box>
                                <Text
                                    bold
                                    color={
                                        msg.role === "user"
                                            ? "green"
                                            : msg.role === "system"
                                              ? "yellow"
                                              : "blue"
                                    }
                                >
                                    {msg.role.toUpperCase()}
                                </Text>
                                <Text color="gray">
                                    {" "}
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </Text>
                            </Box>
                            <Text>{msg.content}</Text>
                        </Box>
                    ))
                )}
            </Box>

            <Box borderStyle="single" borderColor="green" paddingX={1} marginTop={1}>
                <Box marginRight={1}>
                    <Text color="green">❯</Text>
                </Box>
                <TextInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    placeholder="Type instructions..."
                />
            </Box>

            <Box marginTop={1}>
                <Text color="gray">[Esc] Back</Text>
            </Box>
        </Box>
    );
};

export default SessionView;
