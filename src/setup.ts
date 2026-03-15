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
  configFormat: 'json' | 'toml';
  configTemplate: (apiKey: string) => string;
  instructions?: string;
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
    supportsMcp: true,
    configPath: (home) => path.join(home, '.openclaw', 'openclaw.json'),
    configFormat: 'json',
    configTemplate: (apiKey) => JSON.stringify({
      mcp: {
        servers: {
          bringskills: {
            command: 'npx',
            args: ['-y', 'bringskills-mcp-server'],
            env: {
              BRINGSKILLS_API_KEY: apiKey
            }
          }
        }
      }
    }, null, 2),
    instructions: '注意: 需要合并到现有的 openclaw.json 中'
  },
  // 不支持 MCP 的 Agent
  'aider': {
    name: 'Aider',
    value: 'aider',
    supportsMcp: false,
    configPath: (home) => path.join(home, '.aider.conf.yml'),
    configFormat: 'json', // 实际是 YAML，但我们用特殊处理
    configTemplate: (apiKey) => `# BringSkills API Configuration
# 在 Aider 中使用: /add .bringskills-context.md
# 然后让 Aider 生成 API 调用代码

# 环境变量设置 (添加到 ~/.zshrc 或 ~/.bashrc):
# export BRINGSKILLS_API_KEY="${apiKey}"
`,
    instructions: `
Aider 不支持 MCP，但你可以：
1. 设置环境变量: export BRINGSKILLS_API_KEY=<your-api-key>
2. 让 Aider 生成 BringSkills API 调用代码
3. API 文档: https://www.bringskills.com/docs/api
`
  },
  'cody': {
    name: 'Cody (Sourcegraph)',
    value: 'cody',
    supportsMcp: false,
    configPath: '',
    configFormat: 'json',
    configTemplate: () => '',
    instructions: `
Cody 不支持外部 MCP Server。
请使用 BringSkills HTTP API:
- Base URL: https://bringskills-production.up.railway.app/api/v1/
- Header: X-API-Key: <your-api-key>
- 文档: https://www.bringskills.com/docs/api
`
  },
  'tabnine': {
    name: 'Tabnine',
    value: 'tabnine',
    supportsMcp: false,
    configPath: '',
    configFormat: 'json',
    configTemplate: () => '',
    instructions: `
Tabnine 是封闭系统，不支持外部集成。
请使用 BringSkills HTTP API 或切换到支持 MCP 的 Agent。
`
  },
  'jetbrains-ai': {
    name: 'JetBrains AI',
    value: 'jetbrains-ai',
    supportsMcp: false,
    configPath: '',
    configFormat: 'json',
    configTemplate: () => '',
    instructions: `
JetBrains AI 不支持 MCP。
请使用 BringSkills HTTP API:
- Base URL: https://bringskills-production.up.railway.app/api/v1/
- Header: X-API-Key: <your-api-key>
`
  },
  'replit-ai': {
    name: 'Replit AI',
    value: 'replit-ai',
    supportsMcp: false,
    configPath: '',
    configFormat: 'json',
    configTemplate: () => '',
    instructions: `
Replit AI 不支持 MCP。
在 Replit 中使用:
1. 添加 Secret: BRINGSKILLS_API_KEY = <your-api-key>
2. 使用 HTTP API 调用 BringSkills
`
  },
  'continue': {
    name: 'Continue',
    value: 'continue',
    supportsMcp: false,
    configPath: '',
    configFormat: 'json',
    configTemplate: () => '',
    instructions: `
Continue 已转型为 PR 检查工具，不再支持 MCP。
请使用其他支持 MCP 的 Agent。
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
function writeConfig(configPath: string, content: string, format: 'json' | 'toml'): { success: boolean; message: string } {
  try {
    const dir = path.dirname(configPath);
    
    // 创建目录
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
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
  const args = process.argv.slice(2);
  
  // 检查是否是 setup 命令
  if (args[0] !== 'setup') {
    // 如果不是 setup，启动 MCP server
    require('./cli');
    return;
  }
  
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
      console.log('\n⚠️  此 Agent 不支持 MCP');
      if (selectedAgent.instructions) {
        console.log(selectedAgent.instructions);
      }
      
      // 仍然可以绑定 Agent 类型
      const continueSetup = await question(rl, '\n是否仍要绑定 API Key 到此 Agent 类型? (y/n): ');
      if (continueSetup.toLowerCase() !== 'y') {
        rl.close();
        return;
      }
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
    
    // 6. 写入配置文件 (仅支持 MCP 的 Agent)
    if (selectedAgent.supportsMcp && selectedAgent.configPath) {
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
        }
        
        if (selectedAgent.instructions) {
          console.log(`\n📝 ${selectedAgent.instructions}`);
        }
      }
    }
    
    // 7. 完成
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 配置完成！');
    console.log(`\n请重启 ${selectedAgent.name} 开始使用 BringSkills。`);
    console.log('\n测试: 在 Agent 中输入 "搜索 BringSkills 技能"');
    console.log('\n文档: https://www.bringskills.com/docs');
    
  } finally {
    rl.close();
  }
}

// 运行
main().catch(console.error);
