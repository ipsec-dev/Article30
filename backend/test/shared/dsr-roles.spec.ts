import { describe, it, expect } from 'vitest';
import { DSR_ROLES, Role } from '@article30/shared';

describe('DSR_ROLES', () => {
  it('is exactly [ADMIN, DPO]', () => {
    expect([...DSR_ROLES].sort()).toEqual([Role.ADMIN, Role.DPO].sort());
  });
});
