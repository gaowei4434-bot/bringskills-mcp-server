#!/usr/bin/env node
"use strict";
/**
 * BringSkills MCP Server CLI
 * Usage:
 *   bringskills-mcp [--api-key <key>]  - Start MCP server
 *   bringskills-mcp setup              - Interactive setup
 *
 * Environment variables:
 *   BRINGSKILLS_API_KEY - Your BringSkills API key
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_js_1 = require("./server.js");
const args = process.argv.slice(2);
const HELP_FLAGS = new Set(['--help', '-h', 'help']);
function printHelp() {
    console.log('\nBringSkills MCP Server\n');
    console.log('Usage:');
    console.log('  npx -y bringskills-mcp-server setup');
    console.log('  npx -y bringskills-mcp-server setup --help');
    console.log('  BRINGSKILLS_API_KEY=sk-bring-xxx npx -y bringskills-mcp-server');
    console.log('  npx -y bringskills-mcp-server --api-key <key>');
    console.log('');
    console.log('Commands:');
    console.log('  setup     Configure BringSkills for your AI agent');
    console.log('');
    console.log('Options:');
    console.log('  --api-key <key>  Start the MCP server with an explicit API key');
    console.log('  -h, --help       Show this help message');
}
if (args[0] === 'setup') {
    import('./setup.js').catch((error) => {
        console.error('Failed to load setup module:', error);
        process.exit(1);
    });
}
else if (args.length === 0 || HELP_FLAGS.has(args[0])) {
    printHelp();
}
else {
    function getApiKey() {
        const keyIndex = args.indexOf('--api-key');
        if (keyIndex !== -1 && args[keyIndex + 1]) {
            return args[keyIndex + 1];
        }
        const envKey = process.env.BRINGSKILLS_API_KEY;
        if (envKey) {
            return envKey;
        }
        console.error('Error: No API key provided.');
        console.error('');
        console.error('Usage:');
        console.error('  npx -y bringskills-mcp-server setup');
        console.error('  npx -y bringskills-mcp-server --api-key <key>');
        console.error('');
        console.error('Or set the BRINGSKILLS_API_KEY environment variable:');
        console.error('  export BRINGSKILLS_API_KEY=sk-bring-xxx');
        console.error('');
        console.error('Get your API key at: https://www.bringskills.com/settings/api-keys');
        process.exit(1);
    }
    async function main() {
        const apiKey = getApiKey();
        const server = new server_js_1.BringSkillsMCPServer(apiKey);
        await server.run();
    }
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=cli.js.map