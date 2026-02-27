# Claudit

Web tool for managing and interacting with local Claude Code sessions.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser :5173                     │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ SessionList   │  │ SessionDetail              │   │
│  │  SearchBar    │  │  MessageBubble (markdown)  │   │
│  │  ProjectGroup │  │  ThinkingBlock (collapse)  │   │
│  │  SessionItem  │  │  ToolUseBlock  (collapse)  │   │
│  │               │  │  ChatInput → WebSocket     │   │
│  └──────────────┘  └────────────────────────────┘   │
│       300px              flex 1fr                    │
└──────────┬──────────────────┬───────────────────────┘
           │ REST /api        │ WS /ws/chat
           ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                  Express :3001                       │
│                                                      │
│  GET /api/sessions?q=       → historyIndex.ts        │
│  GET /api/sessions/:h/:id   → sessionParser.ts       │
│                                                      │
│  WS  /ws/chat               → claudeProcess.ts       │
│       resume / message / stop    │                   │
│                                  ▼                   │
│                         spawn claude CLI              │
│                         --resume <id> -p              │
│                         --output-format stream-json   │
│                         --input-format stream-json    │
│                         --verbose                     │
└──────────────────────────┬──────────────────────────┘
                           │ read
                           ▼
                    ~/.claude/
                    ├── history.jsonl
                    └── projects/{hash}/{sessionId}.jsonl
```

**Tech stack:** React + Vite + Tailwind CSS (client) / Express + WebSocket (server)

## Data Flow

- **Session list**: scans `~/.claude/projects/` directories + `history.jsonl` for metadata, cached 30s
- **Session detail**: parses session JSONL, merges assistant records by `message.id`, filters out internal tool_result exchanges
- **Live chat**: spawns `claude` CLI as a child process per WebSocket connection, streams JSON events bidirectionally

## Project Structure

```
claudit/
├── server/src/
│   ├── index.ts                 # Express + WebSocket entry
│   ├── routes/sessions.ts       # REST endpoints
│   └── services/
│       ├── historyIndex.ts      # Session index builder
│       ├── sessionParser.ts     # JSONL parser
│       └── claudeProcess.ts     # Claude CLI subprocess manager
└── client/src/
    ├── App.tsx
    ├── api/sessions.ts          # REST client
    ├── hooks/useClaudeChat.ts   # WebSocket hook
    └── components/
        ├── Layout.tsx
        ├── SessionList/         # Left panel
        └── SessionDetail/       # Right panel + chat
```

## Getting Started

```bash
# Install dependencies
npm install && npm install --prefix server && npm install --prefix client

# Start dev (server :3001 + client :5173)
npm run dev
```

Open http://localhost:5173

## Notes

- Resuming a session that is already in use by another Claude Code instance will hang — pick an inactive session
- Slash commands (`/mcp`, `/help`, etc.) are interactive-mode-only and not supported in pipe mode
