#!/usr/bin/env node
/**
 * BringSkills MCP Server CLI
 * Usage: 
 *   bringskills-mcp [--api-key <key>]  - Start MCP server
 *   bringskills-mcp setup              - Interactive setup
 * 
 * Environment variables:
 *   BRINGSKILLS_API_KEY - Your BringSkills API key
 */

import { BringSkillsMCPServer } from './server.js';

// Check if setup command
const args = process.argv.slice(2);
if (args[0] === 'setup') {
  // Dynamic import setup module
  import('./setup.js').catch((error) => {
    console.error('Failed to load setup module:', error);
    process.exit(1);
  });
} else {
  // Normal MCP server mode
  function getApiKey(): string {
    // Check command line arguments
    const keyIndex = args.indexOf('--api-key');
    if (keyIndex !== -1 && args[keyIndex + 1]) {
      return args[keyIndex + 1];
    }

    // Check environment variable
    const envKey = process.env.BRINGSKILLS_API_KEY;
    if (envKey) {
      return envKey;
    }

    console.error('Error: No API key provided.');
    console.error('');
    console.error('Usage:');
    console.error('  npx bringskills-mcp-server setup           - Interactive setup');
    console.error('  npx bringskills-mcp-server --api-key <key> - Start MCP server');
    console.error('');
    console.error('Or set the BRINGSKILLS_API_KEY environment variable:');
    console.error('  export BRINGSKILLS_API_KEY=sk-bring-xxx');
    console.error('');
    console.error('Get your API key at: https://www.bringskills.com/settings/api-keys');
    process.exit(1);
  }

  async function main(): Promise<void> {
    const apiKey = getApiKey();
    // Debug: log API key prefix to stderr (MCP uses stdout for protocol)
    console.error(`[DEBUG] API Key loaded: ${apiKey.substring(0, 15)}...`);
    const server = new BringSkillsMCPServer(apiKey);
    await server.run();
  }

  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
