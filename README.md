# bringskills-mcp-server

MCP (Model Context Protocol) Server for [BringSkills](https://www.bringskills.com) - the AI Skills Marketplace.

**One purchase, use across all AI agents.** Buy skills once and use them with Claude Code, Cursor, Codex, and more AI agents.

## Installation

```bash
npm install -g bringskills-mcp-server
```

## Quick Start

### 1. Get your API Key

Sign up at [BringSkills](https://www.bringskills.com) and get your API key from [Settings → API Keys](https://www.bringskills.com/settings/api-keys).

### 2. Configure your AI Agent

#### Claude Code / Claude Desktop

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "bringskills": {
      "command": "npx",
      "args": ["-y", "bringskills-mcp-server"],
      "env": {
        "BRINGSKILLS_API_KEY": "sk-bring-xxx"
      }
    }
  }
}
```

#### Cursor

Add to Cursor MCP settings:

```json
{
  "mcpServers": {
    "bringskills": {
      "command": "npx",
      "args": ["-y", "bringskills-mcp-server"],
      "env": {
        "BRINGSKILLS_API_KEY": "sk-bring-xxx"
      }
    }
  }
}
```

#### Codex CLI (OpenAI)

Add to `~/.codex/mcp.json`:

```json
{
  "mcpServers": {
    "bringskills": {
      "command": "npx",
      "args": ["-y", "bringskills-mcp-server"],
      "env": {
        "BRINGSKILLS_API_KEY": "sk-bring-xxx"
      }
    }
  }
}
```

#### OpenClaw

```bash
openclaw skill install bringskills-mcp-server
export BRINGSKILLS_API_KEY="sk-bring-xxx"
```

## Available Tools

The MCP server provides these tools to your AI agent:

| Tool | Description |
|------|-------------|
| `bringskills_search` | Search for skills in the marketplace |
| `bringskills_get_skill` | Get detailed info about a skill |
| `bringskills_execute` | Execute a skill with input parameters |
| `bringskills_my_skills` | List your purchased/acquired skills |
| `bringskills_acquire_free` | Add a free skill to your library |
| `bringskills_categories` | List all skill categories |

## Usage Examples

Once configured, your AI agent can use BringSkills naturally:

```
"Search for code review skills"
→ Uses bringskills_search to find relevant skills

"Execute the text-analyzer skill on this code"
→ Uses bringskills_execute with your input

"Show me my skills"
→ Uses bringskills_my_skills to list your library

"Get the free weather skill"
→ Uses bringskills_acquire_free to add it
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BRINGSKILLS_API_KEY` | Your BringSkills API key | Yes |
| `BRINGSKILLS_API_URL` | Custom API URL (default: production) | No |

## Programmatic Usage

You can also use the client directly in your code:

```typescript
import { BringSkillsClient } from 'bringskills-mcp-server';

const client = new BringSkillsClient('sk-bring-xxx');

// Search skills
const skills = await client.searchSkills('code review');

// Execute a skill
const result = await client.executeSkill('text-analyzer', {
  text: 'Hello world'
});

// Get your skills
const mySkills = await client.getMySkills();
```

## Supported AI Agents

### MCP-Compatible Agents (Native Support)

| Agent | Configuration |
|-------|---------------|
| Claude Code | MCP via `~/.claude/mcp.json` |
| Cursor | MCP via settings |
| Codex CLI | MCP via `~/.codex/mcp.json` |
| OpenClaw | Native skill install |

### Other Agents (HTTP API)

For agents that don't support MCP, use the BringSkills HTTP API directly:

| Agent | Integration Method |
|-------|-------------------|
| Windsurf | Use `bringskills-windsurf` package |
| Aider | Use `bringskills-aider` package |
| Continue | Use `bringskills-continue` package |
| Cody | Use `bringskills-cody` package |
| GitHub Copilot | Generate API call code |
| Tabnine | Generate API call code |
| Amazon Q | Use `bringskills-aws` package |
| JetBrains AI | Generate API call code |
| Replit AI | Use Secrets + API calls |

## Links

- [BringSkills Marketplace](https://www.bringskills.com)
- [Documentation](https://www.bringskills.com/docs)
- [API Reference](https://www.bringskills.com/docs/api)
- [Get API Key](https://www.bringskills.com/settings/api-keys)

## License

MIT
