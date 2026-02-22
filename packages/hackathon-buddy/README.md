# Hackathon Buddy MCP Server

MCP server for hackathon discovery, team intelligence, idea validation, build management, pitch coaching, and post-hackathon continuity. Compatible with Claude Desktop, Cursor, Windsurf, Zed, Accomplish, and any MCP host.

## Quick Start

### stdio (local / Accomplish)

```bash
pnpm install
pnpm dev
# or
HACKATHON_BUDDY_TRANSPORT=stdio pnpm dev
```

### HTTP (remote / team)

```bash
HACKATHON_BUDDY_TRANSPORT=http HACKATHON_BUDDY_HTTP_PORT=3100 pnpm dev
```

## Tools (Phase 1 — Scout)

| Tool                             | Description                                         |
| -------------------------------- | --------------------------------------------------- |
| `hb_scout_search_hackathons`     | Search Devpost for active/upcoming hackathons       |
| `hb_scout_get_hackathon_details` | Pull full hackathon data (prizes, judges, sponsors) |
| `hb_scout_get_winning_projects`  | Fetch historical winning projects from a hackathon  |

## Configuration

| Env                         | Default | Description                                                                                   |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `HACKATHON_BUDDY_TRANSPORT` | `stdio` | `stdio` or `http`                                                                             |
| `HACKATHON_BUDDY_HTTP_PORT` | `3100`  | HTTP port when transport=http                                                                 |
| `EXA_API_KEY`               | -       | **Recommended.** [Exa](https://exa.ai) API key — neural search for hackathons, judges, grants |
| `BRAVE_API_KEY`             | -       | Brave Search API key (fallback)                                                               |
| `SERPER_API_KEY`            | -       | Serper API key (fallback)                                                                     |

## Client Setup

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hackathon-buddy": {
      "command": "npx",
      "args": ["tsx", "/path/to/packages/hackathon-buddy/src/index.ts"]
    }
  }
}
```

### Accomplish

Register as an MCP server in the skill config. The stdio binary is spawned by Accomplish's agent core.

### Cursor / Windsurf / Zed

Use HTTP transport and add the server URL in each client's MCP configuration.

## License

MIT
