#!/usr/bin/env node
/**
 * BringSkills Setup CLI
 * 一条命令完成 Agent 配置
 * 
 * 用法: npx -y bringskills-mcp-server setup [--agent <type>]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { execFileSync } from 'child_process';

const PUBLIC_DOCS_URL = 'https://www.bringskills.com/docs';
const DEFAULT_API_BASE = 'https://api.bringskills.com/api/v1';

function normalizeApiBase(value: string | undefined): string {
  if (!value) {
    return DEFAULT_API_BASE;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

const API_BASE = normalizeApiBase(process.env.BRINGSKILLS_API_URL);

// Agent 配置信息
interface AgentConfig {
  name: string;
  value: string;
  supportsMcp: boolean;
  configPath: string | ((home: string) => string);
  configFormat: 'json' | 'toml' | 'skill';
  configTemplate: (apiKey: string) => string;
  instructions?: string;
  shellEnvVar?: boolean;  // 是否需要写入 shell 环境变量
}

interface SetupArgs {
  help: boolean;
  agent?: string;
  invalidAgent?: string;
  missingAgentValue?: boolean;
}

interface AgentDetection {
  agent: AgentConfig;
  reason: string;
  score: number;
}

class SetupCliError extends Error {}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  'claude-code': {
    name: 'Claude Code',
    value: 'claude-code',
    supportsMcp: true,
    configPath: (home) => path.join(home, '.claude', 'mcp.json'),
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      mcpServers: {
        bringskills: {
          command: 'npx',
          args: ['-y', 'bringskills-mcp-server'],
          env: {
            BRINGSKILLS_API_KEY: apiKey
          }
        }
      }
    }, null, 2)
  },
  'cursor': {
    name: 'Cursor',
    value: 'cursor',
    supportsMcp: true,
    configPath: (home) => path.join(home, '.cursor', 'mcp.json'),
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      mcpServers: {
        bringskills: {
          command: 'npx',
          args: ['-y', 'bringskills-mcp-server'],
          env: {
            BRINGSKILLS_API_KEY: apiKey
          }
        }
      }
    }, null, 2)
  },
  'codex': {
    name: 'Codex CLI (OpenAI)',
    value: 'codex',
    supportsMcp: true,
    configPath: (home) => path.join(home, '.codex', 'config.toml'),
    configFormat: 'toml',
    configTemplate: (apiKey) => `
# BringSkills MCP Server Configuration
[mcp_servers.bringskills]
command = "npx"
args = ["-y", "bringskills-mcp-server"]

[mcp_servers.bringskills.env]
BRINGSKILLS_API_KEY = "${apiKey}"
`
  },
  'windsurf': {
    name: 'Windsurf',
    value: 'windsurf',
    supportsMcp: true,
    configPath: (home) => path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      mcpServers: {
        bringskills: {
          command: 'npx',
          args: ['-y', 'bringskills-mcp-server'],
          env: {
            BRINGSKILLS_API_KEY: apiKey
          }
        }
      }
    }, null, 2)
  },
  'github-copilot': {
    name: 'GitHub Copilot',
    value: 'github-copilot',
    supportsMcp: true,
    configPath: (home) => path.join(home, '.vscode', 'settings.json'),
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      "github.copilot.chat.mcp.servers": {
        bringskills: {
          command: 'npx',
          args: ['-y', 'bringskills-mcp-server'],
          env: {
            BRINGSKILLS_API_KEY: apiKey
          }
        }
      }
    }, null, 2),
    instructions: '注意: 需要合并到现有的 settings.json 中'
  },
  'amazon-q': {
    name: 'Amazon Q',
    value: 'amazon-q',
    supportsMcp: true,
    configPath: (home) => path.join(home, '.aws', 'amazonq', 'mcp.json'),
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      mcpServers: {
        bringskills: {
          command: 'npx',
          args: ['-y', 'bringskills-mcp-server'],
          env: {
            BRINGSKILLS_API_KEY: apiKey
          }
        }
      }
    }, null, 2)
  },
  'openclaw': {
    name: 'OpenClaw',
    value: 'openclaw',
    supportsMcp: false,
    configPath: (home) => path.join(home, '.agents', 'skills', 'bringskills', 'SKILL.md'),
    configFormat: 'skill',
    configTemplate: (apiKey) => `# BringSkills - AI 技能市场

搜索、浏览和执行 BringSkills 市场上的 AI 技能。一次购买，所有 Agent 通用。

## 使用场景

- 搜索 BringSkills 技能
- 执行已购买的技能
- 查看技能详情和使用方法

## 环境变量

需要设置 \`BRINGSKILLS_API_KEY\` 环境变量（setup 命令已自动配置）。

## API 端点

- Base URL: \`${DEFAULT_API_BASE}\`
- 认证: \`Authorization: Bearer $BRINGSKILLS_API_KEY\`

## 可用操作

### 1. 搜索技能

\`\`\`bash
curl -X GET "${DEFAULT_API_BASE}/skills?search=text&limit=10" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY"
\`\`\`

返回匹配的技能列表，包含 name, slug, description, price, rating 等字段。

### 2. 获取技能详情

\`\`\`bash
curl -X GET "${DEFAULT_API_BASE}/skills/slug/{skill-slug}" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY"
\`\`\`

### 3. 执行技能

\`\`\`bash
curl -X POST "${DEFAULT_API_BASE}/skills/slug/{skill-slug}/execute" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"text": "要处理的内容"}}'
\`\`\`

### 4. 查看我的技能

\`\`\`bash
curl -X GET "${DEFAULT_API_BASE}/orders" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY"
\`\`\`

### 5. 获取免费技能

\`\`\`bash
curl -X POST "${DEFAULT_API_BASE}/orders/free" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"skill_slug": "技能slug"}'
\`\`\`

## 示例对话

用户: "搜索文本分析相关的技能"
→ 调用搜索 API，返回技能列表

用户: "执行 text-statistics 技能，分析这段文字：Hello world"
→ 调用执行 API，返回分析结果

用户: "把 code-reviewer 技能添加到我的库"
→ 调用免费获取 API（如果是免费技能）

## 错误处理

- 401: API Key 无效或过期
- 403: 没有该技能的使用权限（需要先购买）
- 404: 技能不存在
- 429: 请求过于频繁，稍后重试
`,
    instructions: '已创建 OpenClaw skill 到 ~/.agents/skills/bringskills/，重启 OpenClaw 后生效',
    shellEnvVar: true
  },
  // 不支持 MCP 的 Agent - 但仍可自动配置
  'aider': {
    name: 'Aider',
    value: 'aider',
    supportsMcp: false,
    configPath: (home) => path.join(home, '.bringskills', 'aider-context.md'),
    configFormat: 'json',
    configTemplate: (apiKey) => `# BringSkills API Context for Aider

## 环境变量 (已自动添加到 shell 配置)
\`\`\`bash
export BRINGSKILLS_API_KEY="${apiKey}"
\`\`\`

## API 使用方法

### 搜索技能
\`\`\`bash
curl -X GET "${DEFAULT_API_BASE}/skills?search=YOUR_QUERY" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY"
\`\`\`

### 执行技能
\`\`\`bash
curl -X POST "${DEFAULT_API_BASE}/skills/slug/SKILL_SLUG/execute" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"text": "your input"}}'
\`\`\`

### 获取我的技能
\`\`\`bash
curl -X GET "${DEFAULT_API_BASE}/orders" \\
  -H "Authorization: Bearer $BRINGSKILLS_API_KEY"
\`\`\`

## Python 代码示例
\`\`\`python
import os
import requests

API_KEY = os.environ.get("BRINGSKILLS_API_KEY")
BASE_URL = "${DEFAULT_API_BASE}"

def search_skills(query):
    resp = requests.get(f"{BASE_URL}/skills", 
                       params={"search": query},
                       headers={"Authorization": f"Bearer {API_KEY}"})
    return resp.json()

def execute_skill(skill_id, input_data):
    resp = requests.post(f"{BASE_URL}/skills/slug/{skill_id}/execute",
                        json={"input": input_data},
                        headers={"Authorization": f"Bearer {API_KEY}"})
    return resp.json()
\`\`\`

## 使用说明
在 Aider 中运行: \`/add ~/.bringskills/aider-context.md\`
然后让 Aider 帮你调用 BringSkills API。
`,
    instructions: '已创建 context file，在 Aider 中运行: /add ~/.bringskills/aider-context.md',
    shellEnvVar: true  // 标记需要写入 shell 环境变量
  },
  'cody': {
    name: 'Cody (Sourcegraph)',
    value: 'cody',
    supportsMcp: false,
    configPath: (home) => path.join(home, '.bringskills', 'cody-commands.json'),
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      "bringskills.apiKey": apiKey,
      "commands": {
        "bringskills-search": {
          "description": "Search BringSkills marketplace",
          "prompt": "Use the BringSkills API to search for skills. API key is in BRINGSKILLS_API_KEY. Send Authorization: Bearer $BRINGSKILLS_API_KEY to ${DEFAULT_API_BASE}/skills?search={query}"
        },
        "bringskills-execute": {
          "description": "Execute a BringSkills skill",
          "prompt": "Use the BringSkills API to execute a skill. POST to ${DEFAULT_API_BASE}/skills/slug/{skill-slug}/execute with Authorization: Bearer $BRINGSKILLS_API_KEY."
        }
      },
      "usage": "Copy these commands to your Cody custom commands configuration"
    }, null, 2),
    instructions: '已创建命令模板，请将 ~/.bringskills/cody-commands.json 中的命令添加到 Cody 自定义命令',
    shellEnvVar: true
  },
  'tabnine': {
    name: 'Tabnine',
    value: 'tabnine',
    supportsMcp: false,
    configPath: (home) => path.join(home, '.bringskills', 'tabnine-guide.md'),
    configFormat: 'json',
    configTemplate: (apiKey) => `# BringSkills for Tabnine

Tabnine 是封闭系统，无法直接集成。但你可以让 Tabnine 帮你生成 API 调用代码。

## 环境变量 (已自动添加)
\`\`\`bash
export BRINGSKILLS_API_KEY="${apiKey}"
\`\`\`

## 让 Tabnine 生成的代码模板

在编辑器中输入注释，让 Tabnine 补全：

\`\`\`python
# Call BringSkills API to search for skills about "code review"
# Use requests library, API key from environment variable BRINGSKILLS_API_KEY
# Base URL: ${DEFAULT_API_BASE}
\`\`\`

## API 文档
${PUBLIC_DOCS_URL}
`,
    instructions: '已创建使用指南: ~/.bringskills/tabnine-guide.md',
    shellEnvVar: true
  },
  'jetbrains-ai': {
    name: 'JetBrains AI',
    value: 'jetbrains-ai',
    supportsMcp: false,
    configPath: (home) => path.join(home, '.bringskills', 'jetbrains-template.kt'),
    configFormat: 'json',
    configTemplate: (apiKey) => `// BringSkills API Template for JetBrains AI
// 环境变量已自动配置: BRINGSKILLS_API_KEY

package com.example.bringskills

import java.net.HttpURLConnection
import java.net.URL

object BringSkillsClient {
    private val apiKey = System.getenv("BRINGSKILLS_API_KEY") ?: "${apiKey}"
    private const val baseUrl = "${DEFAULT_API_BASE}"

    fun searchSkills(query: String): String {
        val url = URL("\$baseUrl/skills?search=\$query")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("Authorization", "Bearer \$apiKey")
        return conn.inputStream.bufferedReader().readText()
    }

    fun executeSkill(skillId: String, input: Map<String, Any>): String {
        val url = URL("\$baseUrl/skills/slug/\$skillId/execute")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Authorization", "Bearer \$apiKey")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        // Add JSON body serialization here
        return conn.inputStream.bufferedReader().readText()
    }
}

// 使用方法: 让 JetBrains AI 基于此模板生成代码
`,
    instructions: '已创建 Kotlin 模板: ~/.bringskills/jetbrains-template.kt',
    shellEnvVar: true
  },
  'replit-ai': {
    name: 'Replit AI',
    value: 'replit-ai',
    supportsMcp: false,
    configPath: (home) => path.join(home, '.bringskills', 'replit-setup.md'),
    configFormat: 'json',
    configTemplate: (apiKey) => `# BringSkills for Replit AI

## 步骤 1: 添加 Secret
在 Replit 项目中:
1. 点击左侧 "Secrets" (🔒)
2. 添加新 Secret:
   - Key: \`BRINGSKILLS_API_KEY\`
   - Value: \`${apiKey}\`

## 步骤 2: 使用代码

### Python
\`\`\`python
import os
import requests

API_KEY = os.environ["BRINGSKILLS_API_KEY"]
BASE_URL = "${DEFAULT_API_BASE}"

# 搜索技能
def search_skills(query):
    resp = requests.get(f"{BASE_URL}/skills", 
                       params={"search": query},
                       headers={"Authorization": f"Bearer {API_KEY}"})
    return resp.json()

# 执行技能
def execute_skill(skill_id, input_data):
    resp = requests.post(f"{BASE_URL}/skills/slug/{skill_id}/execute",
                        json={"input": input_data},
                        headers={"Authorization": f"Bearer {API_KEY}"})
    return resp.json()

# 示例
skills = search_skills("text analysis")
print(skills)
\`\`\`

### JavaScript/Node.js
\`\`\`javascript
const API_KEY = process.env.BRINGSKILLS_API_KEY;
const BASE_URL = "${DEFAULT_API_BASE}";

async function searchSkills(query) {
  const resp = await fetch(\`\${BASE_URL}/skills?search=\${query}\`, {
    headers: { "Authorization": \`Bearer \${API_KEY}\` }
  });
  return resp.json();
}

async function executeSkill(skillId, input) {
  const resp = await fetch(\`\${BASE_URL}/skills/slug/\${skillId}/execute\`, {
    method: "POST",
    headers: { 
      "Authorization": \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ input })
  });
  return resp.json();
}
\`\`\`

## 让 Replit AI 帮你
告诉 Replit AI: "使用 BRINGSKILLS_API_KEY 环境变量调用 BringSkills API"
`,
    instructions: '已创建 Replit 配置指南: ~/.bringskills/replit-setup.md\n请在 Replit 中添加 Secret: BRINGSKILLS_API_KEY',
    shellEnvVar: false  // Replit 用 Secrets，不用 shell 环境变量
  },
  'continue': {
    name: 'Continue',
    value: 'continue',
    supportsMcp: false,
    configPath: '',
    configFormat: 'json',
    configTemplate: () => '',
    instructions: `
⚠️ Continue 已转型为 PR 检查工具，不再是 IDE 插件。
建议切换到以下支持 MCP 的 Agent:
- Claude Code
- Cursor  
- Codex CLI
- Windsurf
`
  },
  'generic': {
    name: '通用/其他',
    value: 'generic',
    supportsMcp: true,
    configPath: '',
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      mcpServers: {
        bringskills: {
          command: 'npx',
          args: ['-y', 'bringskills-mcp-server'],
          env: {
            BRINGSKILLS_API_KEY: apiKey
          }
        }
      }
    }, null, 2),
    instructions: '请将此配置添加到你的 Agent 的 MCP 配置文件中'
  }
};

// 创建 readline 接口
function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// 提问函数
function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// 验证 API Key
async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/skills?limit=1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// 确认 Agent 绑定
async function confirmAgentBinding(apiKey: string, agentType: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/api-keys/confirm-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ agent_type: agentType })
    });
    
    if (response.ok) {
      const data = await response.json() as { message: string };
      return { success: true, message: data.message };
    } else {
      const error = await response.json() as { detail?: string };
      return { success: false, message: error.detail || '绑定失败' };
    }
  } catch (err) {
    return { success: false, message: `网络错误: ${err}` };
  }
}

// 写入配置文件
function writeConfig(configPath: string, content: string, format: 'json' | 'toml' | 'skill'): { success: boolean; message: string } {
  try {
    const dir = path.dirname(configPath);
    
    // 创建目录
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // skill 格式直接写入（OpenClaw skill）
    if (format === 'skill') {
      fs.writeFileSync(configPath, content, 'utf-8');
      return { success: true, message: `Skill 已创建: ${configPath}` };
    }
    
    // 如果是 JSON 格式且文件已存在，尝试合并
    if (format === 'json' && fs.existsSync(configPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const newConfig = JSON.parse(content);
        
        // 深度合并 mcpServers
        if (newConfig.mcpServers) {
          existing.mcpServers = existing.mcpServers || {};
          existing.mcpServers.bringskills = newConfig.mcpServers.bringskills;
        }
        // 深度合并 mcp.servers (OpenClaw 格式)
        if (newConfig.mcp?.servers) {
          existing.mcp = existing.mcp || {};
          existing.mcp.servers = existing.mcp.servers || {};
          existing.mcp.servers.bringskills = newConfig.mcp.servers.bringskills;
        }
        // GitHub Copilot 格式
        if (newConfig['github.copilot.chat.mcp.servers']) {
          existing['github.copilot.chat.mcp.servers'] = existing['github.copilot.chat.mcp.servers'] || {};
          existing['github.copilot.chat.mcp.servers'].bringskills = newConfig['github.copilot.chat.mcp.servers'].bringskills;
        }
        
        content = JSON.stringify(existing, null, 2);
      } catch (e) {
        // 解析失败，直接覆盖
      }
    }
    
    // 如果是 TOML 格式且文件已存在，追加到末尾
    if (format === 'toml' && fs.existsSync(configPath)) {
      const existing = fs.readFileSync(configPath, 'utf-8');
      if (!existing.includes('[mcp_servers.bringskills]')) {
        content = existing + '\n' + content;
      } else {
        return { success: true, message: '配置已存在，跳过写入' };
      }
    }
    
    fs.writeFileSync(configPath, content, 'utf-8');
    return { success: true, message: `配置已写入: ${configPath}` };
  } catch (error) {
    return { success: false, message: `写入失败: ${error}` };
  }
}

const AGENT_ALIASES: Record<string, string> = {
  claude: 'claude-code',
  cursor: 'cursor',
  codex: 'codex',
  windsurf: 'windsurf',
  copilot: 'github-copilot',
  github: 'github-copilot',
  githubcopilot: 'github-copilot',
  amazonq: 'amazon-q',
  q: 'amazon-q',
  openclaw: 'openclaw',
  aider: 'aider',
  cody: 'cody',
  tabnine: 'tabnine',
  jetbrains: 'jetbrains-ai',
  jetbrainsai: 'jetbrains-ai',
  replit: 'replit-ai',
  'replit-ai': 'replit-ai',
  replitai: 'replit-ai',
  continue: 'continue',
  other: 'generic',
  generic: 'generic'
};

function normalizeAgentValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (AGENT_CONFIGS[normalized]) {
    return normalized;
  }

  return AGENT_ALIASES[normalized];
}

function parseSetupArgs(): SetupArgs {
  const rawArgs = process.argv[2] === 'setup' ? process.argv.slice(3) : process.argv.slice(2);
  const parsed: SetupArgs = { help: false };

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg === '--agent') {
      const candidate = rawArgs[i + 1];
      if (!candidate || candidate.startsWith('-')) {
        parsed.missingAgentValue = true;
        continue;
      }
      const normalized = normalizeAgentValue(candidate);
      if (!normalized) {
        parsed.invalidAgent = candidate;
      } else {
        parsed.agent = normalized;
      }
      i += 1;
      continue;
    }

    if (arg.startsWith('--agent=')) {
      const candidate = arg.slice('--agent='.length);
      const normalized = normalizeAgentValue(candidate);
      if (!normalized) {
        parsed.invalidAgent = candidate;
      } else {
        parsed.agent = normalized;
      }
    }
  }

  return parsed;
}

function printHelp(): void {
  console.log('\nBringSkills Setup\n');
  console.log('Usage:');
  console.log('  npx -y bringskills-mcp-server setup');
  console.log('  npx -y bringskills-mcp-server setup --agent <type>');
  console.log('  npx -y bringskills-mcp-server setup --help');
  console.log('');
  console.log('Supported agents:');
  Object.values(AGENT_CONFIGS).forEach((agent) => {
    console.log(`  - ${agent.value.padEnd(14)} ${agent.name}`);
  });
}

function resolveConfigPath(agent: AgentConfig, home: string): string {
  return typeof agent.configPath === 'function'
    ? agent.configPath(home)
    : agent.configPath;
}

function getProcessCommand(pid: number): string {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf-8'
    }).trim().toLowerCase();
  } catch {
    return '';
  }
}

function getParentPid(pid: number): number | null {
  try {
    const output = execFileSync('ps', ['-p', String(pid), '-o', 'ppid='], {
      encoding: 'utf-8'
    }).trim();
    const parentPid = Number.parseInt(output, 10);
    return Number.isFinite(parentPid) ? parentPid : null;
  } catch {
    return null;
  }
}

function getAncestorCommands(maxDepth = 5): string[] {
  const commands: string[] = [];
  const seen = new Set<number>();
  let currentPid: number | null = process.ppid;

  while (currentPid && currentPid > 1 && commands.length < maxDepth && !seen.has(currentPid)) {
    seen.add(currentPid);
    const command = getProcessCommand(currentPid);
    if (command) {
      commands.push(command);
    }
    currentPid = getParentPid(currentPid);
  }

  return commands;
}

function maybeAddDetection(
  detections: Map<string, AgentDetection>,
  agentKey: string,
  reason: string,
  score: number
): void {
  const existing = detections.get(agentKey);
  if (existing && existing.score >= score) {
    return;
  }

  const agent = AGENT_CONFIGS[agentKey];
  if (!agent) {
    return;
  }

  detections.set(agentKey, { agent, reason, score });
}

function detectAgents(home: string): AgentDetection[] {
  const detections = new Map<string, AgentDetection>();
  const ancestorCommands = getAncestorCommands();
  const joinedCommands = ancestorCommands.join('\n');

  if (joinedCommands.includes('cursor')) {
    maybeAddDetection(detections, 'cursor', '当前终端进程链包含 Cursor', 100);
  }
  if (joinedCommands.includes('claude')) {
    maybeAddDetection(detections, 'claude-code', '当前终端进程链包含 Claude', 100);
  }
  if (joinedCommands.includes('codex')) {
    maybeAddDetection(detections, 'codex', '当前终端进程链包含 Codex', 100);
  }
  if (joinedCommands.includes('windsurf') || joinedCommands.includes('codeium')) {
    maybeAddDetection(detections, 'windsurf', '当前终端进程链包含 Windsurf/Codeium', 100);
  }
  if (joinedCommands.includes('amazon q') || joinedCommands.includes('amazonq')) {
    maybeAddDetection(detections, 'amazon-q', '当前终端进程链包含 Amazon Q', 100);
  }
  if (joinedCommands.includes('openclaw')) {
    maybeAddDetection(detections, 'openclaw', '当前终端进程链包含 OpenClaw', 100);
  }
  if (joinedCommands.includes('visual studio code') || joinedCommands.includes('/code ') || joinedCommands.includes('/code\n')) {
    maybeAddDetection(detections, 'github-copilot', '当前终端进程链包含 VS Code', 70);
  }

  const configSignals: Array<{ agentKey: string; pathToCheck: string; score: number }> = [
    { agentKey: 'claude-code', pathToCheck: resolveConfigPath(AGENT_CONFIGS['claude-code'], home), score: 80 },
    { agentKey: 'cursor', pathToCheck: resolveConfigPath(AGENT_CONFIGS['cursor'], home), score: 80 },
    { agentKey: 'codex', pathToCheck: resolveConfigPath(AGENT_CONFIGS['codex'], home), score: 80 },
    { agentKey: 'windsurf', pathToCheck: resolveConfigPath(AGENT_CONFIGS['windsurf'], home), score: 80 },
    { agentKey: 'github-copilot', pathToCheck: resolveConfigPath(AGENT_CONFIGS['github-copilot'], home), score: 75 },
    { agentKey: 'amazon-q', pathToCheck: resolveConfigPath(AGENT_CONFIGS['amazon-q'], home), score: 80 },
    { agentKey: 'openclaw', pathToCheck: path.join(home, '.agents'), score: 80 }
  ];

  for (const signal of configSignals) {
    if (signal.pathToCheck && fs.existsSync(signal.pathToCheck)) {
      maybeAddDetection(
        detections,
        signal.agentKey,
        `检测到本机已有 ${signal.pathToCheck}`,
        signal.score
      );
    }
  }

  if (process.env.CODEX_HOME) {
    maybeAddDetection(detections, 'codex', '检测到 CODEX_HOME 环境变量', 95);
  }

  return Array.from(detections.values()).sort((a, b) => b.score - a.score);
}

async function selectAgentInteractively(rl: readline.Interface): Promise<AgentConfig | undefined> {
  console.log('\n📋 支持的 AI Agent:\n');
  const agents = Object.values(AGENT_CONFIGS);
  agents.forEach((agent, i) => {
    const mcpStatus = agent.supportsMcp ? '✅ MCP' : '❌ 无MCP';
    console.log(`  ${i + 1}. ${agent.name} (${mcpStatus})`);
  });

  const agentIndex = await question(rl, '\n请选择你的 Agent (输入数字): ');
  return agents[Number.parseInt(agentIndex, 10) - 1];
}

async function confirmWithDefaultYes(rl: readline.Interface, prompt: string): Promise<boolean> {
  const answer = (await question(rl, prompt)).toLowerCase();
  return answer === '' || answer === 'y' || answer === 'yes';
}

// 主函数
async function main() {
  const args = parseSetupArgs();

  if (args.help) {
    printHelp();
    return;
  }

  if (args.missingAgentValue) {
    console.log('❌ --agent 需要一个值，例如 --agent codex');
    console.log('');
    printHelp();
    throw new SetupCliError('missing-agent-value');
  }

  if (args.invalidAgent) {
    console.log(`❌ 不支持的 agent: ${args.invalidAgent}`);
    console.log('');
    printHelp();
    throw new SetupCliError('invalid-agent');
  }

  console.log('\n🔧 BringSkills Setup\n');
  console.log('=' .repeat(50));
  
  const rl = createRL();
  const home = os.homedir();
  
  try {
    // 1. 自动识别 Agent，必要时回退手选
    let selectedAgent: AgentConfig | undefined;

    if (args.agent) {
      selectedAgent = AGENT_CONFIGS[args.agent];
      console.log(`\n✅ 已使用 --agent: ${selectedAgent.name}`);
    } else {
      const detections = detectAgents(home);

      if (detections.length > 0) {
        const [bestMatch, secondMatch] = detections;
        const canAutoSelect = !secondMatch || bestMatch.score > secondMatch.score;

        if (canAutoSelect) {
          console.log(`\n🔎 Detected ${bestMatch.agent.name}`);
          console.log(`   原因: ${bestMatch.reason}`);
          const confirmed = await confirmWithDefaultYes(
            rl,
            `   Continue with ${bestMatch.agent.name}? [Y/n] `
          );

          if (confirmed) {
            selectedAgent = bestMatch.agent;
          }
        } else {
          console.log('\n⚠️  检测到多个可能的 Agent 环境，改为手动选择:');
          detections.slice(0, 3).forEach((detection) => {
            console.log(`   - ${detection.agent.name}: ${detection.reason}`);
          });
        }
      }

      if (!selectedAgent) {
        selectedAgent = await selectAgentInteractively(rl);
      }
    }

    if (!selectedAgent) {
      console.log('❌ 无效的选择');
      throw new SetupCliError('invalid-selection');
    }
    
    console.log(`\n✅ 已选择: ${selectedAgent.name}`);
    
    // 2. 检查是否支持 MCP
    if (!selectedAgent.supportsMcp) {
      console.log('\n⚠️  此 Agent 不支持 MCP，将配置 HTTP API 集成方式');
    }
    
    // 3. 输入 API Key
    const apiKey = await question(rl, '\n🔑 请输入你的 API Key (从 bringskills.com/settings/api-keys 获取):\n> ');
    
    if (!apiKey.startsWith('sk-bring-')) {
      console.log('❌ 无效的 API Key 格式，应以 sk-bring- 开头');
      throw new SetupCliError('invalid-api-key-format');
    }
    
    // 4. 验证 API Key
    console.log('\n⏳ 正在验证 API Key...');
    const isValid = await validateApiKey(apiKey);
    
    if (!isValid) {
      console.log('❌ API Key 无效或已过期');
      throw new SetupCliError('invalid-api-key');
    }
    console.log('✅ API Key 有效');
    
    // 5. 确认 Agent 绑定
    console.log(`\n⏳ 正在绑定 Agent 类型为 ${selectedAgent.name}...`);
    const bindResult = await confirmAgentBinding(apiKey, selectedAgent.value);
    
    if (bindResult.success) {
      console.log(`✅ ${bindResult.message}`);
    } else {
      console.log(`⚠️  绑定警告: ${bindResult.message}`);
    }
    
    // 6. 写入配置文件 (所有有 configPath 的 Agent)
    const configPath = typeof selectedAgent.configPath === 'function' 
      ? selectedAgent.configPath(home) 
      : selectedAgent.configPath;
    
    if (configPath) {
      console.log(`\n⏳ 正在写入配置到 ${configPath}...`);
      const configContent = selectedAgent.configTemplate(apiKey);
      const writeResult = writeConfig(configPath, configContent, selectedAgent.configFormat);
      
      if (writeResult.success) {
        console.log(`✅ ${writeResult.message}`);
      } else {
        console.log(`❌ ${writeResult.message}`);
        throw new SetupCliError('write-config-failed');
      }
    }
    
    // 7. 写入 shell 环境变量 (对于需要的 Agent)
    const agentConfig = selectedAgent as AgentConfig & { shellEnvVar?: boolean };
    if (agentConfig.shellEnvVar) {
      console.log('\n⏳ 正在配置环境变量...');
      const shellEnvResult = writeShellEnvVar(apiKey, home);
      if (shellEnvResult.success) {
        console.log(`✅ ${shellEnvResult.message}`);
      } else {
        console.log(`⚠️  ${shellEnvResult.message}`);
      }
    }
    
    // 8. 显示说明
    if (selectedAgent.instructions) {
      console.log(`\n📝 ${selectedAgent.instructions}`);
    }
    
    // 9. 完成
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 配置完成！');
    
    if (selectedAgent.supportsMcp) {
      console.log(`\n请重启 ${selectedAgent.name} 开始使用 BringSkills。`);
      console.log('\n现在去 Agent 里输入: "搜索 BringSkills 技能"');
    } else {
      console.log(`\n${selectedAgent.name} 已配置完成。`);
      console.log('请查看上方说明了解如何使用 BringSkills API。');
    }
    console.log(`\n文档: ${PUBLIC_DOCS_URL}`);
    
  } finally {
    rl.close();
  }
}

// 写入 shell 环境变量
function writeShellEnvVar(apiKey: string, home: string): { success: boolean; message: string } {
  try {
    // 检测 shell 类型
    const shell = process.env.SHELL || '/bin/bash';
    let rcFile: string;
    
    if (shell.includes('zsh')) {
      rcFile = path.join(home, '.zshrc');
    } else if (shell.includes('bash')) {
      rcFile = path.join(home, '.bashrc');
    } else {
      rcFile = path.join(home, '.profile');
    }
    
    const envLine = `\n# BringSkills API Key\nexport BRINGSKILLS_API_KEY="${apiKey}"\n`;
    
    // 检查是否已存在
    if (fs.existsSync(rcFile)) {
      const content = fs.readFileSync(rcFile, 'utf-8');
      if (content.includes('BRINGSKILLS_API_KEY')) {
        // 更新现有的
        const updated = content.replace(
          /export BRINGSKILLS_API_KEY="[^"]*"/,
          `export BRINGSKILLS_API_KEY="${apiKey}"`
        );
        fs.writeFileSync(rcFile, updated, 'utf-8');
        return { success: true, message: `已更新 ${rcFile} 中的环境变量` };
      }
    }
    
    // 追加新的
    fs.appendFileSync(rcFile, envLine, 'utf-8');
    return { success: true, message: `已添加环境变量到 ${rcFile}\n   请运行: source ${rcFile}` };
  } catch (error) {
    return { success: false, message: `无法写入环境变量: ${error}` };
  }
}

// 运行
main().catch((error) => {
  if (error instanceof SetupCliError) {
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
