import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Local storage path (metadata in CWD)
const METADATA_DIR = join(process.cwd(), ".dark-factory");
// Global config path
const GLOBAL_CONFIG_DIR = join(homedir(), ".config", "dark-factory");

interface SettingsProps {
    onBack: () => void;
    onResetComplete: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack, onResetComplete }) => {
    const [confirming, setConfirming] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleSelect = (item: { value: string }) => {
        if (item.value === "back") {
            onBack();
        } else if (item.value === "reset") {
            setConfirming(true);
        }
    };

    useInput((input, key) => {
        if (confirming) {
            if (input === "y" || input === "Y") {
                try {
                    setStatusMessage("Deleting data...");

                    // Delete Local Config
                    if (existsSync(METADATA_DIR)) {
                        rmSync(METADATA_DIR, { recursive: true, force: true });
                    }

                    // Delete Global Config
                    if (existsSync(GLOBAL_CONFIG_DIR)) {
                        rmSync(GLOBAL_CONFIG_DIR, { recursive: true, force: true });
                    } else {
                        // Force verify path
                        const absPath = join(homedir(), ".config", "dark-factory");
                        if (existsSync(absPath)) {
                            rmSync(absPath, { recursive: true, force: true });
                        }
                    }

                    setConfirming(false);
                    onResetComplete();
                } catch (e) {
                    setStatusMessage(`Error: ${e}`);
                    console.error("Failed to delete data:", e);
                }
            } else if (input === "n" || input === "N" || key.escape) {
                setConfirming(false);
                setStatusMessage(null);
            }
        } else {
            if (key.escape) {
                onBack();
            }
        }
    });

    const items = [
        { label: "⚠️  Delete All Application Data (Reset Factory)", value: "reset" },
        { label: "Back to Dashboard", value: "back" },
    ];

    if (confirming) {
        return (
            <Box flexDirection="column" borderColor="red" borderStyle="round" padding={1}>
                <Text color="red" bold>
                    DANGER ZONE
                </Text>
                <Text>Are you sure you want to delete all factory data?</Text>
                <Text>This will remove configuration, project metadata, and metrics.</Text>
                <Text italic>
                    (This does not delete your generated product source code folders)
                </Text>
                {statusMessage && <Text color="yellow">{statusMessage}</Text>}
                <Box marginTop={1}>
                    <Text bold>Press [y] to CONFIRM or [n] to CANCEL</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="gray">
            <Box marginBottom={1}>
                <Text bold underline>
                    Settings
                </Text>
            </Box>

            <SelectInput items={items} onSelect={handleSelect} />

            <Box marginTop={1}>
                <Text color="gray">Press [Esc] to go back.</Text>
            </Box>
        </Box>
    );
};

export default Settings;
