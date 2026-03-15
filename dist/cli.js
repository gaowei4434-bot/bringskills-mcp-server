#!/usr/bin/env node
"use strict";
/**
 * BringSkills MCP Server CLI
 * Usage: bringskills-mcp [--api-key <key>]
 *
 * Environment variables:
 *   BRINGSKILLS_API_KEY - Your BringSkills API key
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_js_1 = require("./server.js");
function getApiKey() {
    // Check command line arguments
    const args = process.argv.slice(2);
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
    console.error('  bringskills-mcp --api-key <your-api-key>');
    console.error('');
    console.error('Or set the BRINGSKILLS_API_KEY environment variable:');
    console.error('  export BRINGSKILLS_API_KEY=sk-bring-xxx');
    console.error('');
    console.error('Get your API key at: https://www.bringskills.com/settings/api-keys');
    process.exit(1);
}
async function main() {
    const apiKey = getApiKey();
    // Debug: log API key prefix to stderr (MCP uses stdout for protocol)
    console.error(`[DEBUG] API Key loaded: ${apiKey.substring(0, 15)}...`);
    const server = new server_js_1.BringSkillsMCPServer(apiKey);
    await server.run();
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map