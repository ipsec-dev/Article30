import { describe, expect, it } from 'vitest';
import { VersionService } from '../../src/modules/config/version.service';
import backendPkg from '../../package.json';

describe('VersionService', () => {
  it('exposes the version from backend/package.json', () => {
    const service = new VersionService();
    expect(service.version).toBe(backendPkg.version);
  });

  it('exposes a SemVer-formatted string', () => {
    const service = new VersionService();
    expect(service.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
