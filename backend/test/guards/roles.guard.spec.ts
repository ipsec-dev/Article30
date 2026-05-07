import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { createMockContext } from '../helpers';
import { Role } from '@article30/shared';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it('allows users with matching role', () => {
    const { context } = createMockContext({
      user: { id: 'user-1', role: Role.ADMIN },
      roles: [Role.ADMIN],
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('throws ForbiddenException for non-matching role', () => {
    const { context } = createMockContext({
      user: { id: 'user-2', role: Role.AUDITOR },
      roles: [Role.ADMIN, Role.DPO],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows all roles when no @Roles() decorator present', () => {
    const { context } = createMockContext({
      user: { id: 'user-3', role: Role.AUDITOR },
      // no roles set → reflector returns undefined
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});
