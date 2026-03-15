#!/usr/bin/env node
/**
 * BringSkills Setup CLI
 * 一条命令完成 Agent 配置
 * 
 * 用法: npx bringskills-mcp-server setup [--agent <type>]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

const API_BASE = process.env.BRINGSKILLS_API_URL || 'https://bringskills-production.up.railway.app/api/v1';

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

搜索、浏览和执行 BringSkills 市场上的 AI 技能。一��购买，所有 Agent 通用。

## 使用场景

- 搜索 BringSkills 技能
- 执行已购买的技能
- 查看技能详情和使用方法

## 环境变量

需要设置 \`BRINGSKILLS_API_KEY\` 环境变量（setup 命令已自动配置）。

## API 端点

- Base URL: \`https://bringskills-production.up.railway.app/api/v1\`
- 认证: \`X-API-Key: $BRINGSKILLS_API_KEY\`

## 可用操作

### 1. 搜索技能

\`\`\`bash
curl -X GET "https://bringskills-production.up.railway.app/api/v1/skills?q=text&limit=10" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY"
\`\`\`

返回匹配的技能列表，包含 name, slug, description, price, rating 等字段。

### 2. 获取技能详情

\`\`\`bash
curl -X GET "https://bringskills-production.up.railway.app/api/v1/skills/{slug}" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY"
\`\`\`

### 3. 执行技能

\`\`\`bash
curl -X POST "https://bringskills-production.up.railway.app/api/v1/skills/{slug}/execute" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"text": "要处理的内容"}}'
\`\`\`

### 4. 查看我的技能

\`\`\`bash
curl -X GET "https://bringskills-production.up.railway.app/api/v1/orders" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY"
\`\`\`

### 5. 获取免费技能

\`\`\`bash
curl -X POST "https://bringskills-production.up.railway.app/api/v1/orders/free" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY" \\
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
curl -X GET "https://bringskills-production.up.railway.app/api/v1/skills?q=YOUR_QUERY" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY"
\`\`\`

### 执行技能
\`\`\`bash
curl -X POST "https://bringskills-production.up.railway.app/api/v1/skills/SKILL_ID/execute" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"text": "your input"}}'
\`\`\`

### 获取我的技能
\`\`\`bash
curl -X GET "https://bringskills-production.up.railway.app/api/v1/users/me/skills" \\
  -H "X-API-Key: $BRINGSKILLS_API_KEY"
\`\`\`

## Python 代码示例
\`\`\`python
import os
import requests

API_KEY = os.environ.get("BRINGSKILLS_API_KEY")
BASE_URL = "https://bringskills-production.up.railway.app/api/v1"

def search_skills(query):
    resp = requests.get(f"{BASE_URL}/skills", 
                       params={"q": query},
                       headers={"X-API-Key": API_KEY})
    return resp.json()

def execute_skill(skill_id, input_data):
    resp = requests.post(f"{BASE_URL}/skills/{skill_id}/execute",
                        json={"input": input_data},
                        headers={"X-API-Key": API_KEY})
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
          "prompt": "Use the BringSkills API to search for skills. API Key is in environment variable BRINGSKILLS_API_KEY. Base URL: https://bringskills-production.up.railway.app/api/v1/skills?q={query}"
        },
        "bringskills-execute": {
          "description": "Execute a BringSkills skill",
          "prompt": "Use the BringSkills API to execute a skill. POST to https://bringskills-production.up.railway.app/api/v1/skills/{skill_id}/execute with X-API-Key header."
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
# Base URL: https://bringskills-production.up.railway.app/api/v1
\`\`\`

## API 文档
https://www.bringskills.com/docs/api
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
    private const val baseUrl = "https://bringskills-production.up.railway.app/api/v1"

    fun searchSkills(query: String): String {
        val url = URL("\$baseUrl/skills?q=\$query")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("X-API-Key", apiKey)
        return conn.inputStream.bufferedReader().readText()
    }

    fun executeSkill(skillId: String, input: Map<String, Any>): String {
        val url = URL("\$baseUrl/skills/\$skillId/execute")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("X-API-Key", apiKey)
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
BASE_URL = "https://bringskills-production.up.railway.app/api/v1"

# 搜索技能
def search_skills(query):
    resp = requests.get(f"{BASE_URL}/skills", 
                       params={"q": query},
                       headers={"X-API-Key": API_KEY})
    return resp.json()

# 执行技能
def execute_skill(skill_id, input_data):
    resp = requests.post(f"{BASE_URL}/skills/{skill_id}/execute",
                        json={"input": input_data},
                        headers={"X-API-Key": API_KEY})
    return resp.json()

# 示例
skills = search_skills("text analysis")
print(skills)
\`\`\`

### JavaScript/Node.js
\`\`\`javascript
const API_KEY = process.env.BRINGSKILLS_API_KEY;
const BASE_URL = "https://bringskills-production.up.railway.app/api/v1";

async function searchSkills(query) {
  const resp = await fetch(\`\${BASE_URL}/skills?q=\${query}\`, {
    headers: { "X-API-Key": API_KEY }
  });
  return resp.json();
}

async function executeSkill(skillId, input) {
  const resp = await fetch(\`\${BASE_URL}/skills/\${skillId}/execute\`, {
    method: "POST",
    headers: { 
      "X-API-Key": API_KEY,
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
        'X-API-Key': apiKey
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

// 主函数
async function main() {
  // 直接运行 setup（cli.ts 已经处理了命令分发）
  
  console.log('\n🔧 BringSkills Setup\n');
  console.log('=' .repeat(50));
  
  const rl = createRL();
  const home = os.homedir();
  
  try {
    // 1. 选择 Agent 类型
    console.log('\n📋 支持的 AI Agent:\n');
    const agents = Object.values(AGENT_CONFIGS);
    agents.forEach((agent, i) => {
      const mcpStatus = agent.supportsMcp ? '✅ MCP' : '❌ 无MCP';
      console.log(`  ${i + 1}. ${agent.name} (${mcpStatus})`);
    });
    
    const agentIndex = await question(rl, '\n请选择你的 Agent (输入数字): ');
    const selectedAgent = agents[parseInt(agentIndex) - 1];
    
    if (!selectedAgent) {
      console.log('❌ 无效的选择');
      rl.close();
      return;
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
      rl.close();
      return;
    }
    
    // 4. 验证 API Key
    console.log('\n⏳ 正在验证 API Key...');
    const isValid = await validateApiKey(apiKey);
    
    if (!isValid) {
      console.log('❌ API Key 无效或已过期');
      rl.close();
      return;
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
        console.log(`��� ${writeResult.message}`);
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
      console.log('\n测试: 在 Agent 中输入 "搜索 BringSkills 技能"');
    } else {
      console.log(`\n${selectedAgent.name} 已配置完成。`);
      console.log('请查看上方说明了解如何使用 BringSkills API。');
    }
    console.log('\n文档: https://www.bringskills.com/docs');
    
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
main().catch(console.error);
