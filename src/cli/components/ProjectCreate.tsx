import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface ProjectCreateProps {
    onSubmit: (name: string, description: string) => void;
    onCancel: () => void;
}

const ProjectCreate: React.FC<ProjectCreateProps> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [activeField, setActiveField] = useState<"name" | "description">("name");

    useInput((input, key) => {
        if (key.escape) {
            onCancel();
            return;
        }

        if (key.return) {
            if (activeField === "name") {
                if (name.trim()) {
                    setActiveField("description");
                }
            } else {
                if (description.trim()) {
                    onSubmit(name, description);
                }
            }
        }

        // Tab to switch fields
        if (key.tab) {
            setActiveField((prev) => (prev === "name" ? "description" : "name"));
        }
    });

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={60}>
            <Box marginBottom={1}>
                <Text bold>Create New Project</Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text>Project Name:</Text>
                <Box borderStyle="single" borderColor={activeField === "name" ? "green" : "gray"}>
                    <TextInput
                        value={name}
                        onChange={setName}
                        focus={activeField === "name"}
                        placeholder="My Awesome Project"
                    />
                </Box>
            </Box>

            <Box flexDirection="column">
                <Text>Description:</Text>
                <Box
                    borderStyle="single"
                    borderColor={activeField === "description" ? "green" : "gray"}
                >
                    <TextInput
                        value={description}
                        onChange={setDescription}
                        focus={activeField === "description"}
                        placeholder="What does it do?"
                    />
                </Box>
            </Box>

            <Box marginTop={1}>
                <Text color="gray">
                    Press [Enter] to confirm, [Tab] to switch fields, [Esc] to cancel
                </Text>
            </Box>
        </Box>
    );
};

export default ProjectCreate;
