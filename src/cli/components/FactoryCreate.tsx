import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface FactoryCreateProps {
    onSubmit: (name: string, path: string) => void;
    onCancel: () => void;
}

const FactoryCreate: React.FC<FactoryCreateProps> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState("");
    const [path, setPath] = useState(process.cwd());
    const [activeField, setActiveField] = useState<"name" | "path">("name");

    useInput((input, key) => {
        if (key.escape) {
            onCancel();
            return;
        }

        if (key.return) {
            if (activeField === "name") {
                if (name.trim()) {
                    setActiveField("path");
                }
            } else {
                if (path.trim()) {
                    onSubmit(name, path);
                }
            }
        }

        if (key.tab) {
            setActiveField((prev) => (prev === "name" ? "path" : "name"));
        }
    });

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={70}>
            <Box marginBottom={1}>
                <Text bold>Initialize New Factory</Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text>Factory Name:</Text>
                <Box borderStyle="single" borderColor={activeField === "name" ? "green" : "gray"}>
                    <TextInput
                        value={name}
                        onChange={setName}
                        focus={activeField === "name"}
                        placeholder="My Software Factory"
                    />
                </Box>
            </Box>

            <Box flexDirection="column">
                <Text>Root Path (Absolute):</Text>
                <Box borderStyle="single" borderColor={activeField === "path" ? "green" : "gray"}>
                    <TextInput
                        value={path}
                        onChange={setPath}
                        focus={activeField === "path"}
                        placeholder="/path/to/factory"
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

export default FactoryCreate;
