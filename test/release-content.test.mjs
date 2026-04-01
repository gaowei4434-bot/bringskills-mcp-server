import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('release-facing content uses the public API domain and docs link', () => {
  const setupSource = readRepoFile('src/setup.ts');
  const readme = readRepoFile('README.md');

  assert.match(setupSource, /https:\/\/api\.bringskills\.com\/api\/v1/);
  assert.match(readme, /https:\/\/api\.bringskills\.com\/api\/v1/);
  assert.doesNotMatch(setupSource, /https:\/\/bringskills-production\.up\.railway\.app/);
  assert.doesNotMatch(readme, /https:\/\/bringskills-production\.up\.railway\.app/);
  assert.doesNotMatch(setupSource, /https:\/\/www\.bringskills\.com\/docs\/api/);
  assert.doesNotMatch(readme, /https:\/\/www\.bringskills\.com\/docs\/api/);
});

test('release-facing content documents bearer auth instead of legacy headers', () => {
  const setupSource = readRepoFile('src/setup.ts');
  const readme = readRepoFile('README.md');

  assert.match(setupSource, /Authorization: Bearer/);
  assert.match(readme, /Authorization: Bearer/);
  assert.doesNotMatch(setupSource, /X-API-Key/);
  assert.doesNotMatch(readme, /X-API-Key/);
});
