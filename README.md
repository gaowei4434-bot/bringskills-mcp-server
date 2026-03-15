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

#### Windsurf (Codeium)

Add to `~/.codeium/windsurf/mcp_config.json`:

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
| `bringskills_confirm_agent` | Confirm your AI agent type for optimized output |

## Agent Confirmation Flow

When you first execute a skill, BringSkills will try to auto-detect your AI agent type. If detection fails or you want to specify a different agent, you'll be prompted to confirm:

1. **Auto-detected**: If your agent is detected, you'll see a prompt like:
   ```
   🔔 Agent 确认
   检测到你正在使用 Claude Code (置信度: 85%)
   请确认是否正确...
   ```
   - Confirm: `bringskills_confirm_agent(confirmed=true)`
   - Choose different: `bringskills_confirm_agent(confirmed=false, agent_type="cursor")`

2. **Not detected**: If detection fails, manually specify your agent:
   ```
   bringskills_confirm_agent(confirmed=false, agent_type="claude-code")
   ```

**Supported agent types:**
- `openclaw`, `claude-code`, `cursor`, `codex`, `windsurf`, `aider`
- `continue`, `cody`, `github-copilot`, `tabnine`, `amazon-q`
- `jetbrains-ai`, `replit-ai`, `generic`

Once confirmed, your API key is bound to that agent type, and all skill outputs will be optimized for it.

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
| Windsurf | MCP via `~/.codeium/windsurf/mcp_config.json` |
| Codex CLI | MCP via `~/.codex/mcp.json` |
| OpenClaw | Native skill install |

### Other Agents (HTTP API)

For agents that don't support MCP, use the BringSkills HTTP API directly via `bringskills-api` package:

```bash
npm install bringskills-api
```

```typescript
import { BringSkillsAPI } from 'bringskills-api';

const api = new BringSkillsAPI('sk-bring-xxx');
const result = await api.execute('text-statistics', { text: 'Hello' });
```

| Agent | Integration Method |
|-------|-------------------|
| Aider | Use `bringskills-api` + context file |
| Cody | Use `bringskills-api` in custom commands |
| GitHub Copilot | Generate API call code |
| Tabnine | Generate API call code |
| Amazon Q | Use `bringskills-api` |
| JetBrains AI | Generate API call code |
| Replit AI | Use Secrets + API calls |

## Troubleshooting

### "Invalid authentication credentials" Error

This error occurs when the API key is not properly configured:

1. **Check your API key format** - Must start with `sk-bring-`
2. **Verify environment variable** - Ensure `BRINGSKILLS_API_KEY` is set correctly
3. **Restart your AI agent** - After changing config, restart Claude Code/Cursor
4. **Clear npx cache** (if using npx):
   ```bash
   npx clear-npx-cache
   # or
   rm -rf ~/.npm/_npx
   ```

### Skill execution returns empty result

1. **Check if skill has code** - Some skills may not have executable code yet
2. **Verify input format** - Ensure input matches the skill's expected parameters
3. **Try a different skill** - Test with `text-statistics` to verify setup

### MCP server not loading

1. **Check config file location**:
   - Claude Code: `~/.claude/mcp.json`
   - Cursor: Settings → MCP
   - Codex: `~/.codex/mcp.json`

2. **Validate JSON syntax** - Use a JSON validator

3. **Check logs**:
   ```bash
   # Test MCP server directly
   BRINGSKILLS_API_KEY="sk-bring-xxx" npx bringskills-mcp-server
   ```

## Changelog

### v1.1.3 (Latest)
- Fixed: Executor now correctly calls `main(input)` function
- Fixed: Categories API response format
- Added: Agent confirmation flow documentation

### v1.1.2
- Added: Agent type auto-detection
- Added: `bringskills_confirm_agent` tool

### v1.1.0
- Initial MCP server release

## Links

- [BringSkills Marketplace](https://www.bringskills.com)
- [Documentation](https://www.bringskills.com/docs)
- [API Reference](https://www.bringskills.com/docs/api)
- [Get API Key](https://www.bringskills.com/settings/api-keys)

## License

MIT
