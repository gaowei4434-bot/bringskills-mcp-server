# bringskills-mcp-server

MCP (Model Context Protocol) Server for [BringSkills](https://www.bringskills.com) - the AI Skills Marketplace.

**One purchase, use across all AI agents.** Buy skills once and use them with Claude Code, Cursor, Codex, Windsurf, and 10+ AI agents.

## 🚀 Quick Setup (Recommended)

**One command to configure everything:**

```bash
npx -y bringskills-mcp-server setup
```

This interactive setup will:
1. ✅ Auto-detect your AI Agent when possible
2. ✅ Validate your API Key
3. ✅ Bind your API Key to the Agent type
4. ✅ Write the correct configuration file

Helpful commands:

```bash
npx -y bringskills-mcp-server setup --help
npx -y bringskills-mcp-server setup --agent codex
```

---

## 📋 Supported AI Agents

### ✅ MCP-Compatible Agents (Full Support)

| Agent | Config File | Status |
|-------|-------------|--------|
| Claude Code | `~/.claude/mcp.json` | ✅ Verified |
| Cursor | `~/.cursor/mcp.json` | ✅ Verified |
| Codex CLI (OpenAI) | `~/.codex/config.toml` | ✅ Verified |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | ✅ Verified |
| GitHub Copilot | VS Code MCP settings | ✅ Verified |
| Amazon Q | `~/.aws/amazonq/mcp.json` | ✅ Verified |
| OpenClaw | `~/.openclaw/openclaw.json` | ✅ Verified |

### ❌ Non-MCP Agents (HTTP API Only)

| Agent | Integration Method |
|-------|-------------------|
| Aider | Environment variable + API calls |
| Cody (Sourcegraph) | HTTP API |
| Tabnine | Not supported (closed system) |
| JetBrains AI | HTTP API |
| Replit AI | Secrets + HTTP API |
| Continue | Deprecated (product pivoted) |

---

## 📖 Manual Configuration

If you prefer manual setup, here are the configurations for each agent:

### Claude Code / Claude Desktop

**Config file:** `~/.claude/mcp.json`

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

### Cursor

**Config file:** `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)

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

**Config interpolation supported:**
```json
{
  "env": {
    "BRINGSKILLS_API_KEY": "${env:BRINGSKILLS_API_KEY}"
  }
}
```

### Codex CLI (OpenAI)

**Config file:** `~/.codex/config.toml`

```toml
[mcp_servers.bringskills]
command = "npx"
args = ["-y", "bringskills-mcp-server"]

[mcp_servers.bringskills.env]
BRINGSKILLS_API_KEY = "sk-bring-xxx"
```

**Or use environment variable:**
```toml
[mcp_servers.bringskills]
command = "npx"
args = ["-y", "bringskills-mcp-server"]
env_vars = ["BRINGSKILLS_API_KEY"]
```

### Windsurf

**Config file:** `~/.codeium/windsurf/mcp_config.json`

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

### GitHub Copilot

**Config:** VS Code `settings.json`

```json
{
  "github.copilot.chat.mcp.servers": {
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

### Amazon Q

**Config file:** `~/.aws/amazonq/mcp.json`

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

### OpenClaw

**Config file:** `~/.openclaw/openclaw.json` (merge into existing)

```json
{
  "mcp": {
    "servers": {
      "bringskills": {
        "command": "npx",
        "args": ["-y", "bringskills-mcp-server"],
        "env": {
          "BRINGSKILLS_API_KEY": "sk-bring-xxx"
        }
      }
    }
  }
}
```

### Generic / Other MCP Agents

```json
{
  "command": "npx",
  "args": ["-y", "bringskills-mcp-server"],
  "env": {
    "BRINGSKILLS_API_KEY": "sk-bring-xxx"
  }
}
```

---

## 🔧 Available Tools

The MCP server provides these tools to your AI agent:

| Tool | Description |
|------|-------------|
| `bringskills_search` | Search for skills in the marketplace |
| `bringskills_get_skill` | Get detailed info about a skill |
| `bringskills_execute` | Execute a skill with input parameters |
| `bringskills_my_skills` | List your purchased/acquired skills |
| `bringskills_acquire_free` | Add a free skill to your library |
| `bringskills_categories` | List all skill categories |
| `bringskills_confirm_agent` | Confirm your AI agent type |

---

## 🔐 Agent Confirmation Flow

When you first execute a skill, BringSkills will auto-detect your AI agent type. If detection fails, you'll be prompted to confirm:

```
🔔 Agent 确认
检测到你正在使用 Claude Code (置信度: 85%)
请确认是否正确...
```

- Confirm: `bringskills_confirm_agent(confirmed=true)`
- Choose different: `bringskills_confirm_agent(confirmed=false, agent_type="cursor")`

**Supported agent types:**
`openclaw`, `claude-code`, `cursor`, `codex`, `windsurf`, `aider`, `continue`, `cody`, `github-copilot`, `tabnine`, `amazon-q`, `jetbrains-ai`, `replit-ai`, `generic`

---

## 💡 Usage Examples

Once configured, your AI agent can use BringSkills naturally:

```
"Search for code review skills"
→ Uses bringskills_search

"Execute the text-analyzer skill on this code"
→ Uses bringskills_execute

"Show me my skills"
→ Uses bringskills_my_skills

"Get the free weather skill"
→ Uses bringskills_acquire_free
```

---

## 🌐 HTTP API (For Non-MCP Agents)

For agents that don't support MCP, use the HTTP API directly:

**Base URL:** `https://api.bringskills.com/api/v1`

**Authentication:** `Authorization: Bearer sk-bring-xxx`

**Example:**
```bash
curl -X GET "https://api.bringskills.com/api/v1/skills?search=code+review" \
  -H "Authorization: Bearer sk-bring-xxx"
```

**API Documentation:** [bringskills.com/docs](https://www.bringskills.com/docs)

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BRINGSKILLS_API_KEY` | Yes | Your BringSkills API key |
| `BRINGSKILLS_API_URL` | No | Custom API URL (default: production) |

---

## ❓ Troubleshooting

### "API key not found"
- Ensure `BRINGSKILLS_API_KEY` is set in your config
- Run `npx -y bringskills-mcp-server setup` to reconfigure

### "Agent not confirmed"
- Run `bringskills_confirm_agent` to bind your API key

### MCP server not loading
1. Check config file location for your agent
2. Validate JSON/TOML syntax
3. Test manually: `BRINGSKILLS_API_KEY="sk-bring-xxx" npx -y bringskills-mcp-server`

### Clear npx cache
```bash
rm -rf ~/.npm/_npx
```

---

## 📚 Links

- **Website:** [bringskills.com](https://www.bringskills.com)
- **Get API Key:** [bringskills.com/settings/api-keys](https://www.bringskills.com/settings/api-keys)
- **API Docs:** [bringskills.com/docs](https://www.bringskills.com/docs)
- **Support:** support@bringskills.com

---

## 📝 Changelog

### v1.2.0
- Added: Interactive setup command (`npx -y bringskills-mcp-server setup`)
- Added: Support for 7 MCP-compatible agents
- Fixed: Codex CLI config format (TOML, not JSON)
- Updated: Complete documentation for all 13 agents

### v1.1.4
- Fixed: Executor correctly calls `main(input)` function
- Fixed: Categories API response format

### v1.1.2
- Added: Agent type auto-detection
- Added: `bringskills_confirm_agent` tool

---

## License

MIT
