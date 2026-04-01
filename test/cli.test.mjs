import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli.js');

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options
  });
}

test('root help prints usage and exits successfully', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /BringSkills MCP Server/);
  assert.match(result.stdout, /npx -y bringskills-mcp-server setup/);
});

test('setup help prints setup usage without entering interactive prompts', () => {
  const result = runCli(['setup', '--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /BringSkills Setup/);
  assert.match(result.stdout, /setup --agent <type>/);
  assert.doesNotMatch(result.stdout, /请输入你的 API Key/);
});

test('setup accepts replit alias and reaches API key validation prompt', () => {
  const result = runCli(['setup', '--agent', 'replit'], {
    input: 'not-a-real-key\n'
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /已使用 --agent: Replit AI/);
  assert.match(result.stdout, /无效的 API Key 格式/);
});

test('setup rejects invalid agent values', () => {
  const result = runCli(['setup', '--agent', 'nope']);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /不支持的 agent: nope/);
});
