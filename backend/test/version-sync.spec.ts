import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '../..');
const packageFiles = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
  'shared/package.json',
];

describe('semver workspace sync', () => {
  it('all workspace package.json files share the same version', () => {
    const versions = packageFiles.map(relativePath => {
      const json = JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
      const version = json.version as string | undefined;
      expect(version, `${relativePath} is missing a "version" field`).toBeDefined();
      return { relativePath, version: version ?? '' };
    });

    const distinctVersions = new Set(versions.map(v => v.version));
    expect(distinctVersions.size, JSON.stringify(versions, null, 2)).toBe(1);
  });
});
