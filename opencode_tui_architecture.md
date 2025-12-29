# OpenCode TUI Architecture Analysis

This document describes how the [OpenCode](https://github.com/opencode-ai/opencode) TUI is implemented, specifically focusing on how it starts, how agent sessions can be interrupted, and how it follows the agent's output.

## 1. Starting the TUI View

The TUI entry point is located in `cmd/root.go`. When the `opencode` command is run in interactive mode, it initializes the Bubble Tea program:

```go
// cmd/root.go
program := tea.NewProgram(
    tui.New(app),
    tea.WithAltScreen(),
)
```

The `tui.New(app)` function (in `internal/tui/tui.go`) creates the main `appModel`, which serves as the root component. The `Init()` method of `appModel` initializes all sub-components and pages:

```go
// internal/tui/tui.go
func (a appModel) Init() tea.Cmd {
    // ...
    cmd := a.pages[a.currentPage].Init() // Initializes the active page (e.g., ChatPage)
    // ...
    return tea.Batch(cmds...)
}
```

The default view is the `ChatPage`, initialized in `internal/tui/page/chat.go`. This page sets up a split-pane layout containing the message list (`messagesCmp`) and the input editor (`editorCmp`):

```go
// internal/tui/page/chat.go
func NewChatPage(app *app.App) tea.Model {
    messagesContainer := layout.NewContainer(chat.NewMessagesCmp(app), ...)
    editorContainer := layout.NewContainer(chat.NewEditorCmp(app), ...)
    // ...
    return &chatPage{
        layout: layout.NewSplitPane(...),
        // ...
    }
}
```

## 2. Interrupting Agent Sessions

The interruption mechanism is handled at the `ChatPage` level (`internal/tui/page/chat.go`). The `Esc` key is bound to the `Cancel` action.

```go
// internal/tui/page/chat.go
Cancel: key.NewBinding(
    key.WithKeys("esc"),
    key.WithHelp("esc", "cancel"),
),
```

When `Esc` is pressed while a session is active, the `Update` loop catches the key and calls the cancel method on the agent:

```go
// internal/tui/page/chat.go
case key.Matches(msg, keyMap.Cancel):
    if p.session.ID != "" {
        // Cancel the current session's generation process
        p.app.CoderAgent.Cancel(p.session.ID)
        return p, nil
    }
```

This ensures the user can stop the generation process immediately.

## 3. Following Agent Sessions

The "following" behavior (auto-scrolling) is implemented in the `messagesCmp` component located in `internal/tui/components/chat/list.go`.

The component subscribes to `pubsub` events to receive real-time updates from the agent. When a new message is created (`CreatedEvent`) or an existing message is updated (`UpdatedEvent`), the view is re-rendered.

Crucially, the component detects if the update corresponds to the latest message and auto-scrolls the viewport to the bottom:

```go
// internal/tui/components/chat/list.go
case pubsub.Event[message.Message]:
    // ... (logic to update m.messages) ...
    if needsRerender {
        m.renderView()
        if len(m.messages) > 0 {
            // Check if the update is for the latest message
            if (msg.Type == pubsub.CreatedEvent) ||
                (msg.Type == pubsub.UpdatedEvent && msg.Payload.ID == m.messages[len(m.messages)-1].ID) {
                
                // Auto-scroll to the bottom
                m.viewport.GotoBottom()
            }
        }
    }
```

This logic guarantees that the TUI always displays the most recent output from the agent without requiring manual scrolling by the user.
